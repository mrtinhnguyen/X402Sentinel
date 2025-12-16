import { settlePayment, facilitator } from "thirdweb/x402";
import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";
import { USDC_BASE_ADDRESS, PAYMENT_AMOUNTS, COINGECKO_NETWORK_ID, KNOWN_EXCHANGE_ADDRESSES, WHALE_THRESHOLDS, TIME_PERIODS } from "@/lib/constants";
import OpenAI from "openai";
import { createPublicClient, http, formatUnits, PublicClient } from "viem";
import { base as baseChain } from "viem/chains";
import type { Log } from "viem";

// Type definitions for external API responses
interface DexScreenerPair {
  liquidity?: {
    usd?: string;
  } | string;
  priceUsd?: string;
  priceChange?: {
    h24?: number;
  };
  holders?: number;
  buyCount?: number;
  sellCount?: number;
  volume?: {
    h24?: number;
  };
  [key: string]: unknown;
}

// DexScreenerResponse type - kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DexScreenerResponse = {
  pairs?: DexScreenerPair[];
  [key: string]: unknown;
};

interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
  };
  [key: string]: unknown;
}

interface TwitterResponse {
  data?: TwitterTweet[];
  meta?: {
    result_count?: number;
  };
  [key: string]: unknown;
}

interface RedditPost {
  data?: {
    title?: string;
    selftext?: string;
    ups?: number;
    downs?: number;
    score?: number;
    num_comments?: number;
    created_utc?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// RedditResponse type - kept for future use
// interface RedditResponse {
//   data?: {
//     children?: RedditPost[];
//     [key: string]: unknown;
//   };
//   [key: string]: unknown;
// }

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.THIRDWEB_SERVER_WALLET_ADDRESS!,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface TokenData {
  price: number;
  marketCap?: number;
  volume24h?: number;
  priceChange24h?: number;
  holders?: number;
  distribution?: {
    top10: number;
    top100: number;
    concentration: number;
  };
  onChainMetrics: {
    totalHolders: number;
    buySellRatio: number;
    whaleActivity: string;
    liquidity: string;
  };
  advancedOnChainMetrics?: {
    activeAddresses: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    transactionVolume: {
      volume24h: number;
      volume7d: number;
      volume30d: number;
    };
    exchangeFlows: {
      inflows24h: number;
      outflows24h: number;
      netFlow: number;
      netFlowUSD: number;
    };
    holderDistribution: {
      top10Percent: number;
      top100Holders: number;
      giniCoefficient: number;
      concentrationRisk: 'low' | 'medium' | 'high';
    };
    mvrv: {
      ratio: number;
      marketValue: number;
      realizedValue: number;
      interpretation: 'undervalued' | 'fair' | 'overvalued';
    };
    nupl: {
      value: number;
      interpretation: 'capitulation' | 'fear' | 'hope' | 'optimism' | 'euphoria';
    };
    tvl?: {
      value: number;
      valueUSD: number;
      change24h: number;
    };
    whaleActivity: {
      largeTransactions24h: number;
      whaleVolume24h: number;
      accumulationScore: number; // -1 to 1
    };
    hodlWaves: {
      lessThan1d: number;
      d1To7: number;
      w1To4: number;
      m1To3: number;
      m3To6: number;
      m6To12: number;
      moreThan1y: number;
    };
    nvt: {
      ratio: number;
      ratio30d: number;
      interpretation: 'undervalued' | 'fair' | 'overvalued';
    };
  };
  socialSentiment?: {
    twitter: number;
    reddit: number;
    overall: number;
  };
  chartPattern?: string;
}

async function fetchCoinGeckoData(tokenAddress: string): Promise<Partial<TokenData>> {
  try {
    const apiKey = process.env.COINGECKO_API;
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/networks/${COINGECKO_NETWORK_ID}/token_price/${tokenAddress}?include_market_cap=true&include_24hr_vol=true&include_24hr_price_change=true&mcap_fdv_fallback=true`,
      {
        headers,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Token not found on CoinGecko, will use DexScreener data');
        return {};
      }
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data = await response.json();
    const tokenData = data[tokenAddress.toLowerCase()];

    if (!tokenData) {
      console.log('Token data not found in CoinGecko response, will use DexScreener data');
      return {};
    }

    return {
      price: tokenData.usd || 0,
      marketCap: tokenData.usd_market_cap || undefined,
      volume24h: tokenData.usd_24h_vol || undefined,
      priceChange24h: tokenData.usd_24h_change || undefined,
    };
  } catch (error) {
    console.error('CoinGecko fetch error:', error);
    return {};
  }
}

async function fetchDexScreenerData(tokenAddress: string): Promise<Partial<TokenData>> {
  try {
    // Try multiple chainId formats for Base
    const chainIds = ["base", "8453"]; // Try different formats
    let pairs: DexScreenerPair[] = [];
    let lastError: Error | null = null;

    // Try the new token-pairs endpoint with different chainId formats
    for (const chainId of chainIds) {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`,
          {
            headers: {
              'Accept': '*/*',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // The endpoint might return pairs directly or in a data structure
          const foundPairs = data.pairs || data.data?.pairs || (Array.isArray(data) ? data : []);
          
          if (Array.isArray(foundPairs) && foundPairs.length > 0) {
            pairs = foundPairs;
            console.log(`DexScreener token-pairs API success with chainId "${chainId}": Found ${pairs.length} pairs`);
            break;
          }
        } else {
          const errorText = await response.text();
          console.warn(`DexScreener token-pairs API failed for chainId "${chainId}" (${response.status}): ${errorText}`);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`DexScreener token-pairs API error for chainId "${chainId}":`, err);
      }
    }

    // Fallback to old endpoint if new one fails
    if (pairs.length === 0) {
      console.warn('DexScreener token-pairs API failed for all chainIds, trying fallback endpoint...');
      try {
        const fallbackResponse = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
        );
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          pairs = fallbackData.pairs || [];
          console.log(`DexScreener fallback endpoint: Found ${pairs.length} pairs`);
        } else {
          throw new Error(`DexScreener API error: ${fallbackResponse.statusText}`);
        }
      } catch (fallbackErr) {
        console.error('DexScreener fallback endpoint also failed:', fallbackErr);
        throw lastError || fallbackErr;
      }
    }

    if (!Array.isArray(pairs) || pairs.length === 0) {
      console.warn('No pairs found in DexScreener response');
      return {};
    }

    return processDexScreenerPairs(pairs);
  } catch (error) {
    console.error('DexScreener fetch error:', error);
    return {};
  }
}

function processDexScreenerPairs(pairs: DexScreenerPair[]): Partial<TokenData> {
  if (!pairs || pairs.length === 0) {
    return {};
  }

  // Get the pair with highest liquidity
  const sortedPairs = [...pairs].sort((a: DexScreenerPair, b: DexScreenerPair) => {
    const aLiquidityValue = typeof a.liquidity === 'string' ? a.liquidity : (a.liquidity?.usd || "0");
    const bLiquidityValue = typeof b.liquidity === 'string' ? b.liquidity : (b.liquidity?.usd || "0");
    const aLiquidity = parseFloat(aLiquidityValue);
    const bLiquidity = parseFloat(bLiquidityValue);
    return bLiquidity - aLiquidity;
  });
  const mainPair = sortedPairs[0] || ({} as DexScreenerPair);

  // Extract price history for chart pattern analysis
  const priceHistory = (mainPair.priceHistory as { h24?: unknown[] } | undefined)?.h24 || [];
  const chartPattern = detectChartPattern(priceHistory);

  // Extract market cap from DexScreener (fdv or marketCap)
  const marketCap = mainPair.fdv 
    ? parseFloat(String(mainPair.fdv)) 
    : mainPair.marketCap 
      ? parseFloat(String(mainPair.marketCap)) 
      : undefined;

  // Calculate total liquidity across all pairs (aggregate from all pools)
  let totalLiquidity = 0;
  let totalVolume24h = 0;
  let maxHolders = 0;
  
  pairs.forEach((pair: DexScreenerPair) => {
    // Aggregate liquidity
    const liquidityValue = typeof pair.liquidity === 'string' ? pair.liquidity : (pair.liquidity?.usd || "0");
    const liquidity = parseFloat(liquidityValue);
    if (!isNaN(liquidity) && liquidity > 0) {
      totalLiquidity += liquidity;
    }
    
    // Aggregate volume
    const volumeValue = pair.volume && typeof pair.volume === 'object' && 'h24' in pair.volume
      ? String(pair.volume.h24)
      : "0";
    const volume = parseFloat(volumeValue);
    if (!isNaN(volume) && volume > 0) {
      totalVolume24h += volume;
    }
    
    // Get max holders from any pair (some DEXs provide this)
    const pairHoldersValue = (pair.holders as number | undefined) || 
                             (pair.uniqueWalletCount as number | undefined) || 
                             (pair.uniqueWallets as number | undefined) || 
                             0;
    const pairHolders = typeof pairHoldersValue === 'number' ? pairHoldersValue : 0;
    if (pairHolders > maxHolders) {
      maxHolders = pairHolders;
    }
  });

  // Use main pair for price and other metrics
  const price = mainPair.priceUsd ? parseFloat(String(mainPair.priceUsd)) : undefined;
  const priceChange24h = mainPair.priceChange && typeof mainPair.priceChange === 'object' && 'h24' in mainPair.priceChange
    ? parseFloat(String(mainPair.priceChange.h24))
    : undefined;

  // Calculate buy/sell ratio from DexScreener data (aggregate across all pairs)
  let totalBuys = 0;
  let totalSells = 0;
  
  pairs.forEach((pair: DexScreenerPair) => {
    const txns = pair.txns as { m5?: { buys?: number; sells?: number }; h24?: { buys?: number; sells?: number } } | undefined;
    const buys = txns?.m5?.buys || txns?.h24?.buys || (pair.buys as number | undefined) || 0;
    const sells = txns?.m5?.sells || txns?.h24?.sells || (pair.sells as number | undefined) || 0;
    totalBuys += buys;
    totalSells += sells;
  });
  
  const buySellRatio = totalSells > 0 ? totalBuys / totalSells : totalBuys > 0 ? totalBuys : 1.0;

  // Determine whale activity based on total volume
  let whaleActivity: "low" | "moderate" | "high" = "low";
  if (totalVolume24h > 1000000) {
    whaleActivity = "high";
  } else if (totalVolume24h > 100000) {
    whaleActivity = "moderate";
  }

  console.log(`DexScreener processed: liquidity=$${totalLiquidity.toFixed(2)}, volume24h=$${totalVolume24h.toFixed(2)}, holders=${maxHolders}, pairs=${pairs.length}`);

  return {
    price: price,
    marketCap: marketCap,
    volume24h: totalVolume24h > 0 ? totalVolume24h : undefined,
    priceChange24h: priceChange24h,
    chartPattern,
    onChainMetrics: {
      totalHolders: maxHolders > 0 ? maxHolders : 0, // Use holders from DexScreener if available
      buySellRatio: buySellRatio,
      whaleActivity: whaleActivity,
      liquidity: totalLiquidity > 0 
        ? `$${totalLiquidity.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 })}` 
        : (typeof mainPair.liquidity === 'object' && mainPair.liquidity?.usd)
          ? `$${parseFloat(String(mainPair.liquidity.usd)).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 })}` 
          : 'N/A',
    },
  };
}

