# Environment Variables Guide

## 🔑 Client-Side vs Server-Side Variables

Trong Next.js, các biến môi trường chỉ có thể truy cập từ **client-side** (components với `"use client"`) nếu chúng có prefix `NEXT_PUBLIC_`.

### Vấn đề

Các component `app/analysis/page.tsx` và `app/slippage/page.tsx` là **client components** (`"use client"`), nên chúng không thể truy cập các biến môi trường không có prefix `NEXT_PUBLIC_`.

### Giải pháp

File `lib/constants.ts` đã được cập nhật để hỗ trợ cả hai loại biến:

1. **`NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE`** - Cho client-side (UI display)
2. **`X402_TOKEN_ANALYSIS_PRICE`** - Cho server-side (API routes)

Hệ thống sẽ ưu tiên `NEXT_PUBLIC_` version, sau đó fallback về non-prefix version.

## 📝 Cấu hình Environment Variables

### Bắt buộc cho Client-Side Display

Để hiển thị giá động trong UI, bạn **PHẢI** sử dụng prefix `NEXT_PUBLIC_`:

```env
# Payment prices (REQUIRED for UI display in client components)
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE=50000
```

### Tùy chọn cho Server-Side

Các biến không có prefix chỉ cần thiết cho server-side code (API routes):

```env
# Server-side versions (optional, will use NEXT_PUBLIC_ if not set)
X402_TOKEN_ANALYSIS_PRICE=50000
X402_SLIPPAGE_SENTINEL_PRICE=50000
```

### Ví dụ đầy đủ

```env
# ✅ ĐÚNG - Có thể truy cập từ cả client và server
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE=50000

# ⚠️ CHỈ server-side - Không thể truy cập từ client components
X402_TOKEN_ANALYSIS_PRICE=50000
X402_SLIPPAGE_SENTINEL_PRICE=50000
```

## 🚀 Deployment trên Vercel

Khi deploy lên Vercel, **NHỚ** thêm cả hai loại biến:

1. **`NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE`** - Cho UI display
2. **`X402_TOKEN_ANALYSIS_PRICE`** - Cho server-side (optional, nhưng recommended)

### Vercel Dashboard

1. Vào Project Settings → Environment Variables
2. Thêm các biến với prefix `NEXT_PUBLIC_`:
   - `NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000`
   - `NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE=50000`
3. (Optional) Thêm các biến server-side:
   - `X402_TOKEN_ANALYSIS_PRICE=50000`
   - `X402_SLIPPAGE_SENTINEL_PRICE=50000`

## 🔍 Kiểm tra

Sau khi cấu hình, kiểm tra:

1. **Client-side**: Mở browser console, kiểm tra `PAYMENT_AMOUNTS` có giá trị đúng không
2. **Server-side**: Check API routes logs để đảm bảo payment amounts được đọc đúng

## ⚠️ Lưu ý

- Biến với prefix `NEXT_PUBLIC_` sẽ được **expose ra client-side**, nên không nên dùng cho sensitive data
- Payment prices là public information (người dùng cần biết để thanh toán), nên việc expose là OK
- Nếu set giá = "0", hệ thống sẽ hiển thị "Free" và skip payment flow

## 🐛 Troubleshooting

**Vấn đề**: UI hiển thị giá mặc định ($0.05) thay vì giá từ .env

**Giải pháp**:
1. Kiểm tra biến có prefix `NEXT_PUBLIC_` chưa
2. Restart dev server sau khi thêm biến mới
3. Clear browser cache
4. Kiểm tra `.env.local` (không phải `.env`)

**Vấn đề**: "Cannot read property 'amount' of undefined"

**Giải pháp**:
1. Đảm bảo đã thêm `NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE` và `NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE`
2. Kiểm tra giá trị không phải empty string
3. Restart dev server

