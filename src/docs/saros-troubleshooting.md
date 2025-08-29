# Saros SDK Troubleshooting Guide & FAQ

Your comprehensive guide to solving common issues, understanding error messages, and getting unstuck when building with Saros.

## Quick Diagnostics

Before diving into specific issues, run this diagnostic check:

```javascript
async function runDiagnostics() {
  console.log('🔍 Running Saros SDK Diagnostics...\n');
  
  const checks = {
    connection: false,
    wallet: false,
    balance: false,
    program: false
  };
  
  try {
    // Check connection
    const connection = genConnectionSolana();
    const version = await connection.getVersion();
    checks.connection = true;
    console.log('✅ Connection: OK', version);
  } catch (e) {
    console.log('❌ Connection: Failed', e.message);
  }
  
  try {
    // Check wallet
    const wallet = await genOwnerSolana(YOUR_WALLET);
    checks.wallet = wallet.publicKey !== null;
    console.log('✅ Wallet: OK');
  } catch (e) {
    console.log('❌ Wallet: Failed', e.message);
  }
  
  try {
    // Check SOL balance
    const balance = await connection.getBalance(wallet.publicKey);
    checks.balance = balance > 0;
    console.log(`✅ Balance: ${balance / 1e9} SOL`);
  } catch (e) {
    console.log('❌ Balance check: Failed');
  }
  
  try {
    // Check program
    const programId = new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr');
    const info = await connection.getAccountInfo(programId);
    checks.program = info !== null;
    console.log('✅ Saros Program: OK');
  } catch (e) {
    console.log('❌ Program: Not found');
  }
  
  return checks;
}
```

## Common Error Messages

### Transaction Errors

#### "Transaction too large"

**Error:**
```
Error: Transaction too large: 1244 > 1232
```

**Cause:** Solana transactions have a 1232 byte limit.

**Solutions:**

1. **Split the transaction:**
```javascript
// Instead of one large transaction
const bigTx = new Transaction()
  .add(ix1, ix2, ix3, ix4, ix5);

// Split into multiple
const tx1 = new Transaction().add(ix1, ix2);
const tx2 = new Transaction().add(ix3, ix4, ix5);

await sendTransaction(tx1);
await sendTransaction(tx2);
```

2. **Use versioned transactions (v0):**
```javascript
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';

const message = new TransactionMessage({
  payerKey: wallet.publicKey,
  recentBlockhash: blockhash,
  instructions
}).compileToV0Message();

const tx = new VersionedTransaction(message);
```

3. **Reduce account inputs:**
```javascript
// Batch operations instead of individual
const pools = await getMultiplePools(poolAddresses);
```

---

#### "Insufficient funds for rent"

**Error:**
```
Error: Attempt to debit an account but found no record of a prior credit
```

**Cause:** Account doesn't have enough SOL for rent exemption.

**Solution:**
```javascript
// Check rent requirement
const minBalance = await connection.getMinimumBalanceForRentExemption(
  165 // Account size in bytes
);

console.log(`Need ${minBalance / 1e9} SOL for rent`);

// Fund account if needed
if (balance < minBalance) {
  await requestAirdrop(wallet.publicKey, minBalance - balance);
}
```

---

#### "Custom program error: 0x1"

**Error:**
```
Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x1
```

**Cause:** Insufficient token balance or SOL for fees.

**Debug Steps:**
```javascript
async function debugInsufficientFunds(tokenMint, amount) {
  // Check SOL balance
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log(`SOL balance: ${solBalance / 1e9}`);
  
  if (solBalance < 0.01 * 1e9) {
    console.log('❌ Need more SOL for fees');
    return false;
  }
  
  // Check token balance
  const tokenAccount = await getInfoTokenByMint(tokenMint, wallet);
  if (!tokenAccount) {
    console.log('❌ Token account not found');
    return false;
  }
  
  const tokenBalance = tokenAccount.amount;
  console.log(`Token balance: ${tokenBalance}`);
  
  if (tokenBalance < amount) {
    console.log(`❌ Insufficient tokens. Have: ${tokenBalance}, Need: ${amount}`);
    return false;
  }
  
  return true;
}
```

---

### Pool & Liquidity Errors

#### "Pool not found"

**Error:**
```
Error: Account does not exist FW9hgAiUsFYpqjHaGCGw4nAvejz4tAp9qU7kFpYr1fQZ
```

