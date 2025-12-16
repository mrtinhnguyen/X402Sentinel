# Environment Variables Debug Guide

## Vấn đề: Environment Variables không được đọc đúng

Nếu bạn thấy trong logs:
```
[Payment Amount] X402_TOKEN_ANALYSIS_PRICE: { NEXT_PUBLIC_: '0', 'non-prefix': '0', final: '0', default: '50000' }
```

Nhưng trong `.env.local` bạn đã set giá trị khác, có thể do các nguyên nhân sau:

## Nguyên nhân và Giải pháp

### 1. File `.env.local` không được đọc

**Kiểm tra:**
- File phải tên chính xác là `.env.local` (không phải `.env` hoặc `.env.development`)
- File phải ở **root directory** của project (cùng cấp với `package.json`)
- Không có spaces hoặc special characters trong tên file

**Giải pháp:**
```bash
# Kiểm tra file có tồn tại không
ls -la .env.local

# Kiểm tra nội dung
cat .env.local | grep X402
```

### 2. Dev Server chưa restart sau khi thay đổi `.env.local`

**Quan trọng:** Next.js chỉ load `.env.local` khi **start server**, không hot-reload khi bạn edit file.

**Giải pháp:**
1. Stop dev server (Ctrl+C)
2. Start lại: `npm run dev`
3. Hard refresh browser (Ctrl+Shift+R hoặc Cmd+Shift+R)

### 3. Format sai trong `.env.local`

**Sai:**
```env
# ❌ Có spaces, quotes không cần thiết
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE = "50000"
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE="50000"
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE = 50000
```

**Đúng:**
```env
# ✅ Không có spaces, không có quotes
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
X402_TOKEN_ANALYSIS_PRICE=50000
```

### 4. Giá trị "0" được set intentionally

Nếu bạn muốn **free access** (không cần payment), set giá = "0" là đúng:
```env
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=0
X402_TOKEN_ANALYSIS_PRICE=0
```

Hệ thống sẽ hiển thị "Free" và skip payment flow.

### 5. Client-side vs Server-side

**Client-side** (browser):
- Chỉ đọc được biến có prefix `NEXT_PUBLIC_`
- `process.env.X402_TOKEN_ANALYSIS_PRICE` = `undefined`

**Server-side** (API routes):
- Đọc được TẤT CẢ biến từ `.env.local`
- Cả `NEXT_PUBLIC_*` và non-prefix đều available

**Giải pháp:**
Luôn set cả 2 biến trong `.env.local`:
```env
# Client-side (required for UI)
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000

# Server-side (optional, but recommended)
X402_TOKEN_ANALYSIS_PRICE=50000
```

## Debug Steps

### Step 1: Kiểm tra file `.env.local`

```bash
# Xem tất cả biến X402
cat .env.local | grep X402

# Kết quả mong đợi:
# NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
# X402_TOKEN_ANALYSIS_PRICE=50000
```

### Step 2: Kiểm tra format

Đảm bảo:
- ✅ Không có spaces quanh dấu `=`
- ✅ Không có quotes
- ✅ Không có trailing spaces
- ✅ Mỗi biến trên một dòng riêng

### Step 3: Restart Dev Server

```bash
# Stop server
# Ctrl+C hoặc Cmd+C

# Start lại
npm run dev
```

### Step 4: Check Logs

Sau khi restart, check terminal logs:
```
[Payment Amount] X402_TOKEN_ANALYSIS_PRICE (SERVER): {
  'NEXT_PUBLIC_': '50000',
  'non-prefix': '50000',
  'final': '50000',
  ...
}
```

### Step 5: Check Browser Console

Mở browser console (F12), check:
```javascript
// Client-side check
console.log(process.env.NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE)
// Should show: "50000" (hoặc giá trị bạn set)
```

## Example `.env.local` đúng format

```env
# Thirdweb
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key

# Payment Prices (USDC with 6 decimals)
# $0.05 = 50000 (6 decimals)
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE=50000
X402_TOKEN_ANALYSIS_PRICE=50000
X402_SLIPPAGE_SENTINEL_PRICE=50000

# Free access (set to 0)
# NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=0
# X402_TOKEN_ANALYSIS_PRICE=0

# OpenAI
OPENAI_API_KEY=your_openai_key
```

## Common Mistakes

### ❌ Mistake 1: Dùng `.env` thay vì `.env.local`
```bash
# Wrong
.env

# Correct
.env.local
```

### ❐ Mistake 2: Có spaces
```env
# Wrong
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE = 50000

# Correct
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
```

### ❌ Mistake 3: Dùng quotes
```env
# Wrong
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE="50000"

# Correct
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
```

### ❌ Mistake 4: Không restart server
Sau khi edit `.env.local`, **PHẢI** restart dev server.

## Verification

Sau khi fix, verify:

1. **Server-side log** (terminal):
   ```
   [Payment Amount] X402_TOKEN_ANALYSIS_PRICE (SERVER): {
     'NEXT_PUBLIC_': '50000',
     'non-prefix': '50000',
     'final': '50000',
     ...
   }
   ```

2. **Client-side** (browser console):
   ```javascript
   // Should show your value
   console.log(process.env.NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE)
   ```

3. **UI Display**:
   - Button should show: "Analyze ($0.05 USDC)" (nếu giá = 50000)
   - Hoặc "Analyze (Free)" (nếu giá = 0)

## Still Not Working?

1. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Check for multiple `.env` files**:
   ```bash
   ls -la | grep env
   ```
   Next.js load order: `.env.local` > `.env.development` > `.env`

3. **Verify file encoding**:
   - File should be UTF-8
   - No BOM (Byte Order Mark)

4. **Check for typos**:
   - Variable names are case-sensitive
   - `NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE` (not `next_public_...`)

