# 🚀 Deployment Guide - Vercel

Hướng dẫn chi tiết để deploy X402Sentinel lên Vercel.

## 📋 Prerequisites

- Vercel account (đăng ký tại [vercel.com](https://vercel.com))
- Git repository (GitHub, GitLab, hoặc Bitbucket)
- Tất cả API keys và credentials đã sẵn sàng

## 🔧 Bước 1: Chuẩn bị Repository

1. **Push code lên Git repository**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Đảm bảo các file sau đã có**:
   - ✅ `vercel.json` (đã được tạo)
   - ✅ `.vercelignore` (đã được tạo)
   - ✅ `package.json` với build scripts
   - ✅ `next.config.ts` đã cấu hình đúng

## 🌐 Bước 2: Deploy qua Vercel Dashboard

### 2.1. Import Project

1. Truy cập [vercel.com/new](https://vercel.com/new)
2. Đăng nhập với GitHub/GitLab/Bitbucket
3. Chọn repository của bạn
4. Vercel sẽ tự động detect Next.js

### 2.2. Cấu hình Project

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 2.3. Environment Variables

**QUAN TRỌNG**: Thêm tất cả environment variables trong Vercel Dashboard:

**Required Variables**:
```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key
THIRDWEB_SERVER_WALLET_ADDRESS=your_facilitator_address
MERCHANT_WALLET_ADDRESS=your_merchant_wallet
OPENAI_API_KEY=your_openai_api_key
```

**Optional but Recommended**:
```
NEXT_PUBLIC_API_BASE_URL=https://your-project.vercel.app
BASE_RPC_URL=https://mainnet.base.org
COINGECKO_API=your_coingecko_api_key
X_BEARER_TOKEN=your_x_bearer_token
# Payment prices (use NEXT_PUBLIC_ prefix for client-side access)
NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE=50000
NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE=50000
X402_TOKEN_ANALYSIS_PRICE=50000
X402_SLIPPAGE_SENTINEL_PRICE=50000
```

**Advanced APIs (Optional)**:
```
GLASSNODE_API_KEY=your_key
CRYPTOQUANT_API_KEY=your_key
DUNE_API_KEY=your_key
DUNE_QUERY_ID=123456
NANSEN_API_KEY=your_key
```

**Cách thêm Environment Variables**:
1. Vào Project Settings → Environment Variables
2. Click "Add New"
3. Nhập Name và Value
4. Chọn Environment (Production, Preview, Development)
5. Click "Save"

### 2.4. Deploy

1. Click **"Deploy"**
2. Đợi build process hoàn tất (thường 2-5 phút)
3. Sau khi deploy thành công, copy URL của project

### 2.5. Cập nhật API Base URL

Sau khi deploy lần đầu, cần cập nhật `NEXT_PUBLIC_API_BASE_URL`:

1. Vào Project Settings → Environment Variables
2. Tìm hoặc thêm `NEXT_PUBLIC_API_BASE_URL`
3. Set value = `https://your-project.vercel.app` (URL từ bước 2.4)
4. Redeploy project

## 💻 Bước 3: Deploy qua Vercel CLI (Alternative)

Nếu bạn muốn deploy từ command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (development)
vercel

# Deploy to production
vercel --prod

# Link to existing project
vercel link
```

## ⚙️ Bước 4: Cấu hình Production

### 4.1. RPC Provider (Recommended)

Public Base RPC có thể bị rate limit. Nên sử dụng dedicated provider:

**Alchemy**:
1. Đăng ký tại [alchemy.com](https://www.alchemy.com/)
2. Tạo Base Mainnet app
3. Copy HTTP URL
4. Set `BASE_RPC_URL` trong Vercel environment variables

**Infura**:
1. Đăng ký tại [infura.io](https://infura.io/)
2. Tạo Base Mainnet project
3. Copy endpoint URL
4. Set `BASE_RPC_URL`

**QuickNode**:
1. Đăng ký tại [quicknode.com](https://www.quicknode.com/)
2. Tạo Base Mainnet endpoint
3. Copy HTTP URL
4. Set `BASE_RPC_URL`

### 4.2. Custom Domain (Optional)

1. Vào Project Settings → Domains
2. Add custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_API_BASE_URL` nếu cần

### 4.3. Function Timeout

API routes được cấu hình với timeout 60s trong `vercel.json`. Nếu cần timeout dài hơn:

1. Vào Project Settings → Functions
2. Hoặc cập nhật `vercel.json`:
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 120
    }
  }
}
```

**Lưu ý**: Timeout tối đa là 60s cho Hobby plan, 300s cho Pro plan.

## ✅ Post-Deployment Checklist

Sau khi deploy, kiểm tra:

- [ ] Website load được tại Vercel URL
- [ ] Wallet connection hoạt động
- [ ] Token Analysis API hoạt động (`/api/token-analysis`)
- [ ] Slippage Sentinel API hoạt động (`/api/slippage-sentinel`)
- [ ] X402 payment flow hoạt động
- [ ] Environment variables đã được set đúng
- [ ] `NEXT_PUBLIC_API_BASE_URL` đã được cập nhật
- [ ] Check Vercel logs không có errors
- [ ] Test với một token address thực tế

## 🔍 Monitoring & Debugging

### View Logs

1. Vào Vercel Dashboard → Project
2. Click tab "Deployments"
3. Click vào deployment mới nhất
4. Click "Functions" tab để xem API route logs
5. Click "Runtime Logs" để xem real-time logs

### Common Issues

**Build Fails**:
- Check Node.js version (should be 18+)
- Verify all dependencies in `package.json`
- Check TypeScript errors: `npm run lint` locally
- Review build logs trong Vercel dashboard

**API Routes Timeout**:
- Check function execution time trong logs
- Optimize on-chain queries (reduce block range)
- Consider caching expensive operations
- Check RPC provider rate limits

**Environment Variables Not Working**:
- Verify variables are set trong Vercel dashboard
- Check variable names (case-sensitive)
- Redeploy sau khi thêm/sửa variables
- Ensure `NEXT_PUBLIC_*` variables are set correctly

**RPC Rate Limiting**:
- Switch to dedicated RPC provider (Alchemy/Infura/QuickNode)
- Implement retry logic với exponential backoff
- Add request caching
- Monitor RPC usage

**Function Errors**:
- Check Vercel function logs
- Verify all API keys are valid
- Check network requests trong logs
- Test API routes locally trước khi deploy

## 🔄 Continuous Deployment

Vercel tự động deploy khi bạn push code lên Git:

- **Production**: Deploy từ `main`/`master` branch
- **Preview**: Deploy từ các branches khác
- **Pull Requests**: Tự động tạo preview deployments

## 📊 Performance Optimization

1. **Enable Edge Functions** (nếu cần):
   - Update `vercel.json` với edge runtime
   - Chỉ dùng cho routes không cần Node.js APIs

2. **Caching**:
   - Implement caching cho expensive on-chain queries
   - Use Vercel's edge caching
   - Cache API responses khi có thể

3. **Image Optimization**:
   - Next.js tự động optimize images
   - Use `next/image` component

## 🆘 Support

Nếu gặp vấn đề:
1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. Review project logs trong Vercel dashboard
3. Test locally với `npm run build` và `npm run start`
4. Check Next.js deployment guide: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

## 📝 Notes

- Vercel Hobby plan có giới hạn 100GB bandwidth/tháng
- Function timeout: 60s (Hobby), 300s (Pro)
- Build time: ~2-5 phút tùy project size
- Auto-deploy từ Git push
- Preview deployments cho mỗi PR