**Cause:** Pool doesn't exist or wrong address.

**Debug:**
```javascript
async function verifyPool(poolAddress) {
  try {
    const poolInfo = await getPoolInfo(connection, poolAddress);
    
    if (!poolInfo) {
      console.log('❌ Pool not found');
      return false;
    }
    
    console.log('✅ Pool exists');
    console.log('Token 0:', poolInfo.token0Mint.toString());
    console.log('Token 1:', poolInfo.token1Mint.toString());
    console.log('LP Mint:', poolInfo.lpTokenMint.toString());
    
    return true;
  } catch (error) {
    console.log('❌ Error fetching pool:', error.message);
    return false;
  }
}
```

---

#### "Slippage tolerance exceeded"

**Error:**
```
Error: Slippage tolerance exceeded. Expected: 95, Got: 92
```

**Cause:** Price moved between quote and execution.

**Solutions:**

1. **Increase slippage:**
```javascript
// For volatile pairs
const slippage = 5; // 5% instead of 0.5%
```

2. **Use dynamic slippage:**
```javascript
function calculateDynamicSlippage(priceImpact, volatility) {
  const baseSlippage = 0.5;
  const impactMultiplier = Math.max(1, priceImpact / 2);
  const volatilityMultiplier = Math.max(1, volatility / 10);
  
  return baseSlippage * impactMultiplier * volatilityMultiplier;
}
```

3. **Implement retry with higher slippage:**
```javascript
async function swapWithAutoSlippage(params, maxSlippage = 10) {
  let slippage = 0.5;
  
  while (slippage <= maxSlippage) {
    try {
      return await swapSaros({ ...params, slippage });
    } catch (error) {
      if (error.message.includes('Slippage')) {
        slippage *= 2;
        console.log(`Retrying with ${slippage}% slippage`);
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Max slippage exceeded');
}
```

---

### Farming Errors

#### "Uninitialized account"

**Error:**
```
SarosFarm: Uninitialized account
```

**Cause:** User pool account not created.

**Solution:**
```javascript
// The SDK should handle this, but if not:
async function initializeFarmAccount(poolAddress) {
  const [userPoolAddress, nonce] = await PublicKey.findProgramAddress(
    [wallet.publicKey.toBytes(), poolAddress.toBytes()],
    FARM_PROGRAM
  );
  
  // Check if exists
  const account = await connection.getAccountInfo(userPoolAddress);
  
  if (!account) {
    console.log('Creating user pool account...');
    // Create account instruction will be added by SDK
  }
}
```

---

## Frequently Asked Questions

### General Questions

**Q: What's the difference between Saros SDK and using raw Solana web3.js?**

A: The Saros SDK abstracts complex DeFi operations:
- **Raw web3.js**: Requires building instructions, managing accounts, calculating math
- **Saros SDK**: Single function calls for swaps, liquidity, farming

Example comparison:
```javascript
// Raw web3.js (simplified, actual is 100+ lines)
const ix = new TransactionInstruction({...});
const tx = new Transaction().add(ix);
await sendAndConfirmTransaction(connection, tx, [wallet]);

// Saros SDK
await swapSaros(connection, from, to, amount, minOut, ...);
```

---

**Q: Can I use Saros SDK with React?**

A: Yes! Here's a React hook example:

```javascript
import { useState, useCallback } from 'react';
import { swapSaros, getSwapAmountSaros } from '@saros-finance/sdk';

function useSwap(connection, wallet) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const swap = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get quote first
      const quote = await getSwapAmountSaros(
        connection,
        params.fromMint,
        params.toMint,
        params.amount,
        params.slippage || 0.5,
        params.poolParams
      );
      
      // Execute swap
      const result = await swapSaros(
        connection,
        params.fromAccount,
        params.toAccount,
        params.amount,
        quote.amountOutWithSlippage,
        null,
        params.poolAddress,
        SWAP_PROGRAM,
        wallet.publicKey.toString(),
        params.fromMint,
        params.toMint
      );
      
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);
  
  return { swap, loading, error };
}
```

---

**Q: How do I test on devnet?**

A: Configure for devnet:

