import { settlePayment, facilitator } from "thirdweb/x402";
import { createThirdwebClient } from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { USDC_FUJI_ADDRESS, PAYMENT_AMOUNTS, COINGECKO_NETWORK_ID } from "@/lib/constants";
import OpenAI from "openai";
import { createPublicClient, http, formatUnits, parseUnits } from "viem";
import { avalanche } from "viem/chains";

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.THIRDWEB_SERVER_WALLET_ADDRESS!,
});

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Avalanche Sentinel',
  },
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
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Ensure pairs is an array
    if (!data || !Array.isArray(data.pairs) || data.pairs.length === 0) {
      return {};
    }

    // Get the pair with highest liquidity
    const sortedPairs = [...data.pairs].sort((a: any, b: any) => {
      const aLiquidity = parseFloat(a.liquidity?.usd || "0");
      const bLiquidity = parseFloat(b.liquidity?.usd || "0");
      return bLiquidity - aLiquidity;
    });
    const mainPair = sortedPairs[0];

    // Extract price history for chart pattern analysis
    const priceHistory = mainPair.priceHistory?.h24 || [];
    const chartPattern = detectChartPattern(priceHistory);

    // Extract market cap from DexScreener (fdv or marketCap)
    const marketCap = mainPair.fdv 
      ? parseFloat(mainPair.fdv) 
      : mainPair.marketCap 
        ? parseFloat(mainPair.marketCap) 
        : undefined;

    // Estimate holders from pair data (rough estimate based on unique addresses in pair)
    const estimatedHolders = mainPair.pairCreatedAt 
      ? Math.max(0, Math.floor((Date.now() - mainPair.pairCreatedAt * 1000) / (1000 * 60 * 60 * 24) * 10)) // Rough estimate
      : 0;

    // Calculate buy/sell ratio from DexScreener data
    const buys = mainPair.txns?.m5?.buys || mainPair.buys || 0;
    const sells = mainPair.txns?.m5?.sells || mainPair.sells || 0;
    const buySellRatio = sells > 0 ? buys / sells : buys > 0 ? buys : 1.0;

    // Determine whale activity based on volume and large transactions
    const volume24h = mainPair.volume?.h24 ? parseFloat(mainPair.volume.h24) : 0;
    let whaleActivity: "low" | "moderate" | "high" = "low";
    if (volume24h > 1000000) {
      whaleActivity = "high";
    } else if (volume24h > 100000) {
      whaleActivity = "moderate";
    }

    return {
      price: mainPair.priceUsd ? parseFloat(mainPair.priceUsd) : undefined,
      marketCap: marketCap,
      volume24h: volume24h || undefined,
      priceChange24h: mainPair.priceChange?.h24 ? parseFloat(mainPair.priceChange.h24) : undefined,
      chartPattern,
      onChainMetrics: {
        totalHolders: estimatedHolders,
        buySellRatio: buySellRatio,
        whaleActivity: whaleActivity,
        liquidity: mainPair.liquidity?.usd ? `$${parseFloat(mainPair.liquidity.usd).toLocaleString()}` : 'N/A',
      },
    };
  } catch (error) {
    console.error('DexScreener fetch error:', error);
    return {};
  }
}

