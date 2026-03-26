# Getnet Checkout Integration (Santander / GeoPagos)

This document describes the Getnet Checkout payment integration in the storefront frontend.

## Overview

The Getnet Checkout integration allows customers to pay using Santander's payment gateway (via GeoPagos). The flow connects the Next.js frontend with the backend Vendure plugin that handles the actual Getnet API communication.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Storefront    │────▶│  Next.js API     │────▶│  Vendure Backend   │
│   (Next.js)     │     │  Routes          │     │  (Getnet Plugin)   │
└─────────────────┘     └──────────────────┘     └────────────────────┘
        │                                                 │
        │                                                 ▼
        │                                        ┌────────────────────┐
        │                                        │  Getnet API        │
        │                                        │  (GeoPagos)        │
        └────────────────────────────────────────▶│  Santander         │
                     Redirect to Checkout        └────────────────────┘
```

## File Structure

```
apps/storefront/src/
├── app/
│   ├── api/payments/getnet/
│   │   ├── route.ts                    # POST: Create checkout
│   │   ├── order/[uuid]/route.ts      # GET: Get order status by UUID
│   │   └── transaction/[id]/route.ts  # GET: Get transaction status
│   ├── checkout/
│   │   ├── success/page.tsx           # Payment success page
│   │   └── failed/page.tsx            # Payment failure page
├── components/payments/
│   └── GetnetCheckoutButton.tsx       # Payment button component
├── lib/
│   └── getnet/
│       ├── index.ts                   # Module exports
│       └── client.ts                  # API client functions
└── types/
    └── getnet.ts                      # TypeScript types
```

## Routes

### Payment Button
- **Location**: [`apps/storefront/src/components/payments/GetnetCheckoutButton.tsx`](apps/storefront/src/components/payments/GetnetCheckoutButton.tsx)
- **Trigger**: Click on "Pagar con Getnet" button in cart page
- **Action**: Creates checkout and redirects to Getnet

### Success Page
- **Route**: `/checkout/success`
- **Purpose**: Shows payment confirmation and order details
- **Retrieves**: Transaction status from backend

### Failed Page
- **Route**: `/checkout/failed`
- **Purpose**: Shows payment failure with reason and retry option
- **Retrieves**: Transaction status from backend

## API Endpoints (Next.js Routes)

### POST `/api/payments/getnet`
Creates a new Getnet checkout session.

**Request Body:**
```typescript
{
  orderCode: string;        // Cart/Order code
  items: Array<{            // Cart items
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;      // In cents
  }>;
  shippingCost?: number;    // In cents
  successUrl?: string;      // Redirect URL on success
  failedUrl?: string;       // Redirect URL on failure
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    transactionId: string;     // Local transaction ID
    orderUuid: string;         // Getnet order UUID
    checkoutUrl: string;       // Redirect to this URL
    vendureOrderCode: string;  // Internal order code
    expiresAt?: string;
  }
}
```

### GET `/api/payments/getnet/transaction/[id]`
Gets transaction status by transaction ID.

### GET `/api/payments/getnet/order/[uuid]`
Gets order status by order UUID (fallback).

## Session Storage

The following data is stored in `sessionStorage` to persist payment context:

| Key | Description |
|-----|-------------|
| `getnet_transaction_id` | Local transaction ID |
| `getnet_order_uuid` | Getnet order UUID |
| `getnet_vendure_order_code` | Vendure order code |
| `getnet_cart_code` | Cart code |

## Transaction States

| Status | Description | UI Color |
|--------|-------------|----------|
| `approved` | Payment approved | Success (Green) |
| `pending` | Payment pending | Warning (Yellow) |
| `processing` | Payment being processed | Warning (Yellow) |
| `rejected` | Payment rejected | Error (Red) |
| `cancelled` | Payment cancelled | Error (Red) |
| `expired` | Payment link expired | Error (Red) |
| `unknown` | Unknown status | Info (Blue) |

## Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_VENDURE_API_URL=http://localhost:4001/shop-api

# Getnet API (defaults to local Next.js API routes)
NEXT_PUBLIC_GETNET_API_URL=/api/payments/getnet

# Site URL for building redirect URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Testing in Local Development

### 1. Start the Backend
```bash
cd apps/backend
pnpm run start:dev
```

Make sure the backend has valid Getnet credentials in `.env`:
```env
GETNET_AUTH_BASE_URL=https://api-santander.preprod.geopagos.com
GETNET_CHECKOUT_BASE_URL=https://api-santander.preprod.geopagos.com
GETNET_CLIENT_ID=your_client_id
GETNET_CLIENT_SECRET=your_client_secret
GETNET_CURRENCY=032
```

### 2. Start the Frontend
```bash
cd apps/storefront
pnpm run dev
```

### 3. Test the Flow
1. Add products to cart
2. Go to `/carrito`
3. Click "Pagar con Getnet"
4. Complete payment on Getnet sandbox
5. Verify redirect to `/checkout/success` or `/checkout/failed`

### 4. Check Transaction Status
- Backend logs show webhook events
- Database stores transaction records
- Frontend shows transaction details

## Webhook Configuration

The backend handles webhooks from Getnet. Ensure the webhook URL is configured:

```
GETNET_WEBHOOK_URL=https://your-domain.com/payments/getnet/webhook
```

For local development with ngrok:
```
GETNET_WEBHOOK_URL=https://abc123.ngrok.io/payments/getnet/webhook
```

## Error Handling

### Frontend Errors
- Network errors during checkout creation
- Missing checkout URL response
- Failed to retrieve transaction status
- No transaction data in session storage

### Backend Errors
- Invalid Getnet credentials
- Network timeout to Getnet API
- Invalid order data
- Webhook signature validation failure

## Security Notes

- **No secrets in frontend**: Getnet credentials are only in backend
- **Session storage only**: No sensitive data stored in localStorage
- **Server-side validation**: Backend validates all requests
- **Webhook verification**: Backend validates webhook signatures

## Dependencies

The frontend uses:
- `@mui/material` - UI components
- `next` - Framework
- TypeScript - Type safety

The backend (referenced by this frontend) uses:
- `@vendure/core` - E-commerce framework
- Custom Getnet plugin in `apps/backend/src/plugins/payments/getnet/`