```javascript
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Use devnet connection
const connection = new Connection(
  clusterApiUrl('devnet'),
  'confirmed'
);

// Get devnet tokens
async function getDevnetTokens() {
  // SOL airdrop
  await connection.requestAirdrop(wallet.publicKey, 1e9);
  
  // For SPL tokens, use devnet faucets:
  // - https://spl-token-faucet.com
  // - Or create your own test tokens
}

// Find devnet pools (different addresses than mainnet)
const DEVNET_POOLS = {
  'USDC-USDT': 'DEVNET_POOL_ADDRESS_HERE'
};
```

---

### Swap Questions

**Q: Why is my swap returning less than expected?**

A: Several factors affect output:
1. **Trading fees** (usually 0.3%)
2. **Price impact** (larger for big trades)
3. **Slippage** (price movement during execution)

Debug with:
```javascript
const quote = await getSwapAmountSaros(...);
console.log('Expected output:', quote.amountOut);
console.log('Minimum (with slippage):', quote.amountOutWithSlippage);
console.log('Price impact:', quote.priceImpact, '%');
console.log('Exchange rate:', quote.rate);

// Calculate fees
const fee = amount * 0.003; // 0.3% fee
const amountAfterFee = amount - fee;
```

---

**Q: How do I find the best pool for my swap?**

A: Compare multiple pools:

```javascript
async function findBestPool(fromMint, toMint, amount) {
  const pools = await getAllPoolsForPair(fromMint, toMint);
  
  const quotes = await Promise.all(
    pools.map(pool => 
      getSwapAmountSaros(
        connection,
        fromMint,
        toMint,
        amount,
        0.5,
        pool
      ).catch(() => null)
    )
  );
  
  // Filter out failed quotes and sort by output
  const validQuotes = quotes
    .filter(q => q !== null)
    .map((q, i) => ({ ...q, pool: pools[i] }))
    .sort((a, b) => b.amountOut - a.amountOut);
  
  return validQuotes[0]; // Best quote
}
```

---

### Liquidity Questions

**Q: How do I calculate impermanent loss?**

A: Use this formula:

```javascript
function calculateImpermanentLoss(priceRatio) {
  // priceRatio = currentPrice / initialPrice
  const il = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
  return Math.abs(il) * 100; // Return as percentage
}

// Example
const initialPrice = 1.0;
const currentPrice = 1.5;
const il = calculateImpermanentLoss(currentPrice / initialPrice);
console.log(`Impermanent Loss: ${il.toFixed(2)}%`);
```

---

**Q: Why can't I withdraw my full LP token amount?**

A: Check for:
1. **Withdrawal fees** (if any)
2. **Staked LP tokens** (unstake from farm first)
3. **Rounding errors** (use slightly less than full amount)

```javascript
async function safeWithdraw(lpAmount) {
  // Leave dust to avoid rounding issues
  const safeAmount = Math.floor(lpAmount * 0.9999);
  
  return withdrawAllTokenTypes(
    connection,
    wallet,
    lpAccount,
    token0Account,
    token1Account,
    safeAmount,
    // ... other params
  );
}
```

---

### Farming Questions

**Q: When should I compound rewards?**

A: Calculate optimal frequency:

```javascript
function optimalCompoundFrequency(
  apr,
  stakedValue,
  gasFeesUSD
) {
  // Formula: n = sqrt((apr * stakedValue) / (2 * gasFeesUSD * 365))
  const n = Math.sqrt(
    (apr / 100 * stakedValue) / (2 * gasFeesUSD * 365)
  );
  
  const daysBetweeenCompounds = 365 / n;
  
  return {
    timesPerYear: Math.round(n),
    daysBetween: Math.round(daysBetweeenCompounds),
    gasPerYear: gasFeesUSD * n,
    apyBoost: (Math.pow(1 + apr/100/n, n) - 1) * 100 - apr
  };
}

// Example
const result = optimalCompoundFrequency(100, 10000, 0.5);
console.log(`Compound every ${result.daysBetween} days`);
console.log(`APY boost: +${result.apyBoost.toFixed(2)}%`);
```

---

**Q: How do I track my farming rewards?**

A: Monitor rewards in real-time:

