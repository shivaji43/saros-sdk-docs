# Token Swap Integration Tutorial

This tutorial walks you through building a complete token swap interface using the Saros SDK. By the end, you'll have a production-ready swap implementation with price quotes, slippage protection, and multi-hop routing.

## What We're Building

A swap module that:
- Gets real-time price quotes
- Handles direct and routed swaps
- Manages slippage and price impact
- Provides user-friendly error messages
- Supports SOL wrapping/unwrapping

## Step 1: Setting Up the Swap Service

First, let's create a robust swap service class:

```javascript
// swapService.js
import { 
  getSwapAmountSaros, 
  swapSaros,
  genConnectionSolana,
  getInfoTokenByMint,
  convertBalanceToWei,
  convertWeiToBalance 
} from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

class SarosSwapService {
  constructor(walletAddress) {
    this.connection = genConnectionSolana();
    this.walletAddress = walletAddress;
    this.SAROS_PROGRAM = new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr');
  }

  /**
   * Get swap quote with all necessary details
   */
  async getQuote(fromMint, toMint, amount, poolParams) {
    try {
      // Input validation
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get the swap estimate
      const estimate = await getSwapAmountSaros(
        this.connection,
        fromMint,
        toMint,
        amount,
        0.5, // Default 0.5% slippage
        poolParams
      );

      // Calculate additional metrics
      const minimumReceived = estimate.amountOutWithSlippage;
      const exchangeRate = estimate.amountOut / amount;
      const priceImpact = estimate.priceImpact;
      
      // Determine if price impact is acceptable
      const impactSeverity = this.assessPriceImpact(priceImpact);

      return {
        success: true,
        data: {
          inputAmount: amount,
          outputAmount: estimate.amountOut,
          minimumReceived,
          exchangeRate,
          priceImpact,
          impactSeverity,
          route: 'direct', // or 'routed' for multi-hop
          estimatedFee: 0.00025 // Approximate SOL fee
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get quote: ${error.message}`
      };
    }
  }

  /**
   * Assess price impact severity
   */
  assessPriceImpact(impact) {
    if (impact < 1) return 'low';
    if (impact < 3) return 'medium';
    if (impact < 5) return 'high';
    return 'severe';
  }

  /**
   * Execute the swap
   */
  async executeSwap(swapParams) {
    const {
      fromMint,
      toMint,
      amount,
      minAmountOut,
      poolAddress,
      fromTokenAccount,
      toTokenAccount
    } = swapParams;

    // Pre-flight checks
    const checks = await this.performPreflightChecks(fromMint, amount);
    if (!checks.success) {
      return checks;
    }

    // Execute swap
    const result = await swapSaros(
      this.connection,
      fromTokenAccount,
      toTokenAccount,
      amount,
      minAmountOut,
      null, // No host fees
      poolAddress,
      this.SAROS_PROGRAM,
      this.walletAddress,
      fromMint,
      toMint
    );

    if (result.isError) {
      return {
        success: false,
        error: this.translateError(result.mess)
      };
    }

    return {
      success: true,
      transactionId: result.hash,
      explorerUrl: `https://solscan.io/tx/${result.hash}`
    };
  }

  /**
   * Perform pre-flight checks
   */
  async performPreflightChecks(tokenMint, amount) {
    // Check SOL balance for fees
    const solBalance = await this.connection.getBalance(
      new PublicKey(this.walletAddress)
    );
    
    if (solBalance < 0.01 * 1e9) {
      return {
        success: false,
        error: 'Insufficient SOL for transaction fees (need at least 0.01 SOL)'
      };
    }

    // Check token balance
    const tokenInfo = await getInfoTokenByMint(tokenMint, this.walletAddress);
    if (!tokenInfo) {
      return {
        success: false,
        error: 'Token account not found. Initialize it first.'
      };
    }

    const tokenBalance = convertWeiToBalance(
      tokenInfo.account.data.parsed.info.tokenAmount.amount,
      tokenInfo.account.data.parsed.info.tokenAmount.decimals
    );

    if (tokenBalance < amount) {
      return {
        success: false,
        error: `Insufficient token balance. Have: ${tokenBalance}, Need: ${amount}`
      };
    }

    return { success: true };
  }

  /**
   * Translate error codes to user-friendly messages
   */
  translateError(errorCode) {
    const errorMessages = {
      'gasSolNotEnough': 'Insufficient SOL for transaction fees',
      'tradeErrFund': 'Insufficient token balance',
      'sizeTooSmall': 'Swap amount is too small',
      'exceedsLimit': 'Swap amount exceeds pool liquidity',
      'tooLarge': 'Transaction size exceeds limit',
      'txsFail': 'Transaction failed. Please try again'
    };

    return errorMessages[errorCode] || `Transaction failed: ${errorCode}`;
  }
}

