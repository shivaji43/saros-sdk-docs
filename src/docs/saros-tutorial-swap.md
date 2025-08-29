# Token Swap Integration Tutorial

This tutorial walks you through building a complete token swap interface using the Saros SDK. By the end, you'll have a production-ready swap implementation with price quotes, slippage protection, and multi-hop routing.

---

## What We're Building

A swap module that:

- Gets real-time price quotes
- Handles direct and routed swaps
- Manages slippage and price impact
- Provides user-friendly error messages
- Supports SOL wrapping/unwrapping

---

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
  constructor(connection, walletAddress) {
    this.connection = connection || genConnectionSolana();
    this.walletAddress = walletAddress;
    this.supportedPools = new Map();
    this.tokenCache = new Map();
  }

  // Initialize pools and token information
  async initialize() {
    try {
      await this.loadSupportedPools();
      await this.loadTokenInfo();
      console.log('Swap service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize swap service:', error);
      return false;
    }
  }

  async loadSupportedPools() {
    // Load popular pools
    this.supportedPools.set('USDC-C98', {
      address: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
      tokenA: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      tokenB: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9', // C98
      fee: 0.003, // 0.3%
      active: true
    });

    this.supportedPools.set('SOL-USDC', {
      address: '8k7F9Xb36oFJsjpCKpsXvg4cgBRoZtwNTc3EzG5Ttd2o',
      tokenA: 'So11111111111111111111111111111111111111112', // SOL
      tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      fee: 0.003,
      active: true
    });
  }

  async loadTokenInfo() {
    const commonTokens = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9', // C98
      'So11111111111111111111111111111111111111112'  // SOL
    ];

    for (const mint of commonTokens) {
      try {
        const info = await getInfoTokenByMint(this.connection, mint);
        this.tokenCache.set(mint, info);
      } catch (error) {
        console.warn(`Failed to load token info for ${mint}:`, error);
      }
    }
  }
}

export default SarosSwapService;
```

---

## Step 2: Price Quote System

Add comprehensive price quoting functionality:

```javascript
// Add to SarosSwapService class

async getSwapQuote(fromMint, toMint, amount, slippageTolerance = 0.5) {
  try {
    // Validate inputs
    if (!fromMint || !toMint || !amount || amount <= 0) {
      throw new Error('Invalid swap parameters');
    }

    // Find direct pool
    const directPool = this.findDirectPool(fromMint, toMint);
    
    if (directPool) {
      return await this.getDirectSwapQuote(fromMint, toMint, amount, slippageTolerance, directPool);
    }

    // Try routed swap through USDC
    return await this.getRoutedSwapQuote(fromMint, toMint, amount, slippageTolerance);
    
  } catch (error) {
    console.error('Error getting swap quote:', error);
    return {
      success: false,
      error: error.message,
      fromAmount: amount,
      fromMint,
      toMint
    };
  }
}

async getDirectSwapQuote(fromMint, toMint, amount, slippageTolerance, pool) {
  const fromToken = this.tokenCache.get(fromMint);
  const toToken = this.tokenCache.get(toMint);
  
  if (!fromToken || !toToken) {
    throw new Error('Token information not available');
  }

  // Convert amount to token decimals
  const amountInWei = convertBalanceToWei(amount, fromToken.decimals);

  // Get quote from Saros
  const quote = await getSwapAmountSaros(
    this.connection,
    fromMint,
    toMint,
    amountInWei,
    slippageTolerance,
    {
      poolAddress: pool.address,
      fee: pool.fee
    }
  );

  // Calculate price impact
  const priceImpact = this.calculatePriceImpact(amount, quote.amountOut, pool);

  return {
    success: true,
    route: 'direct',
    pool: pool.address,
    fromAmount: amount,
    toAmount: convertWeiToBalance(quote.amountOut, toToken.decimals),
    toAmountMin: convertWeiToBalance(quote.amountOutWithSlippage, toToken.decimals),
    priceImpact,
    fee: pool.fee,
    slippage: slippageTolerance,
    quote
  };
}