```javascript
class RewardTracker {
  constructor(farmConfig) {
    this.farm = farmConfig;
    this.startBlock = 0;
    this.rewardPerBlock = farmConfig.rewards[0].rewardPerBlock;
  }
  
  async getCurrentRewards() {
    const currentBlock = await connection.getSlot();
    const blocksElapsed = currentBlock - this.startBlock;
    const rewards = blocksElapsed * this.rewardPerBlock;
    
    return {
      blocks: blocksElapsed,
      rewards: rewards / 1e6, // Assuming 6 decimals
      value: (rewards / 1e6) * this.getTokenPrice()
    };
  }
  
  startTracking() {
    setInterval(async () => {
      const rewards = await this.getCurrentRewards();
      console.log(`Current rewards: ${rewards.rewards.toFixed(4)}`);
    }, 60000); // Check every minute
  }
}
```

---

## Performance Issues

### Slow Transactions

**Problem:** Transactions taking too long

**Solutions:**

1. **Use better RPC endpoints:**
```javascript
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana'
];

// Rotate endpoints
let currentEndpoint = 0;
function getConnection() {
  const endpoint = RPC_ENDPOINTS[currentEndpoint];
  currentEndpoint = (currentEndpoint + 1) % RPC_ENDPOINTS.length;
  return new Connection(endpoint, 'confirmed');
}
```

2. **Optimize confirmation:**
```javascript
// Use 'processed' for faster confirmation
const connection = new Connection(url, 'processed');

// Or skip confirmation for non-critical operations
const signature = await connection.sendRawTransaction(
  tx.serialize(),
  { skipPreflight: true }
);
```

---

### High Gas Fees

**Problem:** Transaction fees eating into profits

**Solutions:**

```javascript
// Batch operations
async function batchClaims(farms) {
  const transaction = new Transaction();
  
  for (const farm of farms) {
    transaction.add(
      await createClaimInstruction(farm)
    );
  }
  
  // One transaction instead of many
  return sendTransaction(transaction);
}

// Use priority fees wisely
transaction.add(
  ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1000 // Small priority fee
  })
);
```

---

## Debug Utilities

### Transaction Inspector

```javascript
async function inspectTransaction(txSignature) {
  const tx = await connection.getTransaction(txSignature, {
    maxSupportedTransactionVersion: 0
  });
  
  if (!tx) {
    console.log('Transaction not found');
    return;
  }
  
  console.log('Transaction Details:');
  console.log('Slot:', tx.slot);
  console.log('Status:', tx.meta.err ? 'Failed' : 'Success');
  
  if (tx.meta.err) {
    console.log('Error:', tx.meta.err);
  }
  
  console.log('Fee:', tx.meta.fee / 1e9, 'SOL');
  console.log('Logs:', tx.meta.logMessages);
  
  // Decode instructions
  tx.transaction.message.instructions.forEach((ix, i) => {
    console.log(`Instruction ${i}:`, ix.programId.toString());
  });
}
```

### State Validator

```javascript
async function validateState() {
  const issues = [];
  
  // Check connection
  try {
    await connection.getSlot();
  } catch {
    issues.push('Connection failed');
  }
  
  // Check wallet
  if (!wallet.publicKey) {
    issues.push('Wallet not connected');
  }
  
  // Check balances
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < 0.01 * 1e9) {
    issues.push('Low SOL balance');
  }
  
  // Check token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    wallet.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  
  if (tokenAccounts.value.length === 0) {
    issues.push('No token accounts found');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
```

## Getting Help

### Before Asking for Help

1. **Check the diagnostics** (run the diagnostic function above)
2. **Verify your setup** (network, wallet, balances)
3. **Check transaction logs** (use Solana Explorer)
4. **Test with small amounts** first
5. **Try on devnet** to isolate mainnet issues

### Where to Get Help

- **GitHub Issues**: [github.com/coin98/saros-sdk/issues](https://github.com/coin98/saros-sdk/issues)
- **Discord**: Saros community Discord
- **Documentation**: This guide and API reference
- **Stack Overflow**: Tag with `saros` and `solana`

### Reporting Bugs

Include this information:
```javascript
const bugReport = {
  sdkVersion: '2.4.0', // Your SDK version
  network: 'mainnet-beta',
  error: error.message,
  stack: error.stack,
  transaction: txSignature,
  timestamp: new Date().toISOString(),
  steps: [
    '1. Called getSwapAmountSaros',
    '2. Got quote',
    '3. Called swapSaros',
    '4. Error occurred'
  ]
};
```

Remember: The Solana blockchain is complex, and issues can come from many sources. Be patient, methodical, and always test with small amounts first!