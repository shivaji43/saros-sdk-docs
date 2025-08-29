# Saros SDK Quick Start Guide

Welcome to Saros - your gateway to DeFi on Solana. This guide gets you swapping, providing liquidity, and earning rewards in under 5 minutes.

---

## What's Saros?

Saros is a DeFi super-network on Solana offering:

- **Lightning-fast token swaps** with minimal fees
- **Liquidity pools** for earning trading fees
- **Yield farming** to maximize your returns
- **Single-asset staking** for simplified earning

---

## Prerequisites

Before diving in, make sure you have:

- Node.js v14+ installed
- A Solana wallet (Phantom, Solflare, or similar)
- Some SOL for transaction fees (~0.1 SOL is plenty)
- Basic JavaScript knowledge

---

## Installation

Pick your package manager and let's roll:

```bash
# Using npm
npm install @saros-finance/sdk

# Using yarn (recommended)
yarn add @saros-finance/sdk
```

---

## Your First Swap in 30 Seconds

Here's the absolute minimum to swap tokens on Saros:

```javascript
import { swapSaros, getSwapAmountSaros, genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

// 1. Setup connection
const connection = genConnectionSolana();
const walletAddress = 'YOUR_WALLET_ADDRESS_HERE';

// 2. Define tokens (example: USDC to C98)
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const C98_MINT = 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9';
const POOL_ADDRESS = '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty';

// 3. Calculate swap output
const swapEstimate = await getSwapAmountSaros(
  connection,
  USDC_MINT,
  C98_MINT,
  1, // Swap 1 USDC
  0.5, // 0.5% slippage
  poolParams // Pool configuration (see below)
);

console.log(`You'll receive: ${swapEstimate.amountOut} C98`);

// 4. Execute the swap
const result = await swapSaros(
  connection,
  userUSDCAccount,
  userC98Account,
  1, // Amount in
  swapEstimate.amountOutWithSlippage,
  null,
  new PublicKey(POOL_ADDRESS),
  SAROS_SWAP_PROGRAM_ADDRESS_V1,
  walletAddress,
  USDC_MINT,
  C98_MINT
);

if (!result.isError) {
  console.log(`Success! Transaction: ${result.hash}`);
}
```

---

## Core Concepts Explained

### Pools

Think of pools as token vending machines. You put in Token A, get out Token B. The exchange rate depends on how many tokens are in the pool.

### Slippage

The price might move between when you click "swap" and when your transaction processes. Slippage tolerance (usually 0.5-1%) protects you from unexpected price changes.

### LP Tokens

When you add liquidity, you get LP (Liquidity Provider) tokens as a receipt. These represent your share of the pool and earn you trading fees.

---

## Essential Configuration

Create a `config.js` file for your constants:

```javascript
import { PublicKey } from '@solana/web3.js';

export const CONFIG = {
  // RPC endpoint
  RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com',
  
  // Program addresses
  SAROS_SWAP_PROGRAM: 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr',
  SAROS_FARM_PROGRAM: 'SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ',
  
  // Common token mints
  TOKENS: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    SOL: 'So11111111111111111111111111111111111111112',
    C98: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9'
  },
  
  // Popular pool addresses
  POOLS: {
    'USDC-C98': '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
    'SOL-USDC': '8k7F9Xb36oFJsjpCKpsXvg4cgBRoZtwNTc3EzG5Ttd2o'
  }
};
```

---

## Quick Liquidity Addition

Want to earn fees by providing liquidity? Here's how:

```javascript
import { depositAllTokenTypes, getPoolInfo } from '@saros-finance/sdk';

async function addLiquidity() {
  const poolAddress = 'YOUR_POOL_ADDRESS';
  const amountA = 100; // USDC amount
  const amountB = 50;  // C98 amount
  
  const result = await depositAllTokenTypes(
    connection,
    poolAddress,
    amountA,
    amountB,
    userTokenAAccount,
    userTokenBAccount,
    userLPAccount,
    walletAddress
  );
  
  if (!result.isError) {
    console.log(`LP tokens received: ${result.lpAmount}`);
  }
}
```

---

## Basic Farm Staking

Earn extra rewards by farming your LP tokens:

```javascript
import { SarosFarmService } from '@saros-finance/sdk';

async function stakeLPTokens() {
  const farmService = new SarosFarmService(connection);
  
  const result = await farmService.deposit(
    farmAddress,
    lpTokenAmount,
    userLPAccount,
    walletAddress
  );
  
  if (result.success) {
    console.log(`Staked ${lpTokenAmount} LP tokens!`);
  }
}
```

---

## Common Patterns & Best Practices

### 1. **Always Check Balances First**

```javascript
async function checkBalance(tokenMint, userAccount) {
  const tokenInfo = await getInfoTokenByMint(connection, tokenMint);
  const balance = await connection.getTokenAccountBalance(userAccount);
  
  return {
    balance: balance.value.amount,
    decimals: tokenInfo.decimals,
    symbol: tokenInfo.symbol
  };
}
```

### 2. **Handle Errors Gracefully**

```javascript
try {
  const result = await swapSaros(/* ... */);
  
  if (result.isError) {
    console.error('Swap failed:', result.message);
    return;
  }
  
  console.log('Swap successful!', result.hash);
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### 3. **Use Proper Slippage**

```javascript
const getRecommendedSlippage = (tokenPair, amount) => {
  // Higher slippage for volatile pairs or large amounts
  if (tokenPair.includes('meme') || amount > 10000) return 2.0;
  if (tokenPair.includes('SOL')) return 1.0;
  return 0.5; // Default for stable pairs
};
```

---

## Next Steps

Now that you're up and running:

1. **Explore Advanced Features**: Check out [Token Swap Tutorial](./tutorial-swap.md) for production patterns
2. **Add Liquidity**: Learn [Liquidity Management](./tutorial-liquidity.md) for earning fees
3. **Farm Rewards**: Master [Yield Farming](./tutorial-farming.md) for maximum returns
4. **Study Examples**: Browse [Code Examples](./code-examples.md) for real implementations

---

## Need Help?

- 📖 **Full Documentation**: [API Reference](./api-reference.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/coin98/saros-sdk/issues)
- 💬 **Community**: [Discord](https://discord.gg/saros)
- 📧 **Support**: support@coin98.com

---

**Happy Building!** 🚀

*Built with ❤️ by the Saros team*