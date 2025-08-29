# Yield Farming Integration Tutorial

Master yield farming on Saros - from basic staking to advanced auto-compounding strategies. This tutorial covers everything you need to maximize your DeFi returns.

## Understanding Yield Farming on Saros

Yield farming lets you earn rewards by:
1. Providing liquidity to get LP tokens
2. Staking those LP tokens in farms
3. Earning reward tokens over time
4. Compounding rewards for maximum APY

## Step 1: Complete Farming Integration

Build a comprehensive farming system:

```javascript
// FarmingIntegration.js
import {
  SarosFarmService,
  SarosStakeServices,
  getPoolInfo,
  convertBalanceToWei,
  convertWeiToBalance,
  genConnectionSolana,
  getInfoTokenByMint
} from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

class FarmingIntegration {
  constructor(walletAddress) {
    this.connection = genConnectionSolana();
    this.wallet = walletAddress;
    this.payerAccount = {
      publicKey: new PublicKey(walletAddress)
    };
    this.FARM_PROGRAM = new PublicKey('SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ');
    this.activeFarms = new Map();
  }

  /**
   * Get all available farms with current metrics
   */
  async getAvailableFarms(page = 1, size = 20) {
    try {
      console.log('Fetching available farms...');
      
      // Get farm list
      const farms = await SarosFarmService.getListPool({ page, size });
      
      // Sort by APR
      farms.sort((a, b) => b.apr - a.apr);
      
      // Enhance with additional data
      const enhancedFarms = await Promise.all(
        farms.map(async (farm) => {
          const enhanced = { ...farm };
          
          // Calculate daily/weekly/monthly returns
          enhanced.dailyReturn = farm.apr / 365;
          enhanced.weeklyReturn = farm.apr / 52;
          enhanced.monthlyReturn = farm.apr / 12;
          
          // Check if user has position
          enhanced.userPosition = await this.getUserPosition(farm);
          
          // Risk assessment
          enhanced.riskLevel = this.assessRisk(farm);
          
          return enhanced;
        })
      );
      
      return enhancedFarms;
    } catch (error) {
      console.error('Failed to fetch farms:', error);
      return [];
    }
  }

  /**
   * Start farming with detailed configuration
   */
  async startFarming(farmConfig) {
    const {
      poolAddress,
      lpTokenMint,
      amount,
      rewards,
      autoCompound = false,
      compoundInterval = 24 // hours
    } = farmConfig;

    try {
      // Validate LP token balance
      const lpBalance = await this.getLpTokenBalance(lpTokenMint);
      
      if (lpBalance < amount) {
        return {
          success: false,
          error: `Insufficient LP tokens. Have: ${lpBalance}, Need: ${amount}`
        };
      }

      console.log(`Starting farm with ${amount} LP tokens...`);
      
      // Convert amount to BN
      const amountBN = new BN(convertBalanceToWei(amount, 6));
      
      // Execute staking
      const txHash = await SarosFarmService.stakePool(
        this.connection,
        this.payerAccount,
        new PublicKey(poolAddress),
        amountBN,
        this.FARM_PROGRAM,
        rewards,
        new PublicKey(lpTokenMint)
      );

      if (txHash.includes('error')) {
        return {
          success: false,
          error: txHash
        };
      }

      // Track farm position
      const farmId = `${poolAddress}-${Date.now()}`;
      const farmPosition = {
        id: farmId,
        poolAddress,
        lpTokenMint,
        amount,
        rewards,
        startTime: Date.now(),
        txHash,
        autoCompound,
        compoundInterval,
        lastCompound: Date.now(),
        totalClaimed: 0,
        totalCompounded: 0
      };

      this.activeFarms.set(farmId, farmPosition);

      // Set up auto-compound if enabled
      if (autoCompound) {
        this.setupAutoCompound(farmId);
      }

      return {
        success: true,
        farmId,
        transactionId: txHash,
        position: farmPosition,
        explorerUrl: `https://solscan.io/tx/${txHash}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to start farming: ${error.message}`
      };
    }
  }

  /**
   * Calculate optimal staking amount based on pool metrics
   */
  async calculateOptimalStake(farm) {
    const { liquidityUsd, apr, rewards } = farm;
    
    // Calculate pool saturation
    const poolSaturation = await this.getPoolSaturation(farm);
    
    // Optimal stake should not significantly impact APR
    const maxImpact = 0.05; // 5% APR impact tolerance
    const currentRewardRate = rewards[0].rewardPerBlock;
    
    // Calculate stake that maintains APR
    const optimalStake = liquidityUsd * maxImpact;
    
    // Calculate expected returns
    const expectedDailyReturn = (optimalStake * apr / 100) / 365;
    const expectedMonthlyReturn = expectedDailyReturn * 30;
    
    return {
      optimalAmount: optimalStake,
      currentAPR: apr,
      projectedAPR: apr * (1 - maxImpact),
      expectedDaily: expectedDailyReturn,
      expectedMonthly: expectedMonthlyReturn,
      poolSaturation: `${poolSaturation.toFixed(1)}%`
    };
  }

  /**
   * Claim rewards from specific farm
   */
  async claimRewards(farmId) {
    const farm = this.activeFarms.get(farmId);
    
    if (!farm) {
      return {
        success: false,
        error: 'Farm position not found'
      };
    }

    const claimedRewards = [];
    
    for (const reward of farm.rewards) {
      try {
        console.log(`Claiming ${reward.address} rewards...`);
        
        const txHash = await SarosFarmService.claimReward(
          this.connection,
          this.payerAccount,
          new PublicKey(reward.poolRewardAddress),
          this.FARM_PROGRAM,
          new PublicKey(reward.address)
        );

        if (!txHash.includes('error')) {
          claimedRewards.push({
            token: reward.address,
            txHash,
            timestamp: Date.now()
          });
          
          // Update farm stats
          farm.totalClaimed++;
        }
        
      } catch (error) {
        console.error(`Failed to claim ${reward.address}:`, error);
      }
    }

    return {
      success: claimedRewards.length > 0,
      claimed: claimedRewards,
      totalClaimed: farm.totalClaimed
    };
  }

  /**
   * Set up auto-compound for a farm
   */
  setupAutoCompound(farmId) {
    const farm = this.activeFarms.get(farmId);
    
    if (!farm || !farm.autoCompound) return;
    
    console.log(`Setting up auto-compound for farm ${farmId}`);
    
    const compound = async () => {
      const now = Date.now();
      const timeSinceLastCompound = now - farm.lastCompound;
      const intervalMs = farm.compoundInterval * 60 * 60 * 1000;
      
      if (timeSinceLastCompound >= intervalMs) {
        console.log(`Auto-compounding farm ${farmId}...`);
        
        const result = await this.compoundFarm(farmId);
        
        if (result.success) {
          farm.lastCompound = now;
          farm.totalCompounded += result.amountCompounded;
          console.log(`✅ Compounded ${result.amountCompounded} tokens`);
        }
      }
    };

    // Check every hour
    setInterval(compound, 60 * 60 * 1000);
    
    // Initial compound check
    compound();
  }

  /**
   * Compound rewards back into farm
   */
  async compoundFarm(farmId) {
    const farm = this.activeFarms.get(farmId);
    
    if (!farm) {
      return { success: false, error: 'Farm not found' };
    }

    try {
      // Step 1: Claim rewards
      const claimResult = await this.claimRewards(farmId);
      
      if (!claimResult.success) {
        return { success: false, error: 'No rewards to compound' };
      }

      // Step 2: Convert rewards to LP tokens
      // This is simplified - in production, implement full conversion
      const lpTokensFromRewards = await this.convertRewardsToLp(
        claimResult.claimed,
        farm
      );

      // Step 3: Stake new LP tokens
      if (lpTokensFromRewards > 0) {
        const stakeResult = await this.startFarming({
          ...farm,
          amount: lpTokensFromRewards
        });

        return {
          success: true,
          amountCompounded: lpTokensFromRewards,
          newPosition: stakeResult.farmId
        };
      }

      return { success: false, error: 'No LP tokens to compound' };

    } catch (error) {
      return {
        success: false,
        error: `Compound failed: ${error.message}`
      };
    }
  }

  /**
   * Exit farm position
   */
  async exitFarm(farmId, claimRewards = true) {
    const farm = this.activeFarms.get(farmId);
    
    if (!farm) {
      return { success: false, error: 'Farm not found' };
    }

    try {
      console.log('Exiting farm position...');
      
      // Claim pending rewards first
      if (claimRewards) {
        await this.claimRewards(farmId);
      }

      // Unstake LP tokens
      const amountBN = new BN(convertBalanceToWei(farm.amount, 6));
      
      const txHash = await SarosFarmService.unstakePool(
        this.connection,
        this.payerAccount,
        new PublicKey(farm.poolAddress),
        new PublicKey(farm.lpTokenMint),
        amountBN,
        this.FARM_PROGRAM,
        farm.rewards,
        true // Unstake all
      );

      if (txHash.includes('error')) {
        return { success: false, error: txHash };
      }

      // Remove from active farms
      this.activeFarms.delete(farmId);

      // Calculate total earnings
      const totalEarnings = await this.calculateTotalEarnings(farm);

      return {
        success: true,
        transactionId: txHash,
        lpTokensReturned: farm.amount,
        totalEarnings,
        explorerUrl: `https://solscan.io/tx/${txHash}`
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to exit farm: ${error.message}`
      };
    }
  }

  /**
   * Get farm performance metrics
   */
  async getFarmPerformance(farmId) {
    const farm = this.activeFarms.get(farmId);
    
    if (!farm) {
      return null;
    }

    const now = Date.now();
    const durationDays = (now - farm.startTime) / (1000 * 60 * 60 * 24);
    
    // Get current farm APR
    const farmData = await SarosFarmService.fetchDetailPoolFarm(farm);
    
    // Calculate earnings
    const estimatedEarnings = (farm.amount * farmData.apr / 100) * (durationDays / 365);
    const compoundBoost = farm.totalCompounded * 0.1; // Simplified compound benefit
    
    return {
      farmId,
      durationDays: durationDays.toFixed(1),
      currentAPR: farmData.apr,
      stakedAmount: farm.amount,
      estimatedEarnings,
      compoundBoost,
      totalValue: farm.amount + estimatedEarnings + compoundBoost,
      roi: ((estimatedEarnings + compoundBoost) / farm.amount) * 100,
      claimsCount: farm.totalClaimed,
      compoundsCount: Math.floor(farm.totalCompounded / farm.amount)
    };
  }

  /**
   * Monitor all active farms
   */
  async monitorFarms() {
    const farmStats = [];
    
    for (const [farmId, farm] of this.activeFarms) {
      const performance = await this.getFarmPerformance(farmId);
      
      if (performance) {
        farmStats.push(performance);
      }
    }

    // Sort by ROI
    farmStats.sort((a, b) => b.roi - a.roi);

    return {
      totalFarms: farmStats.length,
      totalStaked: farmStats.reduce((sum, f) => sum + f.stakedAmount, 0),
      totalValue: farmStats.reduce((sum, f) => sum + f.totalValue, 0),
      averageROI: farmStats.reduce((sum, f) => sum + f.roi, 0) / farmStats.length,
      farms: farmStats
    };
  }

  // Helper methods
  async getLpTokenBalance(lpTokenMint) {
    const info = await getInfoTokenByMint(lpTokenMint, this.wallet);
    return info ? convertWeiToBalance(info.amount, 6) : 0;
  }

  async getUserPosition(farm) {
    // Check if user has staked in this farm
    // Implementation would query on-chain data
    return null;
  }

  assessRisk(farm) {
    const { apr, liquidityUsd } = farm;
    
    if (apr > 1000) return 'high';
    if (apr > 100 && liquidityUsd < 100000) return 'medium-high';
    if (apr > 50) return 'medium';
    return 'low';
  }

  async getPoolSaturation(farm) {
    // Calculate how saturated the pool is
    // Higher saturation = lower returns for new deposits
    return 75; // Example: 75% saturated
  }

  async convertRewardsToLp(rewards, farm) {
    // Convert reward tokens to LP tokens
    // This would involve swapping and adding liquidity
    return 10; // Simplified: return LP amount
  }

  async calculateTotalEarnings(farm) {
    // Calculate total earnings from farming
    const durationDays = (Date.now() - farm.startTime) / (1000 * 60 * 60 * 24);
    return farm.amount * 0.001 * durationDays; // Simplified calculation
  }
}

export default FarmingIntegration;
```

## Step 2: Advanced Farming Strategies

Implement sophisticated farming strategies:

```javascript
// FarmingStrategies.js
class FarmingStrategies {
  constructor(farmingIntegration) {
    this.farming = farmingIntegration;
    this.strategies = new Map();
  }

  /**
   * Strategy: Yield Chasing
   * Automatically move funds to highest APR farms
   */
  async yieldChasingStrategy(config = {}) {
    const {
      checkInterval = 6, // hours
      minAPRDifference = 10, // minimum 10% APR difference to switch
      maxGasCost = 0.1 // max SOL for transaction costs
    } = config;

    console.log('Starting Yield Chasing Strategy...');

    const execute = async () => {
      // Get current farms
      const currentFarms = await this.farming.monitorFarms();
      
      // Get available farms
      const availableFarms = await this.farming.getAvailableFarms();
      
      // Find highest APR farm
      const bestFarm = availableFarms[0]; // Already sorted by APR
      
      // Check each active farm
      for (const activeFarm of currentFarms.farms) {
        const currentAPR = activeFarm.currentAPR;
        const bestAPR = bestFarm.apr;
        
        // Check if worth switching
        if (bestAPR - currentAPR > minAPRDifference) {
          console.log(`Found better farm: ${bestAPR}% vs ${currentAPR}%`);
          
          // Calculate switching cost
          const gasCost = await this.estimateGasCost();
          
          if (gasCost < maxGasCost) {
            // Exit current farm
            await this.farming.exitFarm(activeFarm.farmId);
            
            // Enter new farm
            await this.farming.startFarming({
              poolAddress: bestFarm.poolAddress,
              lpTokenMint: bestFarm.lpAddress,
              amount: activeFarm.stakedAmount,
              rewards: bestFarm.rewards,
              autoCompound: true
            });
            
            console.log('✅ Switched to higher yield farm');
          }
        }
      }
    };

    // Execute immediately
    await execute();
    
    // Set up periodic execution
    setInterval(execute, checkInterval * 60 * 60 * 1000);
  }

  /**
   * Strategy: Risk-Adjusted Farming
   * Balance between APR and risk
   */
  async riskAdjustedStrategy(config = {}) {
    const {
      maxRiskLevel = 'medium',
      minLiquidity = 100000, // Minimum $100k liquidity
      targetAllocation = {
        low: 0.5,
        medium: 0.3,
        high: 0.2
      }
    } = config;

    console.log('Implementing Risk-Adjusted Strategy...');

    // Get available farms
    const farms = await this.farming.getAvailableFarms();
    
    // Filter by risk and liquidity
    const eligibleFarms = farms.filter(farm => 
      this.getRiskScore(farm.riskLevel) <= this.getRiskScore(maxRiskLevel) &&
      farm.liquidityUsd >= minLiquidity
    );

    // Group by risk level
    const farmsByRisk = {
      low: eligibleFarms.filter(f => f.riskLevel === 'low'),
      medium: eligibleFarms.filter(f => f.riskLevel === 'medium'),
      high: eligibleFarms.filter(f => f.riskLevel === 'high')
    };

    // Calculate allocation
    const totalCapital = 10000; // Example: $10k to deploy
    const allocations = [];

    for (const [risk, allocation] of Object.entries(targetAllocation)) {
      const farms = farmsByRisk[risk];
      if (farms.length > 0) {
        const amount = totalCapital * allocation;
        const farm = farms[0]; // Take highest APR in risk category
        
        allocations.push({
          farm,
          amount,
          risk,
          expectedReturn: amount * farm.apr / 100
        });
      }
    }

    return allocations;
  }

  /**
   * Strategy: Impermanent Loss Hedging
   * Minimize IL through strategic positioning
   */
  async ilHedgingStrategy(poolData) {
    const { token0Price, token1Price, poolRatio } = poolData;
    
    // Calculate IL risk
    const priceRatio = token1Price / token0Price;
    const ilRisk = this.calculateILRisk(priceRatio, poolRatio);
    
    if (ilRisk > 0.05) { // More than 5% IL risk
      console.log('High IL risk detected, implementing hedge...');
      
      // Strategy 1: Farm stable pairs
      const stableFarms = await this.findStableFarms();
      
      // Strategy 2: Use single-sided staking
      const singleStaking = await this.findSingleStaking();
      
      // Strategy 3: Delta-neutral position
      const deltaNeutral = this.calculateDeltaNeutral(poolData);
      
      return {
        ilRisk: `${(ilRisk * 100).toFixed(2)}%`,
        recommendations: [
          stableFarms.length > 0 ? 'Switch to stable pair farming' : null,
          singleStaking.length > 0 ? 'Use single-sided staking' : null,
          deltaNeutral ? 'Create delta-neutral position' : null
        ].filter(Boolean)
      };
    }
    
    return { ilRisk: `${(ilRisk * 100).toFixed(2)}%`, recommendations: [] };
  }

  // Helper methods
  getRiskScore(level) {
    const scores = { low: 1, medium: 2, 'medium-high': 3, high: 4 };
    return scores[level] || 5;
  }

  async estimateGasCost() {
    // Estimate transaction costs
    return 0.05; // SOL
  }

  calculateILRisk(priceRatio, poolRatio) {
    // Simplified IL calculation
    const deviation = Math.abs(priceRatio - poolRatio) / poolRatio;
    return deviation * 0.5; // Simplified formula
  }

  async findStableFarms() {
    const farms = await this.farming.getAvailableFarms();
    return farms.filter(f => f.token0Id.includes('usd') && f.token1Id.includes('usd'));
  }

  async findSingleStaking() {
    return SarosStakeServices.getListPool({ page: 1, size: 10 });
  }

  calculateDeltaNeutral(poolData) {
    // Calculate positions to hedge IL
    return {
      shortToken0: poolData.token0Amount / 2,
      shortToken1: poolData.token1Amount / 2
    };
  }
}
```

## Step 3: Complete Implementation Example

Here's everything working together:

```javascript
// farmingExample.js
import FarmingIntegration from './FarmingIntegration';
import FarmingStrategies from './FarmingStrategies';

async function runAdvancedFarming() {
  const walletAddress = 'YOUR_WALLET_ADDRESS';
  const farming = new FarmingIntegration(walletAddress);
  const strategies = new FarmingStrategies(farming);

  try {
    // Step 1: Analyze available farms
    console.log('🔍 Analyzing farming opportunities...\n');
    const farms = await farming.getAvailableFarms(1, 10);
    
    console.log('Top 5 Farms by APR:');
    farms.slice(0, 5).forEach((farm, i) => {
      console.log(`${i + 1}. ${farm.token0Id}/${farm.token1Id}`);
      console.log(`   APR: ${farm.apr.toFixed(2)}%`);
      console.log(`   TVL: $${farm.liquidityUsd.toFixed(0)}`);
      console.log(`   Risk: ${farm.riskLevel}`);
      console.log(`   Daily: ${farm.dailyReturn.toFixed(3)}%\n`);
    });

    // Step 2: Calculate optimal stake for best farm
    const bestFarm = farms[0];
    console.log('📊 Calculating optimal stake...');
    const optimal = await farming.calculateOptimalStake(bestFarm);
    
    console.log('Optimal Staking Strategy:');
    console.log(`Recommended amount: $${optimal.optimalAmount.toFixed(2)}`);
    console.log(`Expected APR: ${optimal.projectedAPR.toFixed(2)}%`);
    console.log(`Daily earnings: $${optimal.expectedDaily.toFixed(2)}`);
    console.log(`Monthly earnings: $${optimal.expectedMonthly.toFixed(2)}\n`);

    // Step 3: Start farming with auto-compound
    console.log('🌾 Starting yield farming...');
    const farmResult = await farming.startFarming({
      poolAddress: bestFarm.poolAddress,
      lpTokenMint: bestFarm.lpAddress,
      amount: 100, // 100 LP tokens
      rewards: bestFarm.rewards,
      autoCompound: true,
      compoundInterval: 12 // Compound every 12 hours
    });

    if (farmResult.success) {
      console.log('✅ Farm started successfully!');
      console.log(`Farm ID: ${farmResult.farmId}`);
      console.log(`Transaction: ${farmResult.explorerUrl}\n`);

      // Step 4: Implement risk-adjusted strategy
      console.log('🛡️ Implementing risk management...');
      const riskStrategy = await strategies.riskAdjustedStrategy({
        maxRiskLevel: 'medium',
        minLiquidity: 50000
      });

      console.log('Risk-Adjusted Allocation:');
      riskStrategy.forEach(allocation => {
        console.log(`${allocation.risk} risk: $${allocation.amount}`);
        console.log(`  Farm: ${allocation.farm.token0Id}/${allocation.farm.token1Id}`);
        console.log(`  Expected return: $${allocation.expectedReturn.toFixed(2)}/year\n`);
      });

      // Step 5: Monitor performance
      console.log('📈 Monitoring farm performance...');
      
      // Simulate monitoring after some time
      setTimeout(async () => {
        const performance = await farming.getFarmPerformance(farmResult.farmId);
        
        console.log('\nFarm Performance Update:');
        console.log(`Duration: ${performance.durationDays} days`);
        console.log(`ROI: ${performance.roi.toFixed(2)}%`);
        console.log(`Total value: $${performance.totalValue.toFixed(2)}`);
        console.log(`Compounds executed: ${performance.compoundsCount}`);
        
        // Check IL risk
        const ilStrategy = await strategies.ilHedgingStrategy({
          token0Price: 1.0,
          token1Price: 0.5,
          poolRatio: 2.0
        });
        
        if (ilStrategy.recommendations.length > 0) {
          console.log('\n⚠️ Impermanent Loss Alert:');
          console.log(`IL Risk: ${ilStrategy.ilRisk}`);
          console.log('Recommendations:');
          ilStrategy.recommendations.forEach(rec => console.log(`  - ${rec}`));
        }
        
      }, 5000);

      // Step 6: Set up yield chasing (optional)
      console.log('\n🎯 Activating yield chasing strategy...');
      await strategies.yieldChasingStrategy({
        checkInterval: 24, // Check every 24 hours
        minAPRDifference: 20 // Switch if 20% better APR found
      });

    } else {
      console.error('Failed to start farming:', farmResult.error);
    }

    // Dashboard summary
    setTimeout(async () => {
      console.log('\n📊 FARMING DASHBOARD');
      console.log('═══════════════════════════════');
      
      const summary = await farming.monitorFarms();
      
      console.log(`Active Farms: ${summary.totalFarms}`);
      console.log(`Total Staked: $${summary.totalStaked.toFixed(2)}`);
      console.log(`Total Value: $${summary.totalValue.toFixed(2)}`);
      console.log(`Average ROI: ${summary.averageROI.toFixed(2)}%`);
      
      console.log('\nTop Performing Farms:');
      summary.farms.slice(0, 3).forEach((farm, i) => {
        console.log(`${i + 1}. Farm ${farm.farmId.slice(0, 8)}...`);
        console.log(`   ROI: ${farm.roi.toFixed(2)}%`);
        console.log(`   Value: $${farm.totalValue.toFixed(2)}`);
      });
      
    }, 10000);

  } catch (error) {
    console.error('Farming error:', error);
  }
}

// Emergency exit function
async function emergencyExit() {
  const farming = new FarmingIntegration('YOUR_WALLET_ADDRESS');
  
  console.log('🚨 EMERGENCY EXIT INITIATED');
  
  const farms = await farming.monitorFarms();
  
  for (const farm of farms.farms) {
    console.log(`Exiting farm ${farm.farmId}...`);
    const result = await farming.exitFarm(farm.farmId, true);
    
    if (result.success) {
      console.log(`✅ Exited successfully`);
      console.log(`   Returned: ${result.lpTokensReturned} LP tokens`);
      console.log(`   Earnings: ${result.totalEarnings}`);
    }
  }
}

// Run the example
runAdvancedFarming().catch(console.error);

// Uncomment to test emergency exit
// emergencyExit().catch(console.error);
```

## Step 4: Yield Optimization Tips

### Maximizing Returns

1. **Compound Frequency**
   ```javascript
   // Optimal compound frequency based on gas costs
   function calculateOptimalCompoundFrequency(apr, gasInUSD, stakedValue) {
     // More frequent = better APY but more gas
     const dailyRate = apr / 365;
     const gasImpact = (gasInUSD / stakedValue) * 100;
     
     if (gasImpact < 0.01) return 1;  // Daily
     if (gasImpact < 0.05) return 7;  // Weekly
     if (gasImpact < 0.1) return 30;  // Monthly
     return 90; // Quarterly
   }
   ```

2. **Pool Selection Matrix**
   ```javascript
   function scorePool(pool) {
     const scores = {
       apr: pool.apr / 100 * 0.4,           // 40% weight
       tvl: Math.min(pool.tvl / 1000000, 1) * 0.3,  // 30% weight
       risk: (5 - getRiskScore(pool.risk)) / 5 * 0.2,  // 20% weight
       fees: (1 - pool.feeRate) * 0.1      // 10% weight
     };
     
     return Object.values(scores).reduce((a, b) => a + b, 0);
   }
   ```

### Risk Management

| Risk Level | Max Allocation | Characteristics |
|------------|---------------|-----------------|
| Low | 50% | Stable pairs, high TVL, established pools |
| Medium | 30% | Volatile pairs, medium TVL, proven tokens |
| High | 15% | New pools, low TVL, experimental tokens |
| Degen | 5% | Extremely high APR, unaudited, new protocols |

### Common Pitfalls to Avoid

1. **Ignoring gas costs** - Small positions may lose money to fees
2. **Not accounting for IL** - High APR doesn't compensate for 50% IL
3. **Over-concentration** - Don't put everything in one farm
4. **Ignoring token emissions** - High APR from inflation = token price dump
5. **Manual compounding** - Missing compound opportunities

## Testing Your Farming Integration

### Checklist

- [ ] Test with small amounts first
- [ ] Verify APR calculations match UI
- [ ] Test claim and compound functions
- [ ] Monitor gas costs vs. rewards
- [ ] Test emergency withdrawal
- [ ] Verify slippage on entry/exit
- [ ] Check for front-running protection

### Monitoring Dashboard

```javascript
// Simple monitoring dashboard
function createDashboard(farms) {
  const dashboard = {
    timestamp: new Date().toISOString(),
    totalValue: 0,
    totalRewards: 0,
    avgAPR: 0,
    health: 'good',
    alerts: []
  };
  
  farms.forEach(farm => {
    dashboard.totalValue += farm.totalValue;
    dashboard.totalRewards += farm.estimatedEarnings;
    
    // Check for issues
    if (farm.apr < 10) {
      dashboard.alerts.push(`Low APR on ${farm.farmId}`);
    }
    if (farm.roi < 0) {
      dashboard.alerts.push(`Negative ROI on ${farm.farmId}`);
    }
  });
  
  dashboard.avgAPR = farms.reduce((sum, f) => sum + f.currentAPR, 0) / farms.length;
  dashboard.health = dashboard.alerts.length === 0 ? 'good' : 'warning';
  
  return dashboard;
}
```

## Next Steps

Congratulations! You're now a yield farming expert. Consider:
- Building automated strategies
- Creating yield aggregators
- Implementing cross-chain farming
- Adding portfolio rebalancing

Ready to dive deeper? Check out our [SDK Analysis](./sdk-analysis.md) for advanced optimization!