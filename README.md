# Avalanche Sentinel 🛡️

**Real-time AI-powered risk intelligence and sentiment analysis platform for Avalanche tokens**

Avalanche Sentinel is a cutting-edge web application that provides comprehensive, AI-driven risk analysis for Avalanche tokens. By combining live on-chain data, decentralized AI sentiment analysis, and social media intelligence, it delivers actionable insights to help users make informed trading decisions.

## 🎯 Overview

Avalanche Sentinel analyzes tokens through multiple data sources and AI-powered sentiment analysis, providing:

- **Real-time Risk Scoring** - AI-generated risk assessment (0-100 scale)
- **Multi-Source Data Aggregation** - CoinGecko, DexScreener, and on-chain data
- **Social Sentiment Analysis** - Twitter/X and Reddit sentiment with AI filtering
- **Top Tweets Display** - Most engaging tweets about tokens
- **Comprehensive Metrics** - Price, volume, holders, liquidity, whale activity, and more
- **x402 Micro-Payment Gated Access** - Pay $0.05 USDC for premium analysis

## ✨ Features

### 🔍 Token Analysis
- **Price & Market Data** - Real-time price, market cap, 24h volume, and price changes
- **On-Chain Metrics** - Total holders, buy/sell ratio, whale activity, liquidity
- **Chart Pattern Detection** - AI-powered technical analysis (uptrend, downtrend, volatility)
- **Holder Distribution** - Top 10/100 holder concentration analysis

### 🤖 AI-Powered Analysis
- **Risk Score** - Comprehensive 0-100 risk assessment
- **Recommendations** - BUY, HOLD, SELL, or AVOID with detailed reasoning
- **Score Breakdown** - On-chain, social sentiment, and technical analysis scores
- **Risk Factors** - Key risk factors identified by AI

### 📱 Social Sentiment
- **Twitter/X Integration** - Fetches and analyzes top tweets using X API v2
- **Reddit Analysis** - Sentiment analysis from Reddit discussions
- **AI Sentiment Filtering** - GPT-4o analyzes tweet/post sentiment
- **Top Tweets Display** - Shows most engaging tweets with engagement metrics

### 💳 Payment System
- **x402 Protocol** - HTTP 402 Payment Required implementation
- **Micro-Payments** - $0.05 USDC per comprehensive analysis
- **Thirdweb Integration** - Seamless wallet connection and payment processing
- **Gasless Transactions** - ERC4337 Smart Accounts for facilitator

## 🛠️ Technical Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Blockchain**: Avalanche Fuji Testnet (C-Chain)
- **Payment**: Thirdweb x402 Protocol
- **AI**: OpenRouter (GPT-4o)
- **Data Sources**:
  - CoinGecko API - Market data
  - DexScreener API - DEX data and liquidity
  - Avalanche RPC - On-chain data
  - X/Twitter API v2 - Social sentiment
  - Reddit API - Community sentiment
- **Libraries**:
  - viem - EVM interaction
  - OpenAI SDK - AI integration

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Thirdweb account
- X/Twitter API credentials (optional, for social sentiment)
- CoinGecko API key (optional, for enhanced rate limits)
- OpenRouter API key (for AI analysis)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd x402-starter-kit

# Install dependencies
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required environment variables:

#### Required Variables

```env
# Thirdweb Configuration
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key
THIRDWEB_SERVER_WALLET_ADDRESS=your_facilitator_address
MERCHANT_WALLET_ADDRESS=your_merchant_wallet

# AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
```

#### Optional Variables

```env
# Data Sources
COINGECKO_API=your_coingecko_api_key

# X/Twitter API (for social sentiment)
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
2. Create a new app
3. Get your Bearer Token for API v2
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

### 1. User Flow

1. User enters a token contract address
2. User connects wallet (Thirdweb)
3. User clicks "Analyze" button
4. x402 payment prompt appears ($0.05 USDC)
5. User approves payment
6. System fetches data from multiple sources:
   - CoinGecko (price, market cap, volume)
   - DexScreener (liquidity, DEX data)
   - Avalanche RPC (on-chain metrics)
   - X/Twitter API (social sentiment)
   - Reddit API (community sentiment)
7. AI analyzes all data and generates:
   - Risk score (0-100)
   - Recommendation (BUY/HOLD/SELL/AVOID)
   - Detailed reasoning
   - Score breakdown
   - Risk factors
8. Results displayed with:
   - Risk score visualization
   - Token information
   - AI analysis
   - Top tweets (if available)

### 2. Data Sources

- **CoinGecko**: Market data, price, volume, market cap
- **DexScreener**: DEX-specific data, liquidity, chart patterns
- **Avalanche RPC**: On-chain metrics, holder count, transfer events
- **X/Twitter API v2**: Recent tweets, engagement metrics
- **Reddit API**: Community posts and discussions
- **OpenRouter (GPT-4o)**: AI sentiment analysis and risk assessment

### 3. AI Analysis Process

1. Collects data from all sources
2. Formats data into comprehensive prompt
3. Sends to GPT-4o via OpenRouter
4. AI analyzes:
   - On-chain health
   - Social sentiment
   - Technical indicators
   - Market conditions
5. Returns structured JSON with:
   - Risk score
   - Recommendation
   - Reasoning
   - Score breakdown
   - Risk factors

## 🏗️ Architecture

See detailed architecture documentation in [`docs/architecture.md`](docs/architecture.md)

### Key Components

- **Frontend**: Next.js App Router with React 19
- **API Routes**: Next.js API routes for token analysis
- **Payment**: Thirdweb x402 protocol integration
- **Data Layer**: Multiple API integrations with fallbacks
- **AI Layer**: OpenRouter with GPT-4o for analysis

## 📁 Project Structure

```
x402-starter-kit/
├── app/
│   ├── api/
│   │   └── token-analysis/    # Main analysis endpoint
│   ├── page.tsx                # Main frontend page
│   └── layout.tsx
├── components/
│   ├── token-analysis-result.tsx  # Analysis display
│   ├── top-tweets.tsx             # Twitter tweets display
│   ├── risk-score-chart.tsx       # Risk visualization
│   └── ui/                        # shadcn/ui components
├── lib/
│   ├── constants.ts              # Configuration
│   └── payment.ts                # Payment utilities
└── docs/
    ├── architecture.md           # System architecture
    ├── user-flow.md             # User journey
    └── data-sources.md          # Data source docs
```

## 🔐 Security & Privacy

- All API keys stored in environment variables
- Payment processing via secure x402 protocol
- No user data stored or logged
- All analysis performed server-side

## 🚧 Current Limitations

- **Holder Count**: Estimated from transfer events (not 100% accurate)
- **Buy/Sell Ratio**: Simplified analysis (requires indexer for accuracy)
- **Social Sentiment**: Limited by API rate limits
- **Chart Patterns**: Basic pattern detection (can be enhanced)

## 🔮 Future Enhancements

- [ ] Blockchain indexer integration for accurate holder counts
- [ ] Enhanced chart pattern detection
- [ ] Historical price analysis
- [ ] Multi-chain support (Ethereum, Solana, Starknet)
- [ ] Real-time data updates via WebSockets
- [ ] User portfolio tracking
- [ ] Alert system for price/risk changes

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for the Avalanche ecosystem**