// Chart pattern detection based on price history
function detectChartPattern(priceHistory: unknown[]): string {
  if (!priceHistory || priceHistory.length < 3) {
    return 'Insufficient data';
  }

  try {
    const prices = priceHistory.map((p) => parseFloat(String(p))).filter((p: number) => !isNaN(p));
    if (prices.length < 3) return 'Insufficient data';

    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
    const volatility = (maxPrice - minPrice) / avgPrice;

    // Simple pattern detection
    if (changePercent > 10 && volatility < 0.2) {
      return 'Uptrend (Bullish)';
    } else if (changePercent < -10 && volatility < 0.2) {
      return 'Downtrend (Bearish)';
    } else if (volatility > 0.3) {
      return 'High Volatility (Unstable)';
    } else if (Math.abs(changePercent) < 5) {
      return 'Sideways (Consolidation)';
    } else {
      return 'Mixed Signals';
    }
  } catch (error) {
    console.error('Chart pattern detection error:', error);
    return 'Analysis unavailable';
  }
}

// RPC Providers (with fallback support)
const getRpcProviders = (): string[] => {
  const providers: string[] = [];
  
  // Primary: Use BASE_RPC_URL if provided
  if (process.env.BASE_RPC_URL) {
    providers.push(process.env.BASE_RPC_URL);
  }
  
  // Fallback 1: Alchemy (if API key provided)
  if (process.env.ALCHEMY_BASE_API_KEY) {
    providers.push(`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_BASE_API_KEY}`);
  }
  
  // Fallback 2: Infura (if API key provided)
  if (process.env.INFURA_BASE_API_KEY) {
    providers.push(`https://base-mainnet.infura.io/v3/${process.env.INFURA_BASE_API_KEY}`);
  }
  
  // Fallback 3: QuickNode (if endpoint provided)
  if (process.env.QUICKNODE_BASE_URL) {
    providers.push(process.env.QUICKNODE_BASE_URL);
  }
  
  // Fallback 4: Public endpoint (always last)
  providers.push("https://mainnet.base.org");
  
  return providers;
};

