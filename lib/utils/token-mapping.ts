// Token Address to Symbol Mapping
// Used for APIs that require asset symbols instead of contract addresses

/**
 * Map token contract address to asset symbol for external APIs
 * Note: This is a simplified mapping. In production, you might want to:
 * 1. Fetch from CoinGecko API
 * 2. Use a more comprehensive database
 * 3. Cache mappings
 */
export const TOKEN_ADDRESS_TO_SYMBOL: Record<string, string> = {
  // Base Mainnet tokens
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC', // USDC on Base
  '0x4200000000000000000000000000000000000006': 'ETH', // WETH on Base
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI', // DAI on Base
  // Add more Base tokens as needed
};

/**
 * Get asset symbol from token address
 * Falls back to 'ETH' if not found (for proxy data from Ethereum)
 */
export function getTokenSymbol(tokenAddress: string): string {
  const normalized = tokenAddress.toLowerCase();
  return TOKEN_ADDRESS_TO_SYMBOL[normalized] || 'ETH'; // Default to ETH for proxy
}

/**
 * Check if token is a major asset (ETH, BTC, USDC, etc.)
 * These are more likely to have data in external APIs
 */
export function isMajorAsset(tokenAddress: string): boolean {
  const symbol = getTokenSymbol(tokenAddress);
  const majorAssets = ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'WETH'];
  return majorAssets.includes(symbol);
}