// Chart pattern detection based on price history
function detectChartPattern(priceHistory: any[]): string {
  if (!priceHistory || priceHistory.length < 3) {
    return 'Insufficient data';
  }

  try {
    const prices = priceHistory.map((p: any) => parseFloat(p)).filter((p: number) => !isNaN(p));
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
    // Create public client for Avalanche C-Chain
    const publicClient = createPublicClient({
      chain: {
        ...avalanche,
        rpcUrls: {
          default: {
            http: ["https://api.avax.network/ext/bc/C/rpc"],
          },
        },
      },
      transport: http("https://api.avax.network/ext/bc/C/rpc"),
    });

    const tokenAddr = tokenAddress as `0x${string}`;

    // Fetch basic token info with individual error handling
    let tokenName = "Unknown";
    let tokenSymbol = "UNKNOWN";
    let tokenDecimals = 18;
    let tokenTotalSupply = BigInt(0);

    try {
      tokenName = (await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "name",
      })) as string;
    } catch (e) {
      console.error("Error fetching token name:", e);
    }

    try {
      tokenSymbol = (await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "symbol",
      })) as string;
    } catch (e) {
      console.error("Error fetching token symbol:", e);
    }

    try {
      tokenDecimals = (await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "decimals",
      })) as number;
    } catch (e) {
      console.error("Error fetching token decimals:", e);
    }

    try {
      tokenTotalSupply = (await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "totalSupply",
      })) as bigint;
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
      const currentBlock = await publicClient.getBlockNumber();
      const maxBlocks = 2048; // RPC limit
      const fromBlock = currentBlock > BigInt(maxBlocks) 
        ? currentBlock - BigInt(maxBlocks) 
        : BigInt(0);

      // ERC-20 Transfer event ABI
      const transferEventAbi = [
        {
          anonymous: false,
          inputs: [
            { indexed: true, name: "from", type: "address" },
            { indexed: true, name: "to", type: "address" },
            { indexed: false, name: "value", type: "uint256" },
          ],
          name: "Transfer",
          type: "event",
        },
      ] as const;

      try {
        // Get transfer events from the last 24 hours
        // Using topic0 (event signature) for Transfer(address,address,uint256)
        const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        const transferLogs = await publicClient.getLogs({
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
        } as any);

        // Analyze transfers
        const uniqueAddresses = new Set<string>();
        let totalVolume = BigInt(0);
        const largeTransfers: bigint[] = [];

        transferLogs.forEach((log: any) => {
          if (log.args.from && log.args.from !== "0x0000000000000000000000000000000000000000") {
            uniqueAddresses.add(log.args.from.toLowerCase());
          }
          if (log.args.to && log.args.to !== "0x0000000000000000000000000000000000000000") {
            uniqueAddresses.add(log.args.to.toLowerCase());
          }
          if (log.args.value) {
            const value = BigInt(log.args.value.toString());
            totalVolume += value;
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
          "0x60ae616a2155ee3d9a68541ba4544862310933d4", // TraderJoe Router
          "0xe54ca86531e17ef3616d22ca28b0d458b6c89106", // Pangolin Router
        ].map(a => a.toLowerCase()));

        let buys = 0;
        let sells = 0;
        transferLogs.forEach((log: any) => {
          const from = log.args.from?.toLowerCase();
          const to = log.args.to?.toLowerCase();
          if (dexAddresses.has(from)) buys++;
          if (dexAddresses.has(to)) sells++;
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

    // Build search query - search for token symbol and name, exclude retweets and spam
    // Note: Removed $ cashtag operator as it's not available in all X API tiers
    const query = `(${tokenSymbol} OR ${tokenName}) (crypto OR token OR coin OR trading OR price) -is:retweet -is:reply lang:en -spam -bot`;
    const maxResults = 50; // Get up to 50 tweets for analysis

    // Fetch tweets using X API v2
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,text`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`X API error: ${response.status} - ${errorText}`);
      return { sentiment: 0, tweets: [] };
    }

    const data = await response.json();
    const tweets = data.data || [];

    if (tweets.length === 0) {
      console.log('No tweets found for token');
      return { sentiment: 0, tweets: [] };
    }

    // Process tweets with engagement metrics
    const processedTweets = tweets.map((tweet: any) => {
      const metrics = tweet.public_metrics || {};
      return {
        id: tweet.id,
        text: tweet.text,
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count || 0,
        replies: metrics.reply_count || 0,
        createdAt: tweet.created_at,
        engagement: (metrics.like_count || 0) + (metrics.retweet_count || 0) * 2, // RTs weighted more
      };
    });

    // Sort by engagement and get top 10
    const topTweets = processedTweets
      .sort((a: any, b: any) => b.engagement - a.engagement)
      .slice(0, 10)
      .map((t: any) => ({
        id: t.id,
        text: t.text,
        likes: t.likes,
        retweets: t.retweets,
        replies: t.replies,
        createdAt: t.createdAt,
      }));

    // Use AI to analyze sentiment of all tweets
    // Include engagement metrics for better context
    const tweetData = processedTweets.map((t: any) => ({
      text: t.text,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
    }));

    const tweetTexts = tweetData
      .map((t: any) => `Tweet: "${t.text}" (Likes: ${t.likes}, RTs: ${t.retweets})`)
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
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'user',
            content: sentimentPrompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent sentiment analysis
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
      
      processedTweets.forEach((tweet: any) => {
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
            'User-Agent': 'AvalancheSentinel/1.0',
          },
        }
      );

      if (redditResponse.ok) {
        const redditData = await redditResponse.json();
        const posts = redditData?.data?.children || [];
        
        if (posts.length > 0) {
          // Extract post titles and selftext for AI analysis
          const postTexts = posts
            .map((post: any) => {
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
              model: 'openai/gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: redditPrompt,
                },
              ],
              temperature: 0.3,
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
            posts.forEach((post: any) => {
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

Provide:
1. A risk score from 0-100 (where 0 is extremely risky, 100 is very safe)
2. A recommendation: BUY, HOLD, SELL, or AVOID
3. Detailed reasoning for your assessment
4. Breakdown of scores:
   - On-chain score (0-100)
   - Social sentiment score (0-100)
   - Technical analysis score (0-100)
5. Key risk factors

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
      model: 'openai/gpt-4o',
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
    console.error('OpenRouter AI error:', error);
    
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
  // Get token address from query parameters first
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get("tokenAddress");

  if (!tokenAddress) {
    return Response.json({ error: "Token address is required as query parameter" }, { status: 400 });
  }

  // Get payment data - let settlePayment handle 402 if missing
  const paymentData = request.headers.get("x-payment");

  // Verify payment - settlePayment will return proper 402 format if paymentData is missing
  const result = await settlePayment({
    resourceUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/token-analysis?tokenAddress=${encodeURIComponent(tokenAddress)}`,
    method: "GET",
    paymentData,
    payTo: process.env.MERCHANT_WALLET_ADDRESS!,
    network: avalancheFuji,
    price: {
      amount: PAYMENT_AMOUNTS.TOKEN_ANALYSIS.amount,
      asset: {
        address: USDC_FUJI_ADDRESS,
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

  try {
    // First fetch basic token info to get symbol/name for social sentiment
    const onChainDataBasic = await fetchOnChainData(tokenAddress);
    const tokenSymbol = (onChainDataBasic as any).tokenSymbol || 'UNKNOWN';
    const tokenName = (onChainDataBasic as any).tokenName || 'Unknown Token';

    // Fetch data from multiple sources in parallel
    const [coinGeckoData, dexScreenerData, onChainData, socialData] = await Promise.all([
      fetchCoinGeckoData(tokenAddress),
      fetchDexScreenerData(tokenAddress),
      fetchOnChainData(tokenAddress),
      fetchSocialSentiment(tokenSymbol, tokenName),
    ]);

    // Combine all data with proper defaults, prioritizing CoinGecko but falling back to DexScreener
    const tokenData: TokenData = {
      price: coinGeckoData.price || dexScreenerData.price || 0,
      marketCap: coinGeckoData.marketCap || dexScreenerData.marketCap,
      volume24h: coinGeckoData.volume24h || dexScreenerData.volume24h,
      priceChange24h: coinGeckoData.priceChange24h || dexScreenerData.priceChange24h,
      chartPattern: dexScreenerData.chartPattern,
      distribution: onChainData.distribution || {
        top10: 0,
        top100: 0,
        concentration: 0,
      },
      onChainMetrics: {
        totalHolders: onChainData.onChainMetrics?.totalHolders || dexScreenerData.onChainMetrics?.totalHolders || 0,
        buySellRatio: onChainData.onChainMetrics?.buySellRatio || dexScreenerData.onChainMetrics?.buySellRatio || 1.0,
        whaleActivity: onChainData.onChainMetrics?.whaleActivity || dexScreenerData.onChainMetrics?.whaleActivity || 'unknown',
        liquidity: onChainData.onChainMetrics?.liquidity || dexScreenerData.onChainMetrics?.liquidity || 'N/A',
      },
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

