// API Integration Helper Functions
// Centralized logic for integrating external APIs with fallbacks

import { fetchMVRV, fetchNUPL } from '@/lib/services/glassnode';
import { fetchNetExchangeFlow } from '@/lib/services/cryptoquant';
import { executeDuneQuery } from '@/lib/services/dune';
import { fetchWhaleActivity, fetchHolderLabels } from '@/lib/services/nansen';
import { fetchProtocolTVL, fetchChainProtocols } from '@/lib/services/defillama';
import { getTokenSymbol, isMajorAsset } from './token-mapping';

/**
 * Enhanced MVRV calculation with Glassnode fallback
 */
export async function getMVRVWithFallback(
  publicClient: any,
  tokenAddress: string,
  currentPrice: number,
  tokenTotalSupply: bigint,
  tokenDecimals: number,
  calculateMVRV: (publicClient: any, tokenAddress: string, currentPrice: number, tokenTotalSupply: bigint, tokenDecimals: number) => Promise<any>
): Promise<any> {
  // Try Glassnode first if available and token is major asset
  if (process.env.GLASSNODE_API_KEY && isMajorAsset(tokenAddress)) {
    try {
      const symbol = getTokenSymbol(tokenAddress);
      const glassnodeMVRV = await fetchMVRV(symbol);
      
      if (glassnodeMVRV !== null && glassnodeMVRV > 0) {
        const marketValue = currentPrice * Number(tokenTotalSupply) / (10 ** tokenDecimals);
        return {
          ratio: glassnodeMVRV,
          marketValue,
          realizedValue: marketValue / glassnodeMVRV,
          interpretation: glassnodeMVRV > 3.5 ? 'overvalued' : glassnodeMVRV < 1 ? 'undervalued' : 'fair',
          source: 'glassnode',
        };
      }
    } catch (error) {
      console.warn('Glassnode MVRV fetch failed, using calculated:', error);
    }
  }
  
  // Fallback to calculated
  const calculated = await calculateMVRV(publicClient, tokenAddress as `0x${string}`, currentPrice, tokenTotalSupply, tokenDecimals);
  return { ...calculated, source: 'calculated' };
}

/**
 * Enhanced NUPL calculation with Glassnode fallback
 */
export async function getNUPLWithFallback(
  mvrv: { marketValue: number; realizedValue: number },
  calculateNUPL: (mvrv: { marketValue: number; realizedValue: number }) => any
): Promise<any> {
  // Try Glassnode if available
  if (process.env.GLASSNODE_API_KEY) {
    try {
      // Note: Glassnode NUPL is asset-specific, would need symbol mapping
      // For now, use calculated NUPL
      return { ...calculateNUPL(mvrv), source: 'calculated' };
    } catch (error) {
      console.warn('Glassnode NUPL fetch failed:', error);
    }
  }
  
  return { ...calculateNUPL(mvrv), source: 'calculated' };
}

/**
 * Enhanced Exchange Flows with CryptoQuant fallback
 */
export async function getExchangeFlowsWithFallback(
  publicClient: any,
  tokenAddress: string,
  currentBlock: bigint,
  tokenDecimals: number,
  tokenPrice: number,
  fetchExchangeFlows: (publicClient: any, tokenAddress: string, currentBlock: bigint, tokenDecimals: number, tokenPrice: number) => Promise<any>
): Promise<any> {
  // Try CryptoQuant if available and token is major asset
  if (process.env.CRYPTOQUANT_API_KEY && isMajorAsset(tokenAddress)) {
    try {
      const symbol = getTokenSymbol(tokenAddress);
      // Try major exchanges
      const exchanges = ['binance', 'coinbase', 'kraken'];
      
      for (const exchange of exchanges) {
        try {
          const netFlow = await fetchNetExchangeFlow(exchange, symbol);
          if (netFlow !== null) {
            return {
              inflows24h: 0, // CryptoQuant provides net flow only
              outflows24h: 0,
              netFlow,
              netFlowUSD: netFlow * tokenPrice,
              source: `cryptoquant-${exchange}`,
            };
          }
        } catch (error) {
          // Try next exchange
          continue;
        }
      }
    } catch (error) {
      console.warn('CryptoQuant exchange flows failed, using on-chain:', error);
    }
  }
  
  // Fallback to on-chain calculation
  const onChain = await fetchExchangeFlows(publicClient, tokenAddress as `0x${string}`, currentBlock, tokenDecimals, tokenPrice);
  return { ...onChain, source: 'on-chain' };
}

