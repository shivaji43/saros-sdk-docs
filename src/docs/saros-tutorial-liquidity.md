# Liquidity Provision Integration Tutorial

Learn how to add liquidity to Saros pools, manage positions, and earn trading fees. This tutorial covers everything from calculating optimal ratios to handling impermanent loss.

## Understanding Liquidity Provision

When you add liquidity:
1. You deposit two tokens in a specific ratio
2. You receive LP tokens representing your share
3. You earn fees from every trade in that pool
4. You can withdraw anytime by burning LP tokens

## Step 1: Liquidity Manager Setup

Let's build a comprehensive liquidity management system:

```javascript
// liquidityManager.js
import {
  depositAllTokenTypes,
  withdrawAllTokenTypes,
  getPoolInfo,
  getTokenAccountInfo,
  getTokenMintInfo,
  convertBalanceToWei,
  convertWeiToBalance,
  genConnectionSolana,
  createPool
} from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

class LiquidityManager {
  constructor(walletAddress) {
    this.connection = genConnectionSolana();
    this.walletAddress = walletAddress;
    this.SWAP_PROGRAM = new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr');
    this.TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  }

  /**
   * Get pool details and calculate required token ratios
   */
  async getPoolDetails(poolAddress) {
    try {
      const poolInfo = await getPoolInfo(this.connection, poolAddress);
      
      if (!poolInfo) {
        throw new Error('Pool not found');
      }

      // Get token accounts info
      const [token0Info, token1Info] = await Promise.all([
        getTokenAccountInfo(this.connection, poolInfo.token0Account),
        getTokenAccountInfo(this.connection, poolInfo.token1Account)
      ]);

      // Get LP token supply
      const lpMintInfo = await getTokenMintInfo(
        this.connection, 
        poolInfo.lpTokenMint
      );

      // Calculate pool metrics
      const token0Reserve = token0Info.amount.toNumber();
      const token1Reserve = token1Info.amount.toNumber();
      const lpSupply = lpMintInfo.supply.toNumber();
      
      // Calculate token ratio
      const ratio = token1Reserve / token0Reserve;
      
      // Calculate pool share for 1 LP token
      const lpTokenValue = {
        token0: token0Reserve / lpSupply,
        token1: token1Reserve / lpSupply
      };

      return {
        poolAddress,
        token0Mint: poolInfo.token0Mint.toString(),
        token1Mint: poolInfo.token1Mint.toString(),
        token0Reserve,
        token1Reserve,
        lpSupply,
        ratio,
        lpTokenValue,
        poolInfo
      };
    } catch (error) {
      console.error('Failed to get pool details:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal deposit amounts to maintain pool ratio
   */
  calculateOptimalDeposit(token0Amount, poolDetails) {
    const { ratio } = poolDetails;
    
    // Calculate required token1 amount based on pool ratio
    const optimalToken1Amount = token0Amount * ratio;
    
    // Calculate expected LP tokens
    const expectedLpTokens = this.calculateLpTokensOut(
      token0Amount,
      optimalToken1Amount,
      poolDetails
    );

    return {
      token0Amount,
      token1Amount: optimalToken1Amount,
      expectedLpTokens,
      shareOfPool: (expectedLpTokens / (poolDetails.lpSupply + expectedLpTokens)) * 100
    };
  }

  /**
   * Calculate LP tokens received for deposit
   */
  calculateLpTokensOut(token0Amount, token1Amount, poolDetails) {
    const { token0Reserve, token1Reserve, lpSupply } = poolDetails;
    
    if (lpSupply === 0) {
      // First liquidity provider
      return Math.sqrt(token0Amount * token1Amount);
    }
    
    // Calculate based on the limiting token
    const lpFromToken0 = (token0Amount * lpSupply) / token0Reserve;
    const lpFromToken1 = (token1Amount * lpSupply) / token1Reserve;
    
    return Math.min(lpFromToken0, lpFromToken1);
  }

  /**
   * Add liquidity to pool
   */
  async addLiquidity(params) {
    const {
      poolAddress,
      token0Amount,
      token1Amount,
      token0Mint,
      token1Mint,
      token0Account,
      token1Account,
      slippage = 1.0 // Default 1% slippage
    } = params;

    try {
      // Get current pool state
      const poolDetails = await this.getPoolDetails(poolAddress);
      
      // Validate amounts match pool ratio
      const validation = this.validateDepositRatio(
        token0Amount,
        token1Amount,
        poolDetails
      );
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          suggestion: validation.suggestion
        };
      }

      // Calculate LP tokens to receive
      const lpTokenAmount = this.calculateLpTokensOut(
        token0Amount,
        token1Amount,
        poolDetails
      );

      // Convert amounts to proper units
      const token0Wei = convertBalanceToWei(token0Amount, 6); // Assuming 6 decimals
      const token1Wei = convertBalanceToWei(token1Amount, 6);

      // Execute deposit
      const result = await depositAllTokenTypes(
        this.connection,
        this.walletAddress,
        new PublicKey(this.walletAddress),
        new PublicKey(token0Account),
        new PublicKey(token1Account),
        lpTokenAmount,
        poolAddress,
        this.SWAP_PROGRAM,
        token0Mint,
        token1Mint,
        slippage
      );

      if (result.isError) {
        return {
          success: false,
          error: `Failed to add liquidity: ${result.mess}`
        };
      }

      return {
        success: true,
        transactionId: result.hash,
        lpTokensReceived: lpTokenAmount,
        shareOfPool: (lpTokenAmount / (poolDetails.lpSupply + lpTokenAmount)) * 100,
        explorerUrl: `https://solscan.io/tx/${result.hash}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error.message}`
      };
    }
  }

  /**
   * Validate deposit amounts match pool ratio
   */
  validateDepositRatio(token0Amount, token1Amount, poolDetails) {
    const { ratio } = poolDetails;
    const expectedToken1 = token0Amount * ratio;
    const tolerance = 0.01; // 1% tolerance
    
    const difference = Math.abs(token1Amount - expectedToken1) / expectedToken1;
    
    if (difference > tolerance) {
      return {
        isValid: false,
        error: 'Token amounts don\'t match pool ratio',
        suggestion: {
          token0Amount,
          token1Amount: expectedToken1
        }
      };
    }
    
    return { isValid: true };
  }

  /**
   * Remove liquidity from pool
   */
  async removeLiquidity(params) {
    const {
      poolAddress,
      lpTokenAmount,
      userLpTokenAccount,
      token0Account,
      token1Account,
      token0Mint,
      token1Mint,
      slippage = 1.0
    } = params;

    try {
      // Get expected output amounts
      const poolDetails = await this.getPoolDetails(poolAddress);
      const expectedAmounts = this.calculateWithdrawalAmounts(
        lpTokenAmount,
        poolDetails
      );

      // Execute withdrawal
      const result = await withdrawAllTokenTypes(
        this.connection,
        this.walletAddress,
        userLpTokenAccount,
        token0Account,
        token1Account,
        lpTokenAmount,
        poolAddress,
        this.SWAP_PROGRAM,
        token0Mint,
        token1Mint,
        slippage
      );

      if (result.isError) {
        return {
          success: false,
          error: `Failed to remove liquidity: ${result.mess}`
        };
      }

      return {
        success: true,
        transactionId: result.hash,
        receivedAmounts: expectedAmounts,
        explorerUrl: `https://solscan.io/tx/${result.hash}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error.message}`
      };
    }
  }

  /**
   * Calculate tokens received when withdrawing
   */
  calculateWithdrawalAmounts(lpTokenAmount, poolDetails) {
    const { token0Reserve, token1Reserve, lpSupply } = poolDetails;
    
    const shareOfPool = lpTokenAmount / lpSupply;
    
    return {
      token0Amount: token0Reserve * shareOfPool,
      token1Amount: token1Reserve * shareOfPool
    };
  }

  /**
   * Create a new liquidity pool
   */
  async createNewPool(params) {
    const {
      token0Mint,
      token1Mint,
      token0Amount,
      token1Amount,
      token0Account,
      token1Account
    } = params;

    try {
      // Determine curve type (stable pairs use different curve)
      const isStablePair = this.isStablePair(token0Mint, token1Mint);
      const curveType = isStablePair ? 1 : 0;
      const curveParameter = isStablePair ? 1 : 0;

      // Convert amounts to wei
      const token0Wei = convertBalanceToWei(token0Amount, 6);
      const token1Wei = convertBalanceToWei(token1Amount, 6);

      // Create the pool
      const result = await createPool(
        this.connection,
        this.walletAddress,
        new PublicKey('FDbLZ5DRo61queVRH9LL1mQnsiAoubQEnoCRuPEmH9M8'), // Fee owner
        new PublicKey(token0Mint),
        new PublicKey(token1Mint),
        new PublicKey(token0Account),
        new PublicKey(token1Account),
        token0Wei,
        token1Wei,
        curveType,
        new BN(curveParameter),
        this.TOKEN_PROGRAM,
        this.SWAP_PROGRAM
      );

      if (result.isError) {
        return {
          success: false,
          error: `Failed to create pool: ${result.mess}`
        };
      }

      return {
        success: true,
        poolAddress: result.poolAccount.publicKey.toString(),
        transactionId: result.hash,
        explorerUrl: `https://solscan.io/tx/${result.hash}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create pool: ${error.message}`
      };
    }
  }

  /**
   * Check if token pair is stable (USDC/USDT, etc)
   */
  isStablePair(token0, token1) {
    const stablecoins = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  // USDT
    ];
    
    return stablecoins.includes(token0) && stablecoins.includes(token1);
  }
}

