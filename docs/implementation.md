# Avalanche Sentinel - Implementation Guide

## Overview

This document outlines the implementation details for Avalanche Sentinel, including API integration, payment flow, and AI analysis.

## Payment Flow

**Single Payment Gate**: $0.05 USDC (50,000 units with 6 decimals)

Both token data and AI analysis are gated behind a single $0.05 payment.

## API Endpoint

### POST `/api/token-analysis`

**Payment Required**: Yes ($0.05 USDC via x402)

**Request**:
```typescript
POST /api/token-analysis
Headers:
  X-PAYMENT: <base64-encoded-payment-payload>

Body:
{
  "tokenAddress": "0x..."
}
```

**Response**:
```typescript
{
  success: true,
  tokenAddress: "0x...",
  tokenData: {
    price: number,
    marketCap?: number,
    volume24h?: number,
    priceChange24h?: number,
    holders?: number,
    distribution?: {
      top10: number,
      top100: number,
      concentration: number
    },
    onChainMetrics: {
      totalHolders: number,
      buySellRatio: number,
      whaleActivity: string,
      liquidity: string
    },
    socialSentiment?: {
      twitter: number,
      reddit: number,
      overall: number
    },
    chartPattern?: string
  },
  analysis: {
    riskScore: number, // 0-100
    recommendation: "BUY" | "HOLD" | "SELL" | "AVOID",
    reasoning: string,
    breakdown: {
      onChainScore: number,
      socialScore: number,
      technicalScore: number,
      riskFactors: string[]
    }
  },
  timestamp: string
}
```

## Data Sources

### 1. CoinGecko API

**Endpoint**: `GET /simple/networks/{network}/token_price/{addresses}`

**Network**: `avalanche`

**Headers**: `x-cg-demo-api-key: ${COINGECKO_API}`

**Query Parameters**:
- `include_market_cap=true`
- `include_24hr_vol=true`
- `include_24hr_price_change=true`

**Example**:
```typescript
const response = await fetch(
  `https://api.coingecko.com/api/v3/simple/networks/avalanche/token_price/${tokenAddress}?include_market_cap=true&include_24hr_vol=true&include_24hr_price_change=true`,
  {
    headers: {
      'x-cg-demo-api-key': process.env.COINGECKO_API!,
    },
  }
);
```

### 2. DexScreener API

**Endpoint**: `GET https://api.dexscreener.com/latest/dex/tokens/{tokenAddress}`

**No API Key Required** (for basic usage)

**Returns**:
- Token pairs
- Price data
- Volume data
- Liquidity information

### 3. OpenRouter AI

**SDK**: `openai` package with OpenRouter baseURL

**Model**: `openai/gpt-4o`

**Usage**:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
    'X-Title': 'Avalanche Sentinel',
  },
});

const completion = await openai.chat.completions.create({
  model: 'openai/gpt-4o',
  messages: [
    {
      role: 'user',
      content: prompt,
    },
  ],
});

const content = completion.choices[0].message.content;
```

## Frontend Implementation

### Token Input Component

```typescript
"use client";

import { useState } from "react";
import { useActiveWallet } from "thirdweb/react";
import { wrapFetchWithPayment } from "thirdweb/x402";
import { createNormalizedFetch } from "@/lib/payment";
import { AVALANCHE_FUJI_CHAIN_ID, PAYMENT_AMOUNTS, API_ENDPOINTS } from "@/lib/constants";

export function TokenAnalysisForm() {
  const wallet = useActiveWallet();
  const [tokenAddress, setTokenAddress] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!wallet || !tokenAddress) return;

    setIsAnalyzing(true);
    try {
      const normalizedFetch = createNormalizedFetch(AVALANCHE_FUJI_CHAIN_ID);
      const fetchWithPay = wrapFetchWithPayment(
        normalizedFetch,
        client,
        wallet,
        PAYMENT_AMOUNTS.TOKEN_ANALYSIS.bigInt
      );

      const response = await fetchWithPay(API_ENDPOINTS.TOKEN_ANALYSIS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokenAddress }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="Enter token contract address"
      />
      <button onClick={handleAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? "Analyzing..." : "Analyze Token ($0.05)"}
      </button>
      {result && <AnalysisResult data={result} />}
    </div>
  );
}
```

### Risk Score Pie Chart Component

```typescript
"use client";

import { useEffect, useRef } from "react";

interface PieChartProps {
  riskScore: number; // 0-100
  recommendation: "BUY" | "HOLD" | "SELL" | "AVOID";
}

export function RiskScorePieChart({ riskScore, recommendation }: PieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

    // Animate the pie chart
    let currentScore = 0;
    const targetScore = riskScore;
    const animationDuration = 2000; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Ease out animation
      currentScore = targetScore * (1 - Math.pow(1 - progress, 3));

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f3f4f6";
      ctx.fill();

      // Draw risk score arc
      const angle = (currentScore / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
      ctx.closePath();
      
      // Color based on score
      if (currentScore >= 70) {
        ctx.fillStyle = "#10b981"; // Green
      } else if (currentScore >= 40) {
        ctx.fillStyle = "#f59e0b"; // Yellow
      } else {
        ctx.fillStyle = "#ef4444"; // Red
      }
      ctx.fill();

      // Draw text
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(currentScore)}%`, centerX, centerY - 20);

      ctx.font = "24px Arial";
      ctx.fillText(recommendation, centerX, centerY + 30);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [riskScore, recommendation]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="rounded-full"
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Risk Score: {riskScore}/100
      </p>
    </div>
  );
}
```

## Environment Variables

```env
# Thirdweb
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key
THIRDWEB_SERVER_WALLET_ADDRESS=your_facilitator_address
MERCHANT_WALLET_ADDRESS=your_merchant_address

# APIs
COINGECKO_API=your_coingecko_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional
NEXT_PUBLIC_SITE_URL=https://your-site.com
NEXT_PUBLIC_API_BASE_URL=https://localhost:3000
```

## Analysis Breakdown

The AI analysis provides:

1. **Risk Score (0-100)**
   - 0-30: High Risk (Red)
   - 31-69: Medium Risk (Yellow)
   - 70-100: Low Risk (Green)

2. **Recommendation**
   - BUY: Strong positive indicators
   - HOLD: Neutral/mixed signals
   - SELL: Negative indicators
   - AVOID: High risk, avoid investment

3. **Breakdown Scores**
   - On-Chain Score: Based on holder distribution, transactions, liquidity
   - Social Score: Based on Twitter, Reddit sentiment
   - Technical Score: Based on chart patterns, price action

4. **Risk Factors**
   - List of specific concerns or positive indicators

## Implementation Checklist

- [x] Update payment amount to $0.05
- [x] Create `/api/token-analysis` endpoint
- [x] Integrate CoinGecko API
- [x] Integrate DexScreener API
- [x] Integrate OpenRouter AI
- [ ] Implement Avalanche RPC calls for on-chain data
- [ ] Implement social media sentiment fetching
- [ ] Create frontend token input component
- [ ] Create risk score pie chart component
- [ ] Add recommendation display
- [ ] Add breakdown visualization
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Add caching layer