/**
 * Enhanced Whale Activity with Nansen fallback
 */
export async function getWhaleActivityWithFallback(
  publicClient: any,
  tokenAddress: string,
  currentBlock: bigint,
  tokenDecimals: number,
  tokenPrice: number,
  tokenTotalSupply: bigint,
  fetchEnhancedWhaleActivity: (publicClient: any, tokenAddress: string, currentBlock: bigint, tokenDecimals: number, tokenPrice: number, tokenTotalSupply: bigint) => Promise<any>
): Promise<any> {
  // Try Nansen if available
  if (process.env.NANSEN_API_KEY) {
    try {
      const nansenData = await fetchWhaleActivity('base', tokenAddress);
      if (nansenData) {
        // Transform Nansen data to our format
        return {
          largeTransactions24h: nansenData.largeTransactions || 0,
          whaleVolume24h: nansenData.volume || 0,
          accumulationScore: nansenData.accumulationScore || 0,
          source: 'nansen',
        };
      }
    } catch (error) {
      console.warn('Nansen whale activity failed, using on-chain:', error);
    }
  }
  
  // Fallback to on-chain
  const onChain = await fetchEnhancedWhaleActivity(publicClient, tokenAddress as `0x${string}`, currentBlock, tokenDecimals, tokenPrice, tokenTotalSupply);
  return { ...onChain, source: 'on-chain' };
}

/**
 * Get TVL with DeFiLlama
 */
export async function getTVLWithFallback(
  tokenAddress: string
): Promise<any> {
  // DeFiLlama is public, no API key needed
  try {
    // First, get all Base protocols
    const protocols = await fetchChainProtocols('base');
    
    // Try to find protocol for this token
    // Note: This requires maintaining a token-to-protocol mapping
    // For now, return undefined and let the caller handle it
    return undefined;
  } catch (error) {
    console.warn('DeFiLlama TVL fetch failed:', error);
    return undefined;
  }
}

/**
 * Execute Dune query if configured
 */
export async function getDuneMetrics(
  tokenAddress: string
): Promise<any> {
  if (!process.env.DUNE_API_KEY || !process.env.DUNE_QUERY_ID) {
    return null;
  }
  
  try {
    const queryId = parseInt(process.env.DUNE_QUERY_ID);
    if (isNaN(queryId)) {
      console.warn('Invalid DUNE_QUERY_ID');
      return null;
    }
    
    const results = await executeDuneQuery(queryId);
    if (!results || results.length === 0) {
      return null;
    }
    
    // Find data for this token address
    const tokenData = results.find((row: any) => 
      row.token_address?.toLowerCase() === tokenAddress.toLowerCase()
    );
    
    return tokenData || null;
  } catch (error) {
    console.warn('Dune query execution failed:', error);
    return null;
  }
}

/**
 * Log API usage status
 */
export function logAPIStatus(): void {
  const status = {
    glassnode: process.env.GLASSNODE_API_KEY ? '✅ enabled' : '❌ disabled',
    cryptoquant: process.env.CRYPTOQUANT_API_KEY ? '✅ enabled' : '❌ disabled',
    dune: process.env.DUNE_API_KEY ? '✅ enabled' : '❌ disabled',
    nansen: process.env.NANSEN_API_KEY ? '✅ enabled' : '❌ disabled',
    defillama: '✅ enabled (public)',
  };
  
  console.log('External API Status:', status);
}

