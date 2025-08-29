# Saros SDK Quick Start Guide

Welcome to Saros - your gateway to DeFi on Solana. This guide gets you swapping, providing liquidity, and earning rewards in under 5 minutes.

## What's Saros?

Saros is a DeFi super-network on Solana offering:
- **Lightning-fast token swaps** with minimal fees
- **Liquidity pools** for earning trading fees
- **Yield farming** to maximize your returns
- **Single-asset staking** for simplified earning

## Prerequisites

Before diving in, make sure you have:
- Node.js v14+ installed
- A Solana wallet (Phantom, Solflare, or similar)
- Some SOL for transaction fees (~0.1 SOL is plenty)
- Basic JavaScript knowledge

## Installation

Pick your package manager and let's roll:

```bash
# Using npm
npm install @saros-finance/sdk

# Using yarn (recommended)
yarn add @saros-finance/sdk
```

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

## Core Concepts Explained

### Pools
Think of pools as token vending machines. You put in Token A, get out Token B. The exchange rate depends on how many tokens are in the pool.

### Slippage
The price might move between when you click "swap" and when your transaction processes. Slippage tolerance (usually 0.5-1%) protects you from unexpected price changes.

### LP Tokens
When you add liquidity, you get LP (Liquidity Provider) tokens as a receipt. These represent your share of the pool and earn you trading fees.

## Essential Configuration

Create a `config.js` file for your constants:

```javascript
import { PublicKey } from '@solana/web3.js';

export const CONFIG = {
  // Program addresses
  TOKEN_PROGRAM_ID: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  SAROS_SWAP_PROGRAM: new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'),
  SAROS_FARM_PROGRAM: new PublicKey('SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ'),
  
  // Your wallet
  WALLET_ADDRESS: 'YOUR_WALLET_ADDRESS',
  
  // Common tokens
  TOKENS: {
    USDC: {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
      symbol: 'USDC'
    },
    SOL: {
      mint: 'So11111111111111111111111111111111111111112',
      decimals: 9,
      symbol: 'SOL'
    }
  }
};
```

## Error Handling Like a Pro

Always wrap your Saros calls in proper error handling:

```javascript
async function safeSwap(fromMint, toMint, amount) {
  try {
    // Check wallet balance first
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    if (balance < 0.01 * 1e9) { // Less than 0.01 SOL
      throw new Error('Insufficient SOL for fees');
    }
    
    // Perform swap
    const result = await swapSaros(/* ... */);
    
    if (result.isError) {
      switch(result.mess) {
        case 'gasSolNotEnough':
          console.error('Need more SOL for transaction fees');
          break;
        case 'exceedsLimit':
          console.error('Swap amount too large for pool');
          break;
        case 'sizeTooSmall':
          console.error('Swap amount too small');
          break;
        default:
          console.error(`Swap failed: ${result.mess}`);
      }
      return null;
    }
    
    return result.hash;
  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
}
```

## Next Steps

Ready to level up? Check out:
- [Integration Tutorial: Token Swaps](./tutorial-swap.md) - Deep dive into swap mechanics
- [Integration Tutorial: Liquidity Provision](./tutorial-liquidity.md) - Become a liquidity provider
- [Integration Tutorial: Yield Farming](./tutorial-farming.md) - Maximize your returns
- [API Reference](./api-reference.md) - Complete method documentation

## Quick Tips for Success

1. **Start small**: Test with tiny amounts first
2. **Monitor gas**: Keep ~0.1 SOL for transaction fees
3. **Use devnet**: Test on Solana devnet before mainnet
4. **Check pool liquidity**: Larger pools = better prices
5. **Set realistic slippage**: 0.5-1% for common pairs, 2-5% for volatile tokens

## Getting Help

Stuck? Here's where to find answers:
- GitHub Issues: [github.com/coin98/saros-sdk/issues](https://github.com/coin98/saros-sdk/issues)
- Discord: Join the Saros community
- This documentation: We've got you covered

## Common Gotchas

- **"Transaction too large"**: You're trying to do too much in one transaction. Split it up.
- **"Insufficient funds"**: Remember to account for fees (both SOL and trading fees)
- **"Pool not found"**: Double-check your pool address and that it exists on your network

Ready to build something amazing? Let's go! 🚀