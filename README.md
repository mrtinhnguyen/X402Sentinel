# Sentinel 🛡️

**AI-powered risk intelligence and slippage protection for Avalanche tokens**

Sentinel is a cutting-edge web application that provides comprehensive, AI-driven risk analysis and safe slippage estimation for Avalanche tokens. By combining live on-chain data, decentralized AI sentiment analysis, social media intelligence, and DEX pool analysis, it delivers actionable insights to help users make informed trading decisions.

## 🎯 Overview

Sentinel offers two powerful tools:

1. **Token Analysis** - Comprehensive AI-powered risk assessment with multi-source data aggregation
2. **Slippage Sentinel** - Safe slippage tolerance estimation for any swap route on Avalanche

Both tools are gated behind a single $0.05 USDC micro-payment via the x402 protocol.

## ✨ Features

### 🔍 Token Analysis

- **Price & Market Data** - Real-time price, market cap, 24h volume, and price changes from CoinGecko and DexScreener
- **On-Chain Metrics** - Total holders, buy/sell ratio, whale activity, aggregated liquidity from all pools
- **Chart Pattern Detection** - AI-powered technical analysis (uptrend, downtrend, volatility)
- **Holder Distribution** - Holder concentration analysis
- **Pool Analysis** - Aggregated liquidity data from all DEX pools using DexScreener token-pairs API

### 💰 Slippage Sentinel

- **Safe Slippage Estimation** - Calculates recommended slippage tolerance based on pool depth and volatility
- **Multi-Source Pool Data** - Fetches pools from DexScreener and GeckoTerminal
- **Risk Assessment** - Color-coded risk levels (LOW/MEDIUM/HIGH)
- **Pool Depth Analysis** - Total liquidity analysis across all pools
- **Volatility Adjustment** - Accounts for 24h price volatility in calculations
- **Trade Size Projections** - 95th percentile trade size estimates

### 🤖 AI-Powered Analysis

- **Risk Score** - Comprehensive 0-100 risk assessment
- **Recommendations** - BUY, HOLD, SELL, or AVOID with detailed reasoning
- **Score Breakdown** - On-chain, social sentiment, and technical analysis scores
- **Risk Factors** - Key risk factors identified by AI
- **Animated Visualizations** - Smooth animations for risk score charts and progress bars

### 📱 Social Sentiment

- **Twitter/X Integration** - Fetches and analyzes top tweets using X API v2
- **Reddit Analysis** - Sentiment analysis from Reddit discussions
- **AI Sentiment Filtering** - GPT-4o analyzes tweet/post sentiment
- **Top Tweets Display** - Shows most engaging tweets with engagement metrics
- **Multi-Query Strategy** - Tries multiple search strategies to find relevant tweets

### 🎨 User Interface

- **Modern Landing Page** - Hero section with background image and clear call-to-action
- **Glassmorphism Design** - Beautiful translucent cards with backdrop blur effects
- **Smooth Animations** - Staggered fade-in and slide-up animations
- **Responsive Layout** - Works seamlessly on desktop and mobile
- **PolySans Neutral Font** - Custom typography throughout the application
- **Dark Theme** - Optimized for dark backgrounds with high contrast text

### 💳 Payment System

- **x402 Protocol** - HTTP 402 Payment Required implementation
- **Micro-Payments** - $0.05 USDC per comprehensive analysis or slippage calculation
- **Thirdweb Integration** - Seamless wallet connection and payment processing
- **Gasless Transactions** - ERC4337 Smart Accounts for facilitator

## 🛠️ Technical Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Blockchain**: Avalanche Fuji Testnet (C-Chain)
- **Payment**: Thirdweb x402 Protocol
- **AI**: OpenRouter (GPT-4o)
- **Data Sources**:
  - **CoinGecko API** - Market data (price, market cap, volume)
  - **DexScreener API** - DEX data, liquidity pools via `/token-pairs/v1/{chainId}/{tokenAddress}`
  - **GeckoTerminal API** - Alternative pool data source
  - **Avalanche RPC** - On-chain data (token info, transfer events)
  - **X/Twitter API v2** - Social sentiment and top tweets
  - **Reddit API** - Community sentiment
