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
import { SlippageSentinel } from "@/components/slippage-sentinel";
import Link from "next/link";
import Image from "next/image";
import heroImage from "../assets/hero.jpg";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

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

export default function SlippagePage() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [routeHint, setRouteHint] = useState("base");
  const [slippageResult, setSlippageResult] = useState<SlippageResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate display price dynamically from PAYMENT_AMOUNTS
  const displayPrice = PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.isFree
    ? "Free"
    : `$${(parseInt(PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.amount) / 1000000).toFixed(2)} USDC`;

  useEffect(() => {
    setLogs([]);
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

      const apiUrl = `${getApiBaseUrl()}/api/slippage-sentinel?token_in=${encodeURIComponent(tokenIn.trim())}&token_out=${encodeURIComponent(tokenOut.trim())}&amount_in=${encodeURIComponent(amountInNum)}${routeHint ? `&route_hint=${encodeURIComponent(routeHint)}` : ''}`;
      
      let response;
      
      // Skip payment if price is 0 (free)
      if (PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.isFree) {
        addLog("Free access - no payment required", "info");
        response = await fetch(apiUrl);
      } else {
        const normalizedFetch = createNormalizedFetch(BASE_MAINNET_CHAIN_ID);
        const fetchWithPay = wrapFetchWithPayment(
          normalizedFetch,
          client,
          wallet,
          PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.bigInt
        );

        const priceInUSD = (parseInt(PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.amount) / 1000000).toFixed(2);
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
            <h1 className="text-4xl font-bold mb-2 text-white">Slippage Sentinel</h1>
            <p className="text-white/80">Safe Slippage Tolerance Estimation</p>
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
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Slippage Sentinel</h1>
              <p className="text-white/80 text-sm sm:text-base">Estimate safe slippage tolerance for any swap route on Base</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Link href="/">
                <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                  Home
                </Button>
              </Link>
              <Link href="/analysis">
                <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                  Token Analysis
                </Button>
              </Link>
              <ConnectButton client={client} />
            </div>
          </div>

          {/* Slippage Input Card */}
          <Card className="max-w-6xl mx-auto bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Slippage Sentinel</CardTitle>
              <CardDescription className="text-white/70">
                Estimate safe slippage tolerance for any swap route on Base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Token In (Address)</label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value)}
                  disabled={isCalculating}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Token Out (Address)</label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={tokenOut}
                  onChange={(e) => setTokenOut(e.target.value)}
                  disabled={isCalculating}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Amount In</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    disabled={isCalculating}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Route Hint (Optional)</label>
                  <Input
                    type="text"
                    placeholder="base"
                    value={routeHint}
                    onChange={(e) => setRouteHint(e.target.value)}
                    disabled={isCalculating}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
                  />
                </div>
              </div>
              <Button
                onClick={handleCalculateSlippage}
                disabled={isCalculating || !tokenIn.trim() || !tokenOut.trim() || !amountIn.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-500"
              >
                {isCalculating ? "Calculating..." : `Calculate Slippage (${displayPrice})`}
              </Button>
              {PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.isFree ? (
                <p className="text-xs text-white/60 text-center">
                  Free access - no payment required
                </p>
              ) : (
                <p className="text-xs text-white/60 text-center">
                  Payment of {displayPrice} required for slippage analysis
                </p>
              )}
            </CardContent>
          </Card>

          {/* Slippage Result */}
          {slippageResult && (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SlippageSentinel result={slippageResult} />
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

