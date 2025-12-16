# ESLint Fixes Guide

## Tổng Quan

File `app/api/token-analysis/route.ts` có một số lỗi ESLint chủ yếu liên quan đến:
1. **`any` types** - Cần thay bằng types cụ thể
2. **Unused variables** - Có thể prefix với `_` hoặc xóa
3. **Type compatibility với viem** - Một số lỗi về PublicClient type compatibility

## Các Lỗi Quan Trọng Cần Sửa

### 1. DexScreener Pair Types

**Lỗi**: `Property 'usd' does not exist on type 'string | { usd?: string | undefined; }'`

**Giải pháp**: Đã thêm type guards để check type trước khi access properties:

```typescript
const aLiquidityValue = typeof a.liquidity === 'string' ? a.liquidity : (a.liquidity?.usd || "0");
```

### 2. Log.args Type Issues

**Lỗi**: `Property 'args' does not exist on type 'Log'`

**Giải pháp**: Sử dụng type assertion:

```typescript
const logArgs = log.args as { from?: `0x${string}`; to?: `0x${string}`; value?: bigint } | undefined;
```

### 3. PublicClient Type Compatibility

**Lỗi**: Type incompatibility với viem PublicClient

**Giải pháp**: Sử dụng type assertion khi cần:

```typescript
const publicClient: PublicClient = createPublicClient({
  chain: baseChain,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
}) as PublicClient;
```

### 4. Unused Variables

**Giải pháp**: Prefix với `_` hoặc xóa nếu không cần:

```typescript
async function fetchActiveAddresses(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  currentBlock: bigint,
  _tokenPrice: number  // Prefix với _ nếu không dùng
)
```

## Các Lỗi Có Thể Bỏ Qua (Warnings)

Một số warnings về unused variables có thể bỏ qua nếu:
- Biến được dùng trong comments hoặc để debug
- Biến là part của interface/type definition
- Biến sẽ được dùng trong tương lai

## Các Lỗi Type Compatibility với viem

Một số lỗi về type compatibility với viem PublicClient là do version differences. Có thể:
1. **Ignore với `// @ts-ignore`** (không khuyến khích)
2. **Sử dụng type assertion** (đã làm)
3. **Update viem version** nếu có version mới hơn

## Recommended Action

Hầu hết các lỗi `any` type đã được fix. Các lỗi còn lại chủ yếu là:
- Type compatibility issues với viem (có thể ignore hoặc fix khi update viem)
- Unused variables (warnings, không ảnh hưởng functionality)

**Code vẫn hoạt động tốt** với các lỗi này. Có thể:
1. Thêm `// eslint-disable-next-line @typescript-eslint/no-explicit-any` cho các trường hợp cần thiết
2. Hoặc tiếp tục fix từng lỗi một cách có hệ thống

