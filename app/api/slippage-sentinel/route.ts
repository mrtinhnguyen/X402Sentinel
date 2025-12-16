import { settlePayment, facilitator } from "thirdweb/x402";
import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";
import { USDC_BASE_ADDRESS, PAYMENT_AMOUNTS } from "@/lib/constants";

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.THIRDWEB_SERVER_WALLET_ADDRESS!,
});

// Constants
const MIN_SLIPPAGE_BPS = 50; // 0.5%
const MAX_SLIPPAGE_BPS = 1000; // 10%
const FEE_OVERHEAD_PCT = 0.3; // 0.3% overhead for fees

const DEX_SCREENER_BASE_URL = "https://api.dexscreener.com";
const GECKO_TERMINAL_BASE_URL = "https://api.geckoterminal.com";

// Chain mapping for GeckoTerminal
const CHAIN_MAP: Record<string, string> = {
  base: "base",
  ethereum: "eth",
  eth: "eth",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon",
  bsc: "bsc",
  fantom: "ftm",
};

interface NormalizedPool {
  pairAddress?: string;
  baseToken?: {
    address: string;
    symbol: string;
  };
  quoteToken?: {
    address: string;
    symbol: string;
  };
  priceUsd: number;
  liquidity: { usd: number };
  priceChange?: { h24?: number };
  chainId?: string;
  dexId?: string;
}

interface PoolMetrics {
  maxSafeSlipBps: number;
  maxPoolDepth: number;
  maxTradeP95: number;
  maxVolatility: number;
}

interface DexScreenerPair {
  chainId?: string;
  dexId?: string;
  pairAddress: string;
  baseToken?: {
    address: string;
    symbol: string;
  };
  quoteToken?: {
    address: string;
    symbol: string;
  };
  priceUsd?: string;
  liquidity?: {
    usd?: number;
  };
  priceChange?: {
    h24?: number;
  };
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}

interface GeckoTerminalPool {
  id: string;
  attributes: {
    base_token?: {
      address: string;
      symbol: string;
    };
    quote_token?: {
      address: string;
      symbol: string;
    };
    base_token_price_usd?: string;
    reserve_in_usd?: string;
    price_change_percentage_24h?: string;
  };
}

interface GeckoTerminalResponse {
  data: GeckoTerminalPool[];
}

