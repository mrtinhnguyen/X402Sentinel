// Network Configuration
export const BASE_MAINNET_CHAIN_ID = 8453;

// Token Addresses (Base Mainnet)
export const USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;

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
// Configurable via environment variables with fallback to defaults
// Supports both NEXT_PUBLIC_ (client-side) and non-prefix (server-side) versions
// Using getter functions to read values dynamically at runtime
const getPaymentAmount = (endpoint: 'TOKEN_ANALYSIS' | 'SLIPPAGE_SENTINEL') => {
  const envVarName = endpoint === 'TOKEN_ANALYSIS' 
    ? 'X402_TOKEN_ANALYSIS_PRICE'
    : 'X402_SLIPPAGE_SENTINEL_PRICE';
  
  // In Next.js:
  // - Client-side: process.env only contains NEXT_PUBLIC_* variables (inlined at build time)
  // - Server-side: process.env contains ALL variables from .env.local
  // 
  // IMPORTANT: NEXT_PUBLIC_* variables are inlined at BUILD TIME, not runtime.
  // If you add a new NEXT_PUBLIC_* variable, you MUST restart the dev server.
  
  let publicEnvVar: string | undefined;
  let serverEnvVar: string | undefined;
  
  // Try to read from process.env
  // Note: In client-side, only NEXT_PUBLIC_* vars are available (if they were present at build time)
  // In server-side, all vars from .env.local are available
  if (typeof window === 'undefined') {
    // Server-side: Both types are available
    publicEnvVar = process.env[`NEXT_PUBLIC_${envVarName}`];
    serverEnvVar = process.env[envVarName];
  } else {
    // Client-side: Only NEXT_PUBLIC_* variables are available (inlined at build time)
    // If the variable wasn't present when the app was built, it will be undefined
    publicEnvVar = process.env[`NEXT_PUBLIC_${envVarName}`];
  }
  
  // Prefer NEXT_PUBLIC_ version (works in both client and server)
  // Fallback to non-prefix version (server-side only)
  const envVar = publicEnvVar !== undefined ? publicEnvVar : serverEnvVar;
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    const context = typeof window !== 'undefined' ? 'CLIENT' : 'SERVER';
    const allEnvKeys = typeof process !== 'undefined' && process.env 
      ? Object.keys(process.env).filter(key => key.includes(envVarName))
      : [];
    
    // Check if NEXT_PUBLIC_* exists in process.env (even if undefined)
    const hasPublicKey = typeof process !== 'undefined' && process.env 
      ? `NEXT_PUBLIC_${envVarName}` in process.env
      : false;
    
    console.log(`[Payment Amount] ${envVarName} (${context}):`, {
      'NEXT_PUBLIC_': publicEnvVar,
      'non-prefix': serverEnvVar,
      'final': envVar,
      'default': '50000',
      'isClient': typeof window !== 'undefined',
      'availableEnvKeys': allEnvKeys,
      'hasPublicKeyInProcessEnv': hasPublicKey,
      'process.env keys count': typeof process !== 'undefined' && process.env 
        ? Object.keys(process.env).length 
        : 0,
      'sample NEXT_PUBLIC keys': typeof process !== 'undefined' && process.env 
        ? Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')).slice(0, 5)
        : [],
    });
  }
  
  // Handle "0" or empty string as free (no payment required)
  // If envVar is undefined, use default. If it's "0" or "", treat as free.
  const amount = envVar === undefined 
    ? "50000" // Default $0.05 USDC
    : (envVar === "0" || envVar === "" ? "0" : envVar);
    
  return {
    amount,
    bigInt: BigInt(amount),
    isFree: amount === "0",
  };
};

// Export as getter functions to read values dynamically
export const PAYMENT_AMOUNTS = {
  get TOKEN_ANALYSIS() {
    return getPaymentAmount('TOKEN_ANALYSIS');
  },
  get SLIPPAGE_SENTINEL() {
    return getPaymentAmount('SLIPPAGE_SENTINEL');
  },
};

// API Configuration
export const COINGECKO_NETWORK_ID = "base"; // Network ID for CoinGecko API

// Known Exchange Addresses (Base Mainnet)
// These addresses are used to track exchange inflows/outflows
export const KNOWN_EXCHANGE_ADDRESSES = [
  // Coinbase (Base native)
  "0x4200000000000000000000000000000000000006", // WETH on Base
  // Add more exchange addresses as needed
  // Note: Exchange addresses may vary, this is a starting list
].map(addr => addr.toLowerCase() as `0x${string}`);

// Whale Activity Thresholds
export const WHALE_THRESHOLDS = {
  LARGE_TRANSACTION_USD: 100000, // $100k equivalent
  WHALE_HOLDER_PERCENTILE: 1, // Top 1% holders are considered whales
};

// Time Periods for Metrics (in seconds)
export const TIME_PERIODS = {
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH: 30 * 24 * 60 * 60,
};
