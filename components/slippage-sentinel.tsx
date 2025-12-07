"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SlippageSentinelResult {
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

interface SlippageSentinelProps {
  result: SlippageSentinelResult;
}

export function SlippageSentinel({ result }: SlippageSentinelProps) {
  const slippagePercent = (result.min_safe_slip_bps / 100).toFixed(2);
  const poolDepthFormatted = result.pool_depths.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const tradeSizeFormatted = result.recent_trade_size_p95.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Determine risk level based on slippage
  const getRiskLevel = (slippageBps: number): "LOW" | "MEDIUM" | "HIGH" => {
    if (slippageBps <= 100) return "LOW"; // <= 1%
    if (slippageBps <= 300) return "MEDIUM"; // <= 3%
    return "HIGH"; // > 3%
  };

  const riskLevel = getRiskLevel(result.min_safe_slip_bps);
  const riskColor =
    riskLevel === "LOW"
      ? "bg-green-500/10 text-green-600 dark:text-green-400"
      : riskLevel === "MEDIUM"
        ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400";

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Slippage Analysis</CardTitle>
            <CardDescription>Safe slippage tolerance estimation</CardDescription>
          </div>
          <Badge className={riskColor}>{riskLevel} RISK</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Slippage Recommendation */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{slippagePercent}%</span>
            <span className="text-muted-foreground text-sm">
              ({result.min_safe_slip_bps} basis points)
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Recommended minimum slippage tolerance for this swap
          </p>
        </div>

        <Separator />

        {/* Pool Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Pool Depth</p>
            <p className="text-2xl font-semibold">${poolDepthFormatted}</p>
            <p className="text-xs text-muted-foreground">Total liquidity in USD</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Trade Size (P95)</p>
            <p className="text-2xl font-semibold">${tradeSizeFormatted}</p>
            <p className="text-xs text-muted-foreground">95th percentile trade size</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Volatility Index</p>
            <p className="text-2xl font-semibold">{result.volatility_index.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">24h price change</p>
          </div>
        </div>

        <Separator />

        {/* Swap Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Swap Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Token In</p>
              <p className="font-mono text-xs break-all">{result.token_in}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Token Out</p>
              <p className="font-mono text-xs break-all">{result.token_out}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount In</p>
              <p className="font-semibold">{result.amount_in}</p>
            </div>
            {result.route_hint && (
              <div>
                <p className="text-muted-foreground">Route Hint</p>
                <p className="font-semibold capitalize">{result.route_hint}</p>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Explanation */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold">Analysis Breakdown</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Slippage calculated based on pool depth ({poolDepthFormatted} USD) and trade size
            </li>
            <li>
              Volatility adjustment applied: {Math.abs(result.volatility_index).toFixed(2)}% 24h
              change
            </li>
            <li>Fee overhead of 0.3% included in calculation</li>
            <li>
              {riskLevel === "LOW"
                ? "Low risk: Pool has sufficient liquidity for this trade size"
                : riskLevel === "MEDIUM"
                  ? "Medium risk: Consider splitting large trades or using limit orders"
                  : "High risk: Large slippage expected. Consider alternative routes or smaller trade size"}
            </li>
          </ul>
        </div>

        <Separator />

        <p className="text-xs text-muted-foreground">
          Analysis generated: {new Date(result.timestamp).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

