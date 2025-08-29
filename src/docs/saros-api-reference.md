# Saros SDK API Reference

Complete reference for all methods, parameters, and return types in the Saros SDK.

---

## Table of Contents

- **[Core Methods](#core-methods)** - Connection and account management
- **[Swap Functions](#swap-functions)** - Token swap operations
- **[Liquidity Functions](#liquidity-functions)** - Liquidity pool management
- **[Farming Functions](#farming-functions)** - Yield farming operations
- **[Staking Functions](#staking-functions)** - Single asset staking
- **[Utility Functions](#utility-functions)** - Helper and conversion functions
- **[Type Definitions](#type-definitions)** - TypeScript type definitions

---

## Core Methods

### `genConnectionSolana()`

Creates a connection to Solana mainnet.

**Syntax:**
```javascript
const connection = genConnectionSolana()
```

**Parameters:** None

**Returns:** `Connection` - Solana web3 connection object

**Example:**
```javascript
import { genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
console.log('Connected to:', connection.rpcEndpoint);
```

---

### `genOwnerSolana(wallet)`

Generates owner account object from wallet address.

**Syntax:**
```javascript
const owner = await genOwnerSolana(walletAddress)
```

**Parameters:**
- `wallet` **(string)** - Wallet public key address

**Returns:** `Object`
- `publicKey` - PublicKey object
- `secretKey` - Secret key (if available)

**Example:**
```javascript
import { genOwnerSolana } from '@saros-finance/sdk';

const wallet = 'YOUR_WALLET_ADDRESS';
const owner = await genOwnerSolana(wallet);
console.log('Owner public key:', owner.publicKey.toBase58());
```

---

### `getInfoTokenByMint(connection, mint)`

Retrieves token information by mint address.

**Syntax:**
```javascript
const tokenInfo = await getInfoTokenByMint(connection, mintAddress)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `mint` **(string)** - Token mint address

**Returns:** `TokenInfo`
- `symbol` - Token symbol
- `name` - Token name
- `decimals` - Number of decimal places
- `supply` - Total supply

**Example:**
```javascript
import { getInfoTokenByMint, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const tokenInfo = await getInfoTokenByMint(connection, usdcMint);
console.log(`Token: ${tokenInfo.symbol} (${tokenInfo.decimals} decimals)`);
```

---

## Swap Functions

### `getSwapAmountSaros(connection, fromMint, toMint, amount, slippage, poolParams)`

Calculates swap output amount and price impact.

**Syntax:**
```javascript
const quote = await getSwapAmountSaros(
  connection,
  fromMint,
  toMint,
  amount,
  slippage,
  poolParams
)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `fromMint` **(string)** - Input token mint address
- `toMint` **(string)** - Output token mint address
- `amount` **(number)** - Input amount in token units
- `slippage` **(number)** - Slippage tolerance percentage (e.g., 0.5 for 0.5%)
- `poolParams` **(PoolParams)** - Pool configuration object

**Returns:** `SwapQuote`
- `amountIn` - Input amount in smallest units
- `amountOut` - Expected output amount
- `amountOutWithSlippage` - Minimum output after slippage
- `priceImpact` - Price impact percentage
- `fee` - Trading fee amount

**Example:**
```javascript
import { getSwapAmountSaros, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const fromMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
const toMint = 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9';   // C98

const poolParams = {
  address: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
  tokens: {
    [fromMint]: { decimals: 6, symbol: 'USDC' },
    [toMint]: { decimals: 6, symbol: 'C98' }
  },
  tokenIds: [fromMint, toMint]
};

const quote = await getSwapAmountSaros(
  connection,
  fromMint,
  toMint,
  100, // 100 USDC
  0.5, // 0.5% slippage
  poolParams
);

console.log(`Quote: ${quote.amountOut} C98 for 100 USDC`);
console.log(`Price impact: ${quote.priceImpact}%`);
```

---

### `swapSaros(connection, fromAccount, toAccount, amountIn, amountOutMin, hostFeeAccount, poolAddress, programId, walletAddress, fromMint, toMint)`

Executes a token swap transaction.

**Syntax:**
```javascript
const result = await swapSaros(
  connection,
  fromAccount,
  toAccount,
  amountIn,
  amountOutMin,
  hostFeeAccount,
  poolAddress,
  programId,
  walletAddress,
  fromMint,
  toMint
)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `fromAccount` **(PublicKey)** - Source token account
- `toAccount` **(PublicKey)** - Destination token account
- `amountIn` **(number)** - Input amount in smallest units
- `amountOutMin` **(number)** - Minimum acceptable output amount
- `hostFeeAccount` **(PublicKey | null)** - Host fee account (optional)
- `poolAddress` **(PublicKey)** - Swap pool address
- `programId` **(PublicKey)** - Saros swap program ID
- `walletAddress` **(string)** - User wallet address
- `fromMint` **(string)** - Input token mint
- `toMint` **(string)** - Output token mint

**Returns:** `SwapResult`
- `isError` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `mess` - Error message (if failed)

**Example:**
```javascript
import { swapSaros, genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

const connection = genConnectionSolana();
const result = await swapSaros(
  connection,
  new PublicKey('USER_USDC_ACCOUNT'),
  new PublicKey('USER_C98_ACCOUNT'),
  100000000, // 100 USDC (6 decimals)
  50000000,  // Minimum 50 C98 (6 decimals)
  null,
  new PublicKey('POOL_ADDRESS'),
  new PublicKey('PROGRAM_ID'),
  'USER_WALLET_ADDRESS',
  'USDC_MINT',
  'C98_MINT'
);

if (!result.isError) {
  console.log('Swap successful! Transaction:', result.hash);
} else {
  console.error('Swap failed:', result.mess);
}
```

---

### `swapRouteSaros(connection, routes, amountIn, amountOutMin, walletAddress)`

Executes a multi-hop swap through multiple pools.

**Syntax:**
```javascript
const result = await swapRouteSaros(
  connection,
  routes,
  amountIn,
  amountOutMin,
  walletAddress
)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `routes` **(RouteInfo[])** - Array of route information
- `amountIn` **(number)** - Input amount in smallest units
- `amountOutMin` **(number)** - Minimum acceptable final output
- `walletAddress` **(string)** - User wallet address

**Returns:** `SwapResult`
- `isError` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `mess` - Error message (if failed)

**Example:**
```javascript
import { swapRouteSaros, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const routes = [
  {
    poolAddress: 'POOL_1_ADDRESS',
    fromMint: 'TOKEN_A_MINT',
    toMint: 'TOKEN_B_MINT'
  },
  {
    poolAddress: 'POOL_2_ADDRESS',
    fromMint: 'TOKEN_B_MINT',
    toMint: 'TOKEN_C_MINT'
  }
];

const result = await swapRouteSaros(
  connection,
  routes,
  1000000, // Input amount
  800000,  // Minimum output
  'USER_WALLET_ADDRESS'
);

if (!result.isError) {
  console.log('Route swap successful!', result.hash);
}
```

---

## Liquidity Functions

### `getPoolInfo(connection, poolAddress)`

Retrieves comprehensive pool information.

**Syntax:**
```javascript
const poolInfo = await getPoolInfo(connection, poolAddress)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `poolAddress` **(string)** - Pool address

**Returns:** `PoolInfo`
- `tokenA` - First token information
- `tokenB` - Second token information
- `reserves` - Current pool reserves
- `totalSupply` - Total LP token supply
- `fee` - Pool trading fee

**Example:**
```javascript
import { getPoolInfo, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const poolAddress = '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty';

const poolInfo = await getPoolInfo(connection, poolAddress);
console.log('Pool reserves:', poolInfo.reserves);
console.log('Trading fee:', poolInfo.fee);
```

---

### `depositAllTokenTypes(connection, poolAddress, amountA, amountB, tokenAccountA, tokenAccountB, lpTokenAccount, walletAddress)`

Adds liquidity to a pool with both tokens.

**Syntax:**
```javascript
const result = await depositAllTokenTypes(
  connection,
  poolAddress,
  amountA,
  amountB,
  tokenAccountA,
  tokenAccountB,
  lpTokenAccount,
  walletAddress
)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `poolAddress` **(string)** - Target pool address
- `amountA` **(number)** - Amount of token A to deposit
- `amountB` **(number)** - Amount of token B to deposit
- `tokenAccountA` **(PublicKey)** - User's token A account
- `tokenAccountB` **(PublicKey)** - User's token B account
- `lpTokenAccount` **(PublicKey)** - User's LP token account
- `walletAddress` **(string)** - User wallet address

**Returns:** `LiquidityResult`
- `isError` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `lpAmount` - LP tokens received
- `mess` - Error message (if failed)

**Example:**
```javascript
import { depositAllTokenTypes, genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

const connection = genConnectionSolana();
const result = await depositAllTokenTypes(
  connection,
  'POOL_ADDRESS',
  1000000, // 1 USDC (6 decimals)
  500000,  // 0.5 C98 (6 decimals)
  new PublicKey('USER_USDC_ACCOUNT'),
  new PublicKey('USER_C98_ACCOUNT'),
  new PublicKey('USER_LP_ACCOUNT'),
  'USER_WALLET_ADDRESS'
);

if (!result.isError) {
  console.log('Liquidity added! LP tokens:', result.lpAmount);
}
```

---

### `withdrawAllTokenTypes(connection, poolAddress, lpAmount, tokenAccountA, tokenAccountB, lpTokenAccount, walletAddress)`

Removes liquidity from a pool.

**Syntax:**
```javascript
const result = await withdrawAllTokenTypes(
  connection,
  poolAddress,
  lpAmount,
  tokenAccountA,
  tokenAccountB,
  lpTokenAccount,
  walletAddress
)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `poolAddress` **(string)** - Target pool address
- `lpAmount` **(number)** - Amount of LP tokens to burn
- `tokenAccountA` **(PublicKey)** - User's token A account
- `tokenAccountB` **(PublicKey)** - User's token B account
- `lpTokenAccount` **(PublicKey)** - User's LP token account
- `walletAddress` **(string)** - User wallet address

**Returns:** `LiquidityResult`
- `isError` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `amountA` - Token A received
- `amountB` - Token B received
- `mess` - Error message (if failed)

**Example:**
```javascript
import { withdrawAllTokenTypes, genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

const connection = genConnectionSolana();
const result = await withdrawAllTokenTypes(
  connection,
  'POOL_ADDRESS',
  1000000, // 1 LP token
  new PublicKey('USER_USDC_ACCOUNT'),
  new PublicKey('USER_C98_ACCOUNT'),
  new PublicKey('USER_LP_ACCOUNT'),
  'USER_WALLET_ADDRESS'
);

if (!result.isError) {
  console.log('Liquidity removed!');
  console.log('Received:', result.amountA, 'token A');
  console.log('Received:', result.amountB, 'token B');
}
```

---

### `createPool(connection, tokenAMint, tokenBMint, initialLiquidityA, initialLiquidityB, walletAddress)`

Creates a new liquidity pool.

**Syntax:**
```javascript
const result = await createPool(
  connection,
  tokenAMint,
  tokenBMint,
  initialLiquidityA,
  initialLiquidityB,
  walletAddress
)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `tokenAMint` **(string)** - First token mint address
- `tokenBMint` **(string)** - Second token mint address
- `initialLiquidityA` **(number)** - Initial amount of token A
- `initialLiquidityB` **(number)** - Initial amount of token B
- `walletAddress` **(string)** - Pool creator wallet address

**Returns:** `CreatePoolResult`
- `isError` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `poolAddress` - New pool address
- `mess` - Error message (if failed)

**Example:**
```javascript
import { createPool, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const result = await createPool(
  connection,
  'TOKEN_A_MINT',
  'TOKEN_B_MINT',
  1000000000, // 1000 tokens (9 decimals)
  500000000,  // 500 tokens (9 decimals)
  'CREATOR_WALLET_ADDRESS'
);

if (!result.isError) {
  console.log('Pool created!');
  console.log('Pool address:', result.poolAddress);
}
```

---

## Farming Functions

### `SarosFarmService`

Service class for managing yield farming operations.

**Constructor:**
```javascript
const farmService = new SarosFarmService(connection)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object

#### `farmService.getFarmInfo(farmAddress)`

Gets information about a specific farm.

**Syntax:**
```javascript
const farmInfo = await farmService.getFarmInfo(farmAddress)
```

**Parameters:**
- `farmAddress` **(string)** - Farm address

**Returns:** `FarmInfo`
- `stakingToken` - Token that can be staked
- `rewardToken` - Reward token earned
- `apr` - Annual percentage rate
- `totalStaked` - Total amount staked in farm
- `userStaked` - User's staked amount

**Example:**
```javascript
import { SarosFarmService, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const farmService = new SarosFarmService(connection);

const farmInfo = await farmService.getFarmInfo('FARM_ADDRESS');
console.log('APR:', farmInfo.apr);
console.log('Total staked:', farmInfo.totalStaked);
```

#### `farmService.deposit(farmAddress, amount, tokenAccount, walletAddress)`

Stakes LP tokens in a farm.

**Syntax:**
```javascript
const result = await farmService.deposit(
  farmAddress,
  amount,
  tokenAccount,
  walletAddress
)
```

**Parameters:**
- `farmAddress` **(string)** - Target farm address
- `amount` **(number)** - Amount to stake
- `tokenAccount` **(PublicKey)** - User's LP token account
- `walletAddress` **(string)** - User wallet address

**Returns:** `FarmResult`
- `success` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `error` - Error message (if failed)

**Example:**
```javascript
import { SarosFarmService, genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

const connection = genConnectionSolana();
const farmService = new SarosFarmService(connection);

const result = await farmService.deposit(
  'FARM_ADDRESS',
  1000000, // 1 LP token
  new PublicKey('USER_LP_ACCOUNT'),
  'USER_WALLET_ADDRESS'
);

if (result.success) {
  console.log('Staked successfully!', result.hash);
}
```

#### `farmService.withdraw(farmAddress, amount, tokenAccount, walletAddress)`

Withdraws staked LP tokens from a farm.

**Syntax:**
```javascript
const result = await farmService.withdraw(
  farmAddress,
  amount,
  tokenAccount,
  walletAddress
)
```

**Parameters:**
- `farmAddress` **(string)** - Target farm address
- `amount` **(number)** - Amount to withdraw
- `tokenAccount` **(PublicKey)** - User's LP token account
- `walletAddress` **(string)** - User wallet address

**Returns:** `FarmResult`
- `success` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `rewardsEarned` - Rewards claimed
- `error` - Error message (if failed)

**Example:**
```javascript
const result = await farmService.withdraw(
  'FARM_ADDRESS',
  500000, // 0.5 LP tokens
  new PublicKey('USER_LP_ACCOUNT'),
  'USER_WALLET_ADDRESS'
);

if (result.success) {
  console.log('Withdrawn successfully!');
  console.log('Rewards earned:', result.rewardsEarned);
}
```

#### `farmService.claimRewards(farmAddress, walletAddress)`

Claims pending rewards without withdrawing staked tokens.

**Syntax:**
```javascript
const result = await farmService.claimRewards(farmAddress, walletAddress)
```

**Parameters:**
- `farmAddress` **(string)** - Target farm address
- `walletAddress` **(string)** - User wallet address

**Returns:** `FarmResult`
- `success` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `rewardsClaimed` - Amount of rewards claimed
- `error` - Error message (if failed)

**Example:**
```javascript
const result = await farmService.claimRewards(
  'FARM_ADDRESS',
  'USER_WALLET_ADDRESS'
);

if (result.success) {
  console.log('Rewards claimed:', result.rewardsClaimed);
}
```

---

## Staking Functions

### `SarosStakeServices`

Service class for single-asset staking operations.

**Constructor:**
```javascript
const stakeService = new SarosStakeServices(connection)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object

#### `stakeService.getStakeInfo(stakeAddress)`

Gets information about a staking pool.

**Syntax:**
```javascript
const stakeInfo = await stakeService.getStakeInfo(stakeAddress)
```

**Parameters:**
- `stakeAddress` **(string)** - Staking pool address

**Returns:** `StakeInfo`
- `stakingToken` - Token that can be staked
- `apr` - Annual percentage rate
- `totalStaked` - Total amount staked
- `lockPeriod` - Lock period in seconds

**Example:**
```javascript
import { SarosStakeServices, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const stakeService = new SarosStakeServices(connection);

const stakeInfo = await stakeService.getStakeInfo('STAKE_ADDRESS');
console.log('Staking APR:', stakeInfo.apr);
console.log('Lock period:', stakeInfo.lockPeriod, 'seconds');
```

#### `stakeService.stake(stakeAddress, amount, tokenAccount, walletAddress)`

Stakes tokens in a staking pool.

**Syntax:**
```javascript
const result = await stakeService.stake(
  stakeAddress,
  amount,
  tokenAccount,
  walletAddress
)
```

**Parameters:**
- `stakeAddress` **(string)** - Target staking pool address
- `amount` **(number)** - Amount to stake
- `tokenAccount` **(PublicKey)** - User's token account
- `walletAddress` **(string)** - User wallet address

**Returns:** `StakeResult`
- `success` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `unlockTime` - When tokens can be unstaked
- `error` - Error message (if failed)

**Example:**
```javascript
import { SarosStakeServices, genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';

const connection = genConnectionSolana();
const stakeService = new SarosStakeServices(connection);

const result = await stakeService.stake(
  'STAKE_ADDRESS',
  1000000000, // 1000 tokens (9 decimals)
  new PublicKey('USER_TOKEN_ACCOUNT'),
  'USER_WALLET_ADDRESS'
);

if (result.success) {
  console.log('Staked successfully!');
  console.log('Unlock time:', new Date(result.unlockTime));
}
```

#### `stakeService.unstake(stakeAddress, amount, tokenAccount, walletAddress)`

Unstakes tokens from a staking pool.

**Syntax:**
```javascript
const result = await stakeService.unstake(
  stakeAddress,
  amount,
  tokenAccount,
  walletAddress
)
```

**Parameters:**
- `stakeAddress` **(string)** - Target staking pool address
- `amount` **(number)** - Amount to unstake
- `tokenAccount` **(PublicKey)** - User's token account
- `walletAddress` **(string)** - User wallet address

**Returns:** `StakeResult`
- `success` - Boolean indicating success/failure
- `hash` - Transaction signature (if successful)
- `rewardsEarned` - Rewards earned during staking
- `error` - Error message (if failed)

**Example:**
```javascript
const result = await stakeService.unstake(
  'STAKE_ADDRESS',
  500000000, // 500 tokens (9 decimals)
  new PublicKey('USER_TOKEN_ACCOUNT'),
  'USER_WALLET_ADDRESS'
);

if (result.success) {
  console.log('Unstaked successfully!');
  console.log('Rewards earned:', result.rewardsEarned);
}
```

---

## Utility Functions

### `convertBalanceToWei(balance, decimals)`

Converts human-readable token amount to smallest units.

**Syntax:**
```javascript
const weiAmount = convertBalanceToWei(balance, decimals)
```

**Parameters:**
- `balance` **(number)** - Human-readable amount
- `decimals` **(number)** - Token decimal places

**Returns:** `number` - Amount in smallest units

**Example:**
```javascript
import { convertBalanceToWei } from '@saros-finance/sdk';

const usdcAmount = convertBalanceToWei(100, 6); // 100 USDC
console.log('USDC in wei:', usdcAmount); // 100000000
```

---

### `convertWeiToBalance(weiAmount, decimals)`

Converts smallest unit amount to human-readable format.

**Syntax:**
```javascript
const balance = convertWeiToBalance(weiAmount, decimals)
```

**Parameters:**
- `weiAmount` **(number)** - Amount in smallest units
- `decimals` **(number)** - Token decimal places

**Returns:** `number` - Human-readable amount

**Example:**
```javascript
import { convertWeiToBalance } from '@saros-finance/sdk';

const balance = convertWeiToBalance(100000000, 6); // USDC wei to balance
console.log('USDC balance:', balance); // 100
```

---

### `calculateAPR(rewards, principal, timeInSeconds)`

Calculates Annual Percentage Rate.

**Syntax:**
```javascript
const apr = calculateAPR(rewards, principal, timeInSeconds)
```

**Parameters:**
- `rewards` **(number)** - Rewards earned
- `principal` **(number)** - Principal amount
- `timeInSeconds` **(number)** - Time period in seconds

**Returns:** `number` - APR as percentage

**Example:**
```javascript
import { calculateAPR } from '@saros-finance/sdk';

const apr = calculateAPR(
  100,      // 100 tokens earned
  1000,     // 1000 tokens staked
  2592000   // 30 days in seconds
);

console.log('APR:', apr.toFixed(2) + '%');
```

---

### `validateAddress(address)`

Validates a Solana public key address.

**Syntax:**
```javascript
const isValid = validateAddress(address)
```

**Parameters:**
- `address` **(string)** - Address to validate

**Returns:** `boolean` - True if valid, false otherwise

**Example:**
```javascript
import { validateAddress } from '@saros-finance/sdk';

const address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const isValid = validateAddress(address);
console.log('Valid address:', isValid); // true
```

---

### `getAccountBalance(connection, address)`

Gets account balance for any token account.

**Syntax:**
```javascript
const balance = await getAccountBalance(connection, address)
```

**Parameters:**
- `connection` **(Connection)** - Solana connection object
- `address` **(string)** - Token account address

**Returns:** `AccountBalance`
- `amount` - Balance amount
- `decimals` - Token decimals
- `uiAmount` - Human-readable amount

**Example:**
```javascript
import { getAccountBalance, genConnectionSolana } from '@saros-finance/sdk';

const connection = genConnectionSolana();
const balance = await getAccountBalance(connection, 'TOKEN_ACCOUNT_ADDRESS');

console.log('Balance:', balance.uiAmount);
console.log('Raw amount:', balance.amount);
```

---

## Type Definitions

### `Connection`
```typescript
interface Connection {
  rpcEndpoint: string;
  commitment: Commitment;
  getAccountInfo: (publicKey: PublicKey) => Promise<AccountInfo>;
  getBalance: (publicKey: PublicKey) => Promise<number>;
  // ... other Solana web3 connection methods
}
```

### `SwapQuote`
```typescript
interface SwapQuote {
  amountIn: number;           // Input amount in smallest units
  amountOut: number;          // Expected output amount
  amountOutWithSlippage: number; // Minimum output after slippage
  priceImpact: number;        // Price impact percentage
  fee: number;                // Trading fee amount
  route?: string[];           // Swap route (for multi-hop)
}
```

### `SwapResult`
```typescript
interface SwapResult {
  isError: boolean;           // Success/failure indicator
  hash?: string;              // Transaction signature
  mess?: string;              // Error message
}
```

### `PoolInfo`
```typescript
interface PoolInfo {
  tokenA: {
    mint: string;
    symbol: string;
    decimals: number;
    reserve: number;
  };
  tokenB: {
    mint: string;
    symbol: string;
    decimals: number;
    reserve: number;
  };
  totalSupply: number;        // Total LP token supply
  fee: number;                // Trading fee percentage
}
```

### `LiquidityResult`
```typescript
interface LiquidityResult {
  isError: boolean;           // Success/failure indicator
  hash?: string;              // Transaction signature
  lpAmount?: number;          // LP tokens received/burned
  amountA?: number;           // Token A amount
  amountB?: number;           // Token B amount
  mess?: string;              // Error message
}
```

### `FarmInfo`
```typescript
interface FarmInfo {
  stakingToken: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  rewardToken: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  apr: number;                // Annual percentage rate
  totalStaked: number;        // Total amount staked
  userStaked: number;         // User's staked amount
  pendingRewards: number;     // User's pending rewards
}
```

### `FarmResult`
```typescript
interface FarmResult {
  success: boolean;           // Success/failure indicator
  hash?: string;              // Transaction signature
  rewardsEarned?: number;     // Rewards earned/claimed
  rewardsClaimed?: number;    // Specific rewards claimed
  error?: string;             // Error message
}
```

### `StakeInfo`
```typescript
interface StakeInfo {
  stakingToken: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  apr: number;                // Annual percentage rate
  totalStaked: number;        // Total amount staked
  lockPeriod: number;         // Lock period in seconds
  minStake: number;           // Minimum stake amount
}
```

### `StakeResult`
```typescript
interface StakeResult {
  success: boolean;           // Success/failure indicator
  hash?: string;              // Transaction signature
  unlockTime?: number;        // Unlock timestamp
  rewardsEarned?: number;     // Rewards earned
  error?: string;             // Error message
}
```

### `TokenInfo`
```typescript
interface TokenInfo {
  symbol: string;             // Token symbol
  name: string;               // Token name
  decimals: number;           // Decimal places
  supply: number;             // Total supply
  mint: string;               // Mint address
}
```

### `AccountBalance`
```typescript
interface AccountBalance {
  amount: string;             // Raw amount as string
  decimals: number;           // Token decimals
  uiAmount: number;           // Human-readable amount
  uiAmountString: string;     // Human-readable amount as string
}
```

### `PoolParams`
```typescript
interface PoolParams {
  address: string;            // Pool address
  tokens: {
    [mint: string]: {
      decimals: number;
      symbol: string;
    };
  };
  tokenIds: string[];         // Array of token mints
}
```

### `RouteInfo`
```typescript
interface RouteInfo {
  poolAddress: string;        // Pool address for this hop
  fromMint: string;           // Input token mint
  toMint: string;             // Output token mint
  percentage?: number;        // Percentage of total for this route
}
```

---

## Error Codes

Common error codes and their meanings:

| Error Code | Description | Solution |
|------------|-------------|----------|
| `gasSolNotEnough` | Insufficient SOL for fees | Add more SOL to wallet |
| `exceedsLimit` | Amount exceeds pool limit | Use smaller amount |
| `sizeTooSmall` | Amount below minimum | Increase amount |
| `poolNotFound` | Pool doesn't exist | Check pool address |
| `insufficientBalance` | Not enough tokens | Check token balance |
| `slippageExceeded` | Price moved too much | Increase slippage tolerance |
| `txsFail` | Transaction failed | Retry transaction |
| `tokenAccountNotFound` | Token account missing | Create token account |

---

## Best Practices

### Error Handling
```javascript
try {
  const result = await swapSaros(/* parameters */);
  
  if (result.isError) {
    switch (result.mess) {
      case 'gasSolNotEnough':
        console.error('Need more SOL for fees');
        break;
      case 'exceedsLimit':
        console.error('Amount too large for pool');
        break;
      default:
        console.error('Swap failed:', result.mess);
    }
    return;
  }
  
  console.log('Success!', result.hash);
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### Connection Management
```javascript
// Reuse connection instances
const connection = genConnectionSolana();

// Use connection for multiple operations
const tokenInfo = await getInfoTokenByMint(connection, mintAddress);
const quote = await getSwapAmountSaros(connection, /* other params */);
```

### Amount Handling
```javascript
// Always convert to proper decimals
const userInput = 100; // User enters 100 USDC
const decimals = 6;    // USDC has 6 decimals
const amountInWei = convertBalanceToWei(userInput, decimals);

// Use wei amount in SDK calls
const quote = await getSwapAmountSaros(/* ..., */ amountInWei, /* ... */);

// Convert back for display
const outputAmount = convertWeiToBalance(quote.amountOut, outputDecimals);
```

---

## Support

- **GitHub**: [Saros SDK Repository](https://github.com/coin98/saros-sdk)
- **Documentation**: [docs.saros.finance](https://docs.saros.finance)
- **Discord**: [Community Support](https://discord.gg/saros)
- **Email**: support@coin98.com

---

**Last Updated**: November 2024  
**SDK Version**: 2.4.0