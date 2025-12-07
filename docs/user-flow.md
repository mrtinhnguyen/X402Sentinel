# Avalanche Sentinel - User Flow

## Overview

This document describes the complete user journey through the Avalanche Sentinel platform, from initial access to receiving premium AI-powered trading signals.

## Main User Flow

```mermaid
flowchart TD
    START([User Visits Site]) --> CHECK{Wallet<br/>Connected?}
    
    CHECK -->|No| CONNECT[Connect Wallet<br/>Thirdweb ConnectButton]
    CONNECT --> CHECK
    
    CHECK -->|Yes| LANDING[Landing Page<br/>Token Search/Select]
    
    LANDING --> SELECT[Select Token<br/>Enter Address]
    
    SELECT --> FETCH[Fetch Token Data]
    
    FETCH --> BASIC_VIEW[View Basic Analytics<br/>Free Tier - All Token Details]
    
    BASIC_VIEW --> SHOW_DETAILS[Display Comprehensive Data<br/>• Token Info<br/>• Holder Distribution<br/>• Transaction History<br/>• Liquidity Data<br/>• Smart Contract Info<br/>• Whale Activity]
    
    SHOW_DETAILS --> DECIDE{Want Premium<br/>AI Analysis?}
    
    DECIDE -->|No| CONTINUE[Continue Browsing<br/>Basic Data]
    CONTINUE --> SELECT
    
    DECIDE -->|Yes| PAYMENT[Click Premium Button<br/>Initiate Payment]
    
    PAYMENT --> X402_REQ[x402 Payment Request<br/>Wrap with Payment]
    
    X402_REQ --> WALLET_POPUP[Wallet Popup<br/>Approve Payment]
    
    WALLET_POPUP --> USER_APPROVE{User<br/>Approves?}
    
    USER_APPROVE -->|No| CANCEL[Payment Cancelled<br/>Return to Basic View]
    CANCEL --> BASIC_VIEW
    
    USER_APPROVE -->|Yes| TXN[Transaction Sent<br/>On-Chain Payment]
    
    TXN --> VERIFY[Server Verifies<br/>Payment]
    
    VERIFY --> VERIFY_CHECK{Payment<br/>Valid?}
    
    VERIFY_CHECK -->|No| ERROR[Payment Failed<br/>Show Error]
    ERROR --> PAYMENT
    
    VERIFY_CHECK -->|Yes| PROCESS[Process Premium Request]
    
    PROCESS --> ONCHAIN_SENT[Analyze On-Chain Sentiment<br/>• Buy/Sell Pressure<br/>• Volume Trends<br/>• Whale Behavior<br/>• Flow Patterns]
    
    PROCESS --> SOCIAL_SENT[Analyze Social Sentiment<br/>• Twitter Mentions<br/>• Reddit Discussions<br/>• News Articles]
    
    ONCHAIN_SENT --> AI_ANALYSIS[AI Combines Analysis]
    SOCIAL_SENT --> AI_ANALYSIS
    
    AI_ANALYSIS --> PREMIUM[Access Premium Content<br/>• Risk Score<br/>• Sentiment Score<br/>• Trading Signals<br/>• Actionable Insights]
    
    PREMIUM --> DASHBOARD[Premium Dashboard<br/>Real-time Updates]
    
    DASHBOARD --> ALERTS[Receive Alerts<br/>Signal Changes]
    
    ALERTS --> NEW_TOKEN{New Token<br/>Analysis?}
    
    NEW_TOKEN -->|Yes| SELECT
    NEW_TOKEN -->|No| DASHBOARD
    
    CONTINUE --> NEW_TOKEN
    
    style START fill:#3b82f6
    style PREMIUM fill:#10b981
    style ERROR fill:#ef4444
    style X402_REQ fill:#f59e0b
    style AI_ANALYSIS fill:#8b5cf6
```

## Detailed User Journey

### 1. Initial Access

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Wallet
    participant API

    User->>Frontend: Visit Site
    Frontend->>Frontend: Check Wallet Connection
    
    alt Wallet Not Connected
        Frontend->>User: Show Connect Button
        User->>Wallet: Click Connect
        Wallet->>User: Approve Connection
        Wallet->>Frontend: Wallet Connected
    end
    
    Frontend->>User: Show Token Search Interface
```

### 2. Token Analysis Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DataCollector
    participant Avalanche
    participant CoinGecko
    participant DB

    User->>Frontend: Enter Token Address
    Frontend->>API: GET /api/token/:address
    
    par Fetch On-Chain Data
        API->>DataCollector: Fetch Token Data
        DataCollector->>Avalanche: Get Token Info
        Avalanche-->>DataCollector: Basic Details
        DataCollector->>Avalanche: Get Holders
        Avalanche-->>DataCollector: Holder Distribution
        DataCollector->>Avalanche: Get Transactions
        Avalanche-->>DataCollector: TX History
        DataCollector->>Avalanche: Get Liquidity
        Avalanche-->>DataCollector: Pool Data
        DataCollector->>Avalanche: Get Whale Data
        Avalanche-->>DataCollector: Large Transactions
    end
    
    par Fetch Market Data
        DataCollector->>CoinGecko: Get Price Data
        CoinGecko-->>DataCollector: Price, Volume, MCap
    end
    
    DataCollector->>DB: Store Token Data
    DataCollector-->>API: Return Complete Token Data
    API-->>Frontend: Token Details Response
    Frontend->>User: Display All Token Details (Free)
```

