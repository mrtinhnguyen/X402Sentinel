# Token Analysis - 5 Data Aggregation Layers

## 1. **CoinGecko API**
- **Purpose**: Market data & pricing
- **Data Fetched**:
  - Current price (USD)
  - Market capitalization
  - 24-hour trading volume
  - 24-hour price change percentage
- **Endpoint**: `/api/v3/simple/networks/avalanche/token_price/{address}`
- **Fallback**: Uses DexScreener data if token not found

---

## 2. **DexScreener API**
- **Purpose**: DEX pool data & liquidity metrics
- **Data Fetched**:
  - Aggregated liquidity across all pools
  - Price data (fallback if CoinGecko unavailable)
  - Buy/sell transaction ratios
  - Holder count estimates (from pair data)
  - Chart patterns from price history
  - Volume and price change data
- **Endpoint**: `/token-pairs/v1/{chainId}/{tokenAddress}`
- **Chain IDs Tried**: "avalanche", "avax", "43114"
- **Fallback**: `/latest/dex/tokens/{tokenAddress}`

---

## 3. **Avalanche RPC (On-Chain)**
- **Purpose**: Blockchain-native data
- **Data Fetched**:
  - Token name, symbol, decimals, total supply
  - Transfer events (last 2048 blocks)
  - Estimated holder count (from unique addresses)
  - Buy/sell ratio estimation (from DEX router interactions)
  - Whale activity detection (large transfers >1% of supply)
  - Holder distribution analysis
- **RPC Endpoint**: `https://api.avax.network/ext/bc/C/rpc`
- **Method**: Direct blockchain queries via viem

---

## 4. **X/Twitter API v2**
- **Purpose**: Social sentiment & community engagement
- **Data Fetched**:
  - Recent tweets mentioning token
  - Tweet engagement metrics (likes, retweets, replies)
  - Top tweets with highest engagement
  - AI-analyzed sentiment score (-1 to 1)
- **Endpoint**: Twitter API v2 Search
- **Query Strategy**: Multiple query variations to maximize tweet discovery
- **AI Analysis**: GPT-4o analyzes tweet sentiment

---

## 5. **Reddit API**
- **Purpose**: Community sentiment & discussions
- **Data Fetched**:
  - Reddit posts mentioning token
  - Post engagement (upvotes, downvotes)
  - Post titles and content
  - AI-analyzed sentiment score (-1 to 1)
- **Endpoint**: Reddit Public JSON API
- **Query**: `/search.json?q={tokenSymbol}`
- **AI Analysis**: GPT-4o analyzes post sentiment
- **Fallback**: Upvote-based sentiment if AI fails

---

## Data Aggregation Process

All 5 layers are fetched **in parallel** using `Promise.all()` for optimal performance:

```typescript
const [coinGeckoData, dexScreenerData, onChainData, socialData] = await Promise.all([
  fetchCoinGeckoData(tokenAddress),      // Layer 1
  fetchDexScreenerData(tokenAddress),    // Layer 2
  fetchOnChainData(tokenAddress),       // Layer 3
  fetchSocialSentiment(tokenSymbol, tokenName), // Layers 4 & 5 (Twitter + Reddit)
]);
```

After aggregation, all data is combined with priority rules:
- **Price**: CoinGecko → DexScreener → Default
- **Liquidity**: DexScreener → On-chain → Default
- **Holders**: DexScreener → On-chain estimate → Default
- **Sentiment**: Average of Twitter + Reddit scores

Finally, GPT-4o analyzes the complete aggregated dataset to generate the risk assessment.