async getRoutedSwapQuote(fromMint, toMint, amount, slippageTolerance) {
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  
  // Route: fromToken -> USDC -> toToken
  const step1Pool = this.findDirectPool(fromMint, USDC_MINT);
  const step2Pool = this.findDirectPool(USDC_MINT, toMint);

  if (!step1Pool || !step2Pool) {
    throw new Error('No routing path available');
  }

  // Get quote for first hop
  const quote1 = await this.getDirectSwapQuote(fromMint, USDC_MINT, amount, slippageTolerance, step1Pool);
  
  if (!quote1.success) {
    throw new Error('Failed to get quote for first hop');
  }

  // Get quote for second hop
  const quote2 = await this.getDirectSwapQuote(USDC_MINT, toMint, quote1.toAmount, slippageTolerance, step2Pool);
  
  if (!quote2.success) {
    throw new Error('Failed to get quote for second hop');
  }

  return {
    success: true,
    route: 'routed',
    hops: [step1Pool.address, step2Pool.address],
    fromAmount: amount,
    toAmount: quote2.toAmount,
    toAmountMin: quote2.toAmountMin,
    priceImpact: quote1.priceImpact + quote2.priceImpact,
    fee: step1Pool.fee + step2Pool.fee,
    slippage: slippageTolerance,
    quotes: [quote1, quote2]
  };
}

findDirectPool(tokenA, tokenB) {
  for (const [name, pool] of this.supportedPools) {
    if ((pool.tokenA === tokenA && pool.tokenB === tokenB) ||
        (pool.tokenA === tokenB && pool.tokenB === tokenA)) {
      return pool;
    }
  }
  return null;
}

calculatePriceImpact(amountIn, amountOut, pool) {
  // Simplified price impact calculation
  // In production, you'd want more sophisticated calculation
  const tradeSize = amountIn;
  
  if (tradeSize < 1000) return 0.1;
  if (tradeSize < 10000) return 0.3;
  if (tradeSize < 100000) return 0.8;
  return 1.5; // High impact for large trades
}
```

---

## Step 3: Executing Swaps

Implement the swap execution logic:

```javascript
// Add to SarosSwapService class

