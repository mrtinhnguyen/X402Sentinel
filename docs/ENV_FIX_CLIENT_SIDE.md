# Fix: NEXT_PUBLIC_ Environment Variables Not Available in Client-Side

## Vấn đề

Trong client-side (browser), tất cả `process.env.NEXT_PUBLIC_*` variables đều là `undefined`:

```javascript
{
  NEXT_PUBLIC_: undefined,
  availableEnvKeys: [],
  final: undefined,
  isClient: true,
  ...
}
```

## Nguyên nhân

**Next.js inlines `NEXT_PUBLIC_*` variables tại BUILD TIME, không phải runtime.**

Điều này có nghĩa:
- Nếu bạn thêm biến `NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE` vào `.env.local` **SAU KHI** dev server đã start, biến sẽ không có sẵn trong client bundle
- Bạn **PHẢI** restart dev server để Next.js rebuild và inline các biến mới

## Giải pháp

### Step 1: Kiểm tra `.env.local`

Đảm bảo file `.env.local` có biến với prefix `NEXT_PUBLIC_`:

```env
# ✅ ĐÚNG - Có prefix NEXT_PUBLIC_
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE=50000

# ❌ SAI - Không có prefix (chỉ server-side)
X402_TOKEN_ANALYSIS_PRICE=50000
```

### Step 2: Stop Dev Server

```bash
# Press Ctrl+C hoặc Cmd+C để stop server
```

### Step 3: Clear Next.js Cache (Optional nhưng recommended)

```bash
# Xóa .next folder để force rebuild
rm -rf .next

# Hoặc trên Windows PowerShell:
Remove-Item -Recurse -Force .next
```

### Step 4: Start Dev Server lại

```bash
npm run dev
```

### Step 5: Hard Refresh Browser

- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) hoặc `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) hoặc `Cmd+Shift+R` (Mac)
- Hoặc mở DevTools → Network tab → Check "Disable cache" → Refresh

## Verification

Sau khi restart, check browser console:

```javascript
// Should show your value, not undefined
console.log(process.env.NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE)
// Expected: "50000" (hoặc giá trị bạn set)
```

Và check terminal logs:
```
[Payment Amount] X402_TOKEN_ANALYSIS_PRICE (CLIENT): {
  'NEXT_PUBLIC_': '50000',  // ✅ Should not be undefined
  'final': '50000',
  'hasPublicKeyInProcessEnv': true,  // ✅ Should be true
  'sample NEXT_PUBLIC keys': ['NEXT_PUBLIC_THIRDWEB_CLIENT_ID', 'NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE', ...]
}
```

## Tại sao cần restart?

Next.js build process:
1. **Build time**: Next.js đọc `.env.local` và inline các `NEXT_PUBLIC_*` variables vào JavaScript bundle
2. **Runtime**: Client-side code chỉ có thể access các biến đã được inlined tại build time

Nếu bạn thêm biến mới sau khi build:
- Server-side: ✅ Có thể đọc (vì server đọc `.env.local` trực tiếp)
- Client-side: ❌ Không có (vì không được inlined vào bundle)

## Best Practices

1. **Thêm tất cả `NEXT_PUBLIC_*` variables TRƯỚC KHI start dev server lần đầu**
2. **Restart dev server sau mỗi lần thêm/sửa `NEXT_PUBLIC_*` variables**
3. **Clear `.next` cache nếu vẫn không work sau khi restart**

## Alternative: Server-Side API Endpoint (Advanced)

Nếu bạn cần dynamic values mà không muốn restart server, có thể tạo API endpoint:

```typescript
// app/api/payment-config/route.ts
export async function GET() {
  return Response.json({
    tokenAnalysisPrice: process.env.X402_TOKEN_ANALYSIS_PRICE || "50000",
    slippageSentinelPrice: process.env.X402_SLIPPAGE_SENTINEL_PRICE || "50000",
  });
}
```

Sau đó fetch từ client-side. Tuy nhiên, cách này không recommended vì:
- Thêm network request
- Slower than inlined values
- More complex

## Troubleshooting Checklist

- [ ] File `.env.local` có prefix `NEXT_PUBLIC_`?
- [ ] File `.env.local` ở root directory (cùng cấp với `package.json`)?
- [ ] Format đúng (không có spaces, quotes): `NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000`?
- [ ] Dev server đã restart sau khi thêm biến?
- [ ] Đã clear `.next` cache?
- [ ] Browser đã hard refresh?
- [ ] Check terminal logs có show `hasPublicKeyInProcessEnv: true`?

## Still Not Working?

1. **Verify file exists và readable**:
   ```bash
   cat .env.local | grep NEXT_PUBLIC_X402
   ```

2. **Check for typos**:
   - Variable names are case-sensitive
   - Must be exactly: `NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE`

3. **Check Next.js version**:
   ```bash
   npm list next
   ```
   Should be Next.js 13+ for proper env var support

4. **Try explicit rebuild**:
   ```bash
   rm -rf .next node_modules/.cache
   npm run dev
   ```

