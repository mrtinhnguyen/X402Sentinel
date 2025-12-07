"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskScoreChart } from "@/components/risk-score-chart";
import { TopTweets } from "@/components/top-tweets";

interface TokenAnalysisResultProps {
  tokenAddress: string;
  tokenData: {
    price: number;
    marketCap?: number;
    volume24h?: number;
    priceChange24h?: number;
    onChainMetrics: {
      totalHolders: number;
      buySellRatio: number;
      whaleActivity: string;
      liquidity: string;
    };
  };
  analysis: {
    riskScore: number;
    recommendation: "BUY" | "HOLD" | "SELL" | "AVOID";
    reasoning: string;
    breakdown: {
      onChainScore: number;
      socialScore: number;
      technicalScore: number;
      riskFactors: string[];
    };
  };
  topTweets?: Array<{
    id: string;
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    createdAt?: string;
  }>;
  timestamp: string;
}

export function TokenAnalysisResult({
  tokenAddress,
  tokenData,
  analysis,
  topTweets,
  timestamp,
}: TokenAnalysisResultProps) {
  return (
    <div className="space-y-6">
      {/* Risk Score Chart */}
      <RiskScoreChart
        riskScore={analysis.riskScore}
        recommendation={analysis.recommendation}
        breakdown={analysis.breakdown}
      />

      {/* Token Data */}
      <Card>
        <CardHeader>
          <CardTitle>Token Information</CardTitle>
          <CardDescription>Contract: {tokenAddress}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-lg font-semibold">${tokenData.price.toFixed(6)}</p>
            </div>
            {tokenData.marketCap && (
              <div>
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="text-lg font-semibold">
                  ${(tokenData.marketCap / 1e6).toFixed(2)}M
                </p>
              </div>
            )}
            {tokenData.volume24h && (
              <div>
                <p className="text-sm text-muted-foreground">24h Volume</p>
                <p className="text-lg font-semibold">
                  ${(tokenData.volume24h / 1e6).toFixed(2)}M
                </p>
              </div>
            )}
            {tokenData.priceChange24h !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">24h Change</p>
                <p
                  className={`text-lg font-semibold ${
                    tokenData.priceChange24h >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tokenData.priceChange24h >= 0 ? "+" : ""}
                  {tokenData.priceChange24h.toFixed(2)}%
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Holders</p>
              <p className="text-lg font-semibold">
                {tokenData.onChainMetrics.totalHolders.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buy/Sell Ratio</p>
              <p className="text-lg font-semibold">
                {tokenData.onChainMetrics.buySellRatio.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Whale Activity</p>
              <Badge variant="outline" className="mt-1">
                {tokenData.onChainMetrics.whaleActivity}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Liquidity</p>
              <p className="text-lg font-semibold">{tokenData.onChainMetrics.liquidity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
          <CardDescription>Comprehensive risk assessment and reasoning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Reasoning</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{analysis.reasoning}</p>
          </div>

          {analysis.breakdown?.riskFactors && analysis.breakdown.riskFactors.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Key Risk Factors</h3>
              <ul className="space-y-2">
                {analysis.breakdown.riskFactors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 border-t text-xs text-muted-foreground">
            Analysis generated: {new Date(timestamp).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Top Tweets */}
      {topTweets && topTweets.length > 0 && (
        <TopTweets tweets={topTweets} />
      )}
    </div>
  );
}