// Utility functions
function normalizeHex(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function buildDexScreenerUrl(routeHint: string | undefined, tokenIn: string): string {
  if (routeHint && routeHint.includes("/")) {
    return `${DEX_SCREENER_BASE_URL}/latest/dex/pairs/${routeHint}`;
  }
  return `${DEX_SCREENER_BASE_URL}/latest/dex/tokens/${tokenIn}`;
}

// Fetch pools from DexScreener
async function fetchDexScreenerPools(
  tokenIn: string,
  tokenOut: string,
  routeHint?: string,
): Promise<NormalizedPool[]> {
  const url = buildDexScreenerUrl(routeHint, tokenIn);
  const response = await fetch(url, {
    headers: {
      "user-agent": "base-sentinel/1.0",
    },
  });

  if (!response.ok) return [];

  const data: DexScreenerResponse = await response.json();
  const pairs = data.pairs || [];

  const tokenInLower = normalizeHex(tokenIn);
  const tokenOutLower = normalizeHex(tokenOut);
  const routeChain = routeHint && !routeHint.includes("/") ? routeHint.toLowerCase() : null;

  return pairs
    .filter((p) => {
      const base = normalizeHex(p?.baseToken?.address);
      const quote = normalizeHex(p?.quoteToken?.address);
      const poolChain = p?.chainId?.toLowerCase();
      const chainMatches = !routeChain || poolChain === routeChain || poolChain === "base" || poolChain === "8453";

      return (
        chainMatches &&
        ((base === tokenInLower && quote === tokenOutLower) ||
          (base === tokenOutLower && quote === tokenInLower))
      );
    })
    .map((p) => ({
      pairAddress: p.pairAddress,
      baseToken: p.baseToken
        ? { address: p.baseToken.address || "", symbol: p.baseToken.symbol }
        : undefined,
      quoteToken: p.quoteToken
        ? { address: p.quoteToken.address || "", symbol: p.quoteToken.symbol }
        : undefined,
      priceUsd: Number(p.priceUsd || 0),
      liquidity: { usd: Number(p.liquidity?.usd || 0) },
      priceChange: { h24: Number(p.priceChange?.h24 || 0) },
      chainId: p.chainId,
      dexId: p.dexId,
    }));
}

// Fetch pools from GeckoTerminal
async function fetchGeckoTerminalPools(
  tokenIn: string,
  tokenOut: string,
  routeHint?: string,
): Promise<NormalizedPool[]> {
  if (!routeHint || routeHint.includes("/")) return [];

  const geckoChain = CHAIN_MAP[routeHint.toLowerCase()] || "base";
  const url = `${GECKO_TERMINAL_BASE_URL}/api/v2/networks/${geckoChain}/pools`;

  const response = await fetch(url, {
    headers: {
      "user-agent": "base-sentinel/1.0",
    },
  });

  if (!response.ok) return [];

  const data: GeckoTerminalResponse = await response.json();
  const pools = data.data || [];

  const tokenInLower = normalizeHex(tokenIn);
  const tokenOutLower = normalizeHex(tokenOut);

  return pools
    .filter((p) => {
      const base = normalizeHex(p?.attributes?.base_token?.address);
      const quote = normalizeHex(p?.attributes?.quote_token?.address);
      return (
        (base === tokenInLower && quote === tokenOutLower) ||
        (base === tokenOutLower && quote === tokenInLower)
      );
    })
    .map((p) => ({
      baseToken: p.attributes?.base_token
        ? {
            address: p.attributes.base_token.address || "",
            symbol: p.attributes.base_token.symbol,
          }
        : undefined,
      quoteToken: p.attributes?.quote_token
        ? {
            address: p.attributes.quote_token.address || "",
            symbol: p.attributes.quote_token.symbol,
          }
        : undefined,
      priceUsd: Number(p.attributes?.base_token_price_usd || 0),
      liquidity: { usd: Number(p.attributes?.reserve_in_usd || 0) },
      priceChange: {
        h24: Number(p.attributes?.price_change_percentage_24h || 0),
      },
    }));
}

// Fetch all pools (DexScreener first, then GeckoTerminal as fallback)
async function fetchAllPools(
  tokenIn: string,
  tokenOut: string,
  routeHint?: string,
): Promise<NormalizedPool[]> {
  const dexScreenerPools = await fetchDexScreenerPools(tokenIn, tokenOut, routeHint);

  if (dexScreenerPools.length > 0) {
    return dexScreenerPools;
  }

  const geckoPools = await fetchGeckoTerminalPools(tokenIn, tokenOut, routeHint || "base");
  return geckoPools;
}

// Analyze pool metrics and calculate safe slippage
function analyzePoolMetrics(
  pools: NormalizedPool[],
  tradeAmountUsd: number,
): PoolMetrics {
  let maxSafeSlipBps = MIN_SLIPPAGE_BPS;
  let maxPoolDepth = 0;
  let maxTradeP95 = 0;
  let maxVolatility = 0;

  for (const pool of pools) {
    const poolDepthUsd = pool.liquidity.usd;
    const priceChange24h = pool.priceChange?.h24 || 0;

    if (!Number.isFinite(poolDepthUsd) || poolDepthUsd <= 0) continue;

    // Calculate price impact based on trade size vs pool depth
    const depthRatio = tradeAmountUsd / (poolDepthUsd + 1);
    const baseSlippage = Math.min(Math.max(depthRatio, 0) * 100, 5);

    // Add volatility adjustment
    const volatilityAdj = Math.abs(priceChange24h) / 10;

    // Add fee overhead
    const finalSlipPct = Math.min(
      baseSlippage + volatilityAdj + FEE_OVERHEAD_PCT,
      10,
    );

    // Ensure minimum slippage
    const safeSlipBps = Math.max(
      Math.ceil(finalSlipPct * 100),
      MIN_SLIPPAGE_BPS,
    );
    const cappedSlipBps = Math.min(safeSlipBps, MAX_SLIPPAGE_BPS);

    const tradeP95 = Number((tradeAmountUsd * 0.95).toFixed(2));

    if (cappedSlipBps > maxSafeSlipBps) maxSafeSlipBps = cappedSlipBps;
    if (poolDepthUsd > maxPoolDepth) maxPoolDepth = poolDepthUsd;
    if (tradeP95 > maxTradeP95) maxTradeP95 = tradeP95;
    if (Math.abs(priceChange24h) > maxVolatility)
      maxVolatility = Math.abs(priceChange24h);
  }

  return {
    maxSafeSlipBps,
    maxPoolDepth,
    maxTradeP95,
    maxVolatility,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenIn = searchParams.get("token_in");
  const tokenOut = searchParams.get("token_out");
  const amountIn = searchParams.get("amount_in");
  const routeHint = searchParams.get("route_hint");

  if (!tokenIn || !tokenOut || !amountIn) {
    return Response.json(
      { error: "token_in, token_out, and amount_in are required" },
      { status: 400 }
    );
  }

  // Validate addresses
  if (!isValidAddress(tokenIn)) {
    return Response.json(
      { error: "Invalid token_in address format" },
      { status: 400 }
    );
  }

  if (!isValidAddress(tokenOut)) {
    return Response.json(
      { error: "Invalid token_out address format" },
      { status: 400 }
    );
  }

  // Validate amount
  const amountInNum = parseFloat(amountIn);
  if (isNaN(amountInNum) || amountInNum <= 0) {
    return Response.json(
      { error: "amount_in must be a positive number" },
      { status: 400 }
    );
  }

  // Skip payment verification if price is 0 (free)
  if (!PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.isFree) {
    // Get payment data - let settlePayment handle 402 if missing
    const paymentData = request.headers.get("x-payment");

    // Verify payment
    const result = await settlePayment({
      resourceUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/slippage-sentinel?token_in=${encodeURIComponent(tokenIn)}&token_out=${encodeURIComponent(tokenOut)}&amount_in=${encodeURIComponent(amountIn)}${routeHint ? `&route_hint=${encodeURIComponent(routeHint)}` : ''}`,
      method: "GET",
      paymentData,
      payTo: process.env.MERCHANT_WALLET_ADDRESS!,
      network: base,
      price: {
        amount: PAYMENT_AMOUNTS.SLIPPAGE_SENTINEL.amount,
        asset: {
          address: USDC_BASE_ADDRESS,
        },
      },
      facilitator: thirdwebFacilitator,
    });

    if (result.status !== 200) {
      return Response.json(result.responseBody, {
        status: result.status,
        headers: result.responseHeaders,
      });
    }
  }

  try {
    // Fetch pool data
    const pools = await fetchAllPools(tokenIn, tokenOut, routeHint || undefined);

    if (pools.length === 0) {
      return Response.json(
        { error: "No matching liquidity pool found for this token pair" },
        { status: 404 }
      );
    }

    // Calculate trade amount in USD
    const firstPool = pools[0];
    const tradeAmountUsd = amountInNum * firstPool.priceUsd;

    // Analyze metrics and calculate slippage
    const metrics = analyzePoolMetrics(pools, tradeAmountUsd);

    const output = {
      success: true,
      min_safe_slip_bps: metrics.maxSafeSlipBps,
      pool_depths: Number(metrics.maxPoolDepth.toFixed(2)),
      recent_trade_size_p95: metrics.maxTradeP95,
      volatility_index: Number(metrics.maxVolatility.toFixed(2)),
      token_in: tokenIn,
      token_out: tokenOut,
      amount_in: amountInNum,
      route_hint: routeHint || "base",
      timestamp: new Date().toISOString(),
    };

    return Response.json(output);
  } catch (error) {
    console.error("Slippage sentinel error:", error);
    return Response.json(
      {
        error: "Failed to calculate safe slippage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