export default LiquidityManager;
```

## Step 2: Building the Position Tracker

Track and analyze your liquidity positions:

```javascript
// positionTracker.js
import LiquidityManager from './liquidityManager';
import { getInfoTokenByMint } from '@saros-finance/sdk';

class PositionTracker {
  constructor(walletAddress) {
    this.walletAddress = walletAddress;
    this.liquidityManager = new LiquidityManager(walletAddress);
    this.positions = [];
  }

  /**
   * Track all LP positions for wallet
   */
  async loadPositions() {
    // In production, query from indexer or store locally
    // This is a simplified example
    const lpTokenMints = [
      // Add LP token mints you want to track
    ];

    const positions = [];
    
    for (const lpMint of lpTokenMints) {
      const lpBalance = await getInfoTokenByMint(lpMint, this.walletAddress);
      
      if (lpBalance && lpBalance.amount > 0) {
        positions.push({
          lpMint,
          balance: lpBalance.amount,
          poolAddress: await this.getPoolForLpToken(lpMint)
        });
      }
    }

    this.positions = positions;
    return positions;
  }

  /**
   * Calculate current value of position
   */
  async getPositionValue(position) {
    const poolDetails = await this.liquidityManager.getPoolDetails(
      position.poolAddress
    );

    const withdrawAmounts = this.liquidityManager.calculateWithdrawalAmounts(
      position.balance,
      poolDetails
    );

    // Get token prices (in production, use price oracle)
    const token0Price = await this.getTokenPrice(poolDetails.token0Mint);
    const token1Price = await this.getTokenPrice(poolDetails.token1Mint);

    const totalValue = 
      (withdrawAmounts.token0Amount * token0Price) +
      (withdrawAmounts.token1Amount * token1Price);

    return {
      position: position.lpMint,
      tokens: withdrawAmounts,
      valueUSD: totalValue,
      shareOfPool: (position.balance / poolDetails.lpSupply) * 100
    };
  }

