// Nansen API Service
// Documentation: https://docs.nansen.ai/

const NANSEN_API_BASE = "https://api.nansen.ai/v1";

interface NansenConfig {
  apiKey?: string;
}

/**
 * Fetch smart money flows from Nansen
 * @param chain Chain identifier (e.g., 'base', 'ethereum')
 * @param tokenAddress Token contract address
 * @param config Configuration with optional API key
 */
export async function fetchSmartMoneyFlows(
  chain: string,
  tokenAddress: string,
  config: NansenConfig = {}
): Promise<any> {
  const apiKey = config.apiKey || process.env.NANSEN_API_KEY;
  if (!apiKey) {
    console.warn("Nansen API key not found, skipping smart money flows fetch");
    return null;
  }

  try {
    const response = await fetch(
      `${NANSEN_API_BASE}/smart-money/${chain}/token/${tokenAddress}/flows`,
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nansen API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching smart money flows from Nansen:", error);
    return null;
  }
}

/**
 * Fetch whale activity from Nansen
 */
export async function fetchWhaleActivity(
  chain: string,
  tokenAddress: string,
  config: NansenConfig = {}
): Promise<any> {
  const apiKey = config.apiKey || process.env.NANSEN_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${NANSEN_API_BASE}/whales/${chain}/token/${tokenAddress}/activity`,
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nansen API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching whale activity from Nansen:", error);
    return null;
  }
}

/**
 * Fetch token holder labels from Nansen
 * Identifies if holders are exchanges, smart money, etc.
 */
export async function fetchHolderLabels(
  chain: string,
  tokenAddress: string,
  config: NansenConfig = {}
): Promise<any> {
  const apiKey = config.apiKey || process.env.NANSEN_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${NANSEN_API_BASE}/labels/${chain}/token/${tokenAddress}/holders`,
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nansen API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching holder labels from Nansen:", error);
    return null;
  }
}

