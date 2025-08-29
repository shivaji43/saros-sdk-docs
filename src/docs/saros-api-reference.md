# Saros SDK API Reference

Complete reference for all methods, parameters, and return types in the Saros SDK.

## Table of Contents

- [Core Methods](#core-methods)
- [Swap Functions](#swap-functions)
- [Liquidity Functions](#liquidity-functions)
- [Farming Functions](#farming-functions)
- [Staking Functions](#staking-functions)
- [Utility Functions](#utility-functions)
- [Type Definitions](#type-definitions)

## Core Methods

### genConnectionSolana()

Creates a connection to Solana mainnet.

```javascript
const connection = genConnectionSolana()
```

**Returns:** `Connection` - Solana web3 connection object

**Example:**
```javascript
import { genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
console.log('Connected to:', connection.rpcEndpoint);
```

---

### genOwnerSolana(wallet)

Generates owner account object from wallet address.

```javascript
const owner = await genOwnerSolana(walletAddress)
```

**Parameters:**
- `wallet` (string) - Wallet public key address

**Returns:** `Object`
- `publicKey` - PublicKey object

**Example:**
```javascript
const owner = await genOwnerSolana('5UrM9csUEDBeBqMZTuuZyHRNhbRW4vQ1MgKJDrKU1U2v');
```

---

## Swap Functions

### getSwapAmountSaros(connection, fromMint, toMint, amount, slippage, poolParams)

Calculate swap output amount with slippage protection.

```javascript
const estimate = await getSwapAmountSaros(
  connection,
  fromMint,
  toMint,
  amount,
  slippage,
  poolParams
)
```

**Parameters:**
- `connection` (Connection) - Solana connection
- `fromMint` (string) - Source token mint address
- `toMint` (string) - Destination token mint address  
- `amount` (number) - Input amount
- `slippage` (number) - Slippage tolerance percentage
- `poolParams` (Object) - Pool configuration
  - `address` (string) - Pool address
  - `tokens` (Object) - Token information map
  - `tokenIds` (Array<string>) - Token mint addresses

**Returns:** `Object`
- `amountOut` (number) - Expected output amount
- `amountOutWithSlippage` (number) - Minimum output with slippage
- `priceImpact` (number) - Price impact percentage
- `rate` (number) - Exchange rate

**Example:**
```javascript
const estimate = await getSwapAmountSaros(
  connection,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',  // C98
  100,  // 100 USDC
  0.5,  // 0.5% slippage
  {
    address: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
    tokens: { /* token info */ },
    tokenIds: ['USDC_MINT', 'C98_MINT']
  }
);

console.log(`You'll receive: ${estimate.amountOut} C98`);
console.log(`Price impact: ${estimate.priceImpact}%`);
```

---

### swapSaros(connection, fromAccount, toAccount, fromAmount, minToAmount, hostFee, poolAddress, programId, wallet, fromMint, toMint)

Execute a token swap on Saros.

```javascript
const result = await swapSaros(
  connection,
  fromTokenAccount,
  toTokenAccount,
  fromAmount,
  minToAmount,
  hostFeeAccount,
  poolAddress,
  programId,
  walletAddress,
  fromMint,
  toMint
)
```

**Parameters:**
- `connection` (Connection) - Solana connection
- `fromAccount` (string) - Source token account
- `toAccount` (string) - Destination token account
- `fromAmount` (number) - Amount to swap
- `minToAmount` (number) - Minimum output amount
- `hostFee` (string|null) - Host fee account (optional)
- `poolAddress` (PublicKey) - Pool address
- `programId` (PublicKey) - Swap program ID
- `wallet` (string) - User wallet address
- `fromMint` (string) - Source token mint
- `toMint` (string) - Destination token mint

**Returns:** `Object`
- `isError` (boolean) - Whether swap failed
- `mess` (string) - Error message or transaction hash
- `hash` (string) - Transaction signature (if successful)

**Error Codes:**
- `gasSolNotEnough` - Insufficient SOL for fees
- `tradeErrFund` - Insufficient token balance
- `sizeTooSmall` - Swap amount too small
- `exceedsLimit` - Exceeds pool liquidity
- `tooLarge` - Transaction too large

**Example:**
```javascript
const result = await swapSaros(
  connection,
  userUSDCAccount,
  userC98Account,
  100,
  95,  // Minimum 95 C98 expected
  null,
  new PublicKey(poolAddress),
  SAROS_SWAP_PROGRAM_ADDRESS_V1,
  walletAddress,
  'USDC_MINT',
  'C98_MINT'
);

if (!result.isError) {
  console.log(`Swap successful: ${result.hash}`);
}
```

---

### swapRouteSaros(connection, ...params)

Execute multi-hop swap through intermediate token.

```javascript
const result = await swapRouteSaros(
  connection,
  fromAccount,
  middleAccount,
  toAccount,
  amountIn,
  minAmountOut,
  middleAmount,
  hostFee,
  poolA,
  poolB,
  programId,
  wallet,
  fromMint,
  toMint,
  middleMint,
  callback,
  transaction
)
```

**Parameters:**
- All parameters from `swapSaros` plus:
- `middleAccount` (string) - Intermediate token account
- `middleAmount` (number) - Expected middle token amount
- `poolB` (PublicKey) - Second pool address
- `middleMint` (string) - Intermediate token mint

**Returns:** Same as `swapSaros`

---

## Liquidity Functions

### createPool(connection, owner, feeOwner, token0Mint, token1Mint, token0Account, token1Account, token0Amount, token1Amount, curveType, curveParams, tokenProgram, swapProgram)

Create a new liquidity pool.

```javascript
const result = await createPool(
  connection,
  ownerAddress,
  feeOwnerKey,
  token0MintKey,
  token1MintKey,
  token0AccountKey,
  token1AccountKey,
  token0Amount,
  token1Amount,
  curveType,
  curveParameters,
  tokenProgramId,
  swapProgramId
)
```

**Parameters:**
- `connection` (Connection) - Solana connection
- `owner` (string) - Pool creator address
- `feeOwner` (PublicKey) - Fee recipient
- `token0Mint` (PublicKey) - First token mint
- `token1Mint` (PublicKey) - Second token mint
- `token0Account` (PublicKey) - First token account
- `token1Account` (PublicKey) - Second token account
- `token0Amount` (string) - Initial token0 amount (in wei)
- `token1Amount` (string) - Initial token1 amount (in wei)
- `curveType` (number) - 0 for normal, 1 for stable pairs
- `curveParams` (BN) - Curve parameters
- `tokenProgram` (PublicKey) - Token program ID
- `swapProgram` (PublicKey) - Swap program ID

**Returns:** `Object`
- `isError` (boolean) - Whether creation failed
- `mess` (string) - Error message
- `hash` (string) - Transaction hash
- `poolAccount` (Keypair) - New pool account

**Example:**
```javascript
const result = await createPool(
  connection,
  walletAddress,
  new PublicKey(FEE_OWNER),
  new PublicKey(USDC_MINT),
  new PublicKey(C98_MINT),
  new PublicKey(usdcAccount),
  new PublicKey(c98Account),
  '1000000000', // 1000 USDC (6 decimals)
  '2000000000', // 2000 C98
  0, // Normal curve
  new BN(0),
  TOKEN_PROGRAM_ID,
  SAROS_SWAP_PROGRAM_ADDRESS_V1
);
```

---

### depositAllTokenTypes(connection, wallet, user, token0Account, token1Account, lpAmount, pool, program, token0Mint, token1Mint, slippage)

Add liquidity to an existing pool.

```javascript
const result = await depositAllTokenTypes(
  connection,
  walletAddress,
  userPublicKey,
  token0Account,
  token1Account,
  lpTokenAmount,
  poolAddress,
  swapProgramId,
  token0Mint,
  token1Mint,
  slippage
)
```

**Parameters:**
- `connection` (Connection) - Solana connection
- `wallet` (string) - Wallet address
- `user` (PublicKey) - User public key
- `token0Account` (PublicKey) - First token account
- `token1Account` (PublicKey) - Second token account
- `lpAmount` (number) - LP tokens to mint
- `pool` (PublicKey) - Pool address
- `program` (PublicKey) - Swap program ID
- `token0Mint` (string) - First token mint
- `token1Mint` (string) - Second token mint
- `slippage` (number) - Slippage tolerance

**Returns:** `Object`
- `isError` (boolean) - Whether deposit failed
- `mess` (string) - Error message
- `hash` (string) - Transaction hash

---

### withdrawAllTokenTypes(connection, wallet, lpAccount, token0Account, token1Account, lpAmount, pool, program, token0Mint, token1Mint, slippage)

Remove liquidity from pool.

```javascript
const result = await withdrawAllTokenTypes(
  connection,
  walletAddress,
  userLpTokenAccount,
  token0Account,
  token1Account,
  lpTokenAmount,
  poolAddress,
  swapProgramId,
  token0Mint,
  token1Mint,
  slippage
)
```

**Parameters:** Similar to `depositAllTokenTypes`
- `lpAccount` (string) - User's LP token account

**Returns:** Same as `depositAllTokenTypes`

---

### getPoolInfo(connection, poolAddress)

Get detailed pool information.

```javascript
const poolInfo = await getPoolInfo(connection, poolAddress)
```

**Parameters:**
- `connection` (Connection) - Solana connection
- `poolAddress` (PublicKey) - Pool address

**Returns:** `Object`
- `token0Mint` (PublicKey) - First token mint
- `token1Mint` (PublicKey) - Second token mint
- `token0Account` (PublicKey) - Pool's token0 account
- `token1Account` (PublicKey) - Pool's token1 account
- `lpTokenMint` (PublicKey) - LP token mint
- `feeAccount` (PublicKey) - Fee account
- `tradeFeeNumerator` (BN) - Trade fee numerator
- `tradeFeeDenominator` (BN) - Trade fee denominator
- `curveType` (number) - Curve type

---

## Farming Functions

### SarosFarmService.stakePool(connection, payer, pool, amount, program, rewards, lpAddress)

Stake LP tokens in farm.

```javascript
const txHash = await SarosFarmService.stakePool(
  connection,
  payerAccount,
  poolAddress,
  amountBN,
  farmProgramAddress,
  rewardsArray,
  lpTokenAddress
)
```

**Parameters:**
- `connection` (Connection) - Solana connection
- `payer` (Object) - Payer account with publicKey
- `pool` (PublicKey) - Farm pool address
- `amount` (BN) - Amount to stake (in wei)
- `program` (PublicKey) - Farm program address
- `rewards` (Array) - Reward configuration array
- `lpAddress` (PublicKey) - LP token mint address

**Returns:** `string` - Transaction hash or error message

---

### SarosFarmService.unstakePool(connection, payer, pool, lpAddress, amount, program, rewards, isMax)

Unstake LP tokens from farm.

```javascript
const result = await SarosFarmService.unstakePool(
  connection,
  payerAccount,
  poolAddress,
  lpAddress,
  amountBN,
  farmProgramAddress,
  rewardsArray,
  isMaxBalance
)
```

**Parameters:**
- Same as `stakePool` plus:
- `isMax` (boolean) - Whether to unstake entire balance

**Returns:** `string` - Success message with transaction hash

---

### SarosFarmService.claimReward(connection, payer, poolReward, program, mint)

Claim farming rewards.

```javascript
const txHash = await SarosFarmService.claimReward(
  connection,
  payerAccount,
  poolRewardAddress,
  farmProgramAddress,
  rewardMintAddress
)
```

**Parameters:**
- `connection` (Connection) - Solana connection
- `payer` (Object) - Payer account
- `poolReward` (PublicKey) - Pool reward address
- `program` (PublicKey) - Farm program address
- `mint` (PublicKey) - Reward token mint

**Returns:** `string` - Transaction hash

---

### SarosFarmService.getListPool({page, size})

Get paginated list of farm pools.

```javascript
const farms = await SarosFarmService.getListPool({
  page: 1,
  size: 10
})
```

**Parameters:**
- `page` (number) - Page number (1-indexed)
- `size` (number) - Items per page

**Returns:** `Array<Object>` - Farm pool data with APR and liquidity

---

## Staking Functions

### SarosStakeServices.stakePool(...)

Stake single tokens (not LP tokens).

**Parameters:** Same as `SarosFarmService.stakePool`

**Returns:** Same as farm staking

---

### SarosStakeServices.getListPool({page, size})

Get list of single-asset staking pools.

```javascript
const stakePools = await SarosStakeServices.getListPool({
  page: 1,
  size: 10
})
```

**Returns:** `Array<Object>` - Staking pool data

---

## Utility Functions

### convertBalanceToWei(value, decimals)

Convert human-readable amount to blockchain units.

```javascript
const wei = convertBalanceToWei('100.5', 6)
```

**Parameters:**
- `value` (string|number) - Human-readable amount
- `decimals` (number) - Token decimals

**Returns:** `string` - Amount in smallest unit

**Example:**
```javascript
const usdcWei = convertBalanceToWei('100', 6);  // Returns '100000000'
const solWei = convertBalanceToWei('1', 9);      // Returns '1000000000'
```

---

### convertWeiToBalance(value, decimals)

Convert blockchain units to human-readable amount.

```javascript
const balance = convertWeiToBalance('100000000', 6)
```

**Parameters:**
- `value` (string) - Amount in smallest unit
- `decimals` (number) - Token decimals

**Returns:** `string` - Human-readable amount

---

### getInfoTokenByMint(mint, wallet)

Get token account info for a specific mint.

```javascript
const tokenInfo = await getInfoTokenByMint(mintAddress, walletAddress)
```

**Parameters:**
- `mint` (string) - Token mint address
- `wallet` (string) - Wallet address

**Returns:** `Object|null` - Token account info or null

---

### getTokenAccountInfo(connection, address)

Get detailed token account information.

```javascript
const accountInfo = await getTokenAccountInfo(connection, tokenAccount)
```

**Returns:** `Object`
- `mint` (PublicKey) - Token mint
- `owner` (PublicKey) - Account owner
- `amount` (BN) - Token amount
- `delegate` (PublicKey|null) - Delegate address
- `isInitialized` (boolean) - Account status

---

### getTokenMintInfo(connection, address)

Get token mint information.

```javascript
const mintInfo = await getTokenMintInfo(connection, mintAddress)
```

**Returns:** `Object`
- `supply` (BN) - Total supply
- `decimals` (number) - Token decimals
- `isInitialized` (boolean) - Mint status
- `mintAuthority` (PublicKey|null) - Mint authority

---

## Type Definitions

### PoolParams
```typescript
interface PoolParams {
  address: string;
  tokens: {
    [mintAddress: string]: {
      id: string;
      mintAddress: string;
      symbol: string;
      name: string;
      icon: string;
      decimals: string;
      addressSPL?: string;
    }
  };
  tokenIds: string[];
}
```

### FarmParams
```typescript
interface FarmParams {
  lpAddress: string;
  poolAddress: string;
  poolLpAddress: string;
  rewards: Array<{
    address: string;
    poolRewardAddress: string;
    rewardPerBlock: number;
    rewardTokenAccount: string;
    id: string;
  }>;
  token0: string;
  token1: string;
  token0Id: string;
  token1Id: string;
  startBlock?: number;
  endBlock?: number;
}
```

### SwapResult
```typescript
interface SwapResult {
  isError: boolean;
  mess?: string;
  hash?: string;
}
```

### SwapEstimate
```typescript
interface SwapEstimate {
  amountOut: number;
  amountOutWithSlippage: number;
  priceImpact: number;
  rate: number;
}
```

## Error Handling

### Common Error Messages

| Error Code | Description | Solution |
|------------|-------------|----------|
| `gasSolNotEnough` | Insufficient SOL for transaction fees | Add SOL to wallet |
| `tradeErrFund` | Insufficient token balance | Check token balance |
| `sizeTooSmall` | Trade amount below minimum | Increase trade size |
| `exceedsLimit` | Trade exceeds pool liquidity | Reduce trade size or use multi-hop |
| `tooLarge` | Transaction size exceeds limit | Split into multiple transactions |
| `txsFail` | Generic transaction failure | Check logs for details |

### Error Handling Pattern

```javascript
try {
  const result = await swapSaros(/* params */);
  
  if (result.isError) {
    switch(result.mess) {
      case 'gasSolNotEnough':
        // Handle insufficient SOL
        break;
      case 'exceedsLimit':
        // Handle liquidity issues
        break;
      default:
        // Handle generic error
    }
  } else {
    // Success
    console.log(`Transaction: ${result.hash}`);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## Constants

### Program IDs
```javascript
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SAROS_SWAP_PROGRAM_ADDRESS_V1 = new PublicKey('SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr');
const SAROS_FARM_ADDRESS = new PublicKey('SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ');
const ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
```

### Common Token Mints
```javascript
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
```

## Best Practices

1. **Always use try-catch** blocks for async operations
2. **Check transaction results** before proceeding
3. **Validate user inputs** before blockchain calls
4. **Cache pool data** when possible
5. **Use appropriate slippage** (0.5-1% for stable, 2-5% for volatile)
6. **Monitor gas costs** and maintain SOL balance
7. **Implement retry logic** for failed transactions
8. **Log all transactions** for debugging

## Support

- GitHub: [github.com/coin98/saros-sdk](https://github.com/coin98/saros-sdk)
- NPM: [@saros-finance/sdk](https://www.npmjs.com/package/@saros-finance/sdk)
- Issues: [GitHub Issues](https://github.com/coin98/saros-sdk/issues)