  /**
   * Calculate impermanent loss
   */
  calculateImpermanentLoss(initialRatio, currentRatio) {
    const ratioChange = currentRatio / initialRatio;
    const impermanentLoss = 
      2 * Math.sqrt(ratioChange) / (1 + ratioChange) - 1;
    
    return impermanentLoss * 100; // Return as percentage
  }

  /**
   * Calculate fees earned
   */
  async calculateFeesEarned(position, startTime) {
    // This would require historical data
    // Simplified calculation based on volume and fee rate
    const poolDetails = await this.liquidityManager.getPoolDetails(
      position.poolAddress
    );
    
    const dailyVolume = 100000; // Example: $100k daily volume
    const feeRate = 0.003; // 0.3% fee
    const poolShare = position.balance / poolDetails.lpSupply;
    
    const daysHeld = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
    const totalFees = dailyVolume * feeRate * poolShare * daysHeld;
    
    return totalFees;
  }

  // Helper methods
  async getPoolForLpToken(lpMint) {
    // Implementation to find pool address from LP token
    // This would query from your indexer or API
    return 'POOL_ADDRESS';
  }

  async getTokenPrice(tokenMint) {
    // Get token price from oracle or API
    // Simplified example
    const prices = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.00, // USDC
      'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9': 0.50  // C98
    };
    return prices[tokenMint] || 0;
  }
}
```

## Step 3: Complete Working Example

Here's everything working together:

```javascript
// liquidityExample.js
import LiquidityManager from './liquidityManager';
import PositionTracker from './positionTracker';

