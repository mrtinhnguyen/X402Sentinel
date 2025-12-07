"use client";

import { useEffect, useState } from "react";
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "BUY":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "HOLD":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "SELL":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "AVOID":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getWhaleActivityColor = (activity: string) => {
    switch (activity.toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "moderate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Score & Recommendation - Hero Section */}
      <div
        className={`transition-all duration-1000 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4">
                  <p className="text-sm text-white/60 mb-2">Risk Score</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-bold text-white">{analysis.riskScore}</span>
                    <span className="text-2xl text-white/60">/100</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-lg px-6 py-2 ${getRecommendationColor(analysis.recommendation)}`}
                >
                  {analysis.recommendation}
                </Badge>
              </div>
              <div className="flex-shrink-0">
                <RiskScoreChart
                  riskScore={analysis.riskScore}
                  recommendation={analysis.recommendation}
                  breakdown={analysis.breakdown}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Metrics - Horizontal Flow */}
      <div
        className={`transition-all duration-1000 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "100ms" }}
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Token Information</CardTitle>
            <CardDescription className="text-white/70">Contract: {tokenAddress}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 justify-between">
              <div className="flex-1 min-w-[150px]">
                <p className="text-sm text-white/60 mb-2">Price</p>
                <p className="text-2xl font-bold text-white">${tokenData.price.toFixed(6)}</p>
              </div>
              {tokenData.marketCap && (
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-white/60 mb-2">Market Cap</p>
                  <p className="text-2xl font-bold text-white">
                    ${(tokenData.marketCap / 1e6).toFixed(2)}M
                  </p>
                </div>
              )}
              {tokenData.volume24h && (
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-white/60 mb-2">24h Volume</p>
                  <p className="text-2xl font-bold text-white">
                    ${(tokenData.volume24h / 1e6).toFixed(2)}M
                  </p>
                </div>
              )}
              {tokenData.priceChange24h !== undefined && (
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-white/60 mb-2">24h Change</p>
                  <p
                    className={`text-2xl font-bold ${
                      tokenData.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tokenData.priceChange24h >= 0 ? "+" : ""}
                    {tokenData.priceChange24h.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-white/20">
              <div className="flex flex-wrap gap-6 justify-between">
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-white/60 mb-2">Total Holders</p>
                  <p className="text-xl font-semibold text-white">
                    {tokenData.onChainMetrics.totalHolders.toLocaleString()}
                  </p>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-white/60 mb-2">Buy/Sell Ratio</p>
                  <p className="text-xl font-semibold text-white">
                    {tokenData.onChainMetrics.buySellRatio.toFixed(2)}
                  </p>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-white/60 mb-2">Whale Activity</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${getWhaleActivityColor(tokenData.onChainMetrics.whaleActivity)}`}
                  >
                    {tokenData.onChainMetrics.whaleActivity}
                  </Badge>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm text-white/60 mb-2">Liquidity</p>
                  <p className="text-xl font-semibold text-white">
                    {tokenData.onChainMetrics.liquidity}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown - Side by Side */}
      {analysis.breakdown && (
        <div
          className={`transition-all duration-1000 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Score Breakdown</CardTitle>
              <CardDescription className="text-white/70">
                Detailed analysis across different metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-medium text-white/90">On-Chain Score</span>
                    <span className="text-xl font-bold text-white">
                      {analysis.breakdown.onChainScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
                      style={{ width: `${analysis.breakdown.onChainScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-medium text-white/90">Social Sentiment</span>
                    <span className="text-xl font-bold text-white">
                      {analysis.breakdown.socialScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-purple-500 h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
                      style={{ width: `${analysis.breakdown.socialScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-medium text-white/90">Technical Analysis</span>
                    <span className="text-xl font-bold text-white">
                      {analysis.breakdown.technicalScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
                      style={{ width: `${analysis.breakdown.technicalScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analysis - Full Width Cards */}
      <div
        className={`space-y-6 transition-all duration-1000 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "300ms" }}
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">AI Reasoning</CardTitle>
            <CardDescription className="text-white/70">
              Comprehensive risk assessment analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-base text-white/90 leading-relaxed">{analysis.reasoning}</p>
          </CardContent>
        </Card>

        {analysis.breakdown?.riskFactors && analysis.breakdown.riskFactors.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Key Risk Factors</CardTitle>
              <CardDescription className="text-white/70">
                Identified risk indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.breakdown.riskFactors.map((factor, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-base text-white/90 animate-in fade-in slide-in-from-left"
                    style={{ animationDelay: `${400 + index * 100}ms` }}
                  >
                    <span className="text-red-400 mt-1 text-lg">▸</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Tweets */}
      {topTweets && topTweets.length > 0 && (
        <div
          className={`transition-all duration-1000 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "500ms" }}
        >
          <TopTweets tweets={topTweets} />
        </div>
      )}

      {/* Footer */}
      <div
        className={`text-center text-xs text-white/50 transition-all duration-700 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDelay: "600ms" }}
      >
        Analysis generated: {new Date(timestamp).toLocaleString()}
      </div>
    </div>
  );
}
