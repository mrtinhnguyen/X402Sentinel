// CryptoQuant API Service
// Documentation: https://cryptoquant.com/api-docs

const CRYPTOQUANT_API_BASE = "https://api.cryptoquant.com/v1";

interface CryptoQuantConfig {
  apiKey?: string;
}

/**
 * Fetch exchange inflows from CryptoQuant
 * @param exchange Exchange name (e.g., 'binance', 'coinbase')
 * @param asset Asset symbol (e.g., 'ETH', 'BTC')
 * @param config Configuration with optional API key
 */
export async function fetchExchangeInflows(
  exchange: string,
  asset: string,
  config: CryptoQuantConfig = {}
): Promise<number | null> {
  const apiKey = config.apiKey || process.env.CRYPTOQUANT_API_KEY;
  if (!apiKey) {
    console.warn("CryptoQuant API key not found, skipping exchange inflows fetch");
    return null;
  }

  try {
    const response = await fetch(
      `${CRYPTOQUANT_API_BASE}/exchange/inflow?exchange=${exchange}&asset=${asset}&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`CryptoQuant API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Return the most recent value
    return data && data.result && data.result.length > 0 
      ? data.result[data.result.length - 1].value 
      : null;
  } catch (error) {
    console.error("Error fetching exchange inflows from CryptoQuant:", error);
    return null;
  }
}

/**
 * Fetch exchange outflows from CryptoQuant
 */
export async function fetchExchangeOutflows(
  exchange: string,
  asset: string,
  config: CryptoQuantConfig = {}
): Promise<number | null> {
  const apiKey = config.apiKey || process.env.CRYPTOQUANT_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${CRYPTOQUANT_API_BASE}/exchange/outflow?exchange=${exchange}&asset=${asset}&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`CryptoQuant API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data && data.result && data.result.length > 0 
      ? data.result[data.result.length - 1].value 
      : null;
  } catch (error) {
    console.error("Error fetching exchange outflows from CryptoQuant:", error);
    return null;
  }
}

/**
 * Fetch net exchange flow (outflows - inflows)
 */
export async function fetchNetExchangeFlow(
  exchange: string,
  asset: string,
  config: CryptoQuantConfig = {}
): Promise<number | null> {
  const [inflows, outflows] = await Promise.all([
    fetchExchangeInflows(exchange, asset, config),
    fetchExchangeOutflows(exchange, asset, config),
  ]);

  if (inflows === null || outflows === null) {
    return null;
  }

  return outflows - inflows; // Positive = net outflow (accumulation)
}

