// DeFiLlama API Service
// Documentation: https://defillama.com/docs/api

const DEFILLAMA_API_BASE = "https://api.llama.fi";

/**
 * Fetch TVL (Total Value Locked) for a protocol
 * @param protocol Protocol slug (e.g., 'uniswap-v3', 'aave-v3')
 */
export async function fetchProtocolTVL(protocol: string): Promise<{
  value: number;
  valueUSD: number;
  change24h: number;
} | null> {
  try {
    const response = await fetch(
      `${DEFILLAMA_API_BASE}/tvl/${protocol}`
    );

    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Get current and 24h ago TVL
    const currentTVL = data.tvl || 0;
    const tvl24hAgo = data.tvlPrevDay || currentTVL;
    const change24h = tvl24hAgo > 0 
      ? ((currentTVL - tvl24hAgo) / tvl24hAgo) * 100 
      : 0;

    return {
      value: currentTVL,
      valueUSD: currentTVL,
      change24h,
    };
  } catch (error) {
    console.error("Error fetching TVL from DeFiLlama:", error);
    return null;
  }
}

/**
 * Search for protocol by token address
 * @param tokenAddress Token contract address
 * @param chain Chain identifier (e.g., 'base', 'ethereum')
 */
export async function findProtocolByToken(
  tokenAddress: string,
  chain: string = "base"
): Promise<string | null> {
  try {
    // DeFiLlama doesn't have a direct token-to-protocol mapping
    // This would require maintaining a mapping or using their protocol list
    // For now, return null - can be enhanced with a protocol registry
    return null;
  } catch (error) {
    console.error("Error finding protocol by token:", error);
    return null;
  }
}

/**
 * Fetch all protocols on a specific chain
 */
export async function fetchChainProtocols(chain: string): Promise<any[]> {
  try {
    const response = await fetch(
      `${DEFILLAMA_API_BASE}/protocols`
    );

    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter by chain
    return data.filter((protocol: any) => 
      protocol.chains?.includes(chain)
    );
  } catch (error) {
    console.error("Error fetching chain protocols from DeFiLlama:", error);
    return [];
  }
}