async function addLiquidityExample() {
  const walletAddress = 'YOUR_WALLET_ADDRESS';
  const liquidityManager = new LiquidityManager(walletAddress);
  
  // Pool and token configuration
  const POOL_ADDRESS = '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty';
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const C98_MINT = 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9';
  
  try {
    // Step 1: Get pool details
    console.log('Fetching pool information...');
    const poolDetails = await liquidityManager.getPoolDetails(
      new PublicKey(POOL_ADDRESS)
    );
    
    console.log('Pool Details:');
    console.log(`Token Ratio: 1 USDC = ${poolDetails.ratio} C98`);
    console.log(`Total Liquidity: $${poolDetails.token0Reserve + poolDetails.token1Reserve}`);
    console.log(`Your share would be: ${poolDetails.shareOfPool}%`);
    
    // Step 2: Calculate optimal amounts
    const usdcAmount = 100; // Want to add 100 USDC
    const optimal = liquidityManager.calculateOptimalDeposit(
      usdcAmount,
      poolDetails
    );
    
    console.log('\nOptimal Deposit Amounts:');
    console.log(`USDC: ${optimal.token0Amount}`);
    console.log(`C98: ${optimal.token1Amount}`);
    console.log(`Expected LP Tokens: ${optimal.expectedLpTokens}`);
    console.log(`Pool Share: ${optimal.shareOfPool}%`);
    
    // Step 3: Check balances
    console.log('\nChecking wallet balances...');
    // Add balance checking logic here
    
    // Step 4: Add liquidity
    console.log('\nAdding liquidity...');
    const result = await liquidityManager.addLiquidity({
      poolAddress: new PublicKey(POOL_ADDRESS),
      token0Amount: optimal.token0Amount,
      token1Amount: optimal.token1Amount,
      token0Mint: USDC_MINT,
      token1Mint: C98_MINT,
      token0Account: 'USER_USDC_ACCOUNT',
      token1Account: 'USER_C98_ACCOUNT',
      slippage: 1.0
    });
    
    if (result.success) {
      console.log('✅ Liquidity added successfully!');
      console.log(`Transaction: ${result.explorerUrl}`);
      console.log(`LP Tokens received: ${result.lpTokensReceived}`);
      console.log(`Your pool share: ${result.shareOfPool}%`);
    } else {
      console.error('❌ Failed to add liquidity:', result.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function trackPositionsExample() {
  const walletAddress = 'YOUR_WALLET_ADDRESS';
  const tracker = new PositionTracker(walletAddress);
  
  try {
    // Load all positions
    console.log('Loading LP positions...');
    const positions = await tracker.loadPositions();
    
    if (positions.length === 0) {
      console.log('No LP positions found');
      return;
    }
    
    // Analyze each position
    for (const position of positions) {
      console.log('\n📊 Position Analysis:');
      
      const value = await tracker.getPositionValue(position);
      console.log(`Pool: ${position.poolAddress}`);
      console.log(`LP Balance: ${position.balance}`);
      console.log(`Value: $${value.valueUSD.toFixed(2)}`);
      console.log(`Pool Share: ${value.shareOfPool.toFixed(4)}%`);
      
      // Calculate fees earned (example: position opened 30 days ago)
      const startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const fees = await tracker.calculateFeesEarned(position, startTime);
      console.log(`Estimated fees earned: $${fees.toFixed(2)}`);
      
      // Calculate IL if we have historical data
      const il = tracker.calculateImpermanentLoss(1.0, 1.2); // Example ratio change
      console.log(`Impermanent Loss: ${il.toFixed(2)}%`);
    }
    
  } catch (error) {
    console.error('Error tracking positions:', error);
  }
}

// Run examples
addLiquidityExample().catch(console.error);
// trackPositionsExample().catch(console.error);
```

## Step 4: Advanced Features

### Zap-In Functionality (Single Token to LP)

```javascript
async function zapIn(tokenMint, amount, poolAddress) {
  // 1. Swap half of token to the other pool token
  const poolDetails = await liquidityManager.getPoolDetails(poolAddress);
  const halfAmount = amount / 2;
  
  // 2. Get the other token
  const otherToken = poolDetails.token0Mint === tokenMint 
    ? poolDetails.token1Mint 
    : poolDetails.token0Mint;
  
  // 3. Swap half to other token
  const swapResult = await swapInterface.executeSwap({
    fromMint: tokenMint,
    toMint: otherToken,
    amount: halfAmount
  });
  
  // 4. Add liquidity with both tokens
  const liquidityResult = await liquidityManager.addLiquidity({
    poolAddress,
    token0Amount: halfAmount,
    token1Amount: swapResult.outputAmount,
    // ... other params
  });
  
  return liquidityResult;
}
```

### Auto-Compound Rewards

```javascript
class AutoCompounder {
  async compoundPosition(position, farmAddress) {
    // 1. Claim farming rewards
    const rewards = await claimFarmingRewards(position, farmAddress);
    
    // 2. Swap rewards to pool tokens
    const token0Amount = await swapToPoolToken(rewards, poolToken0);
    const token1Amount = await swapToPoolToken(rewards, poolToken1);
    
    // 3. Add liquidity with rewards
    const result = await liquidityManager.addLiquidity({
      token0Amount,
      token1Amount,
      // ... other params
    });
    
    // 4. Stake new LP tokens
    await stakeLpTokens(result.lpTokensReceived, farmAddress);
    
    return result;
  }
}
```

## Testing Your Integration

### Test Scenarios

1. **Add liquidity with exact ratio** ✓
2. **Add liquidity with imbalanced amounts** (should get warning)
3. **Remove partial liquidity** ✓
4. **Remove all liquidity** ✓
5. **Create new pool** ✓
6. **Handle insufficient balance errors** ✓
7. **Test with high slippage scenarios** ✓

### Monitoring Checklist

- [ ] Track LP token balance changes
- [ ] Monitor pool ratio changes
- [ ] Calculate and display IL regularly
- [ ] Track fee earnings
- [ ] Alert on large price divergences

## Best Practices

1. **Always show impermanent loss risk** to users
2. **Calculate and display fees earned** to offset IL
3. **Use appropriate slippage** (1% for stable, 2-5% for volatile)
4. **Warn about ratio imbalances** before adding liquidity
5. **Show pool analytics** (volume, TVL, APR)

## Common Issues

| Problem | Solution |
|---------|----------|
| "Insufficient X for transaction" | Ensure both tokens available in correct ratio |
| "Slippage exceeded" | Increase slippage or wait for less volatility |
| "Pool ratio changed" | Recalculate amounts with current ratio |
| "LP token not found" | Ensure correct LP token account initialized |

## Next Steps

You're now equipped to build sophisticated liquidity interfaces! Consider adding:
- IL protection strategies
- Concentrated liquidity ranges
- Multi-pool strategies
- Yield optimization

Ready to maximize returns? Check out our [Yield Farming Tutorial](./tutorial-farming.md)!