export default SarosSwapService;
```

## Step 2: Building the Swap Interface

Now let's create a user-facing swap interface:

```javascript
// SwapInterface.js
import SarosSwapService from './swapService';
import { getPoolInfo } from '@saros-finance/sdk';

class SwapInterface {
  constructor(walletAddress) {
    this.swapService = new SarosSwapService(walletAddress);
    this.currentQuote = null;
    this.slippageTolerance = 0.5; // Default 0.5%
  }

  /**
   * Set custom slippage tolerance
   */
  setSlippage(percentage) {
    if (percentage < 0.1 || percentage > 50) {
      throw new Error('Slippage must be between 0.1% and 50%');
    }
    this.slippageTolerance = percentage;
  }

  /**
   * Get available pools for a token pair
   */
  async findAvailablePools(token0Mint, token1Mint) {
    // In production, you'd query this from an API or indexer
    const pools = [
      {
        address: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
        token0: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
        token1: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        liquidity: 1000000 // USD value
      }
    ];

    // Filter pools that match our token pair
    return pools.filter(pool => 
      (pool.token0 === token0Mint && pool.token1 === token1Mint) ||
      (pool.token0 === token1Mint && pool.token1 === token0Mint)
    );
  }

  /**
   * Get best quote across all available pools
   */
  async getBestQuote(fromMint, toMint, amount) {
    const pools = await this.findAvailablePools(fromMint, toMint);
    
    if (pools.length === 0) {
      // Try finding a route through intermediate token
      return this.findRouteQuote(fromMint, toMint, amount);
    }

    // Get quotes from all pools
    const quotes = await Promise.all(
      pools.map(pool => 
        this.swapService.getQuote(fromMint, toMint, amount, {
          address: pool.address,
          tokens: {
            [pool.token0]: { /* token info */ },
            [pool.token1]: { /* token info */ }
          },
          tokenIds: [pool.token0, pool.token1]
        })
      )
    );

    // Find best quote (highest output)
    const validQuotes = quotes.filter(q => q.success);
    if (validQuotes.length === 0) {
      return { success: false, error: 'No valid quotes available' };
    }

    const bestQuote = validQuotes.reduce((best, current) => 
      current.data.outputAmount > best.data.outputAmount ? current : best
    );

    this.currentQuote = bestQuote;
    return bestQuote;
  }

  /**
   * Find route through intermediate token (2-hop swap)
   */
  async findRouteQuote(fromMint, toMint, amount) {
    // Common routing tokens (USDC, SOL, etc.)
    const routingTokens = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'So11111111111111111111111111111111111111112' // SOL
    ];

    for (const middleToken of routingTokens) {
      // Skip if middle token is same as from or to
      if (middleToken === fromMint || middleToken === toMint) continue;

      const pool1 = await this.findAvailablePools(fromMint, middleToken);
      const pool2 = await this.findAvailablePools(middleToken, toMint);

      if (pool1.length > 0 && pool2.length > 0) {
        // Calculate routed quote
        // This is simplified - in production, calculate exact amounts
        return {
          success: true,
          data: {
            route: 'routed',
            path: [fromMint, middleToken, toMint],
            pools: [pool1[0].address, pool2[0].address],
            // ... other quote details
          }
        };
      }
    }

    return {
      success: false,
      error: 'No swap route found'
    };
  }

  /**
   * Execute swap with current quote
   */
  async executeSwap() {
    if (!this.currentQuote) {
      return { success: false, error: 'No quote available' };
    }

    const { data } = this.currentQuote;
    
    // Apply slippage to minimum output
    const minOutput = data.minimumReceived * (1 - this.slippageTolerance / 100);

    // Execute based on route type
    if (data.route === 'direct') {
      return this.swapService.executeSwap({
        fromMint: data.fromMint,
        toMint: data.toMint,
        amount: data.inputAmount,
        minAmountOut: minOutput,
        poolAddress: data.poolAddress,
        fromTokenAccount: data.fromTokenAccount,
        toTokenAccount: data.toTokenAccount
      });
    } else {
      // Handle routed swap
      return this.executeRoutedSwap(data);
    }
  }

  /**
   * Execute multi-hop swap
   */
  async executeRoutedSwap(routeData) {
    // Implementation for routed swaps
    // This would use swapRouteSaros from the SDK
    console.log('Executing routed swap through:', routeData.path);
    // ... implementation
  }
}
```

## Step 3: Real-World Implementation Example

Here's how to use everything together:

```javascript
// main.js - Complete working example
import SwapInterface from './SwapInterface';

