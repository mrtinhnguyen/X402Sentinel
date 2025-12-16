# X402 Third-Party Integration Guide

## Overview

Các API endpoints `/api/token-analysis` và `/api/slippage-sentinel` được thiết kế để **luôn trả về HTTP 402 Payment Required** ngay cả khi không có parameters, cho phép third-party services như [x402scan.com](https://x402scan.com) có thể discover và configure payment requirements.

## API Endpoints

### 1. `/api/token-analysis`

**Method**: `GET`

**Query Parameters** (Optional for payment discovery):
- `tokenAddress` (string): Token address to analyze

**Headers**:
- `X-PAYMENT` (string, optional): Base64-encoded payment payload

**Behavior**:
- ✅ **Luôn check payment TRƯỚC khi validate parameters**
- ✅ Trả về **402 Payment Required** nếu không có `X-PAYMENT` header (cho phép third-party discover payment requirements)
- ✅ Validate `tokenAddress` chỉ SAU KHI payment được verify
- ✅ Trả về **400 Bad Request** nếu thiếu `tokenAddress` SAU KHI payment verified

**Example Request (No Parameters - Payment Discovery)**:
```bash
GET /api/token-analysis
```

**Response (402 Payment Required)**:
```json
{
  "error": "Payment required",
  "payment": {
    "amount": "50000",
    "asset": {
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    "network": "base",
    "payTo": "0x..."
  }
}
```

**Example Request (With Payment)**:
```bash
GET /api/token-analysis?tokenAddress=0x9768C0dc9370C0F001E5D6cd65A59f165515a619
Headers:
  X-PAYMENT: <base64-encoded-payment-payload>
```

**Response (200 OK)**:
```json
{
  "success": true,
  "tokenAddress": "0x9768C0dc9370C0F001E5D6cd65A59f165515a619",
  "tokenData": { ... },
  "analysis": { ... }
}
```

### 2. `/api/slippage-sentinel`

**Method**: `GET`

**Query Parameters** (Optional for payment discovery):
- `token_in` (string): Input token address
- `token_out` (string): Output token address
- `amount_in` (string): Input amount
- `route_hint` (string, optional): Route hint (default: "base")

**Headers**:
- `X-PAYMENT` (string, optional): Base64-encoded payment payload

**Behavior**:
- ✅ **Luôn check payment TRƯỚC khi validate parameters**
- ✅ Trả về **402 Payment Required** nếu không có `X-PAYMENT` header
- ✅ Validate parameters chỉ SAU KHI payment được verify
- ✅ Trả về **400 Bad Request** nếu thiếu required parameters SAU KHI payment verified

**Example Request (No Parameters - Payment Discovery)**:
```bash
GET /api/slippage-sentinel
```

**Response (402 Payment Required)**:
```json
{
  "error": "Payment required",
  "payment": {
    "amount": "50000",
    "asset": {
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    "network": "base",
    "payTo": "0x..."
  }
}
```

**Example Request (With Payment)**:
```bash
GET /api/slippage-sentinel?token_in=0x...&token_out=0x...&amount_in=1000
Headers:
  X-PAYMENT: <base64-encoded-payment-payload>
```

## Integration với x402scan.com

### Step 1: Discover Payment Requirements

Third-party service có thể gọi API **không có parameters** để discover payment requirements:

```bash
# Discover payment for token-analysis
curl https://your-domain.com/api/token-analysis

# Response: 402 Payment Required với payment details
```

### Step 2: Configure Payment

Third-party service sử dụng payment details từ 402 response để configure payment flow:

```json
{
  "payment": {
    "amount": "50000",  // USDC với 6 decimals = $0.05
    "asset": {
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // USDC on Base
    },
    "network": "base",
    "payTo": "0x..."  // Merchant wallet address
  }
}
```

### Step 3: User Payment Flow

1. User initiates request through third-party service
2. Third-party service requests payment from user
3. User approves payment
4. Third-party service includes `X-PAYMENT` header in API request
5. API verifies payment and processes request

## Payment Flow

```
┌─────────────┐
│ Third-Party │
│   Service   │
└──────┬──────┘
       │
       │ 1. GET /api/token-analysis (no params)
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│   API       │                      │   API       │
│  (402)      │                      │  (402)      │
└──────┬──────┘                      └──────┬──────┘
       │                                     │
       │ 2. Return payment requirements     │
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│ Third-Party │                      │   User       │
│   Service   │                      │  Wallet     │
└──────┬──────┘                      └──────┬──────┘
       │                                     │
       │ 3. Request payment                  │
       ├─────────────────────────────────────┤
       │                                     │
       │ 4. User approves                    │
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│ Third-Party │                      │   User      │
│   Service   │                      │  Wallet    │
└──────┬──────┘                      └──────┬──────┘
       │                                     │
       │ 5. GET /api/token-analysis          │
       │    + X-PAYMENT header               │
       │    + tokenAddress param             │
       ├─────────────────────────────────────┤
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│   API       │                      │   API       │
│  (200)      │                      │  (200)      │
└─────────────┘                      └─────────────┘
```

## Free Access Mode

Nếu payment price được set = "0" trong environment variables:
- API sẽ **skip payment verification**
- Trả về **200 OK** ngay cả khi không có `X-PAYMENT` header
- Parameters vẫn được validate như bình thường

## Response Status Codes

- **200 OK**: Payment verified (or free) và request processed successfully
- **400 Bad Request**: Missing or invalid parameters (sau khi payment verified)
- **402 Payment Required**: Payment required but not provided
- **500 Internal Server Error**: Server error during processing

## Best Practices

1. **Always check payment first**: Third-party services nên gọi API không có parameters trước để discover payment requirements
2. **Cache payment details**: Sau khi discover, cache payment details để tránh multiple discovery calls
3. **Handle 402 gracefully**: 402 response không phải là error, mà là payment requirement
4. **Support free mode**: Check nếu payment amount = 0, skip payment flow

## Example Integration Code

```typescript
async function callTokenAnalysis(tokenAddress: string) {
  // Step 1: Discover payment requirements (if not cached)
  const discoveryResponse = await fetch('/api/token-analysis');
  
  if (discoveryResponse.status === 402) {
    const paymentDetails = await discoveryResponse.json();
    
    // Step 2: Request payment from user
    const paymentPayload = await requestPaymentFromUser(paymentDetails.payment);
    
    // Step 3: Call API with payment
    const response = await fetch(
      `/api/token-analysis?tokenAddress=${tokenAddress}`,
      {
        headers: {
          'X-PAYMENT': paymentPayload
        }
      }
    );
    
    return await response.json();
  }
  
  // Free mode or already paid
  return await discoveryResponse.json();
}
```

## Notes

- Payment verification được thực hiện **TRƯỚC** parameter validation
- Parameters là **optional** cho payment discovery, nhưng **required** cho actual processing
- Third-party services có thể cache payment requirements để optimize performance
- Payment amount có thể được configure qua environment variables (`NEXT_PUBLIC_X402_TOKEN_ANALYSIS_PRICE`, `NEXT_PUBLIC_X402_SLIPPAGE_SENTINEL_PRICE`)

