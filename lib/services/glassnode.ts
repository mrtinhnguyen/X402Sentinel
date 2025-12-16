// Glassnode API Service
// Documentation: https://docs.glassnode.com/

const GLASSNODE_API_BASE = "https://api.glassnode.com/v1";

interface GlassnodeConfig {
  apiKey?: string;
}

/**
 * Fetch MVRV ratio from Glassnode
 * @param asset Asset symbol (e.g., 'ETH', 'BTC')
 * @param config Configuration with optional API key
 */
export async function fetchMVRV(
  asset: string,
  config: GlassnodeConfig = {}
): Promise<number | null> {
  const apiKey = config.apiKey || process.env.GLASSNODE_API_KEY;
  if (!apiKey) {
    console.warn("Glassnode API key not found, skipping MVRV fetch");
    return null;
  }

  try {
    const response = await fetch(
      `${GLASSNODE_API_BASE}/metrics/indicators/mvrv?a=${asset}&i=24h&f=JSON&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Glassnode API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Return the most recent value
    return data && data.length > 0 ? data[data.length - 1].v : null;
  } catch (error) {
    console.error("Error fetching MVRV from Glassnode:", error);
    return null;
  }
}

/**
 * Fetch NUPL (Net Unrealized Profit/Loss) from Glassnode
 */
export async function fetchNUPL(
  asset: string,
  config: GlassnodeConfig = {}
): Promise<number | null> {
  const apiKey = config.apiKey || process.env.GLASSNODE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${GLASSNODE_API_BASE}/metrics/indicators/nupl?a=${asset}&i=24h&f=JSON&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Glassnode API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data && data.length > 0 ? data[data.length - 1].v : null;
  } catch (error) {
    console.error("Error fetching NUPL from Glassnode:", error);
    return null;
  }
}

/**
 * Fetch Realized Cap from Glassnode
 */
export async function fetchRealizedCap(
  asset: string,
  config: GlassnodeConfig = {}
): Promise<number | null> {
  const apiKey = config.apiKey || process.env.GLASSNODE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${GLASSNODE_API_BASE}/metrics/supply/realized_cap?a=${asset}&i=24h&f=JSON&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Glassnode API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data && data.length > 0 ? data[data.length - 1].v : null;
  } catch (error) {
    console.error("Error fetching Realized Cap from Glassnode:", error);
    return null;
  }
}

/**
 * Fetch HODL Waves from Glassnode
 */
export async function fetchHODLWaves(
  asset: string,
  config: GlassnodeConfig = {}
): Promise<Record<string, number> | null> {
  const apiKey = config.apiKey || process.env.GLASSNODE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Note: HODL Waves endpoint may vary, adjust based on Glassnode API documentation
    const response = await fetch(
      `${GLASSNODE_API_BASE}/metrics/distribution/hodl_waves?a=${asset}&i=24h&f=JSON&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Glassnode API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Process and return HODL waves data
    return data && data.length > 0 ? data[data.length - 1] : null;
  } catch (error) {
    console.error("Error fetching HODL Waves from Glassnode:", error);
    return null;
  }
}

