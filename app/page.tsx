"use client";

import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveWallet, useActiveAccount } from "thirdweb/react";
import { wrapFetchWithPayment } from "thirdweb/x402";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionLog, LogEntry } from "@/components/transaction-log";
import { Separator } from "@/components/ui/separator";
import { createNormalizedFetch } from "@/lib/payment";
import { AVALANCHE_FUJI_CHAIN_ID, PAYMENT_AMOUNTS, getApiBaseUrl } from "@/lib/constants";
import { TokenAnalysisResult } from "@/components/token-analysis-result";
import { SlippageSentinel } from "@/components/slippage-sentinel";

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

interface SlippageResult {
  success: boolean;
  min_safe_slip_bps: number;
  pool_depths: number;
  recent_trade_size_p95: number;
  volatility_index: number;
  token_in: string;
  token_out: string;
  amount_in: number;
  route_hint?: string;
  timestamp: string;
}

export default function Home() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<"analysis" | "slippage">("analysis");
  
  // Token Analysis State
  const [tokenAddress, setTokenAddress] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Slippage Sentinel State
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [routeHint, setRouteHint] = useState("avalanche");
  const [slippageResult, setSlippageResult] = useState<SlippageResult | null>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setLogs([]);
    setResult(null);
    setSlippageResult(null);
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

      const normalizedFetch = createNormalizedFetch(AVALANCHE_FUJI_CHAIN_ID);
      const fetchWithPay = wrapFetchWithPayment(
        normalizedFetch,
        client,
        wallet,
        PAYMENT_AMOUNTS.TOKEN_ANALYSIS.bigInt
      );

      addLog("Requesting payment authorization ($0.05 USDC)...", "info");
      
      // Use GET with query parameter - pass URL string directly like in example
      const apiUrl = `${getApiBaseUrl()}/api/token-analysis?tokenAddress=${encodeURIComponent(tokenAddress.trim())}`;
      
      let response;
      try {
        response = await fetchWithPay(apiUrl);
      } catch (error) {
        console.error("Error in fetchWithPay:", error);
        console.error("Error details:", {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          wallet: wallet ? "exists" : "missing",
          account: account ? "exists" : "missing",
          apiUrl,
        });
        throw error;
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
        
        // Validate and normalize response data structure
        if (responseData && responseData.analysis && responseData.tokenData) {
          // Ensure all nested structures exist
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
          
          console.log('Normalized data - topTweets count:', normalizedData.topTweets?.length || 0);
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
        // Provide more helpful error messages
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

  const handleCalculateSlippage = async () => {
    if (!wallet || !tokenIn.trim() || !tokenOut.trim() || !amountIn.trim()) {
      addLog("Please enter token addresses and amount", "error");
      return;
    }

    if (!account) {
      addLog("Please connect your wallet account", "error");
      return;
    }

    const amountInNum = parseFloat(amountIn);
    if (isNaN(amountInNum) || amountInNum <= 0) {
      addLog("Amount must be a positive number", "error");
      return;
    }

    setIsCalculating(true);
    setSlippageResult(null);
    setLogs([]);

    try {
      addLog("Initiating slippage calculation...", "info");

      const normalizedFetch = createNormalizedFetch(AVALANCHE_FUJI_CHAIN_ID);
      const fetchWithPay = wrapFetchWithPayment(
        normalizedFetch,
        client,
        wallet,
        PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.bigInt
      );

      addLog("Requesting payment authorization ($0.05 USDC)...", "info");
      
      const apiUrl = `${getApiBaseUrl()}/api/slippage-sentinel?token_in=${encodeURIComponent(tokenIn.trim())}&token_out=${encodeURIComponent(tokenOut.trim())}&amount_in=${encodeURIComponent(amountInNum)}${routeHint ? `&route_hint=${encodeURIComponent(routeHint)}` : ''}`;
      
      let response;
      try {
        response = await fetchWithPay(apiUrl);
      } catch (error) {
        console.error("Error in fetchWithPay:", error);
        throw error;
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
        addLog("Fetching pool data...", "info");
        addLog("Calculating safe slippage...", "info");
        addLog("Calculation complete!", "success");
        
        if (responseData && responseData.success) {
          setSlippageResult(responseData);
        } else {
          throw new Error(responseData.error || "Invalid response format from server");
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
        }
      }
      
      addLog(`Error: ${errorMsg}`, "error");
      console.error("Slippage calculation error:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-6 p-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Avalanche Sentinel</h1>
            <p className="text-muted-foreground">AI-Powered Token Risk Analysis</p>
            <p className="text-sm text-muted-foreground mt-1">Avalanche Fuji Testnet</p>
          </div>
          <ConnectButton client={client} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Avalanche Sentinel</h1>
          <p className="text-muted-foreground">AI-powered risk intelligence and sentiment analysis</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <ConnectButton client={client} />
          </div>
        </div>

        <Separator />

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4">
          <Button
            variant={activeTab === "analysis" ? "default" : "outline"}
            onClick={() => setActiveTab("analysis")}
          >
            Token Analysis
          </Button>
          <Button
            variant={activeTab === "slippage" ? "default" : "outline"}
            onClick={() => setActiveTab("slippage")}
          >
            Slippage Sentinel
          </Button>
        </div>

        {/* Token Analysis Tab */}
        {activeTab === "analysis" && (
          <>
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Analyze Token</CardTitle>
                <CardDescription>
                  Enter a token contract address to get comprehensive risk analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
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
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !tokenAddress.trim()}
                    className="min-w-[200px]"
                  >
                    {isAnalyzing ? "Analyzing..." : "Analyze ($0.05 USDC)"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Payment of $0.05 USDC required for comprehensive token analysis
                </p>
              </CardContent>
            </Card>

            {/* Analysis Result */}
            {result && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TokenAnalysisResult
                  tokenAddress={result.tokenAddress}
                  tokenData={result.tokenData}
                  analysis={result.analysis}
                  topTweets={result.topTweets}
                  timestamp={result.timestamp}
                />
              </div>
            )}
          </>
        )}

        {/* Slippage Sentinel Tab */}
        {activeTab === "slippage" && (
          <>
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Slippage Sentinel</CardTitle>
                <CardDescription>
                  Estimate safe slippage tolerance for any swap route on Avalanche
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token In (Address)</label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={tokenIn}
                    onChange={(e) => setTokenIn(e.target.value)}
                    disabled={isCalculating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Out (Address)</label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={tokenOut}
                    onChange={(e) => setTokenOut(e.target.value)}
                    disabled={isCalculating}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount In</label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={amountIn}
                      onChange={(e) => setAmountIn(e.target.value)}
                      disabled={isCalculating}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Route Hint (Optional)</label>
                    <Input
                      type="text"
                      placeholder="avalanche"
                      value={routeHint}
                      onChange={(e) => setRouteHint(e.target.value)}
                      disabled={isCalculating}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCalculateSlippage}
                  disabled={isCalculating || !tokenIn.trim() || !tokenOut.trim() || !amountIn.trim()}
                  className="w-full"
                >
                  {isCalculating ? "Calculating..." : "Calculate Slippage ($0.05 USDC)"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Payment of $0.05 USDC required for slippage analysis
                </p>
              </CardContent>
            </Card>

            {/* Slippage Result */}
            {slippageResult && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SlippageSentinel result={slippageResult} />
              </div>
            )}
          </>
        )}

        {/* Transaction Log */}
        {logs.length > 0 && (
          <div className="max-w-4xl mx-auto animate-in fade-in-from-bottom-4 duration-700">
            <TransactionLog logs={logs} />
          </div>
        )}
      </div>
    </div>
  );
}
