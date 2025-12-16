# Hướng Dẫn Tích Hợp API - Advanced On-Chain Metrics

Hướng dẫn chi tiết để tích hợp các nền tảng API chuyên nghiệp vào X402Sentinel để cung cấp advanced on-chain metrics.

## Tổng Quan

Các nền tảng được tích hợp:
1. **Glassnode** - MVRV, NUPL, Realized Cap, HODL Waves
2. **CryptoQuant** - Exchange flows, on-chain metrics
3. **Dune Analytics** - Custom queries cho Base chain
4. **Nansen** - Whale tracking, smart money flows
5. **DeFiLlama** - TVL data cho DeFi tokens

---

## 1. Glassnode API Integration

### Bước 1: Đăng ký và Lấy API Key

1. Truy cập [Glassnode.com](https://glassnode.com)
2. Đăng ký tài khoản (có free tier)
3. Vào **API** section trong dashboard
4. Tạo API key mới
5. Copy API key

### Bước 2: Cấu Hình Environment Variable

Thêm vào `.env.local`:
```env
GLASSNODE_API_KEY=your_glassnode_api_key_here
```

### Bước 3: Kiểm Tra API Service

File `lib/services/glassnode.ts` đã được tạo sẵn với các functions:
- `fetchMVRV()` - Lấy MVRV ratio
- `fetchNUPL()` - Lấy NUPL value
- `fetchRealizedCap()` - Lấy Realized Cap
- `fetchHODLWaves()` - Lấy HODL Waves data

### Bước 4: Tích Hợp Vào Token Analysis

Cập nhật `app/api/token-analysis/route.ts` để sử dụng Glassnode khi có API key:

```typescript
// Trong phần fetch advanced metrics
import { fetchMVRV as fetchMVRVFromGlassnode, fetchNUPL as fetchNUPLFromGlassnode } from '@/lib/services/glassnode';

// Thay thế calculateMVRV nếu có Glassnode data
let mvrvData;
if (process.env.GLASSNODE_API_KEY) {
  // Try Glassnode first (more accurate)
  const glassnodeMVRV = await fetchMVRVFromGlassnode('ETH'); // Hoặc token symbol
  if (glassnodeMVRV !== null) {
    // Use Glassnode data
    mvrvData = {
      ratio: glassnodeMVRV,
      marketValue: marketValue,
      realizedValue: marketValue / glassnodeMVRV,
      interpretation: glassnodeMVRV > 3.5 ? 'overvalued' : glassnodeMVRV < 1 ? 'undervalued' : 'fair',
    };
  } else {
    // Fallback to calculated
    mvrvData = await calculateMVRV(...);
  }
} else {
  // Use calculated version
  mvrvData = await calculateMVRV(...);
}
```

### Lưu Ý Glassnode

- **Asset Support**: Glassnode chủ yếu hỗ trợ ETH, BTC. Base chain tokens có thể cần dùng Ethereum data làm proxy
- **Rate Limits**: Free tier có giới hạn requests. Kiểm tra [Glassnode Pricing](https://glassnode.com/pricing)
- **Endpoint Format**: Đảm bảo asset symbol đúng (ETH, BTC, không phải địa chỉ contract)

---

## 2. CryptoQuant API Integration

### Bước 1: Đăng ký và Lấy API Key

1. Truy cập [CryptoQuant.com](https://cryptoquant.com)
2. Đăng ký tài khoản
3. Vào **API** section
4. Tạo API key
5. Copy API key

### Bước 2: Cấu Hình Environment Variable

Thêm vào `.env.local`:
```env
CRYPTOQUANT_API_KEY=your_cryptoquant_api_key_here
```

### Bước 3: Kiểm Tra API Service

File `lib/services/cryptoquant.ts` đã có:
- `fetchExchangeInflows()` - Lấy exchange inflows
- `fetchExchangeOutflows()` - Lấy exchange outflows
- `fetchNetExchangeFlow()` - Lấy net flow (outflows - inflows)

### Bước 4: Tích Hợp Vào Exchange Flows

Cập nhật `fetchExchangeFlows()` trong `app/api/token-analysis/route.ts`:

```typescript
import { fetchNetExchangeFlow } from '@/lib/services/cryptoquant';

async function fetchExchangeFlows(...) {
  // Try CryptoQuant first if available
  if (process.env.CRYPTOQUANT_API_KEY) {
    try {
      // Note: CryptoQuant uses asset symbols, not contract addresses
      // You may need to map token address to symbol
      const netFlow = await fetchNetExchangeFlow('binance', 'ETH', {
        apiKey: process.env.CRYPTOQUANT_API_KEY,
      });
      
      if (netFlow !== null) {
        // Use CryptoQuant data (more accurate for major exchanges)
        return {
          inflows24h: 0, // CryptoQuant provides net flow
          outflows24h: 0,
          netFlow: netFlow,
          netFlowUSD: netFlow * tokenPrice,
        };
      }
    } catch (error) {
      console.warn('CryptoQuant API failed, falling back to on-chain calculation');
    }
  }
  
  // Fallback to on-chain calculation (existing code)
  // ...
}
```

### Lưu Ý CryptoQuant

- **Exchange Support**: Hỗ trợ các sàn lớn (Binance, Coinbase, etc.)
- **Asset Mapping**: Cần map token contract address → asset symbol (ETH, BTC, etc.)
- **Base Chain**: Có thể không hỗ trợ trực tiếp Base chain, cần dùng Ethereum data

---

## 3. Dune Analytics API Integration

### Bước 1: Đăng ký và Lấy API Key

1. Truy cập [Dune.com](https://dune.com)
2. Đăng ký tài khoản (free tier available)
3. Vào **Settings** → **API Keys**
4. Tạo API key mới
5. Copy API key

### Bước 2: Cấu Hình Environment Variable

Thêm vào `.env.local`:
```env
DUNE_API_KEY=your_dune_api_key_here
```

### Bước 3: Tạo Dune Query cho Base Chain

1. Vào Dune Analytics dashboard
2. Tạo query mới cho Base chain
3. Viết SQL query để fetch metrics (ví dụ: active addresses, holder distribution)
4. Lưu query và lấy **Query ID**

Ví dụ query cho Active Addresses trên Base:
```sql
SELECT 
  DATE_TRUNC('day', block_time) as date,
  COUNT(DISTINCT "from") as active_addresses
FROM base.transactions
WHERE "to" = '{{token_address}}'
  AND block_time >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;
```

### Bước 4: Tích Hợp Vào Token Analysis

```typescript
import { executeDuneQuery, fetchBaseTokenMetrics } from '@/lib/services/dune';

// Trong GET handler, sau khi fetch basic data
if (process.env.DUNE_API_KEY) {
  try {
    // Query ID của bạn (thay bằng ID thực tế)
    const DUNE_QUERY_ID = 123456; // Your query ID
    
    const duneData = await fetchBaseTokenMetrics(tokenAddress, DUNE_QUERY_ID);
    if (duneData) {
      // Merge duneData vào advancedMetrics
      advancedMetrics = {
        ...advancedMetrics,
        // Override với Dune data nếu có
        activeAddresses: duneData.activeAddresses || advancedMetrics?.activeAddresses,
        // ...
      };
    }
  } catch (error) {
    console.warn('Dune Analytics query failed:', error);
  }
}
```

### Lưu Ý Dune Analytics

- **Query Execution**: Queries có thể mất thời gian, cần polling
- **Rate Limits**: Free tier có giới hạn queries/day
- **Base Chain Support**: Dune hỗ trợ Base chain, có thể query trực tiếp
- **Custom Queries**: Cần maintain và update queries khi cần metrics mới

---

## 4. Nansen API Integration

### Bước 1: Đăng ký và Lấy API Key

1. Truy cập [Nansen.ai](https://nansen.ai)
2. Đăng ký tài khoản (có paid plans)
3. Vào **API** section
4. Tạo API key
5. Copy API key

### Bước 2: Cấu Hình Environment Variable

Thêm vào `.env.local`:
```env
NANSEN_API_KEY=your_nansen_api_key_here
```

### Bước 3: Kiểm Tra API Service

File `lib/services/nansen.ts` đã có:
- `fetchSmartMoneyFlows()` - Smart money flows
- `fetchWhaleActivity()` - Whale activity tracking
- `fetchHolderLabels()` - Holder labels (exchanges, smart money, etc.)

### Bước 4: Tích Hợp Vào Whale Activity

```typescript
import { fetchWhaleActivity as fetchWhaleFromNansen, fetchHolderLabels } from '@/lib/services/nansen';

// Trong fetchEnhancedWhaleActivity hoặc GET handler
if (process.env.NANSEN_API_KEY) {
  try {
    const nansenWhaleData = await fetchWhaleFromNansen('base', tokenAddress, {
      apiKey: process.env.NANSEN_API_KEY,
    });
    
    if (nansenWhaleData) {
      // Merge Nansen data
      advancedMetrics = {
        ...advancedMetrics,
        whaleActivity: {
          ...advancedMetrics?.whaleActivity,
          // Override với Nansen data
          largeTransactions24h: nansenWhaleData.largeTransactions || advancedMetrics?.whaleActivity.largeTransactions24h,
          // ...
        },
      };
    }
    
    // Fetch holder labels để identify exchanges, smart money
    const holderLabels = await fetchHolderLabels('base', tokenAddress);
    // Use labels để enhance exchange flows detection
  } catch (error) {
    console.warn('Nansen API failed:', error);
  }
}
```

### Lưu Ý Nansen

- **Pricing**: Nansen có pricing cao, chủ yếu cho enterprise
- **Base Chain Support**: Kiểm tra xem Nansen có hỗ trợ Base chain không
- **Smart Money**: Nansen có database về smart money addresses, rất hữu ích

---

## 5. DeFiLlama API Integration

### Bước 1: Không Cần API Key

DeFiLlama API là **public**, không cần đăng ký!

### Bước 2: Kiểm Tra API Service

File `lib/services/defillama.ts` đã có:
- `fetchProtocolTVL()` - Fetch TVL cho protocol
- `findProtocolByToken()` - Tìm protocol từ token address (cần implement)
- `fetchChainProtocols()` - Lấy tất cả protocols trên chain

### Bước 3: Tích Hợp TVL

```typescript
import { fetchProtocolTVL, fetchChainProtocols } from '@/lib/services/defillama';

// Trong GET handler
// First, try to find protocol for this token
const baseProtocols = await fetchChainProtocols('base');

// Check if token is associated with a protocol
// (This requires maintaining a mapping or checking protocol token addresses)
const protocolSlug = findProtocolForToken(tokenAddress, baseProtocols);

if (protocolSlug) {
  const tvlData = await fetchProtocolTVL(protocolSlug);
  if (tvlData) {
    advancedMetrics = {
      ...advancedMetrics,
      tvl: tvlData,
    };
  }
}
```

### Bước 4: Tạo Token-to-Protocol Mapping

Tạo file `lib/data/protocol-mapping.ts`:

```typescript
// Map token addresses to DeFiLlama protocol slugs
export const TOKEN_TO_PROTOCOL: Record<string, string> = {
  '0x...': 'uniswap-v3', // Example
  '0x...': 'aave-v3',
  // Add more mappings
};

export function findProtocolForToken(
  tokenAddress: string,
  protocols: any[]
): string | null {
  // Check direct mapping
  if (TOKEN_TO_PROTOCOL[tokenAddress.toLowerCase()]) {
    return TOKEN_TO_PROTOCOL[tokenAddress.toLowerCase()];
  }
  
  // Check if token is in protocol's token list
  for (const protocol of protocols) {
    if (protocol.tokens?.includes(tokenAddress.toLowerCase())) {
      return protocol.slug;
    }
  }
  
  return null;
}
```

### Lưu Ý DeFiLlama

- **No API Key**: Không cần authentication
- **Rate Limits**: Có rate limits, nhưng khá generous
- **Protocol Mapping**: Cần maintain mapping token → protocol
- **Base Chain**: Hỗ trợ Base chain protocols

---

## 6. Tích Hợp Tổng Hợp

### Cập Nhật GET Handler

Cập nhật `app/api/token-analysis/route.ts` để tích hợp tất cả APIs:

```typescript
// Import all services
import { fetchMVRV as fetchMVRVFromGlassnode, fetchNUPL as fetchNUPLFromGlassnode } from '@/lib/services/glassnode';
import { fetchNetExchangeFlow } from '@/lib/services/cryptoquant';
import { executeDuneQuery } from '@/lib/services/dune';
import { fetchWhaleActivity as fetchWhaleFromNansen } from '@/lib/services/nansen';
import { fetchProtocolTVL, findProtocolForToken } from '@/lib/services/defillama';

// Trong GET handler, sau khi fetch basic data:

// 1. Glassnode (MVRV, NUPL)
if (process.env.GLASSNODE_API_KEY) {
  const [glassnodeMVRV, glassnodeNUPL] = await Promise.all([
    fetchMVRVFromGlassnode('ETH'), // Map token to symbol
    fetchNUPLFromGlassnode('ETH'),
  ]);
  
  if (glassnodeMVRV !== null) {
    mvrvData = {
      ratio: glassnodeMVRV,
      marketValue,
      realizedValue: marketValue / glassnodeMVRV,
      interpretation: glassnodeMVRV > 3.5 ? 'overvalued' : glassnodeMVRV < 1 ? 'undervalued' : 'fair',
    };
  }
  
  if (glassnodeNUPL !== null) {
    nuplData = {
      value: glassnodeNUPL,
      interpretation: glassnodeNUPL > 0.75 ? 'euphoria' : 
                     glassnodeNUPL > 0.5 ? 'optimism' :
                     glassnodeNUPL > 0.25 ? 'hope' :
                     glassnodeNUPL > 0 ? 'fear' : 'capitulation',
    };
  }
}

// 2. CryptoQuant (Exchange Flows)
if (process.env.CRYPTOQUANT_API_KEY) {
  const netFlow = await fetchNetExchangeFlow('binance', 'ETH');
  if (netFlow !== null) {
    exchangeFlowsData = {
      inflows24h: 0,
      outflows24h: 0,
      netFlow,
      netFlowUSD: netFlow * tokenPrice,
    };
  }
}

// 3. Dune Analytics (Custom Queries)
if (process.env.DUNE_API_KEY) {
  const DUNE_QUERY_ID = process.env.DUNE_QUERY_ID ? parseInt(process.env.DUNE_QUERY_ID) : null;
  if (DUNE_QUERY_ID) {
    const duneResults = await executeDuneQuery(DUNE_QUERY_ID);
    // Process duneResults and merge into advancedMetrics
  }
}

// 4. Nansen (Whale Activity)
if (process.env.NANSEN_API_KEY) {
  const nansenWhale = await fetchWhaleFromNansen('base', tokenAddress);
  if (nansenWhale) {
    // Merge Nansen whale data
  }
}

// 5. DeFiLlama (TVL)
const tvlData = await fetchTVL(tokenAddress); // Already implemented
if (tvlData) {
  advancedMetrics.tvl = tvlData;
}
```

---

## 7. Environment Variables Tổng Hợp

Thêm tất cả vào `.env.local`:

```env
# Glassnode API
GLASSNODE_API_KEY=your_glassnode_api_key

# CryptoQuant API
CRYPTOQUANT_API_KEY=your_cryptoquant_api_key

# Dune Analytics API
DUNE_API_KEY=your_dune_api_key
DUNE_QUERY_ID=123456  # Query ID cho Base chain metrics

# Nansen API
NANSEN_API_KEY=your_nansen_api_key

# DeFiLlama (không cần key, nhưng có thể config)
DEFILLAMA_API_BASE=https://api.llama.fi  # Default, có thể override
```

---

## 8. Error Handling và Fallbacks

Đảm bảo mỗi API call có fallback:

```typescript
async function fetchAdvancedMetricsWithFallback(...) {
  let metrics = {
    // Default values from on-chain calculation
  };
  
  // Try external APIs, fallback to calculated if fails
  try {
    if (process.env.GLASSNODE_API_KEY) {
      const glassnodeData = await fetchMVRVFromGlassnode('ETH');
      if (glassnodeData !== null) {
        metrics.mvrv = glassnodeData;
      }
    }
  } catch (error) {
    console.warn('Glassnode API failed, using calculated MVRV');
    // Fallback to calculateMVRV()
  }
  
  // Similar for other APIs...
  
  return metrics;
}
```

---

## 9. Testing

### Test từng API riêng lẻ:

```typescript
// Test script: test-apis.ts
import { fetchMVRV } from '@/lib/services/glassnode';
import { fetchNetExchangeFlow } from '@/lib/services/cryptoquant';

async function testAPIs() {
  // Test Glassnode
  if (process.env.GLASSNODE_API_KEY) {
    const mvrv = await fetchMVRV('ETH');
    console.log('Glassnode MVRV:', mvrv);
  }
  
  // Test CryptoQuant
  if (process.env.CRYPTOQUANT_API_KEY) {
    const flow = await fetchNetExchangeFlow('binance', 'ETH');
    console.log('CryptoQuant Net Flow:', flow);
  }
  
  // Test DeFiLlama (no key needed)
  const tvl = await fetchProtocolTVL('uniswap-v3');
  console.log('DeFiLlama TVL:', tvl);
}
```

---

## 10. Monitoring và Logging

Thêm logging để track API usage:

```typescript
console.log('API Usage:', {
  glassnode: process.env.GLASSNODE_API_KEY ? 'enabled' : 'disabled',
  cryptoquant: process.env.CRYPTOQUANT_API_KEY ? 'enabled' : 'disabled',
  dune: process.env.DUNE_API_KEY ? 'enabled' : 'disabled',
  nansen: process.env.NANSEN_API_KEY ? 'enabled' : 'disabled',
  defillama: 'enabled (public)',
});
```

---

## 11. Best Practices

1. **Rate Limiting**: Implement rate limiting cho mỗi API
2. **Caching**: Cache API responses để giảm requests
3. **Error Handling**: Luôn có fallback về on-chain calculation
4. **Cost Management**: Monitor API usage để tránh overage
5. **Data Validation**: Validate API responses trước khi sử dụng
6. **Async Processing**: Fetch APIs in parallel khi có thể

---

## 12. Troubleshooting

### Glassnode không trả về data
- Kiểm tra asset symbol (ETH, BTC, không phải contract address)
- Kiểm tra API key có đúng không
- Kiểm tra rate limits

### CryptoQuant không hoạt động
- Kiểm tra exchange name (phải đúng format)
- Kiểm tra asset symbol
- Base chain có thể không được hỗ trợ, dùng Ethereum data

### Dune Query timeout
- Queries phức tạp có thể mất thời gian
- Tăng timeout hoặc optimize query
- Kiểm tra query ID có đúng không

### Nansen API errors
- Kiểm tra Base chain có được hỗ trợ không
- Kiểm tra API key permissions
- Nansen có thể không hỗ trợ tất cả tokens

---

## Kết Luận

Sau khi tích hợp các APIs, hệ thống sẽ có:
- ✅ Accurate MVRV/NUPL từ Glassnode
- ✅ Real-time exchange flows từ CryptoQuant
- ✅ Custom Base chain metrics từ Dune
- ✅ Smart money tracking từ Nansen
- ✅ TVL data từ DeFiLlama

Tất cả đều có fallback về on-chain calculation để đảm bảo hệ thống luôn hoạt động!