- **Libraries**:
  - **viem** - EVM interaction and on-chain data fetching
  - **OpenAI SDK** - AI integration via OpenRouter
  - **Thirdweb SDK v5** - Wallet connection and x402 payments

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Thirdweb account
- X/Twitter API credentials (optional, for social sentiment)
- CoinGecko API key (optional, for enhanced rate limits)
- OpenRouter API key (required for AI analysis)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd x402-starter-kit

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory:

```env
# Thirdweb Configuration (Required)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key
THIRDWEB_SERVER_WALLET_ADDRESS=your_facilitator_address
MERCHANT_WALLET_ADDRESS=your_merchant_wallet

# AI Configuration (Required)
OPENROUTER_API_KEY=your_openrouter_api_key

# Data Sources (Optional but recommended)
COINGECKO_API=your_coingecko_api_key

# X/Twitter API (Optional, for social sentiment)
X_BEARER_TOKEN=your_x_bearer_token
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_SECRET=your_x_access_secret

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Thirdweb Setup

1. **Create Thirdweb Account**
   - Go to [Thirdweb Dashboard](https://thirdweb.com/dashboard)
   - Log in with your wallet
   - Create a new project
   - Get your **Client ID** and **Secret Key**

2. **Set Up Facilitator Wallet (ERC4337 Smart Account)**
   - In Thirdweb dashboard, go to **Server Wallets** section
   - Click **Show ERC4337 Smart Account**
   - Switch to Avalanche Fuji Testnet
   - Copy the smart account address → `THIRDWEB_SERVER_WALLET_ADDRESS`
   - Fund the address with testnet AVAX for gas fees

   ⚠️ **Important**: Only ERC4337 Smart Accounts are supported as facilitators.

3. **Get Testnet USDC**
   - Avalanche Fuji USDC: `0x5425890298aed601595a70AB815c96711a31Bc65`
   - Get testnet tokens from faucets

### X/Twitter API Setup (Optional)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app with API v2 access
3. Get your Bearer Token
4. Add to `.env.local` as `X_BEARER_TOKEN`

### Development

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📊 How It Works

### Token Analysis Flow

1. User navigates to `/analysis` page
2. User enters a token contract address
3. User connects wallet (Thirdweb)
4. User clicks "Analyze" button
5. x402 payment prompt appears ($0.05 USDC)
6. User approves payment
7. System fetches data from multiple sources in parallel:
   - **CoinGecko** - Price, market cap, 24h volume, price change
   - **DexScreener** - Pool data via `/token-pairs/v1/avalanche/{tokenAddress}`, aggregated liquidity
   - **Avalanche RPC** - Token info, transfer events (limited to 2048 blocks)
   - **X/Twitter API** - Recent tweets with multiple query strategies
   - **Reddit API** - Community posts and discussions
8. AI analyzes all data using GPT-4o and generates:
   - Risk score (0-100)
   - Recommendation (BUY/HOLD/SELL/AVOID)
   - Detailed reasoning
   - Score breakdown (on-chain, social, technical)
   - Risk factors
9. Results displayed with smooth animations:
   - Risk score visualization with pie chart
   - Token information cards
   - AI analysis breakdown
   - Top tweets (if available)

### Slippage Sentinel Flow

1. User navigates to `/slippage` page
2. User enters:
   - Token In address
   - Token Out address
   - Amount In
   - Route Hint (optional, defaults to "avalanche")
3. User connects wallet and approves $0.05 USDC payment
4. System fetches pool data:
   - **DexScreener** - Primary source for pool data
   - **GeckoTerminal** - Fallback if DexScreener has no results
5. System calculates safe slippage:
   - Base slippage from trade size vs pool depth ratio
   - Volatility adjustment based on 24h price change
   - Fee overhead (0.3% for DEX fees)
   - Clamped between 0.5% (50 bps) and 10% (1000 bps)
6. Results displayed with:
   - Recommended slippage percentage
   - Risk level badge (LOW/MEDIUM/HIGH)
   - Pool depth metrics
   - Trade size projections
   - Volatility index

## 🏗️ Architecture

### Page Structure

- **`/`** - Landing page with hero section
- **`/analysis`** - Token analysis tool
- **`/slippage`** - Slippage sentinel tool

### API Endpoints

- **`GET /api/token-analysis?tokenAddress={address}`** - Token analysis endpoint
- **`GET /api/slippage-sentinel?token_in={address}&token_out={address}&amount_in={number}&route_hint={chain}`** - Slippage calculation endpoint

### Data Sources

#### DexScreener Integration

- **Primary Endpoint**: `/token-pairs/v1/{chainId}/{tokenAddress}`
- **Chain IDs Tried**: "avalanche", "avax", "43114"
- **Fallback**: `/latest/dex/tokens/{tokenAddress}`
- **Data Extracted**:
  - Aggregated liquidity across all pools
  - Price, volume, price change
  - Buy/sell transaction ratios
  - Holder counts (if available in pair data)
  - Chart patterns from price history

#### CoinGecko Integration

- **Endpoint**: `/api/v3/simple/networks/avalanche/token_price/{address}`
- **Fallback**: Uses DexScreener data if token not found
- **Data Extracted**: Price, market cap, 24h volume, 24h price change

#### On-Chain Data (Avalanche RPC)

- **RPC**: `https://api.avax.network/ext/bc/C/rpc`
- **Data Extracted**:
  - Token name, symbol, decimals, total supply
  - Transfer events (limited to 2048 blocks for RPC compatibility)
  - Estimated holder count from unique addresses in transfers
  - Buy/sell ratio estimation from DEX router interactions