async executeSwap(quote, userAccounts) {
  try {
    // Validate quote and accounts
    this.validateSwapInputs(quote, userAccounts);

    if (quote.route === 'direct') {
      return await this.executeDirectSwap(quote, userAccounts);
    } else if (quote.route === 'routed') {
      return await this.executeRoutedSwap(quote, userAccounts);
    }

    throw new Error('Invalid swap route');

  } catch (error) {
    console.error('Swap execution failed:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}

async executeDirectSwap(quote, userAccounts) {
  const { fromAccount, toAccount } = userAccounts;
  
  const result = await swapSaros(
    this.connection,
    fromAccount,
    toAccount,
    quote.quote.amountIn,
    quote.quote.amountOutWithSlippage,
    null, // Additional parameters
    new PublicKey(quote.pool),
    'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr', // Program ID
    this.walletAddress,
    quote.fromMint || quote.quote.fromMint,
    quote.toMint || quote.quote.toMint
  );

  if (result.isError) {
    throw new Error(`Swap failed: ${result.mess || result.message}`);
  }

  return {
    success: true,
    signature: result.hash,
    route: 'direct',
    fromAmount: quote.fromAmount,
    toAmount: quote.toAmount,
    actualToAmount: await this.getActualReceived(result.hash, quote.toMint)
  };
}

async executeRoutedSwap(quote, userAccounts) {
  // For routed swaps, we need to execute two transactions
  const { fromAccount, intermediateAccount, toAccount } = userAccounts;
  
  try {
    // Execute first hop
    const hop1Result = await this.executeDirectSwap(quote.quotes[0], {
      fromAccount,
      toAccount: intermediateAccount
    });

    if (!hop1Result.success) {
      throw new Error('First hop failed');
    }

    // Wait for first transaction to be confirmed
    await this.waitForConfirmation(hop1Result.signature);

    // Execute second hop
    const hop2Result = await this.executeDirectSwap(quote.quotes[1], {
      fromAccount: intermediateAccount,
      toAccount
    });

    if (!hop2Result.success) {
      throw new Error('Second hop failed');
    }

    return {
      success: true,
      signatures: [hop1Result.signature, hop2Result.signature],
      route: 'routed',
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      actualToAmount: hop2Result.actualToAmount
    };

  } catch (error) {
    // If second hop fails, user has intermediate tokens
    console.error('Routed swap partially failed:', error);
    throw error;
  }
}

validateSwapInputs(quote, userAccounts) {
  if (!quote || !quote.success) {
    throw new Error('Invalid quote');
  }

  if (!userAccounts || !userAccounts.fromAccount || !userAccounts.toAccount) {
    throw new Error('Missing user accounts');
  }

  if (quote.route === 'routed' && !userAccounts.intermediateAccount) {
    throw new Error('Intermediate account required for routed swaps');
  }
}

async waitForConfirmation(signature, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      if (status.value && status.value.confirmationStatus === 'confirmed') {
        return true;
      }
    } catch (error) {
      console.warn('Error checking transaction status:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  }
  
  throw new Error('Transaction confirmation timeout');
}

async getActualReceived(signature, tokenMint) {
  // Parse transaction logs to get actual amount received
  // This is a simplified version - in production you'd parse logs more carefully
  try {
    const transaction = await this.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
    
    // Extract actual amount from transaction data
    // Implementation depends on your specific needs
    return null;
  } catch (error) {
    console.warn('Could not get actual received amount:', error);
    return null;
  }
}
```

---

## Step 4: Error Handling & Recovery

Add comprehensive error handling:

```javascript
// Add to SarosSwapService class

handleSwapError(error, quote) {
  const errorMappings = {
    'gasSolNotEnough': {
      userMessage: 'Insufficient SOL for transaction fees',
      suggestedAction: 'Add more SOL to your wallet',
      canRetry: true
    },
    'exceedsLimit': {
      userMessage: 'Swap amount too large for pool liquidity',
      suggestedAction: 'Try a smaller amount or different route',
      canRetry: true
    },
    'sizeTooSmall': {
      userMessage: 'Swap amount too small',
      suggestedAction: 'Increase the swap amount',
      canRetry: true
    },
    'slippageExceeded': {
      userMessage: 'Price moved beyond acceptable range',
      suggestedAction: 'Increase slippage tolerance or try again',
      canRetry: true
    },
    'poolNotFound': {
      userMessage: 'Trading pair not available',
      suggestedAction: 'Try a different token pair',
      canRetry: false
    },
    'insufficientBalance': {
      userMessage: 'Insufficient token balance',
      suggestedAction: 'Check your wallet balance',
      canRetry: false
    }
  };

  const errorKey = this.categorizeError(error);
  const errorInfo = errorMappings[errorKey] || {
    userMessage: 'An unexpected error occurred',
    suggestedAction: 'Please try again later',
    canRetry: true
  };

  return {
    ...errorInfo,
    originalError: error.message,
    quote,
    timestamp: new Date().toISOString()
  };
}

categorizeError(error) {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('insufficient') && message.includes('sol')) return 'gasSolNotEnough';
  if (message.includes('exceeds') || message.includes('limit')) return 'exceedsLimit';
  if (message.includes('too small') || message.includes('minimum')) return 'sizeTooSmall';
  if (message.includes('slippage')) return 'slippageExceeded';
  if (message.includes('pool') && message.includes('not found')) return 'poolNotFound';
  if (message.includes('insufficient') && message.includes('balance')) return 'insufficientBalance';
  
  return 'unknown';
}

async retrySwap(quote, userAccounts, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Swap attempt ${attempt} of ${maxRetries}`);
      
      // Get fresh quote for retry
      const freshQuote = await this.getSwapQuote(
        quote.fromMint,
        quote.toMint,
        quote.fromAmount,
        quote.slippage
      );

      if (!freshQuote.success) {
        throw new Error('Failed to get fresh quote');
      }

      // Execute with fresh quote
      const result = await this.executeSwap(freshQuote, userAccounts);
      
      if (result.success) {
        console.log(`Swap succeeded on attempt ${attempt}`);
        return result;
      }

    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      const errorInfo = this.handleSwapError(error, quote);
      
      if (!errorInfo.canRetry || attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Step 5: Usage Examples

Here's how to use the complete swap service:

### Basic Swap

```javascript
import SarosSwapService from './swapService.js';

async function performBasicSwap() {
  const swapService = new SarosSwapService(connection, walletAddress);
  
  // Initialize the service
  await swapService.initialize();

  // Get a quote
  const quote = await swapService.getSwapQuote(
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9', // C98
    100, // 100 USDC
    0.5  // 0.5% slippage
  );

  if (!quote.success) {
    console.error('Quote failed:', quote.error);
    return;
  }

  console.log(`Quote: ${quote.fromAmount} USDC → ${quote.toAmount} C98`);
  console.log(`Price impact: ${quote.priceImpact}%`);
  console.log(`Route: ${quote.route}`);

  // Execute the swap
  const userAccounts = {
    fromAccount: 'USER_USDC_ACCOUNT',
    toAccount: 'USER_C98_ACCOUNT'
  };

  const result = await swapService.executeSwap(quote, userAccounts);

  if (result.success) {
    console.log('Swap successful!');
    console.log(`Transaction: ${result.signature}`);
    console.log(`Received: ${result.actualToAmount || result.toAmount} C98`);
  } else {
    console.error('Swap failed:', result.error);
  }
}
```

### Swap with Error Handling

```javascript
async function performSwapWithErrorHandling() {
  const swapService = new SarosSwapService(connection, walletAddress);
  await swapService.initialize();

  try {
    const quote = await swapService.getSwapQuote(
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      1.5, // 1.5 SOL
      1.0  // 1% slippage
    );

    if (!quote.success) {
      throw new Error(quote.error);
    }

    const userAccounts = {
      fromAccount: 'USER_SOL_ACCOUNT',
      toAccount: 'USER_USDC_ACCOUNT'
    };

    // Try swap with automatic retry
    const result = await swapService.retrySwap(quote, userAccounts);
    
    console.log('Swap completed successfully!');
    return result;

  } catch (error) {
    const errorInfo = swapService.handleSwapError(error, quote);
    
    console.error('Swap Error:', errorInfo.userMessage);
    console.error('Suggested Action:', errorInfo.suggestedAction);
    
    if (errorInfo.canRetry) {
      console.log('You can try again with different parameters');
    }
    
    throw error;
  }
}
```

### Price Monitoring

```javascript
async function monitorPrice(fromMint, toMint, amount) {
  const swapService = new SarosSwapService();
  await swapService.initialize();

  console.log(`Monitoring price for ${amount} tokens...`);

  setInterval(async () => {
    try {
      const quote = await swapService.getSwapQuote(fromMint, toMint, amount, 0.5);
      
      if (quote.success) {
        const rate = quote.toAmount / quote.fromAmount;
        console.log(`Current rate: 1 → ${rate.toFixed(6)} (Impact: ${quote.priceImpact}%)`);
      }
    } catch (error) {
      console.error('Price check failed:', error.message);
    }
  }, 10000); // Check every 10 seconds
}
```

---

## Advanced Features

### Dynamic Slippage Calculation

```javascript
function calculateOptimalSlippage(tokenPair, amount, volatility) {
  let baseSlippage = 0.5; // 0.5%
  
  // Adjust for token volatility
  if (volatility > 0.1) baseSlippage += 0.5; // High volatility
  if (volatility > 0.2) baseSlippage += 1.0; // Very high volatility
  
  // Adjust for trade size
  if (amount > 10000) baseSlippage += 0.3; // Large trade
  if (amount > 100000) baseSlippage += 0.7; // Very large trade
  
  // Adjust for token pair
  if (tokenPair.includes('meme') || tokenPair.includes('new')) {
    baseSlippage += 1.0; // New or meme tokens
  }
  
  return Math.min(baseSlippage, 5.0); // Cap at 5%
}
```

### MEV Protection

```javascript
async function executeSwapWithMEVProtection(quote, userAccounts) {
  // Add random delay to avoid predictable timing
  const randomDelay = Math.random() * 2000; // 0-2 seconds
  await new Promise(resolve => setTimeout(resolve, randomDelay));
  
  // Use higher slippage for MEV protection
  const protectedQuote = {
    ...quote,
    slippage: Math.max(quote.slippage, 1.0) // Minimum 1% slippage
  };
  
  return await swapService.executeSwap(protectedQuote, userAccounts);
}
```

---

## Testing & Validation

### Unit Tests Example

```javascript
// Test swap quote calculation
describe('Swap Service', () => {
  let swapService;
  
  beforeEach(async () => {
    swapService = new SarosSwapService(mockConnection, mockWallet);
    await swapService.initialize();
  });

  test('should get direct swap quote', async () => {
    const quote = await swapService.getSwapQuote(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9', // C98
      100,
      0.5
    );

    expect(quote.success).toBe(true);
    expect(quote.route).toBe('direct');
    expect(quote.toAmount).toBeGreaterThan(0);
    expect(quote.priceImpact).toBeLessThan(2.0);
  });

  test('should handle invalid inputs', async () => {
    const quote = await swapService.getSwapQuote('invalid', 'invalid', -1, 0.5);
    
    expect(quote.success).toBe(false);
    expect(quote.error).toBeDefined();
  });
});
```

---

## Production Deployment

### Configuration

```javascript
// config/production.js
export const PRODUCTION_CONFIG = {
  RPC_ENDPOINT: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  MAX_SLIPPAGE: 5.0,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000,
  
  MONITORING: {
    enablePriceAlerts: true,
    enableErrorTracking: true,
    logLevel: 'info'
  },
  
  POOLS: {
    refreshInterval: 300000, // 5 minutes
    maxAge: 600000 // 10 minutes
  }
};
```

### Monitoring

```javascript
class SwapMonitor {
  constructor(swapService) {
    this.swapService = swapService;
    this.metrics = {
      totalSwaps: 0,
      successfulSwaps: 0,
      failedSwaps: 0,
      totalVolume: 0
    };
  }

  trackSwap(quote, result) {
    this.metrics.totalSwaps++;
    
    if (result.success) {
      this.metrics.successfulSwaps++;
      this.metrics.totalVolume += quote.fromAmount;
    } else {
      this.metrics.failedSwaps++;
      this.reportError(result.error, quote);
    }
    
    this.logMetrics();
  }

  reportError(error, quote) {
    console.error('Swap Error Tracked:', {
      error: error.message,
      quote,
      timestamp: new Date().toISOString(),
      successRate: this.getSuccessRate()
    });
  }

  getSuccessRate() {
    if (this.metrics.totalSwaps === 0) return 0;
    return (this.metrics.successfulSwaps / this.metrics.totalSwaps * 100).toFixed(2);
  }

  logMetrics() {
    if (this.metrics.totalSwaps % 10 === 0) { // Log every 10 swaps
      console.log('Swap Metrics:', {
        ...this.metrics,
        successRate: this.getSuccessRate() + '%'
      });
    }
  }
}
```

---

## Best Practices Summary

1. **Always validate inputs** before making SDK calls
2. **Implement proper error handling** with user-friendly messages
3. **Use appropriate slippage** based on token volatility and trade size
4. **Cache token information** to reduce RPC calls
5. **Monitor transaction status** and provide feedback to users
6. **Test thoroughly** on devnet before mainnet deployment
7. **Implement retry logic** for transient failures
8. **Add monitoring and logging** for production systems
9. **Consider MEV protection** for large trades
10. **Keep the SDK updated** to latest version

---

## Next Steps

- **Advanced Features**: Explore [Liquidity Tutorial](./tutorial-liquidity.md)
- **Yield Farming**: Learn [Farming Tutorial](./tutorial-farming.md)
- **API Reference**: Check [Complete API Docs](./api-reference.md)
- **Examples**: Browse [Working Code Examples](./code-examples.md)

---

**Ready to go live?** Test your implementation thoroughly and deploy with confidence! 🚀