async function main() {
  // Initialize with your wallet
  const walletAddress = 'YOUR_WALLET_ADDRESS';
  const swapInterface = new SwapInterface(walletAddress);

  // Token addresses
  const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const C98 = 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9';

  try {
    // Step 1: Get quote
    console.log('Getting swap quote...');
    const quote = await swapInterface.getBestQuote(USDC, C98, 100);
    
    if (!quote.success) {
      console.error('Failed to get quote:', quote.error);
      return;
    }

    // Step 2: Display quote to user
    console.log('Swap Quote:');
    console.log(`Input: 100 USDC`);
    console.log(`Output: ${quote.data.outputAmount} C98`);
    console.log(`Minimum received: ${quote.data.minimumReceived} C98`);
    console.log(`Price impact: ${quote.data.priceImpact}%`);
    console.log(`Impact severity: ${quote.data.impactSeverity}`);

    // Step 3: Check if user wants to proceed
    if (quote.data.impactSeverity === 'severe') {
      console.warn('⚠️ High price impact! Consider smaller amount.');
      // In a real app, prompt user for confirmation
    }

    // Step 4: Set custom slippage if needed
    swapInterface.setSlippage(1.0); // 1% slippage

    // Step 5: Execute swap
    console.log('Executing swap...');
    const result = await swapInterface.executeSwap();

    if (result.success) {
      console.log('✅ Swap successful!');
      console.log(`Transaction: ${result.explorerUrl}`);
    } else {
      console.error('❌ Swap failed:', result.error);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the example
main().catch(console.error);
```

## Step 4: Handling Edge Cases

### SOL Wrapping/Unwrapping

When swapping to/from native SOL:

```javascript
async function handleSolSwap(fromToken, toToken, amount) {
  const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';
  const isFromSol = fromToken === 'SOL';
  const isToSol = toToken === 'SOL';

  if (isFromSol) {
    // Wrap SOL first
    console.log('Wrapping SOL...');
    fromToken = WRAPPED_SOL;
  }

  if (isToSol) {
    // Will unwrap automatically after swap
    toToken = WRAPPED_SOL;
  }

  // Proceed with swap
  return swapInterface.getBestQuote(fromToken, toToken, amount);
}
```

### Transaction Retry Logic

```javascript
async function swapWithRetry(params, maxRetries = 3) {
  let attempts = 0;
  let lastError;

  while (attempts < maxRetries) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxRetries}...`);

    const result = await swapInterface.executeSwap(params);
    
    if (result.success) {
      return result;
    }

    lastError = result.error;
    
    // Don't retry on certain errors
    if (lastError.includes('Insufficient')) {
      break;
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
  }

  return { success: false, error: lastError };
}
```

## Testing Your Integration

### 1. Devnet Testing

```javascript
// Use devnet connection
import { Connection, clusterApiUrl } from '@solana/web3.js';

const devnetConnection = new Connection(clusterApiUrl('devnet'));
// Test with devnet tokens and pools
```

### 2. Mainnet Testing Checklist

- [ ] Test with small amounts first (< $1)
- [ ] Verify correct token accounts
- [ ] Check slippage settings
- [ ] Monitor price impact
- [ ] Test error handling
- [ ] Verify transaction confirmations

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Transaction too large" | Split into multiple transactions or use simpler routing |
| "Slippage tolerance exceeded" | Increase slippage or try again when market is less volatile |
| "Pool not found" | Check pool address or try different token pair |
| "Insufficient liquidity" | Use smaller amount or find pool with more liquidity |

## Performance Optimization

1. **Cache pool data**: Don't fetch pool info on every quote
2. **Batch RPC calls**: Use `getMultipleAccountsInfo` for multiple accounts
3. **Pre-calculate routes**: Store common swap routes
4. **Use websockets**: Subscribe to pool updates for real-time quotes

## Next Steps

Congratulations! You now have a production-ready swap integration. Consider adding:
- Price charts and history
- Favorite token pairs
- Transaction history
- Advanced order types (limit orders)
- MEV protection

Check out our [Liquidity Tutorial](./tutorial-liquidity.md) to learn about providing liquidity and earning fees!