#### Social Media

- **X/Twitter API v2**: Multiple query strategies to find relevant tweets
- **Reddit API**: Public JSON API for community posts
- **AI Analysis**: GPT-4o analyzes sentiment from both sources

## 📁 Project Structure

```
x402-starter-kit/
├── app/
│   ├── api/
│   │   ├── token-analysis/
│   │   │   └── route.ts          # Token analysis endpoint
│   │   └── slippage-sentinel/
│   │       └── route.ts          # Slippage calculation endpoint
│   ├── analysis/
│   │   └── page.tsx              # Token analysis page
│   ├── slippage/
│   │   └── page.tsx              # Slippage sentinel page
│   ├── assets/
│   │   └── hero.jpg              # Landing page background
│   ├── fonts/
│   │   └── PolySans Neutral.ttf  # Custom font
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout with font
│   └── globals.css               # Global styles
├── components/
│   ├── token-analysis-result.tsx # Analysis results display
│   ├── slippage-sentinel.tsx     # Slippage results display
│   ├── risk-score-chart.tsx      # Risk visualization
│   ├── top-tweets.tsx            # Twitter tweets display
│   ├── transaction-log.tsx      # Payment transaction log
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── constants.ts              # Configuration and constants
│   ├── payment.ts                # Payment utilities
│   └── utils.ts                  # Utility functions
└── docs/
    ├── architecture.md            # System architecture
    ├── user-flow.md              # User journey
    ├── data-sources.md           # Data source documentation
    └── implementation.md         # Implementation details
```

## 🎨 Design Features

### Glassmorphism UI

- Translucent cards with `bg-white/10 backdrop-blur-md`
- Semi-transparent borders with `border-white/20`
- Smooth hover effects and transitions
- Consistent design across all pages

### Animations

- Staggered fade-in animations for result cards
- Slide-up effects for new content
- Progress bar animations (1 second duration)
- Hover scale effects on interactive elements

### Typography

- **PolySans Neutral** font applied globally
- Enforced via CSS with `!important` flags
- Consistent across all components and third-party libraries

## 🔐 Security & Privacy

- All API keys stored in environment variables
- Payment processing via secure x402 protocol
- No user data stored or logged
- All analysis performed server-side
- Secure wallet connection via Thirdweb

## 🚧 Current Limitations

- **Holder Count**: Estimated from transfer events (limited to 2048 blocks) or from DexScreener if available
- **Buy/Sell Ratio**: Simplified analysis based on DEX router interactions
- **Social Sentiment**: Limited by API rate limits and query restrictions
- **Chart Patterns**: Basic pattern detection (can be enhanced)
- **Transfer Events**: RPC block range limited to 2048 blocks to avoid errors

## 🔮 Future Enhancements

- [ ] Blockchain indexer integration (The Graph, Snowtrace) for accurate holder counts
- [ ] Enhanced chart pattern detection with ML models
- [ ] Historical price analysis and trends
- [ ] Multi-chain support (Ethereum, Base, Arbitrum, etc.)
- [ ] Real-time data updates via WebSockets
- [ ] User portfolio tracking
- [ ] Alert system for price/risk changes
- [ ] Advanced slippage calculations with route optimization
- [ ] Integration with more DEX aggregators

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for the Avalanche ecosystem**
