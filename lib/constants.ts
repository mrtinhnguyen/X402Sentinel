// Network Configuration
export const AVALANCHE_FUJI_CHAIN_ID = 43113;

// Token Addresses (Avalanche Fuji Testnet)
export const USDC_FUJI_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65" as `0x${string}`;

// API Configuration
// Use relative URL in browser, absolute in server
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
export const API_ENDPOINTS = {
  TOKEN_ANALYSIS: `${API_BASE_URL}/api/token-analysis`,
  SLIPPAGE_SENTINEL: `${API_BASE_URL}/api/slippage-sentinel`,
} as const;

// Payment Amounts (USDC with 6 decimals)
export const PAYMENT_AMOUNTS = {
  TOKEN_ANALYSIS: {
    amount: "50000", // $0.05 USDC
    bigInt: BigInt(50000),
  },
  SLIPPAGE_SENTINEL: {
    amount: "50000", // $0.05 USDC
    bigInt: BigInt(50000),
  },
} as const;

// API Configuration
export const COINGECKO_NETWORK_ID = "avalanche"; // Network ID for CoinGecko API
