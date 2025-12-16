# RPC Fallback Configuration Guide

## Overview

X402Sentinel hỗ trợ **automatic RPC provider fallback** để đảm bảo reliability khi public RPC endpoints gặp rate limits hoặc downtime. Hệ thống sẽ tự động thử các providers theo thứ tự ưu tiên.

## RPC Provider Priority Order

Hệ thống sẽ thử các providers theo thứ tự sau:

1. **BASE_RPC_URL** (nếu có) - Custom RPC endpoint của bạn
2. **Alchemy** (nếu có API key) - `https://base-mainnet.g.alchemy.com/v2/{API_KEY}`
3. **Infura** (nếu có API key) - `https://base-mainnet.infura.io/v3/{API_KEY}`
4. **QuickNode** (nếu có endpoint) - Custom QuickNode endpoint
5. **Public Base RPC** - `https://mainnet.base.org` (fallback cuối cùng)

## Cấu hình RPC Providers

### Option 1: Sử dụng Public RPC (Mặc định)

Không cần cấu hình gì, hệ thống sẽ sử dụng `https://mainnet.base.org`. Tuy nhiên, endpoint này có thể gặp rate limits.

```env
# Không cần thêm gì, hoặc có thể set:
BASE_RPC_URL=https://mainnet.base.org
```

### Option 2: Alchemy (Khuyến nghị cho Production)

1. Đăng ký tài khoản tại [Alchemy](https://www.alchemy.com/)
2. Tạo app cho Base Mainnet
3. Copy API key
4. Thêm vào `.env.local`:

```env
ALCHEMY_BASE_API_KEY=your_alchemy_api_key_here
```

**Ưu điểm:**
- Rate limits cao (300M compute units/month free tier)
- Reliable và fast
- Free tier đủ cho hầu hết use cases

### Option 3: Infura

1. Đăng ký tài khoản tại [Infura](https://www.infura.io/)
2. Tạo project cho Base Mainnet
3. Copy API key
4. Thêm vào `.env.local`:

```env
INFURA_BASE_API_KEY=your_infura_api_key_here
```

**Ưu điểm:**
- 100k requests/day free tier
- Reliable infrastructure

### Option 4: QuickNode

1. Đăng ký tài khoản tại [QuickNode](https://www.quicknode.com/)
2. Tạo endpoint cho Base Mainnet
3. Copy endpoint URL
4. Thêm vào `.env.local`:

```env
QUICKNODE_BASE_URL=https://compatible-flashy-scion.base-mainnet.quiknode.pro/0f22b361f0dc786fd427f575be606c57b127c1c3
```

**Ưu điểm:**
- Custom endpoints
- High performance

### Option 5: Custom RPC Endpoint

Nếu bạn có custom RPC endpoint:

```env
BASE_RPC_URL=https://your-custom-rpc-endpoint.com
```

## Cấu hình Multiple Providers (Khuyến nghị)

Để có độ tin cậy cao nhất, cấu hình nhiều providers:

```env
# Primary
BASE_RPC_URL=https://mainnet.base.org

# Fallback 1: Alchemy
ALCHEMY_BASE_API_KEY=your_alchemy_key

# Fallback 2: Infura
INFURA_BASE_API_KEY=your_infura_key

# Fallback 3: QuickNode (optional)
QUICKNODE_BASE_URL=https://your-quicknode-endpoint...
```

Hệ thống sẽ tự động fallback qua các providers nếu một provider fail.

## Cách hoạt động

1. **Viem Automatic Fallback**: Khi bạn cung cấp array của RPC URLs trong `rpcUrls.default.http`, viem sẽ tự động thử providers theo thứ tự nếu một provider fail.

2. **Retry Logic**: Mỗi RPC call có retry mechanism với exponential backoff (1s, 2s, 4s delays) trước khi thử provider tiếp theo.

3. **Error Handling**: Nếu tất cả providers fail, hệ thống vẫn trả về partial data từ các nguồn khác (CoinGecko, DexScreener, etc.) thay vì complete failure.

## Troubleshooting

### Vấn đề: RPC rate limit errors (429, 503)

**Giải pháp:**
1. Thêm Alchemy hoặc Infura API key
2. Hệ thống sẽ tự động fallback sang provider có rate limit cao hơn

### Vấn đề: "no backend is currently healthy"

**Giải pháp:**
1. Đây là lỗi từ public Base RPC endpoint
2. Thêm dedicated RPC provider (Alchemy/Infura) để bypass public endpoint

### Vấn đề: API không trả về kết quả

**Kiểm tra:**
1. Xem console logs để xem provider nào đang được sử dụng
2. Kiểm tra `.env.local` có đúng format không
3. Đảm bảo API keys hợp lệ

## Best Practices

1. **Production**: Luôn sử dụng ít nhất một dedicated RPC provider (Alchemy hoặc Infura)
2. **Development**: Có thể dùng public RPC, nhưng nên có fallback
3. **Monitoring**: Theo dõi logs để xem provider nào đang được sử dụng và có cần thêm providers không

## Example .env.local

```env
# RPC Configuration
BASE_RPC_URL=https://mainnet.base.org
ALCHEMY_BASE_API_KEY=abc123xyz...
INFURA_BASE_API_KEY=def456uvw...

# Other configs...
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...
OPENAI_API_KEY=...
```

## Notes

- Tất cả RPC providers được cấu hình sẽ được thử theo thứ tự ưu tiên
- Nếu một provider fail, viem tự động thử provider tiếp theo
- Retry logic chỉ áp dụng cho rate limit errors (429, 503)
- Hệ thống vẫn hoạt động với partial data nếu một số RPC calls fail

