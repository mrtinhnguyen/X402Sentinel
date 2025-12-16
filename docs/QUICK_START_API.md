# Quick Start - Tích Hợp API Nhanh

Hướng dẫn nhanh để tích hợp các external APIs vào X402Sentinel.

## Bước 1: Thêm Environment Variables

Thêm vào `.env.local`:

```env
# Glassnode (Optional - cho MVRV/NUPL chính xác hơn)
GLASSNODE_API_KEY=your_key_here

# CryptoQuant (Optional - cho exchange flows chính xác hơn)
CRYPTOQUANT_API_KEY=your_key_here

# Dune Analytics (Optional - cho custom Base chain queries)
DUNE_API_KEY=your_key_here
DUNE_QUERY_ID=123456  # Query ID của bạn

# Nansen (Optional - cho whale tracking nâng cao)
NANSEN_API_KEY=your_key_here

# DeFiLlama (Không cần key - public API)
# Không cần config gì
```

## Bước 2: Lấy API Keys

### Glassnode
1. Đăng ký tại https://glassnode.com
2. Vào API section → Create API key
3. Copy key vào `.env.local`

### CryptoQuant
1. Đăng ký tại https://cryptoquant.com
2. Vào API section → Create API key
3. Copy key vào `.env.local`

### Dune Analytics
1. Đăng ký tại https://dune.com
2. Settings → API Keys → Create key
3. Tạo query cho Base chain metrics
4. Copy Query ID vào `DUNE_QUERY_ID`

### Nansen
1. Đăng ký tại https://nansen.ai (có thể cần paid plan)
2. Vào API section → Create key
3. Copy key vào `.env.local`

## Bước 3: Test APIs

Tạo file `test-apis.ts` trong root:

```typescript
import { fetchMVRV } from './lib/services/glassnode';
import { fetchNetExchangeFlow } from './lib/services/cryptoquant';

async function test() {
  // Test Glassnode
  if (process.env.GLASSNODE_API_KEY) {
    const mvrv = await fetchMVRV('ETH');
    console.log('✅ Glassnode MVRV:', mvrv);
  } else {
    console.log('❌ Glassnode API key not set');
  }
  
  // Test CryptoQuant
  if (process.env.CRYPTOQUANT_API_KEY) {
    const flow = await fetchNetExchangeFlow('binance', 'ETH');
    console.log('✅ CryptoQuant Flow:', flow);
  } else {
    console.log('❌ CryptoQuant API key not set');
  }
}
```

## Bước 4: Hệ Thống Tự Động Sử Dụng APIs

Sau khi thêm API keys, hệ thống sẽ:
- ✅ Tự động dùng Glassnode cho MVRV/NUPL (nếu có key)
- ✅ Tự động dùng CryptoQuant cho exchange flows (nếu có key)
- ✅ Tự động dùng Dune cho custom metrics (nếu có key + query ID)
- ✅ Tự động dùng Nansen cho whale tracking (nếu có key)
- ✅ Tự động dùng DeFiLlama cho TVL (luôn available)

**Fallback**: Nếu API không available hoặc fail, hệ thống tự động dùng on-chain calculation.

## Lưu Ý

- **Không bắt buộc**: Tất cả APIs đều optional. Hệ thống vẫn chạy tốt với on-chain calculation.
- **Cost**: Một số APIs có free tier, một số cần paid plan. Kiểm tra pricing trước.
- **Base Chain**: Một số APIs có thể không hỗ trợ Base trực tiếp, sẽ dùng Ethereum data làm proxy.

## Xem Chi Tiết

Xem file `docs/api-integration-guide.md` để biết chi tiết về từng API.