// RPC Retry Helper with Exponential Backoff
// Note: Provider fallback is handled by viem automatically when multiple providers are configured
async function retryRpcCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = 
        errorMessage.includes('429') || 
        errorMessage.includes('503') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('no backend') ||
        errorMessage.includes('over rate limit') ||
        errorMessage.includes('currently healthy');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`RPC call failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms... Error: ${errorMessage.substring(0, 100)}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// ERC-20 ABI for standard token functions
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

async function fetchOnChainData(tokenAddress: string): Promise<Partial<TokenData> & { tokenSymbol?: string; tokenName?: string }> {
  // Return safe defaults if anything fails
  const defaultReturn = {
    tokenSymbol: "UNKNOWN",
    tokenName: "Unknown Token",
    onChainMetrics: {
      totalHolders: 0,
      buySellRatio: 0.5,
      whaleActivity: "moderate" as const,
      liquidity: "N/A",
    },
    distribution: {
      top10: 0,
      top100: 0,
      concentration: 0,
    },
  };

  try {
    // Create public client for Base Mainnet
    // Use BASE_RPC_URL from env if available, fallback to public endpoint
    const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    const publicClient = createPublicClient({
      chain: {
        ...baseChain,
        rpcUrls: {
          default: {
            http: [rpcUrl],
          },
        },
      },
      transport: http(rpcUrl),
    });

    const tokenAddr = tokenAddress as `0x${string}`;

    // Fetch basic token info with individual error handling
    let tokenName = "Unknown";
    let tokenSymbol = "UNKNOWN";
    // Note: tokenDecimals and tokenTotalSupply are fetched later for advanced metrics
    let tokenTotalSupply = BigInt(0);

    try {
      tokenName = await retryRpcCall(() => 
        publicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "name",
        }) as Promise<string>
      );
    } catch (e) {
      console.error("Error fetching token name:", e);
    }

    try {
      tokenSymbol = await retryRpcCall(() => 
        publicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "symbol",
        }) as Promise<string>
      );
    } catch (e) {
      console.error("Error fetching token symbol:", e);
    }

    try {
      await retryRpcCall(() => 
        publicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "decimals",
        })
      );
    } catch {
      // Error already logged in outer catch
    }

    try {
      tokenTotalSupply = await retryRpcCall(() => 
        publicClient.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "totalSupply",
        }) as Promise<bigint>
      );
    } catch (e) {
      console.error("Error fetching token totalSupply:", e);
    }

    // Estimate holders using a heuristic: check recent transfer events
    // Note: This is an approximation. For accurate counts, use an indexer/subgraph
    let estimatedTotalHolders = 0;
    let buySellRatio = 1.0;
    let whaleActivity: "low" | "moderate" | "high" = "moderate";

    try {
      // Get recent blocks (limit to 2048 blocks max to avoid RPC errors)
      const currentBlock = await retryRpcCall(() => publicClient.getBlockNumber());
      const maxBlocks = 2048; // RPC limit
      const fromBlock = currentBlock > BigInt(maxBlocks) 
        ? currentBlock - BigInt(maxBlocks) 
        : BigInt(0);

      try {
        // Get transfer events from the last 24 hours
        const transferLogs = (await retryRpcCall(() => publicClient.getLogs({
          address: tokenAddr,
          event: {
            type: "event",
            name: "Transfer",
            inputs: [
              { indexed: true, name: "from", type: "address" },
              { indexed: true, name: "to", type: "address" },
              { indexed: false, name: "value", type: "uint256" },
            ],
          },
          fromBlock,
          toBlock: currentBlock,
        }))) as Log[];

        // Analyze transfers
        const uniqueAddresses = new Set<string>();
        const largeTransfers: bigint[] = [];

        transferLogs.forEach((log: Log) => {
          // Type assertion for decoded log args
          const logArgs = (log as { args?: { from?: `0x${string}`; to?: `0x${string}`; value?: bigint } }).args;
          const from = logArgs?.from;
          const to = logArgs?.to;
          const value = logArgs?.value;
          
          if (from && from !== "0x0000000000000000000000000000000000000000") {
            uniqueAddresses.add(from.toLowerCase());
          }
          if (to && to !== "0x0000000000000000000000000000000000000000") {
            uniqueAddresses.add(to.toLowerCase());
          }
          if (value) {
            // Consider transfers > 1% of supply as whale activity
            if (tokenTotalSupply > 0 && value > tokenTotalSupply / BigInt(100)) {
              largeTransfers.push(value);
            }
          }
        });

        estimatedTotalHolders = uniqueAddresses.size;
        
        // Estimate buy/sell ratio based on transfers to/from known DEX addresses
        // This is simplified - in production, use DEX router addresses
        const dexAddresses = new Set([
          "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
          "0xcF77a3Ba9A5CA399B7c97c6d5B80F9F8D8C5A8E", // Aerodrome Router
        ].map(a => a.toLowerCase()));

        let buys = 0;
        let sells = 0;
        transferLogs.forEach((log: Log) => {
          const logArgs = (log as { args?: { from?: `0x${string}`; to?: `0x${string}` } }).args;
          const from = logArgs?.from?.toLowerCase();
          const to = logArgs?.to?.toLowerCase();
          if (from && dexAddresses.has(from)) buys++;
          if (to && dexAddresses.has(to)) sells++;
        });

        buySellRatio = sells > 0 ? buys / sells : 1.0;

        // Determine whale activity based on large transfers
        if (largeTransfers.length > 10) {
          whaleActivity = "high";
        } else if (largeTransfers.length > 3) {
          whaleActivity = "moderate";
        } else {
          whaleActivity = "low";
        }
      } catch (eventError) {
        console.error("Error fetching transfer events:", eventError);
        // Use defaults if event fetching fails
      }
    } catch (error) {
      console.error("Error in holder estimation:", error);
    }

    return {
      tokenSymbol,
      tokenName,
      onChainMetrics: {
        totalHolders: estimatedTotalHolders,
        buySellRatio: buySellRatio,
        whaleActivity: whaleActivity,
        liquidity: "N/A", // Will be filled from DexScreener
      },
      distribution: {
        top10: 0, // Requires indexer to calculate accurately
        top100: 0, // Requires indexer to calculate accurately
        concentration: 0, // Requires indexer to calculate accurately
      },
    };
  } catch (error) {
    console.error("On-chain data fetch error:", error);
    console.error("Error details:", error instanceof Error ? error.stack : error);
    // Return default values on error
    return defaultReturn;
  }
}

// Advanced On-Chain Metrics Functions

interface TransferLog {
  from: string;
  to: string;
  value: bigint;
  blockNumber: bigint;
  timestamp?: number;
}

// Zero address constant
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// Transfer event ABI for getLogs
const transferEventAbi = {
  type: "event",
  name: "Transfer",
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: false, name: "value", type: "uint256" },
  ],
} as const;

// Helper function to get transfer logs with timestamps
async function getTransferLogsWithTimestamps(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tokenDecimals: number
): Promise<TransferLog[]> {
  try {
    const transferLogs = await retryRpcCall(() => publicClient.getLogs({
      address: tokenAddress,
      event: {
        type: "event",
        name: "Transfer",
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "value", type: "uint256" },
        ],
      },
        fromBlock,
        toBlock,
      }) as Promise<Log[]>);

    // Get block timestamps for each transfer
    const logsWithTimestamps: TransferLog[] = [];
    const blockCache = new Map<bigint, number>();

    for (const log of transferLogs) {
      let timestamp: number | undefined;
      
      const blockNum = log.blockNumber || BigInt(0);
      if (blockNum > BigInt(0)) {
        if (!blockCache.has(blockNum)) {
          try {
            const block = await retryRpcCall(() => publicClient.getBlock({ blockNumber: blockNum }));
            timestamp = Number(block.timestamp);
            blockCache.set(blockNum, timestamp);
          } catch {
            console.warn(`Failed to get block timestamp for block ${blockNum}`);
          }
        } else {
          timestamp = blockCache.get(blockNum);
        }
      }

      const logArgs = (log as { args?: { from?: `0x${string}`; to?: `0x${string}`; value?: bigint }; blockNumber: bigint | null }).args;
      const blockNumber = blockNum;
      logsWithTimestamps.push({
        from: logArgs?.from?.toLowerCase() || "0x0",
        to: logArgs?.to?.toLowerCase() || "0x0",
        value: logArgs?.value || BigInt(0),
        blockNumber: blockNumber || BigInt(0),
        timestamp,
      });
    }

    return logsWithTimestamps;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('rate limit')) {
      console.error("RPC rate limit error fetching transfer logs. Consider using a dedicated RPC provider:", errorMessage);
    } else {
      console.error("Error fetching transfer logs with timestamps:", error);
    }
    return [];
  }
}

// Fetch Active Addresses (daily, weekly, monthly)
async function fetchActiveAddresses(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  currentBlock: bigint,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tokenPrice: number
): Promise<{ daily: number; weekly: number; monthly: number }> {
  try {
    // Estimate blocks per time period (Base ~2s per block)
    const blocksPerDay = Math.floor(TIME_PERIODS.DAY / 2);
    const blocksPerWeek = Math.floor(TIME_PERIODS.WEEK / 2);
    const blocksPerMonth = Math.floor(TIME_PERIODS.MONTH / 2);

    const fromBlockDaily = currentBlock > BigInt(blocksPerDay) 
      ? currentBlock - BigInt(blocksPerDay) 
      : BigInt(0);
    const fromBlockWeekly = currentBlock > BigInt(blocksPerWeek) 
      ? currentBlock - BigInt(blocksPerWeek) 
      : BigInt(0);
    const fromBlockMonthly = currentBlock > BigInt(blocksPerMonth) 
      ? currentBlock - BigInt(blocksPerMonth) 
      : BigInt(0);

    // Get transfer logs for each period
    const [dailyLogs, weeklyLogs, monthlyLogs] = await Promise.all([
      getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlockDaily, currentBlock, 18),
      getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlockWeekly, currentBlock, 18),
      getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlockMonthly, currentBlock, 18),
    ]);

    // Count unique addresses
    const dailyAddresses = new Set<string>();
    const weeklyAddresses = new Set<string>();
    const monthlyAddresses = new Set<string>();

    dailyLogs.forEach(log => {
      if (log.from !== "0x0000000000000000000000000000000000000000") dailyAddresses.add(log.from);
      if (log.to !== "0x0000000000000000000000000000000000000000") dailyAddresses.add(log.to);
    });

    weeklyLogs.forEach(log => {
      if (log.from !== "0x0000000000000000000000000000000000000000") weeklyAddresses.add(log.from);
      if (log.to !== "0x0000000000000000000000000000000000000000") weeklyAddresses.add(log.to);
    });

    monthlyLogs.forEach(log => {
      if (log.from !== "0x0000000000000000000000000000000000000000") monthlyAddresses.add(log.from);
      if (log.to !== "0x0000000000000000000000000000000000000000") monthlyAddresses.add(log.to);
    });

    return {
      daily: dailyAddresses.size,
      weekly: weeklyAddresses.size,
      monthly: monthlyAddresses.size,
    };
  } catch (error) {
    console.error("Error fetching active addresses:", error);
    return { daily: 0, weekly: 0, monthly: 0 };
  }
}

// Fetch Transaction Volume (24h, 7d, 30d)
async function fetchTransactionVolume(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  currentBlock: bigint,
  tokenDecimals: number,
  tokenPrice: number
): Promise<{ volume24h: number; volume7d: number; volume30d: number }> {
  try {
    const blocksPerDay = Math.floor(TIME_PERIODS.DAY / 2);
    const blocksPerWeek = Math.floor(TIME_PERIODS.WEEK / 2);
    const blocksPerMonth = Math.floor(TIME_PERIODS.MONTH / 2);

    const fromBlock24h = currentBlock > BigInt(blocksPerDay) 
      ? currentBlock - BigInt(blocksPerDay) 
      : BigInt(0);
    const fromBlock7d = currentBlock > BigInt(blocksPerWeek) 
      ? currentBlock - BigInt(blocksPerWeek) 
      : BigInt(0);
    const fromBlock30d = currentBlock > BigInt(blocksPerMonth) 
      ? currentBlock - BigInt(blocksPerMonth) 
      : BigInt(0);

    const [logs24h, logs7d, logs30d] = await Promise.all([
      getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlock24h, currentBlock, tokenDecimals),
      getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlock7d, currentBlock, tokenDecimals),
      getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlock30d, currentBlock, tokenDecimals),
    ]);

    const calculateVolume = (logs: TransferLog[]): number => {
      let totalVolume = BigInt(0);
      logs.forEach(log => {
        // Exclude mint/burn transfers
        if (log.from !== "0x0000000000000000000000000000000000000000" && 
            log.to !== "0x0000000000000000000000000000000000000000") {
          totalVolume += log.value;
        }
      });
      const volumeInTokens = Number(formatUnits(totalVolume, tokenDecimals));
      return volumeInTokens * tokenPrice;
    };

    return {
      volume24h: calculateVolume(logs24h),
      volume7d: calculateVolume(logs7d),
      volume30d: calculateVolume(logs30d),
    };
  } catch (error) {
    console.error("Error fetching transaction volume:", error);
    return { volume24h: 0, volume7d: 0, volume30d: 0 };
  }
}

// Fetch Exchange Inflows/Outflows
async function fetchExchangeFlows(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  currentBlock: bigint,
  tokenDecimals: number,
  tokenPrice: number
): Promise<{ inflows24h: number; outflows24h: number; netFlow: number; netFlowUSD: number }> {
  try {
    const blocksPerDay = Math.floor(TIME_PERIODS.DAY / 2);
    const fromBlock = currentBlock > BigInt(blocksPerDay) 
      ? currentBlock - BigInt(blocksPerDay) 
      : BigInt(0);

    const logs = await getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlock, currentBlock, tokenDecimals);
    
    const exchangeAddressesSet = new Set(KNOWN_EXCHANGE_ADDRESSES);
    let inflows = BigInt(0);
    let outflows = BigInt(0);

    logs.forEach(log => {
      const from = log.from.toLowerCase();
      const to = log.to.toLowerCase();
      
      // Inflow: token going TO exchange (selling pressure)
      if (exchangeAddressesSet.has(to as `0x${string}`)) {
        inflows += log.value;
      }
      
      // Outflow: token coming FROM exchange (buying/accumulation)
      if (exchangeAddressesSet.has(from as `0x${string}`)) {
        outflows += log.value;
      }
    });

    const inflowsTokens = Number(formatUnits(inflows, tokenDecimals));
    const outflowsTokens = Number(formatUnits(outflows, tokenDecimals));
    const netFlowTokens = outflowsTokens - inflowsTokens; // Positive = accumulation
    const netFlowUSD = netFlowTokens * tokenPrice;

    return {
      inflows24h: inflowsTokens,
      outflows24h: outflowsTokens,
      netFlow: netFlowTokens,
      netFlowUSD,
    };
  } catch (error) {
    console.error("Error fetching exchange flows:", error);
    return { inflows24h: 0, outflows24h: 0, netFlow: 0, netFlowUSD: 0 };
  }
}

// Fetch Holder Distribution and calculate concentration metrics
async function fetchHolderDistribution(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  tokenTotalSupply: bigint,
  tokenDecimals: number
): Promise<{
  top10Percent: number;
  top100Holders: number;
  giniCoefficient: number;
  concentrationRisk: 'low' | 'medium' | 'high';
}> {
  try {
    // Note: Getting all holders is expensive. We'll sample top holders from recent transfers
    // For accurate distribution, use an indexer or subgraph
    const currentBlock = await retryRpcCall(() => publicClient.getBlockNumber());
    const blocksPerMonth = Math.floor(TIME_PERIODS.MONTH / 2);
    const fromBlock = currentBlock > BigInt(blocksPerMonth) 
      ? currentBlock - BigInt(blocksPerMonth) 
      : BigInt(0);

    const logs = await getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlock, currentBlock, tokenDecimals);
    
    // Get unique addresses that have held tokens
    const holderAddresses = new Set<string>();
    logs.forEach(log => {
      if (log.to !== "0x0000000000000000000000000000000000000000") {
        holderAddresses.add(log.to);
      }
    });

    // Sample balances for top addresses (limited to avoid too many RPC calls)
    const addressesArray = Array.from(holderAddresses).slice(0, 1000);
    const balances: { address: string; balance: bigint }[] = [];

    // Fetch balances in batches
    for (let i = 0; i < Math.min(addressesArray.length, 100); i++) {
      try {
        const balance = await retryRpcCall(() => 
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [addressesArray[i] as `0x${string}`],
          }) as Promise<bigint>
        );
        if (balance > BigInt(0)) {
          balances.push({ address: addressesArray[i], balance });
        }
      } catch {
        // Skip if balance fetch fails
      }
    }

    // Sort by balance descending
    balances.sort((a, b) => {
      if (b.balance > a.balance) return 1;
      if (b.balance < a.balance) return -1;
      return 0;
    });

    // Calculate top 10% and top 100 holders percentage
    const totalSupplyFloat = Number(formatUnits(tokenTotalSupply, tokenDecimals));
    let top10PercentSupply = 0;
    let top100Supply = 0;

    balances.slice(0, Math.min(100, balances.length)).forEach((holder, index) => {
      const holderSupply = Number(formatUnits(holder.balance, tokenDecimals));
      if (index < 10) {
        top10PercentSupply += holderSupply;
      }
      top100Supply += holderSupply;
    });

    const top10Percent = totalSupplyFloat > 0 ? (top10PercentSupply / totalSupplyFloat) * 100 : 0;
    const top100Holders = totalSupplyFloat > 0 ? (top100Supply / totalSupplyFloat) * 100 : 0;

    // Calculate Gini coefficient (simplified)
    // Gini = 1 - (2 * sum of cumulative proportions) / n
    let cumulativeSum = 0;
    let cumulativeProportion = 0;
    balances.forEach((holder) => {
      const proportion = Number(formatUnits(holder.balance, tokenDecimals)) / totalSupplyFloat;
      cumulativeProportion += proportion;
      cumulativeSum += cumulativeProportion;
    });
    const n = balances.length;
    const giniCoefficient = n > 0 ? 1 - (2 * cumulativeSum) / (n * n) : 0;

    // Determine concentration risk
    let concentrationRisk: 'low' | 'medium' | 'high' = 'low';
    if (top10Percent > 50 || giniCoefficient > 0.8) {
      concentrationRisk = 'high';
    } else if (top10Percent > 30 || giniCoefficient > 0.6) {
      concentrationRisk = 'medium';
    }

    return {
      top10Percent,
      top100Holders,
      giniCoefficient: Math.max(0, Math.min(1, giniCoefficient)),
      concentrationRisk,
    };
  } catch (error) {
    console.error("Error fetching holder distribution:", error);
    return {
      top10Percent: 0,
      top100Holders: 0,
      giniCoefficient: 0,
      concentrationRisk: 'low',
    };
  }
}

// Calculate NVT Ratio (Network Value to Transaction)
function calculateNVT(
  marketCap: number | undefined,
  transactionVolume30d: number
): { ratio: number; ratio30d: number; interpretation: 'undervalued' | 'fair' | 'overvalued' } {
  if (!marketCap || transactionVolume30d === 0) {
    return { ratio: 0, ratio30d: 0, interpretation: 'fair' };
  }

  // NVT = Market Cap / Daily Transaction Volume (average)
  const dailyVolume = transactionVolume30d / 30;
  const nvtRatio = dailyVolume > 0 ? marketCap / dailyVolume : 0;
  const nvt30d = transactionVolume30d > 0 ? marketCap / transactionVolume30d : 0;

  let interpretation: 'undervalued' | 'fair' | 'overvalued' = 'fair';
  if (nvtRatio > 95) {
    interpretation = 'overvalued'; // High NVT = overvalued relative to usage
  } else if (nvtRatio < 20) {
    interpretation = 'undervalued'; // Low NVT = undervalued, high usage
  }

  return {
    ratio: nvtRatio,
    ratio30d: nvt30d,
    interpretation,
  };
}

// Fetch Total Holders from Full History
// This function queries all Transfer events from a historical period to count unique holders
async function fetchTotalHoldersFromHistory(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tokenDecimals: number
): Promise<number> {
  try {
    const currentBlock = await retryRpcCall(() => publicClient.getBlockNumber());
    // Estimate blocks per day (Base ~2s per block)
    const blocksPerDay = 43200; // 86400 seconds / 2
    const maxBlocksPerQuery = 2048; // RPC limit
    
    // Try to get from last 90 days first (more practical than all history)
    // For very old tokens, this should still capture most holders
    const daysToCheck = 90;
    const fromBlock = currentBlock > BigInt(blocksPerDay * daysToCheck)
      ? currentBlock - BigInt(blocksPerDay * daysToCheck)
      : BigInt(0);
    
    const uniqueAddresses = new Set<string>();
    let lastBlock = fromBlock;
    
    console.log(`Fetching total holders: querying from block ${fromBlock} to ${currentBlock} (${daysToCheck} days)`);
    
    // Paginate through blocks to avoid RPC limits
    while (lastBlock < currentBlock) {
      const toBlock = lastBlock + BigInt(maxBlocksPerQuery) > currentBlock
        ? currentBlock
        : lastBlock + BigInt(maxBlocksPerQuery);
      
      try {
        const logs = (await retryRpcCall(() => publicClient.getLogs({
          address: tokenAddress,
          event: transferEventAbi,
          fromBlock: lastBlock,
          toBlock: toBlock,
        }))) as Log[];
        
        logs.forEach((log: Log) => {
          const logArgs = (log as { args?: { from?: `0x${string}`; to?: `0x${string}` } }).args;
          const from = logArgs?.from?.toLowerCase();
          const to = logArgs?.to?.toLowerCase();
          
          if (from && from !== ZERO_ADDRESS.toLowerCase()) {
            uniqueAddresses.add(from);
          }
          if (to && to !== ZERO_ADDRESS.toLowerCase()) {
            uniqueAddresses.add(to);
          }
        });
        
        lastBlock = toBlock + BigInt(1);
      } catch (error) {
        console.error(`Error fetching logs from block ${lastBlock} to ${toBlock}:`, error);
        // Continue with next batch if one fails
        lastBlock = toBlock + BigInt(1);
      }
    }
    
    console.log(`Found ${uniqueAddresses.size} unique addresses from transfer history`);
    
    // Check current balances (sample if too many to avoid too many RPC calls)
    const addressesArray = Array.from(uniqueAddresses);
    let holdersWithBalance = 0;
    
    // Batch check balances to avoid rate limiting
    const batchSize = 100;
    const maxAddressesToCheck = 10000; // Limit to avoid excessive RPC calls
    
    for (let i = 0; i < Math.min(addressesArray.length, maxAddressesToCheck); i += batchSize) {
      const batch = addressesArray.slice(i, i + batchSize);
      try {
        const balances = await Promise.all(
          batch.map(addr => 
            retryRpcCall(() => 
              publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [addr as `0x${string}`],
              }) as Promise<bigint>
            ).catch(() => BigInt(0))
          )
        ) as bigint[];
        
        holdersWithBalance += balances.filter((b: bigint) => b > BigInt(0)).length;
      } catch (error) {
        console.error(`Error checking balances for batch starting at index ${i}:`, error);
        // Continue with next batch
      }
    }
    
    // If we had to limit the check, estimate total holders
    if (addressesArray.length > maxAddressesToCheck) {
      const sampleRatio = holdersWithBalance / maxAddressesToCheck;
      holdersWithBalance = Math.ceil(addressesArray.length * sampleRatio);
      console.log(`Estimated total holders: ${holdersWithBalance} (sampled ${maxAddressesToCheck} of ${addressesArray.length} addresses)`);
    }
    
    console.log(`Total holders with balance > 0: ${holdersWithBalance}`);
    return holdersWithBalance;
  } catch (error) {
    console.error("Error fetching total holders from history:", error);
    throw error; // Let caller handle fallback
  }
}

// Calculate MVRV Ratio (Market Value to Realized Value)
// Note: Simplified version - full implementation requires tracking realized price per token
async function calculateMVRV(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  currentPrice: number,
  tokenTotalSupply: bigint,
  tokenDecimals: number
): Promise<{
  ratio: number;
  marketValue: number;
  realizedValue: number;
  interpretation: 'undervalued' | 'fair' | 'overvalued';
}> {
  try {
    // Market Value = current_price * total_supply
    const marketValue = currentPrice * Number(formatUnits(tokenTotalSupply, tokenDecimals));

    // Realized Value approximation: Use average price of recent transfers
    // Full implementation would track price at last move for each token
    // Note: Full MVRV calculation would require tracking realized price per token
    // This is a simplified approximation
    const realizedValue = marketValue * 0.7; // Approximation: assume 70% of market value

    const mvrvRatio = realizedValue > 0 ? marketValue / realizedValue : 0;

    let interpretation: 'undervalued' | 'fair' | 'overvalued' = 'fair';
    if (mvrvRatio > 3.5) {
      interpretation = 'overvalued';
    } else if (mvrvRatio < 1) {
      interpretation = 'undervalued';
    }

    return {
      ratio: mvrvRatio,
      marketValue,
      realizedValue,
      interpretation,
    };
  } catch (error) {
    console.error("Error calculating MVRV:", error);
    return {
      ratio: 0,
      marketValue: 0,
      realizedValue: 0,
      interpretation: 'fair',
    };
  }
}

// Calculate NUPL (Net Unrealized Profit/Loss)
function calculateNUPL(mvrv: { marketValue: number; realizedValue: number }): {
  value: number;
  interpretation: 'capitulation' | 'fear' | 'hope' | 'optimism' | 'euphoria';
} {
  const { marketValue, realizedValue } = mvrv;
  
  if (marketValue === 0) {
    return { value: 0, interpretation: 'hope' };
  }

  const nupl = (marketValue - realizedValue) / marketValue;

  let interpretation: 'capitulation' | 'fear' | 'hope' | 'optimism' | 'euphoria' = 'hope';
  if (nupl > 0.75) {
    interpretation = 'euphoria';
  } else if (nupl > 0.5) {
    interpretation = 'optimism';
  } else if (nupl > 0.25) {
    interpretation = 'hope';
  } else if (nupl > 0) {
    interpretation = 'fear';
  } else {
    interpretation = 'capitulation';
  }

  return {
    value: Math.max(-1, Math.min(1, nupl)),
    interpretation,
  };
}

// Enhanced Whale Activity Tracking
async function fetchEnhancedWhaleActivity(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  currentBlock: bigint,
  tokenDecimals: number,
  tokenPrice: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tokenTotalSupply: bigint
): Promise<{
  largeTransactions24h: number;
  whaleVolume24h: number;
  accumulationScore: number;
}> {
  try {
    const blocksPerDay = Math.floor(TIME_PERIODS.DAY / 2);
    const fromBlock = currentBlock > BigInt(blocksPerDay) 
      ? currentBlock - BigInt(blocksPerDay) 
      : BigInt(0);

    const logs = await getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlock, currentBlock, tokenDecimals);
    
    let largeTransactions24h = 0;
    let whaleVolume = BigInt(0);
    let accumulationVolume = BigInt(0);
    let distributionVolume = BigInt(0);

    logs.forEach(log => {
      const valueUSD = Number(formatUnits(log.value, tokenDecimals)) * tokenPrice;
      
      if (valueUSD >= WHALE_THRESHOLDS.LARGE_TRANSACTION_USD) {
        largeTransactions24h++;
        whaleVolume += log.value;

        // Track accumulation (to non-exchange addresses) vs distribution (from non-exchange addresses)
        const isToExchange = KNOWN_EXCHANGE_ADDRESSES.includes(log.to as `0x${string}`);
        const isFromExchange = KNOWN_EXCHANGE_ADDRESSES.includes(log.from as `0x${string}`);

        if (!isToExchange && log.to !== "0x0000000000000000000000000000000000000000") {
          accumulationVolume += log.value;
        }
        if (!isFromExchange && log.from !== "0x0000000000000000000000000000000000000000") {
          distributionVolume += log.value;
        }
      }
    });

    const whaleVolume24h = Number(formatUnits(whaleVolume, tokenDecimals)) * tokenPrice;
    
    // Accumulation score: -1 (heavy distribution) to 1 (heavy accumulation)
    const totalWhaleVolume = Number(formatUnits(accumulationVolume + distributionVolume, tokenDecimals));
    const accumulationScore = totalWhaleVolume > 0
      ? (Number(formatUnits(accumulationVolume, tokenDecimals)) - Number(formatUnits(distributionVolume, tokenDecimals))) / totalWhaleVolume
      : 0;

    return {
      largeTransactions24h,
      whaleVolume24h,
      accumulationScore: Math.max(-1, Math.min(1, accumulationScore)),
    };
  } catch (error) {
    console.error("Error fetching enhanced whale activity:", error);
    return {
      largeTransactions24h: 0,
      whaleVolume24h: 0,
      accumulationScore: 0,
    };
  }
}

// Calculate HODL Waves (Holding duration patterns)
async function calculateHODLWaves(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  currentBlock: bigint,
  tokenTotalSupply: bigint,
  tokenDecimals: number
): Promise<{
  lessThan1d: number;
  d1To7: number;
  w1To4: number;
  m1To3: number;
  m3To6: number;
  m6To12: number;
  moreThan1y: number;
}> {
  try {
    // Get transfer history to analyze holding patterns
    // This is a simplified version - full implementation would track each token's age
    const blocksPerYear = Math.floor((365 * TIME_PERIODS.DAY) / 2);
    const fromBlock = currentBlock > BigInt(blocksPerYear) 
      ? currentBlock - BigInt(blocksPerYear) 
      : BigInt(0);

    const logs = await getTransferLogsWithTimestamps(publicClient, tokenAddress, fromBlock, currentBlock, tokenDecimals);
    
    // Group transfers by time periods
    const now = Date.now() / 1000;
    const waves = {
      lessThan1d: 0,
      d1To7: 0,
      w1To4: 0,
      m1To3: 0,
      m3To6: 0,
      m6To12: 0,
      moreThan1y: 0,
    };

    // For each transfer, estimate holding duration based on time since last transfer
    // This is simplified - would need to track actual token age
    logs.forEach(log => {
      if (log.timestamp) {
        const ageSeconds = now - log.timestamp;
        const ageDays = ageSeconds / TIME_PERIODS.DAY;
        const value = Number(formatUnits(log.value, tokenDecimals));
        
        if (ageDays < 1) {
          waves.lessThan1d += value;
        } else if (ageDays < 7) {
          waves.d1To7 += value;
        } else if (ageDays < 30) {
          waves.w1To4 += value;
        } else if (ageDays < 90) {
          waves.m1To3 += value;
        } else if (ageDays < 180) {
          waves.m3To6 += value;
        } else if (ageDays < 365) {
          waves.m6To12 += value;
        } else {
          waves.moreThan1y += value;
        }
      }
    });

    // Normalize to percentages
    const totalSupply = Number(formatUnits(tokenTotalSupply, tokenDecimals));
    if (totalSupply > 0) {
      const waveKeys: (keyof typeof waves)[] = ['lessThan1d', 'd1To7', 'w1To4', 'm1To3', 'm3To6', 'm6To12', 'moreThan1y'];
      waveKeys.forEach(key => {
        waves[key] = (waves[key] / totalSupply) * 100;
      });
    }

    return waves;
  } catch (error) {
    console.error("Error calculating HODL waves:", error);
    return {
      lessThan1d: 0,
      d1To7: 0,
      w1To4: 0,
      m1To3: 0,
      m3To6: 0,
      m6To12: 0,
      moreThan1y: 0,
    };
  }
}

// Fetch TVL from DeFiLlama (if DeFi token)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchTVL(_tokenAddress: string): Promise<{
  value: number;
  valueUSD: number;
  change24h: number;
} | undefined> {
  try {
    // Check if token has TVL on DeFiLlama
    // This would require checking protocol addresses or using DeFiLlama API
    // For now, return undefined (can be implemented when DeFiLlama API key is available)
    return undefined;
  } catch (error) {
    console.error("Error fetching TVL:", error);
    return undefined;
  }
}

// Fetch tweets from X/Twitter API and analyze sentiment with AI
async function fetchTwitterSentiment(tokenSymbol: string, tokenName: string): Promise<{
  sentiment: number;
  tweets: Array<{
    id: string;
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    createdAt?: string;
  }>;
}> {
  try {
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      console.warn('X_BEARER_TOKEN not found, skipping Twitter sentiment');
      return { sentiment: 0, tweets: [] };
    }

    // Build search query - try multiple query strategies
    // Strategy 1: Try with token symbol and name
    let query = `${tokenSymbol} OR ${tokenName} -is:retweet -is:reply lang:en`;
    const maxResults = 50;

    // Fetch tweets using X API v2
    let response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,text`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let data: TwitterResponse | null = null;
    let tweets: TwitterTweet[] = [];

    if (response.ok) {
      data = (await response.json()) as TwitterResponse;
      tweets = data.data || [];
      console.log(`X API query 1: Found ${tweets.length} tweets for "${tokenSymbol}" / "${tokenName}"`);
    } else {
      const errorText = await response.text();
      console.warn(`X API query 1 error (${response.status}): ${errorText}`);
    }

    // Strategy 2: If no results, try a broader search with crypto keywords
    if (tweets.length === 0) {
      query = `${tokenSymbol} crypto OR ${tokenSymbol} token OR ${tokenSymbol} coin -is:retweet -is:reply lang:en`;
      response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,text`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        data = (await response.json()) as TwitterResponse;
        tweets = data?.data || [];
        console.log(`X API query 2: Found ${tweets.length} tweets for broader "${tokenSymbol}" search`);
      } else {
        const errorText = await response.text();
        console.warn(`X API query 2 error (${response.status}): ${errorText}`);
      }
    }

    // Strategy 3: If still no results, try just the token symbol
    if (tweets.length === 0) {
      query = `${tokenSymbol} -is:retweet -is:reply lang:en`;
      response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,text`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        data = (await response.json()) as TwitterResponse;
        tweets = data.data || [];
        console.log(`X API query 3: Found ${tweets.length} tweets for simple "${tokenSymbol}" search`);
      } else {
        const errorText = await response.text();
        console.warn(`X API query 3 error (${response.status}): ${errorText}`);
      }
    }

    if (tweets.length === 0) {
      console.log(`No tweets found after trying 3 query strategies for token: ${tokenSymbol} / ${tokenName}`);
      return { sentiment: 0, tweets: [] };
    }

    // Process tweets with engagement metrics
    console.log(`Processing ${tweets.length} tweets...`);
    const processedTweets = tweets.map((tweet: TwitterTweet) => {
      const metrics = tweet.public_metrics || {};
      const engagement = (metrics.like_count || 0) + (metrics.retweet_count || 0) * 2;
      return {
        id: tweet.id,
        text: tweet.text,
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count || 0,
        replies: metrics.reply_count || 0,
        createdAt: tweet.created_at,
        engagement: engagement,
      };
    });

    // Sort by engagement and get top 10
    const topTweets = processedTweets
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        text: t.text,
        likes: t.likes,
        retweets: t.retweets,
        replies: t.replies,
        createdAt: t.createdAt,
      }));

    console.log(`Top tweets selected: ${topTweets.length}`);

    // Use AI to analyze sentiment of all tweets
    // Include engagement metrics for better context
    const tweetData = processedTweets.map((t) => ({
      text: t.text,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
    }));

    const tweetTexts = tweetData
      .map((t) => `Tweet: "${t.text}" (Likes: ${t.likes}, RTs: ${t.retweets})`)
      .join('\n---\n');
    const tweetCount = tweets.length;

    // Create comprehensive prompt for AI sentiment analysis
    const sentimentPrompt = `You are an expert cryptocurrency sentiment analyst. Analyze the sentiment of these ${tweetCount} tweets about a cryptocurrency token (${tokenSymbol} / ${tokenName}).

Consider:
- The actual text content and tone
- Engagement metrics (likes, retweets) - higher engagement may indicate stronger sentiment
- Whether tweets are bullish, bearish, or neutral
- Overall market sentiment and community perception

Tweets with engagement metrics:
${tweetTexts}

Analyze the overall sentiment and return a JSON object with:
{
  "sentiment": number (between -1 and 1, where -1 is very negative/bearish, 0 is neutral, 1 is very positive/bullish),
  "summary": "brief 1-2 sentence summary of the overall sentiment",
  "positiveCount": number of bullish/positive tweets,
  "negativeCount": number of bearish/negative tweets,
  "neutralCount": number of neutral tweets,
  "keyThemes": ["list of 3-5 key themes or topics mentioned"]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: sentimentPrompt,
          },
        ],
        // Note: gpt-4o-mini does not support custom temperature, uses default (1)
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      // Parse AI response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const sentiment = parsed.sentiment || 0;
        console.log(`Twitter sentiment analysis: ${sentiment.toFixed(2)} (${parsed.summary || 'N/A'})`);
        console.log(`  - Positive: ${parsed.positiveCount || 0}, Negative: ${parsed.negativeCount || 0}, Neutral: ${parsed.neutralCount || 0}`);
        if (parsed.keyThemes) {
          console.log(`  - Key themes: ${parsed.keyThemes.join(', ')}`);
        }
        return { sentiment, tweets: topTweets };
      }

      // Fallback: simple keyword-based sentiment if AI parsing fails
      const positiveKeywords = ['buy', 'bullish', 'moon', 'pump', 'gem', 'hold', 'good', 'great', 'profit'];
      const negativeKeywords = ['sell', 'bearish', 'dump', 'scam', 'rug', 'bad', 'avoid', 'loss'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      
      processedTweets.forEach((tweet) => {
        const text = tweet.text.toLowerCase();
        const positiveMatches = positiveKeywords.filter(kw => text.includes(kw)).length;
        const negativeMatches = negativeKeywords.filter(kw => text.includes(kw)).length;
        if (positiveMatches > negativeMatches) positiveCount++;
        if (negativeMatches > positiveMatches) negativeCount++;
      });

      const sentiment = positiveCount > negativeCount 
        ? 0.3 
        : negativeCount > positiveCount 
          ? -0.3 
          : 0;
      
      return { sentiment, tweets: topTweets };
    } catch (aiError) {
      console.error('AI sentiment analysis error:', aiError);
      return { sentiment: 0, tweets: topTweets };
    }
  } catch (error) {
    console.error('Twitter sentiment fetch error:', error);
    return { sentiment: 0, tweets: [] };
  }
}

// Fetch social sentiment from Twitter/X and Reddit
async function fetchSocialSentiment(tokenSymbol: string, tokenName: string): Promise<Partial<TokenData> & { topTweets?: Array<{
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  createdAt?: string;
}> }> {
  const socialData: Partial<TokenData> & { topTweets?: Array<{
    id: string;
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    createdAt?: string;
  }> } = {
    socialSentiment: {
      twitter: 0,
      reddit: 0,
      overall: 0,
    },
    topTweets: [],
  };

  try {
    // Twitter/X sentiment using X API v2 with AI analysis
    try {
      const twitterData = await fetchTwitterSentiment(tokenSymbol, tokenName);
      socialData.socialSentiment!.twitter = twitterData.sentiment;
      socialData.topTweets = twitterData.tweets || [];
      console.log(`Twitter sentiment: ${twitterData.sentiment}, Tweets fetched: ${twitterData.tweets?.length || 0}`);
    } catch (twitterError) {
      console.error('Twitter sentiment error:', twitterError);
    }

    // Reddit sentiment (using public JSON API with AI analysis)
    try {
      const redditResponse = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(tokenSymbol)}&limit=20&sort=relevance`,
        {
          headers: {
            'User-Agent': 'BaseSentinel/1.0',
          },
        }
      );

      if (redditResponse.ok) {
        const redditData = await redditResponse.json();
        const posts = redditData?.data?.children || [];
        
        if (posts.length > 0) {
          // Extract post titles and selftext for AI analysis
          const postTexts = posts
            .map((post: RedditPost) => {
              const data = post.data;
              if (data) {
                return `Title: ${data.title}\nContent: ${data.selftext || 'N/A'}\nUpvotes: ${data.ups || 0}\nDownvotes: ${data.downs || 0}`;
              }
              return null;
            })
            .filter((text: string | null) => text !== null)
            .join('\n---\n');

          // Use AI to analyze Reddit sentiment
          const redditPrompt = `Analyze the sentiment of these Reddit posts about a cryptocurrency token (${tokenSymbol} / ${tokenName}).

Posts:
${postTexts}

Analyze the overall sentiment and return a JSON object with:
{
  "sentiment": number (between -1 and 1, where -1 is very negative, 0 is neutral, 1 is very positive),
  "summary": "brief summary of the sentiment",
  "positiveCount": number,
  "negativeCount": number,
  "neutralCount": number
}`;

          try {
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: redditPrompt,
                },
              ],
              // Note: gpt-4o-mini does not support custom temperature, uses default (1)
            });

            const content = completion.choices[0].message.content;
            if (content) {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const sentiment = parsed.sentiment || 0;
                console.log(`Reddit sentiment analysis: ${sentiment} (${parsed.summary || 'N/A'})`);
                socialData.socialSentiment!.reddit = sentiment;
              }
            }
          } catch (aiError) {
            console.error('AI Reddit sentiment analysis error:', aiError);
            // Fallback to simple upvote-based sentiment
            let totalScore = 0;
            let postCount = 0;
            posts.forEach((post: RedditPost) => {
              const data = post.data;
              if (data) {
                const score = data.ups || 0;
                const downvotes = data.downs || 0;
                const netScore = score - downvotes;
                totalScore += netScore;
                postCount++;
              }
            });
            const avgScore = postCount > 0 ? totalScore / postCount : 0;
            const normalizedSentiment = Math.max(-1, Math.min(1, avgScore / 100));
            socialData.socialSentiment!.reddit = normalizedSentiment;
          }
        }
      }
    } catch (redditError) {
      console.error('Reddit sentiment error:', redditError);
    }

    // Calculate overall sentiment
    const twitterSent = socialData.socialSentiment?.twitter || 0;
    const redditSent = socialData.socialSentiment?.reddit || 0;
    socialData.socialSentiment!.overall = (twitterSent + redditSent) / 2;

  } catch (error) {
    console.error('Social sentiment fetch error:', error);
  }

  console.log(`Returning social data with ${socialData.topTweets?.length || 0} tweets`);
  return socialData;
}

