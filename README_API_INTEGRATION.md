# API Integration Summary

## Tổng Quan

X402Sentinel hỗ trợ tích hợp các external APIs để cung cấp advanced on-chain metrics chính xác hơn.

## APIs Được Hỗ Trợ

| API | Metrics | Required | Cost |
|-----|---------|----------|------|
| **Glassnode** | MVRV, NUPL, Realized Cap, HODL Waves | Optional | Free tier available |
| **CryptoQuant** | Exchange Inflows/Outflows | Optional | Paid plans |
| **Dune Analytics** | Custom Base chain queries | Optional | Free tier available |
| **Nansen** | Whale Activity, Smart Money | Optional | Paid plans |
| **DeFiLlama** | TVL data | Optional | Free (public API) |

## Quick Setup

1. **Thêm API keys vào `.env.local`**:
```env
GLASSNODE_API_KEY=your_key
CRYPTOQUANT_API_KEY=your_key
DUNE_API_KEY=your_key
DUNE_QUERY_ID=123456
NANSEN_API_KEY=your_key
```

2. **Hệ thống tự động sử dụng APIs** khi có keys
3. **Fallback tự động** về on-chain calculation nếu API fail

## Files Quan Trọng

- `docs/api-integration-guide.md` - Hướng dẫn chi tiết từng API
- `docs/QUICK_START_API.md` - Quick start guide
- `lib/services/` - API service files
- `lib/utils/api-integration.ts` - Helper functions với fallbacks
- `lib/utils/token-mapping.ts` - Token address → symbol mapping

## Testing

```bash
# Test APIs (sau khi thêm keys)
npm run test:apis  # Nếu có script
# Hoặc tạo file test-apis.ts và chạy
```

## Support

- Xem `docs/api-integration-guide.md` cho troubleshooting
- Kiểm tra API status trong logs: `External API Status: {...}`
- Tất cả APIs đều optional - hệ thống vẫn chạy tốt không có keys