### 3. Premium Payment Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Wallet
    participant API
    participant X402
    participant Facilitator
    participant Avalanche

    User->>Frontend: Click "Get Premium Analysis"
    Frontend->>Frontend: wrapFetchWithPayment()
    Frontend->>Wallet: Request Payment Authorization
    Wallet->>User: Show Payment Approval
    User->>Wallet: Approve Payment
    
    Wallet->>Frontend: Payment Signature
    Frontend->>Frontend: Create Payment Payload (Base64)
    Frontend->>API: GET /api/premium/:address<br/>Header: X-PAYMENT
    
    API->>X402: settlePayment()
    X402->>X402: Decode X-PAYMENT Header
    X402->>Facilitator: Verify Payment
    Facilitator->>Avalanche: Check Transaction
    Avalanche-->>Facilitator: Transaction Status
    
    alt Payment Valid
        Facilitator->>Avalanche: Execute Settlement
        Avalanche-->>Facilitator: Settlement Confirmed
        Facilitator-->>X402: Payment Verified
        X402-->>API: Payment Success
        API-->>Frontend: 200 OK + Premium Data
        Frontend-->>User: Display Premium Analysis
    else Payment Invalid
        Facilitator-->>X402: Payment Failed
        X402-->>API: Payment Error
        API-->>Frontend: 402 Payment Required
        Frontend-->>User: Show Payment Error
    end
```

### 4. Premium Analysis Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant OnChainAnalyzer
    participant SocialFetcher
    participant AI
    participant DB

    User->>API: GET /api/premium/:address (Paid)
    API->>API: Payment Verified
    
    par On-Chain Sentiment Analysis
        API->>OnChainAnalyzer: Analyze On-Chain Data
        OnChainAnalyzer->>OnChainAnalyzer: Calculate Buy/Sell Pressure
        OnChainAnalyzer->>OnChainAnalyzer: Analyze Volume Trends
        OnChainAnalyzer->>OnChainAnalyzer: Track Whale Behavior
        OnChainAnalyzer->>OnChainAnalyzer: Analyze Flow Patterns
        OnChainAnalyzer-->>API: On-Chain Sentiment Score
    end
    
    par Social Media Sentiment
        API->>SocialFetcher: Fetch Social Data
        SocialFetcher->>SocialFetcher: Get Twitter Mentions
        SocialFetcher->>SocialFetcher: Get Reddit Posts
        SocialFetcher->>SocialFetcher: Get News Articles
        SocialFetcher-->>API: Social Media Data
    end
    
    API->>AI: Analyze Both Sentiments
    AI->>AI: Process On-Chain Sentiment
    AI->>AI: Process Social Sentiment
    AI->>AI: Combine & Generate Insights
    AI->>AI: Calculate Risk Score
    AI->>AI: Generate Trading Signals
    AI-->>API: Risk Score + Sentiment + Signals
    
    API->>DB: Store Analysis Results
    API-->>User: Return Premium Analysis
```

### 5. Real-time Updates Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant WebSocket
    participant Cache
    participant BackgroundWorker
    participant DataSources

    User->>Frontend: Viewing Dashboard
    Frontend->>WebSocket: Connect to /api/realtime
    
    loop Real-time Updates
        BackgroundWorker->>DataSources: Fetch Latest Data
        DataSources-->>BackgroundWorker: Updated Data
        BackgroundWorker->>BackgroundWorker: Process Updates
        BackgroundWorker->>Cache: Update Redis Cache
        Cache->>WebSocket: Push Update
        WebSocket->>Frontend: Send Update Event
        Frontend->>User: Update Dashboard UI
    end
```

## User Flow States

### State 1: Unauthenticated
- User visits site
- Must connect wallet to proceed
- Shows connection prompt

### State 2: Authenticated - Free Tier
- Wallet connected
- Can search and view token details
- Access to comprehensive token data (free)
- Can see all on-chain information

### State 3: Premium Request
- User clicks premium button
- Payment prompt appears
- User approves payment in wallet
- Payment transaction sent

### State 4: Premium Access
- Payment verified
- AI analysis processing
- Premium dashboard displayed
- Real-time updates enabled

## Key User Actions

1. **Connect Wallet**: Required to access any features
2. **Search Token**: Enter token address to view details
3. **View Basic Data**: Free access to all token information
4. **Request Premium**: Click to get AI analysis (requires payment)
5. **Approve Payment**: Confirm payment in wallet
6. **View Premium Analysis**: Access risk scores and trading signals
7. **Monitor Updates**: Real-time dashboard updates

## Error Handling

- **Wallet Connection Failed**: Show retry option
- **Payment Cancelled**: Return to basic view
- **Payment Failed**: Show error message, allow retry
- **Token Not Found**: Show error, allow new search
- **API Error**: Show user-friendly error message





