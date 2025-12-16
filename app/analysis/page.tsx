"use client";

import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveWallet, useActiveAccount } from "thirdweb/react";
import { wrapFetchWithPayment } from "thirdweb/x402";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionLog, LogEntry } from "@/components/transaction-log";
import { createNormalizedFetch } from "@/lib/payment";
import { BASE_MAINNET_CHAIN_ID, PAYMENT_AMOUNTS, getApiBaseUrl } from "@/lib/constants";
import { TokenAnalysisResult } from "@/components/token-analysis-result";
import Link from "next/link";
import Image from "next/image";
import heroImage from "../assets/hero.jpg";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

interface AnalysisResult {
  success: boolean;
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

export default function AnalysisPage() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const [tokenAddress, setTokenAddress] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculate display price from payment amount (USDC has 6 decimals)
  const displayPrice = PAYMENT_AMOUNTS.TOKEN_ANALYSIS.isFree 
    ? "Free" 
    : `$${(parseInt(PAYMENT_AMOUNTS.TOKEN_ANALYSIS.amount) / 1000000).toFixed(2)} USDC`;

  useEffect(() => {
    setLogs([]);
    setResult(null);
  }, [wallet, account?.address]);

  const addLog = (message: string, type: LogEntry["type"]) => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }]);
  };

  const updateLogStatus = (messagePattern: string, newType: LogEntry["type"]) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.message.includes(messagePattern) ? { ...log, type: newType } : log
      )
    );
  };

  const handleAnalyze = async () => {
    if (!wallet || !tokenAddress.trim()) {
      addLog("Please enter a token address", "error");
      return;
    }

    if (!account) {
      addLog("Please connect your wallet account", "error");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setLogs([]);

    try {
      addLog("Initiating token analysis...", "info");

      const apiUrl = `${getApiBaseUrl()}/api/token-analysis?tokenAddress=${encodeURIComponent(tokenAddress.trim())}`;
      
      let response;
      
      // Skip payment if price is 0 (free)
      if (PAYMENT_AMOUNTS.TOKEN_ANALYSIS.isFree) {
        addLog("Free access - no payment required", "info");
        response = await fetch(apiUrl);
      } else {
        const normalizedFetch = createNormalizedFetch(BASE_MAINNET_CHAIN_ID);
        const fetchWithPay = wrapFetchWithPayment(
          normalizedFetch,
          client,
          wallet,
          PAYMENT_AMOUNTS.TOKEN_ANALYSIS.bigInt
        );

        const priceInUSD = (parseInt(PAYMENT_AMOUNTS.TOKEN_ANALYSIS.amount) / 1000000).toFixed(2);
        addLog(`Requesting payment authorization ($${priceInUSD} USDC)...`, "info");
        
        try {
          response = await fetchWithPay(apiUrl);
        } catch (error) {
          console.error("Error in fetchWithPay:", error);
          throw error;
        }
      }

      if (!response.ok && response.status !== 402) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
      }

      let responseData;
      try {
        const text = await response.text();
        responseData = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (response.status === 200) {
        updateLogStatus("Initiating", "success");
        updateLogStatus("Requesting payment authorization", "success");
        addLog("Payment successful!", "success");
        addLog("Fetching token data...", "info");
        addLog("Analyzing with AI...", "info");
        addLog("Analysis complete!", "success");
        
        if (responseData && responseData.analysis && responseData.tokenData) {
          const normalizedData: AnalysisResult = {
            success: responseData.success || true,
            tokenAddress: responseData.tokenAddress || tokenAddress.trim(),
            tokenData: {
              price: responseData.tokenData.price || 0,
              marketCap: responseData.tokenData.marketCap,
              volume24h: responseData.tokenData.volume24h,
              priceChange24h: responseData.tokenData.priceChange24h,
              onChainMetrics: {
                totalHolders: responseData.tokenData.onChainMetrics?.totalHolders || 0,
                buySellRatio: responseData.tokenData.onChainMetrics?.buySellRatio || 0,
                whaleActivity: responseData.tokenData.onChainMetrics?.whaleActivity || 'unknown',
                liquidity: responseData.tokenData.onChainMetrics?.liquidity || 'N/A',
              },
            },
            analysis: {
              riskScore: responseData.analysis.riskScore || 50,
              recommendation: responseData.analysis.recommendation || 'HOLD',
              reasoning: responseData.analysis.reasoning || 'Analysis completed',
              breakdown: {
                onChainScore: responseData.analysis.breakdown?.onChainScore || 50,
                socialScore: responseData.analysis.breakdown?.socialScore || 50,
                technicalScore: responseData.analysis.breakdown?.technicalScore || 50,
                riskFactors: Array.isArray(responseData.analysis.breakdown?.riskFactors)
                  ? responseData.analysis.breakdown.riskFactors
                  : ['No specific risk factors identified'],
              },
            },
            topTweets: responseData.topTweets || [],
            timestamp: responseData.timestamp || new Date().toISOString(),
          };
          
          setResult(normalizedData);
        } else {
          throw new Error("Invalid response format from server");
        }
      } else {
        updateLogStatus("Initiating", "error");
        updateLogStatus("Requesting payment authorization", "error");
        const errorMsg = responseData.error || responseData.message || "Unknown error";
        addLog(`Payment failed: ${errorMsg}`, "error");
      }
    } catch (error) {
      updateLogStatus("Initiating", "error");
      updateLogStatus("Requesting payment authorization", "error");
      
      let errorMsg = "Unknown error";
      if (error instanceof Error) {
        errorMsg = error.message;
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorMsg = "Network error: Could not connect to server. Make sure the server is running.";
        } else if (error.message.includes("CORS")) {
          errorMsg = "CORS error: Server configuration issue.";
        }
      }
      
      addLog(`Error: ${errorMsg}`, "error");
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!wallet) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt="Sentinel Hero Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative z-10 text-center space-y-6 p-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-white">Base Sentinel</h1>
            <p className="text-white/80">AI-Powered Token Risk Analysis</p>
            <p className="text-sm text-white/60 mt-1">Base Mainnet</p>
          </div>
          <ConnectButton client={client} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src={heroImage}
          alt="Sentinel Hero Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Token Analysis</h1>
              <p className="text-white/80 text-sm sm:text-base">AI-powered risk intelligence and sentiment analysis</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Link href="/">
                <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                  Home
                </Button>
              </Link>
              <Link href="/slippage">
                <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                  Slippage Sentinel
                </Button>
              </Link>
              <ConnectButton client={client} />
            </div>
          </div>

          {/* Token Input Card */}
          <Card className="max-w-6xl mx-auto bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Analyze Token</CardTitle>
              <CardDescription className="text-white/70">
                Enter a token contract address to get comprehensive risk analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="0x..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isAnalyzing) {
                      handleAnalyze();
                    }
                  }}
                  disabled={isAnalyzing}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !tokenAddress.trim()}
                  className="min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-500"
                >
                  {isAnalyzing ? "Analyzing..." : `Analyze (${displayPrice})`}
                </Button>
              </div>
              {!PAYMENT_AMOUNTS.TOKEN_ANALYSIS.isFree && (
                <p className="text-xs text-white/60 text-center">
                  Payment of {displayPrice} required for comprehensive token analysis
                </p>
              )}
              {PAYMENT_AMOUNTS.TOKEN_ANALYSIS.isFree && (
                <p className="text-xs text-white/60 text-center">
                  Free access - no payment required
                </p>
              )}
            </CardContent>
          </Card>

          {/* Analysis Result */}
          {result && (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TokenAnalysisResult
                tokenAddress={result.tokenAddress}
                tokenData={result.tokenData}
                analysis={result.analysis}
                topTweets={result.topTweets}
                timestamp={result.timestamp}
              />
            </div>
          )}

          {/* Transaction Log */}
          {logs.length > 0 && (
            <div className="max-w-6xl mx-auto animate-in fade-in-from-bottom-4 duration-700">
              <TransactionLog logs={logs} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

