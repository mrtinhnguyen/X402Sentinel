# Avalanche Sentinel - Slide Notes

## What Sentinel Does

• **Token Analysis**
  - AI-powered risk assessment (0-100 score)
  - Multi-source data aggregation (CoinGecko, DexScreener, on-chain)
  - Social sentiment analysis (Twitter/X, Reddit)
  - Chart pattern detection & technical analysis
  - Holder distribution & whale activity tracking

• **Slippage Sentinel**
  - Safe slippage tolerance estimation
  - Pool depth analysis across DEXs
  - Volatility-adjusted calculations
  - Risk level indicators (LOW/MEDIUM/HIGH)

---

## Why Sentinel Matters

• **Risk Intelligence**
  - Prevents bad trades with comprehensive analysis
  - Identifies red flags before investment
  - Real-time on-chain + social data

• **Cost Efficiency**
  - $0.05 USDC micro-payments per analysis
  - No subscription fees
  - Pay-per-use model

• **AI-Powered Insights**
  - GPT-4o analyzes all data sources
  - Actionable recommendations (BUY/HOLD/SELL/AVOID)
  - Detailed reasoning & risk factors

• **Slippage Protection**
  - Prevents failed swaps
  - Optimizes trade execution
  - Saves gas fees from failed transactions

---

## How It Works - End-to-End Flow

### 🔍 Token Analysis Flow

1. **User Input**
   - User navigates to `/analysis` page
   - Enters Avalanche token contract address
   - Connects wallet via Thirdweb

2. **Payment Authorization**
   - User clicks "Analyze" button
   - Frontend calls `wrapFetchWithPayment()`
   - Wallet prompts for $0.05 USDC approval
   - User signs payment authorization

3. **API Request**
   - Payment signature encoded in `X-PAYMENT` header
   - GET request to `/api/token-analysis?tokenAddress={address}`

4. **Payment Verification**
   - Backend calls `settlePayment()` from x402 SDK
   - Facilitator (ERC4337 Smart Account) verifies payment on-chain
   - If invalid → Returns 402 Payment Required

5. **Data Aggregation (Parallel)**
   - **CoinGecko API** → Price, market cap, 24h volume, price change
   - **DexScreener API** → Pool data, liquidity, buy/sell ratio, holders
   - **Avalanche RPC** → Token info, transfer events, holder estimation
   - **X/Twitter API v2** → Recent tweets with multiple query strategies
   - **Reddit API** → Community posts and discussions

6. **AI Analysis**
   - GPT-4o (via OpenAI) analyzes all aggregated data
   - Generates risk score (0-100)
   - Provides recommendation (BUY/HOLD/SELL/AVOID)
   - Breaks down scores: on-chain, social, technical
   - Identifies key risk factors

7. **Response & Display**
   - API returns JSON with analysis results
   - Frontend displays:
     - Risk score visualization (pie chart)
     - Token information cards
     - AI analysis breakdown
     - Top tweets (if available)
   - Smooth animations for UI elements

8. **Payment Settlement**
   - Facilitator handles gas fees (ERC4337)
   - Merchant receives $0.05 USDC
   - Transaction recorded on Avalanche C-Chain

---

### 💰 Slippage Sentinel Flow

1. **User Input**
   - User navigates to `/slippage` page
   - Enters: Token In address, Token Out address, Amount In
   - Optional: Route hint (defaults to "avalanche")
   - Connects wallet via Thirdweb

2. **Payment Authorization**
   - User clicks "Calculate Slippage" button
   - Frontend calls `wrapFetchWithPayment()`
   - Wallet prompts for $0.05 USDC approval
   - User signs payment authorization

3. **API Request**
   - Payment signature encoded in `X-PAYMENT` header
   - GET request to `/api/slippage-sentinel?token_in={addr}&token_out={addr}&amount_in={num}`

4. **Payment Verification**
   - Backend calls `settlePayment()` from x402 SDK
   - Facilitator verifies payment on-chain
   - If invalid → Returns 402 Payment Required

5. **Pool Data Fetching**
   - **Primary**: DexScreener API → Fetches all pools for token pair
   - **Fallback**: GeckoTerminal API → If DexScreener has no results
   - Aggregates liquidity across all pools

6. **Slippage Calculation**
   - **Base Slippage**: Trade size vs pool depth ratio
   - **Volatility Adjustment**: Based on 24h price change
   - **Fee Overhead**: Adds 0.3% for DEX fees
   - **Clamping**: Between 0.5% (50 bps) and 10% (1000 bps)
   - Calculates: Pool depths, 95th percentile trade size, volatility index

7. **Risk Assessment**
   - Determines risk level: LOW / MEDIUM / HIGH
   - Based on pool depth, volatility, and trade size

8. **Response & Display**
   - API returns JSON with slippage metrics
   - Frontend displays:
     - Recommended slippage percentage
     - Risk level badge (color-coded)
     - Pool depth metrics
     - Trade size projections
     - Volatility index

9. **Payment Settlement**
   - Facilitator handles gas fees
   - Merchant receives $0.05 USDC
   - Transaction recorded on-chain

---

**Key Technologies:**
- x402 Protocol (HTTP 402 Payment Required)
- Thirdweb SDK v5
- ERC4337 Smart Accounts (gasless for facilitator)
- Avalanche C-Chain
- GPT-4o (OpenAI) for AI analysis
- Multiple data sources: CoinGecko, DexScreener, GeckoTerminal, X/Twitter, Reddit