async function analyzeWithAI(tokenData: TokenData): Promise<{
  riskScore: number; // 0-100
  recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
  reasoning: string;
  breakdown: {
    onChainScore: number;
    socialScore: number;
    technicalScore: number;
    riskFactors: string[];
  };
}> {
  const advancedMetrics = tokenData.advancedOnChainMetrics;
  const advancedMetricsText = advancedMetrics ? `
Advanced On-Chain Metrics:
- Active Addresses: Daily: ${advancedMetrics.activeAddresses.daily}, Weekly: ${advancedMetrics.activeAddresses.weekly}, Monthly: ${advancedMetrics.activeAddresses.monthly}
- Transaction Volume: 24h: $${advancedMetrics.transactionVolume.volume24h.toLocaleString()}, 7d: $${advancedMetrics.transactionVolume.volume7d.toLocaleString()}, 30d: $${advancedMetrics.transactionVolume.volume30d.toLocaleString()}
- Exchange Flows: Inflows 24h: ${advancedMetrics.exchangeFlows.inflows24h.toFixed(2)}, Outflows 24h: ${advancedMetrics.exchangeFlows.outflows24h.toFixed(2)}, Net Flow: ${advancedMetrics.exchangeFlows.netFlow.toFixed(2)} (${advancedMetrics.exchangeFlows.netFlowUSD >= 0 ? '+' : ''}$${advancedMetrics.exchangeFlows.netFlowUSD.toFixed(2)})
- Holder Distribution: Top 10%: ${advancedMetrics.holderDistribution.top10Percent.toFixed(2)}%, Top 100: ${advancedMetrics.holderDistribution.top100Holders.toFixed(2)}%, Gini: ${advancedMetrics.holderDistribution.giniCoefficient.toFixed(3)}, Risk: ${advancedMetrics.holderDistribution.concentrationRisk}
- MVRV Ratio: ${advancedMetrics.mvrv.ratio.toFixed(2)} (${advancedMetrics.mvrv.interpretation}), Market Value: $${advancedMetrics.mvrv.marketValue.toLocaleString()}, Realized Value: $${advancedMetrics.mvrv.realizedValue.toLocaleString()}
- NUPL: ${advancedMetrics.nupl.value.toFixed(3)} (${advancedMetrics.nupl.interpretation})
- Whale Activity: Large Transactions 24h: ${advancedMetrics.whaleActivity.largeTransactions24h}, Volume: $${advancedMetrics.whaleActivity.whaleVolume24h.toLocaleString()}, Accumulation Score: ${advancedMetrics.whaleActivity.accumulationScore.toFixed(2)} (${advancedMetrics.whaleActivity.accumulationScore > 0 ? 'Accumulation' : advancedMetrics.whaleActivity.accumulationScore < 0 ? 'Distribution' : 'Neutral'})
- HODL Waves: <1d: ${advancedMetrics.hodlWaves.lessThan1d.toFixed(2)}%, 1d-7d: ${advancedMetrics.hodlWaves.d1To7.toFixed(2)}%, 1w-4w: ${advancedMetrics.hodlWaves.w1To4.toFixed(2)}%, 1m-3m: ${advancedMetrics.hodlWaves.m1To3.toFixed(2)}%, 3m-6m: ${advancedMetrics.hodlWaves.m3To6.toFixed(2)}%, 6m-12m: ${advancedMetrics.hodlWaves.m6To12.toFixed(2)}%, >1y: ${advancedMetrics.hodlWaves.moreThan1y.toFixed(2)}%
- NVT Ratio: ${advancedMetrics.nvt.ratio.toFixed(2)} (${advancedMetrics.nvt.interpretation}), 30d: ${advancedMetrics.nvt.ratio30d.toFixed(2)}
${advancedMetrics.tvl ? `- TVL: $${advancedMetrics.tvl.valueUSD.toLocaleString()} (${advancedMetrics.tvl.change24h >= 0 ? '+' : ''}${advancedMetrics.tvl.change24h.toFixed(2)}%)` : ''}
` : '';

  const prompt = `You are an expert cryptocurrency risk analyst. Analyze the following token data and provide a comprehensive risk assessment.

Token Data:
- Price: $${tokenData.price}
- Market Cap: ${tokenData.marketCap ? `$${tokenData.marketCap.toLocaleString()}` : 'N/A'}
- 24h Volume: ${tokenData.volume24h ? `$${tokenData.volume24h.toLocaleString()}` : 'N/A'}
- 24h Price Change: ${tokenData.priceChange24h ? `${tokenData.priceChange24h.toFixed(2)}%` : 'N/A'}
- Total Holders: ${tokenData.onChainMetrics?.totalHolders || 'N/A'}
- Holder Distribution: Top 10: ${tokenData.distribution?.top10 || 0}%, Top 100: ${tokenData.distribution?.top100 || 0}%
- Buy/Sell Ratio: ${tokenData.onChainMetrics?.buySellRatio || 0}
- Whale Activity: ${tokenData.onChainMetrics?.whaleActivity || 'N/A'}
- Liquidity: ${tokenData.onChainMetrics?.liquidity || 'N/A'}
- Social Sentiment: Twitter: ${tokenData.socialSentiment?.twitter?.toFixed(2) || 'N/A'}, Reddit: ${tokenData.socialSentiment?.reddit?.toFixed(2) || 'N/A'}, Overall: ${tokenData.socialSentiment?.overall?.toFixed(2) || 'N/A'}
- Chart Pattern: ${tokenData.chartPattern || 'N/A'}
${advancedMetricsText}

When analyzing, pay special attention to:
- MVRV Ratio: >3.5 indicates overvaluation, <1 indicates undervaluation
- NUPL: Euphoria (>0.75) suggests top, Capitulation (<0) suggests bottom
- Exchange Flows: Positive net flow (outflows > inflows) indicates accumulation, negative indicates selling pressure
- Holder Concentration: High concentration (top 10% >50%) increases rug pull risk
- Active Addresses: Growing active addresses indicates adoption, declining suggests waning interest
- NVT Ratio: High NVT (>95) suggests overvaluation relative to usage, low NVT (<20) suggests undervaluation
- Whale Activity: Positive accumulation score indicates whale buying, negative indicates distribution
- HODL Waves: High % in long-term holds (>1y) indicates strong conviction, high % in short-term (<1d) suggests speculation

Provide:
1. A risk score from 0-100 (where 0 is extremely risky, 100 is very safe)
2. A recommendation: BUY, HOLD, SELL, or AVOID
3. Detailed reasoning for your assessment, incorporating insights from advanced on-chain metrics
4. Breakdown of scores:
   - On-chain score (0-100) - consider active addresses, holder distribution, MVRV, NUPL, exchange flows
   - Social sentiment score (0-100)
   - Technical analysis score (0-100) - consider NVT, chart patterns, volume trends
5. Key risk factors, including any red flags from advanced metrics (e.g., high concentration, negative exchange flows, overvaluation signals)

Respond in JSON format:
{
  "riskScore": number,
  "recommendation": "BUY" | "HOLD" | "SELL" | "AVOID",
  "reasoning": "string",
  "breakdown": {
    "onChainScore": number,
    "socialScore": number,
    "technicalScore": number,
    "riskFactors": ["string"]
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Ensure all required fields exist with defaults
      return {
        riskScore: parsed.riskScore || 50,
        recommendation: parsed.recommendation || 'HOLD',
        reasoning: parsed.reasoning || 'Analysis completed',
        breakdown: {
          onChainScore: parsed.breakdown?.onChainScore || 50,
          socialScore: parsed.breakdown?.socialScore || 50,
          technicalScore: parsed.breakdown?.technicalScore || 50,
          riskFactors: Array.isArray(parsed.breakdown?.riskFactors) 
            ? parsed.breakdown.riskFactors 
            : ['No specific risk factors identified'],
        },
      };
    }

    // Fallback parsing
    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('OpenAI error:', error);
    
    // Fallback response
    return {
      riskScore: 50,
      recommendation: 'HOLD',
      reasoning: 'Unable to complete AI analysis. Please try again.',
      breakdown: {
        onChainScore: 50,
        socialScore: 50,
        technicalScore: 50,
        riskFactors: ['Analysis unavailable'],
      },
    };
  }
}

export async function GET(request: Request) {
  // ALWAYS check payment first (before parameter validation)
  // This allows third-party services (like x402scan.com) to configure payment requirements
  // even when parameters are missing
  
  // Skip payment verification if price is 0 (free)
  if (!PAYMENT_AMOUNTS.TOKEN_ANALYSIS.isFree) {
    // Get payment data - let settlePayment handle 402 if missing
    const paymentData = request.headers.get("x-payment");

    // Get token address from query parameters (may be undefined for payment configuration)
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get("tokenAddress");

    // Build resource URL with tokenAddress if available
    const resourceUrl = tokenAddress
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/token-analysis?tokenAddress=${encodeURIComponent(tokenAddress)}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/token-analysis`;

    // Verify payment - settlePayment will return proper 402 format if paymentData is missing
    // This allows third-party services to discover payment requirements
    const result = await settlePayment({
      resourceUrl,
      method: "GET",
      paymentData,
      payTo: process.env.MERCHANT_WALLET_ADDRESS!,
      network: base,
      price: {
        amount: PAYMENT_AMOUNTS.TOKEN_ANALYSIS.amount,
        asset: {
          address: USDC_BASE_ADDRESS,
        },
      },
      facilitator: thirdwebFacilitator,
      routeConfig: {
        description: "AI-powered comprehensive token risk analysis with on-chain metrics, social sentiment, and technical analysis",
        mimeType: "application/json",
        inputSchema: {
          queryParams: {
            tokenAddress: "string (required): Token address to analyze (0x-prefixed hex string)"
          },
          bodyType: undefined, // GET request, no body
        },
        outputSchema: {
          success: "boolean",
          tokenAddress: "string",
          tokenData: {
            price: "number",
            marketCap: "number (optional)",
            volume24h: "number (optional)",
            priceChange24h: "number (optional)",
            onChainMetrics: {
              totalHolders: "number",
              buySellRatio: "number",
              whaleActivity: "string",
              liquidity: "string"
            },
            advancedOnChainMetrics: "object (optional): Advanced metrics including active addresses, transaction volume, exchange flows, holder distribution, MVRV, NUPL, TVL, whale activity, HODL waves, NVT",
            socialSentiment: {
              twitter: "number",
              reddit: "number",
              overall: "number"
            },
            chartPattern: "string (optional)"
          },
          analysis: {
            riskScore: "number (0-100)",
            recommendation: "string: BUY | HOLD | SELL | AVOID",
            reasoning: "string",
            breakdown: {
              onChainScore: "number (0-100)",
              socialScore: "number (0-100)",
              technicalScore: "number (0-100)",
              riskFactors: "string[]"
            }
          },
          topTweets: "array (optional): Array of top tweets with engagement metrics",
          timestamp: "string (ISO 8601)"
        },
        discoverable: true,
      },
    });

    if (result.status !== 200) {
      return Response.json(result.responseBody, {
        status: result.status,
        headers: result.responseHeaders,
      });
    }
  }

  // After payment is verified (or if free), validate parameters
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get("tokenAddress");

  if (!tokenAddress) {
    return Response.json({ error: "Token address is required as query parameter" }, { status: 400 });
  }

  try {
    // First fetch basic token info to get symbol/name for social sentiment
    const onChainDataBasic = await fetchOnChainData(tokenAddress);
    const tokenSymbol = (onChainDataBasic as { tokenSymbol?: string }).tokenSymbol || 'UNKNOWN';
    const tokenName = (onChainDataBasic as { tokenName?: string }).tokenName || 'Unknown Token';

    // Fetch data from multiple sources in parallel
    const [coinGeckoData, dexScreenerData, onChainData, socialData] = await Promise.all([
      fetchCoinGeckoData(tokenAddress),
      fetchDexScreenerData(tokenAddress),
      fetchOnChainData(tokenAddress),
      fetchSocialSentiment(tokenSymbol, tokenName),
    ]);

    // Fetch advanced on-chain metrics
    let advancedMetrics: TokenData['advancedOnChainMetrics'] | undefined;
    let totalHoldersFromHistory: number | undefined;
    
    try {
      // Create public client with fallback providers
      const providers = getRpcProviders();
      const primaryRpcUrl = providers[0];
      
      const publicClient = createPublicClient({
        chain: {
          ...baseChain,
          rpcUrls: {
            default: {
              http: providers, // Multiple providers for automatic fallback
            },
          },
        },
        transport: http(primaryRpcUrl, {
          retryCount: 3,
          retryDelay: 1000,
        }),
      });

      const tokenAddressTyped = tokenAddress as `0x${string}`;
      const currentBlock = await retryRpcCall(() => publicClient.getBlockNumber());
      const tokenPrice = coinGeckoData.price || dexScreenerData.price || 0;
      
      // Get token info for advanced metrics
      let tokenDecimals = 18;
      let tokenTotalSupply = BigInt(0);
      try {
        tokenDecimals = await retryRpcCall(() => 
          publicClient.readContract({
            address: tokenAddressTyped,
            abi: ERC20_ABI,
            functionName: "decimals",
          }) as Promise<number>
        );
        tokenTotalSupply = await retryRpcCall(() => 
          publicClient.readContract({
            address: tokenAddressTyped,
            abi: ERC20_ABI,
            functionName: "totalSupply",
          }) as Promise<bigint>
        );
      } catch (e) {
        console.warn("Could not fetch token decimals/supply for advanced metrics:", e);
      }

      // Fetch all advanced metrics in parallel with error handling
      // Use Promise.allSettled to ensure partial data is returned even if some metrics fail
      // Note: @ts-expect-error directives are needed due to viem PublicClient type compatibility
      // with getBlock return type differences between chain configurations
      const metricsResults = await Promise.allSettled([
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        fetchActiveAddresses(publicClient, tokenAddressTyped, currentBlock, tokenPrice),
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        fetchTransactionVolume(publicClient, tokenAddressTyped, currentBlock, tokenDecimals, tokenPrice),
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        fetchExchangeFlows(publicClient, tokenAddressTyped, currentBlock, tokenDecimals, tokenPrice),
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        fetchHolderDistribution(publicClient, tokenAddressTyped, tokenTotalSupply, tokenDecimals),
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        calculateMVRV(publicClient, tokenAddressTyped, tokenPrice, tokenTotalSupply, tokenDecimals),
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        fetchEnhancedWhaleActivity(publicClient, tokenAddressTyped, currentBlock, tokenDecimals, tokenPrice, tokenTotalSupply),
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        calculateHODLWaves(publicClient, tokenAddressTyped, currentBlock, tokenTotalSupply, tokenDecimals),
        fetchTVL(tokenAddress),
      ]);
      
      // Extract results with fallbacks for failed metrics
      const [
        activeAddressesResult,
        transactionVolumeResult,
        exchangeFlowsResult,
        holderDistributionResult,
        mvrvResult,
        whaleActivityResult,
        hodlWavesResult,
        tvlResult,
      ] = metricsResults;
      
      const activeAddresses = activeAddressesResult.status === 'fulfilled' 
        ? activeAddressesResult.value 
        : { daily: 0, weekly: 0, monthly: 0 };
      const transactionVolume = transactionVolumeResult.status === 'fulfilled'
        ? transactionVolumeResult.value
        : { volume24h: 0, volume7d: 0, volume30d: 0 };
      const exchangeFlows = exchangeFlowsResult.status === 'fulfilled'
        ? exchangeFlowsResult.value
        : { inflows24h: 0, outflows24h: 0, netFlow: 0, netFlowUSD: 0 };
      const holderDistribution = holderDistributionResult.status === 'fulfilled'
        ? holderDistributionResult.value
        : { top10Percent: 0, top100Holders: 0, giniCoefficient: 0, concentrationRisk: 'high' as const };
      const mvrv = mvrvResult.status === 'fulfilled'
        ? mvrvResult.value
        : { ratio: 0, marketValue: 0, realizedValue: 0, interpretation: 'fair' as const };
      const whaleActivity = whaleActivityResult.status === 'fulfilled'
        ? whaleActivityResult.value
        : { largeTransactions24h: 0, whaleVolume24h: 0, accumulationScore: 0 };
      const hodlWaves = hodlWavesResult.status === 'fulfilled'
        ? hodlWavesResult.value
        : { lessThan1d: 0, d1To7: 0, w1To4: 0, m1To3: 0, m3To6: 0, m6To12: 0, moreThan1y: 0 };
      const tvl = tvlResult.status === 'fulfilled' ? tvlResult.value : undefined;
      
      // Log any failed metrics
      metricsResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const metricNames = [
            'activeAddresses',
            'transactionVolume',
            'exchangeFlows',
            'holderDistribution',
            'mvrv',
            'whaleActivity',
            'hodlWaves',
            'tvl'
          ];
          console.warn(`Failed to fetch ${metricNames[index]}:`, result.reason);
        }
      });

      // Calculate derived metrics
      const nupl = calculateNUPL(mvrv);
      const nvt = calculateNVT(coinGeckoData.marketCap || dexScreenerData.marketCap, transactionVolume.volume30d);

      advancedMetrics = {
        activeAddresses,
        transactionVolume,
        exchangeFlows,
        holderDistribution,
        mvrv,
        nupl,
        whaleActivity,
        hodlWaves,
        nvt,
        ...(tvl && { tvl }),
      };

      // Fetch total holders from full history (this can be slow, so we do it after other metrics)
      try {
        // @ts-expect-error - viem PublicClient type compatibility issue with getBlock return type
        totalHoldersFromHistory = await fetchTotalHoldersFromHistory(publicClient, tokenAddressTyped, tokenDecimals);
        console.log(`Total holders from history: ${totalHoldersFromHistory}`);
      } catch (error) {
        console.error("Error fetching total holders from history, will use fallback:", error);
        // Will use fallback in tokenData construction
      }
    } catch (error) {
      console.error("Error fetching advanced metrics:", error);
      // Continue without advanced metrics if they fail
    }

    // Combine all data with proper defaults, prioritizing on-chain data
    const tokenData: TokenData = {
      price: coinGeckoData.price || dexScreenerData.price || 0,
      marketCap: coinGeckoData.marketCap || dexScreenerData.marketCap,
      // Prioritize on-chain volume24h from advancedMetrics, fallback to external APIs only if on-chain fails
      volume24h: (advancedMetrics?.transactionVolume?.volume24h && advancedMetrics.transactionVolume.volume24h > 0)
        ? advancedMetrics.transactionVolume.volume24h
        : (coinGeckoData.volume24h && coinGeckoData.volume24h > 0
          ? coinGeckoData.volume24h
          : (dexScreenerData.volume24h && dexScreenerData.volume24h > 0
            ? dexScreenerData.volume24h
            : undefined)),
      priceChange24h: coinGeckoData.priceChange24h || dexScreenerData.priceChange24h,
      chartPattern: dexScreenerData.chartPattern,
      // Use real distribution data from advancedMetrics if available, otherwise calculate from holderDistribution
      distribution: advancedMetrics?.holderDistribution ? {
        top10: advancedMetrics.holderDistribution.top10Percent,
        top100: advancedMetrics.holderDistribution.top100Holders,
        concentration: advancedMetrics.holderDistribution.giniCoefficient * 100, // Convert to percentage
      } : (onChainData.distribution || {
        top10: 0,
        top100: 0,
        concentration: 0,
      }),
      onChainMetrics: {
        // Prioritize on-chain totalHolders from history, then DexScreener, then on-chain estimate
        // Only use fallback if all on-chain methods fail
        totalHolders: totalHoldersFromHistory !== undefined && totalHoldersFromHistory > 0
          ? totalHoldersFromHistory
          : ((dexScreenerData.onChainMetrics?.totalHolders ?? 0) > 0
            ? (dexScreenerData.onChainMetrics?.totalHolders ?? 0)
            : (onChainData.onChainMetrics?.totalHolders && onChainData.onChainMetrics.totalHolders > 0
              ? onChainData.onChainMetrics.totalHolders
              : 0)),
        buySellRatio: dexScreenerData.onChainMetrics?.buySellRatio || onChainData.onChainMetrics?.buySellRatio || 1.0,
        whaleActivity: dexScreenerData.onChainMetrics?.whaleActivity || onChainData.onChainMetrics?.whaleActivity || 'unknown',
        // Always prioritize DexScreener liquidity (it's more accurate from pools)
        liquidity: dexScreenerData.onChainMetrics?.liquidity && dexScreenerData.onChainMetrics.liquidity !== 'N/A'
          ? dexScreenerData.onChainMetrics.liquidity
          : onChainData.onChainMetrics?.liquidity || 'N/A',
      },
      advancedOnChainMetrics: advancedMetrics,
      socialSentiment: socialData.socialSentiment || {
        twitter: 0,
        reddit: 0,
        overall: 0,
      },
    };

    // Analyze with AI
    const aiAnalysis = await analyzeWithAI(tokenData);

    // Ensure all required fields are present in response
    const response = {
      success: true,
      tokenAddress,
      tokenData: {
        ...tokenData,
        onChainMetrics: {
          totalHolders: tokenData.onChainMetrics.totalHolders || 0,
          buySellRatio: tokenData.onChainMetrics.buySellRatio || 0,
          whaleActivity: tokenData.onChainMetrics.whaleActivity || 'unknown',
          liquidity: tokenData.onChainMetrics.liquidity || 'N/A',
        },
      },
      analysis: {
        riskScore: aiAnalysis.riskScore || 50,
        recommendation: aiAnalysis.recommendation || 'HOLD',
        reasoning: aiAnalysis.reasoning || 'Analysis completed',
        breakdown: {
          onChainScore: aiAnalysis.breakdown?.onChainScore || 50,
          socialScore: aiAnalysis.breakdown?.socialScore || 50,
          technicalScore: aiAnalysis.breakdown?.technicalScore || 50,
          riskFactors: Array.isArray(aiAnalysis.breakdown?.riskFactors) 
            ? aiAnalysis.breakdown.riskFactors 
            : ['No specific risk factors identified'],
        },
      },
      topTweets: socialData.topTweets || [],
      timestamp: new Date().toISOString(),
    };

    console.log(`API Response - topTweets count: ${response.topTweets.length}`);
    return Response.json(response);
  } catch (error) {
    console.error('Token analysis error:', error);
    return Response.json(
      { error: "Failed to analyze token", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

