// Dune Analytics API Service
// Documentation: https://docs.dune.com/api-reference

const DUNE_API_BASE = "https://api.dune.com/api/v1";

interface DuneConfig {
  apiKey?: string;
}

/**
 * Execute a Dune Analytics query
 * @param queryId Query ID from Dune Analytics
 * @param config Configuration with optional API key
 */
export async function executeDuneQuery(
  queryId: number,
  config: DuneConfig = {}
): Promise<any> {
  const apiKey = config.apiKey || process.env.DUNE_API_KEY;
  if (!apiKey) {
    console.warn("Dune API key not found, skipping query execution");
    return null;
  }

  try {
    // Execute query
    const executeResponse = await fetch(
      `${DUNE_API_BASE}/query/${queryId}/execute`,
      {
        method: "POST",
        headers: {
          "X-Dune-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!executeResponse.ok) {
      throw new Error(`Dune API error: ${executeResponse.statusText}`);
    }

    const executeData = await executeResponse.json();
    const executionId = executeData.execution_id;

    if (!executionId) {
      throw new Error("No execution ID returned from Dune API");
    }

    // Poll for results
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(
        `${DUNE_API_BASE}/execution/${executionId}/status`,
        {
          headers: {
            "X-Dune-API-Key": apiKey,
          },
        }
      );

      const statusData = await statusResponse.json();

      if (statusData.state === "QUERY_STATE_COMPLETED") {
        // Fetch results
        const resultsResponse = await fetch(
          `${DUNE_API_BASE}/execution/${executionId}/results`,
          {
            headers: {
              "X-Dune-API-Key": apiKey,
            },
          }
        );

        const resultsData = await resultsResponse.json();
        return resultsData.result?.rows || [];
      } else if (statusData.state === "QUERY_STATE_FAILED") {
        throw new Error("Dune query execution failed");
      }

      attempts++;
    }

    throw new Error("Dune query execution timeout");
  } catch (error) {
    console.error("Error executing Dune query:", error);
    return null;
  }
}

/**
 * Fetch Base chain token metrics using a custom Dune query
 * Note: You need to create a Dune query first and get its query ID
 */
export async function fetchBaseTokenMetrics(
  tokenAddress: string,
  queryId: number,
  config: DuneConfig = {}
): Promise<any> {
  const results = await executeDuneQuery(queryId, config);
  if (!results) {
    return null;
  }

  // Filter results for the specific token address
  return results.find((row: any) => 
    row.token_address?.toLowerCase() === tokenAddress.toLowerCase()
  );
}

