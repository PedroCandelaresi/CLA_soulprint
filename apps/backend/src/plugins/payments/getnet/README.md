# Getnet Checkout Integration (Santander / GeoPagos)

This plugin integrates Getnet Checkout (Santander) payment gateway with Vendure for handling online payments in Argentina.

## Features

- OAuth authentication with Getnet API
- Checkout session creation
- Webhook handling for payment status updates
- Idempotent webhook processing
- MySQL persistence for payment transactions
- Vendure order/payment integration
- Development and production environment support

## IMPORTANT: API URLs Configuration

The Getnet API URLs may vary depending on your region and environment. **You must verify these URLs with your Getnet/Santander documentation or support team.**

### Expected API Endpoints

The plugin expects the following endpoint paths:

| Service | Endpoint Path |
|---------|--------------|
| OAuth Token | `/oauth/token` |
| Create Order | `/api/v2/orders` |
| Get Order | `/api/v2/orders/{uuid}` |

### Common URL Formats

**Preprod (Sandbox):**
```
GETNET_AUTH_BASE_URL=https://auth.preprod.geopagos.com
GETNET_CHECKOUT_BASE_URL=https://api-santander.preprod.geopagos.com
```

**Production:**
```
GETNET_AUTH_BASE_URL=https://auth.getnet.com.br (or similar)
GETNET_CHECKOUT_BASE_URL=https://api.getnet.com.br (or similar)
```

### Verifying URLs

Before testing, verify your URLs by checking:

1. **OAuth endpoint** - Should return 400 or 401 (expected for invalid credentials):
   ```bash
   curl -X POST "https://auth.preprod.geopagos.com/oauth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=test&client_secret=test&scope=*"
   ```

2. **Checkout API** - Should return 401 or 404:
   ```bash
   curl -X GET "https://api-santander.preprod.geopagos.com/api/v2/orders"
   ```

If you get a **404** on the OAuth endpoint, the URL path is incorrect. Contact Getnet support for the correct API URLs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Flow                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User                      Frontend               Backend              │
│    │                            │                     │                 │
│    │  1. Click "Pagar"          │                     │                 │
│    │───────────────────────────► │                     │                 │
│    │                            │  2. POST /checkout  │                 │
│    │                            │───────────────────► │                 │
│    │                            │                     │  3. Create Order │
│    │                            │                     │     (Getnet API) │
│    │                            │                     │                 │
│    │  4. checkoutUrl            │                     │                 │
│    │◄────────────────────────── │                     │                 │
│    │                            │                     │                 │
│    │  5. Redirect to Getnet     │                     │                 │
│    │───────────────────────────►│                     │                 │
│    │                            │                     │                 │
│    │  (User Pays on Getnet)     │                     │                 │
│    │                            │                     │                 │
│    │  6. Success/Failed URL     │                     │                 │
│    │◄────────────────────────── │                     │                 │
│    │                            │                     │                 │
│    │                            │                     │  7. Webhook      │
│    │                            │                     │◄────────────────│
│    │                            │                     │                 │
│    │                            │                     │  8. Update Order │
│    │                            │                     │     + Payment    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Environment Variables

> **Note:** All environment variables are defined in `apps/backend/.env.example` and shared between backend and frontend. The frontend reads `GETNET_INTERNAL_API_URL` from the same .env file.

### Required

```env
# Enable Getnet integration
GETNET_ENABLED=true

# Standalone server port
GETNET_PORT=4003

# Internal API URL (used by frontend to communicate with standalone server)
GETNET_INTERNAL_API_URL=http://localhost:4003/payments/getnet

# API Credentials (from Getnet/Santander developer portal)
GETNET_CLIENT_ID=your_client_id
GETNET_CLIENT_SECRET=your_client_secret

# API Base URLs (development)
GETNET_AUTH_BASE_URL=https://auth.preprod.geopagos.com
GETNET_CHECKOUT_BASE_URL=https://api-santander.preprod.geopagos.com
```

### Optional

```env
# Currency (default: 032 for ARS)
GETNET_CURRENCY=032

# Checkout expiration (default: 10 minutes)
GETNET_EXPIRE_LIMIT_MINUTES=10

# Redirect URLs
GETNET_SUCCESS_URL=http://localhost:3000/checkout/success
GETNET_FAILED_URL=http://localhost:3000/checkout/failed

# Webhook URL (for production)
GETNET_WEBHOOK_URL=https://yourdomain.com/payments/getnet/webhook

# Request timeout (default: 30000ms)
GETNET_REQUEST_TIMEOUT=30000

# OAuth scope (default: *)
GETNET_SCOPE=*
```

## API Endpoints

### Create Checkout

```http
POST /payments/getnet/checkout
Content-Type: application/json

{
  "orderCode": "ORD-00001",
  "items": [
    {
      "id": "product-1",
      "name": "Producto de prueba",
      "quantity": 2,
      "unitPrice": 1500
    }
  ],
  "shippingCost": 500,
  "successUrl": "http://localhost:3000/checkout/success",
  "failedUrl": "http://localhost:3000/checkout/failed"
}
```

**Response:**

```json
{
  "transactionId": "local-uuid",
  "orderUuid": "getnet-order-uuid",
  "checkoutUrl": "https://checkout.getnet.com/...",
  "vendureOrderCode": "ORD-00001",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

### Get Order Status

```http
GET /payments/getnet/order/{uuid}
```

### Get Transaction

```http
GET /payments/getnet/transaction/{id}
```

### Webhook Handler

```http
POST /payments/getnet/webhook
Content-Type: application/json

{
  "event": "order.updated",
  "orderUuid": "getnet-order-uuid",
  "status": "approved",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Health Check

```http
GET /payments/getnet/health
```

## Database

### Table: `getnet_payment_transaction`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Local UUID primary key |
| vendureOrderCode | VARCHAR(255) | Vendure order code (e.g., ORD-00001) |
| providerOrderUuid | VARCHAR(255) | Getnet order UUID (unique) |
| checkoutUrl | TEXT | Checkout redirect URL |
| status | VARCHAR(50) | Transaction status |
| amount | INT | Amount in cents |
| currency | VARCHAR(10) | Currency code (032 for ARS) |
| lastEvent | VARCHAR(100) | Last webhook event |
| lastEventAt | DATETIME | Last webhook timestamp |
| expiresAt | DATETIME | Checkout expiration |
| approvedAt | DATETIME | Payment approval timestamp |
| webhookEventCount | INT | Number of webhooks received |
| isTerminal | BOOLEAN | Terminal state reached |
| metadata | TEXT | Additional JSON data |
| createdAt | DATETIME | Record creation |
| updatedAt | DATETIME | Last update |

### Migration

The migration is located at:
```
apps/backend/src/migrations/history/1705000000000-CreateGetnetPaymentTransaction.ts
```

To run migrations:
```bash
cd apps/backend
pnpm run migration:run
```

## Vendure Integration

The plugin integrates with Vendure's order/payment system:

1. **Order Lookup**: When a webhook is received, the plugin looks up the Vendure order by `vendureOrderCode`
2. **Payment Creation**: Creates a payment record in Vendure with the Getnet transaction ID
3. **Order State Transition**: Transitions the order to `PaymentSettled` (on success) or `Cancelled` (on failure)

### Payment Handler

The `getnetPaymentHandler` is registered in `vendure-config.ts` and available in the admin panel for payment method configuration.

## Deployment Options

### Option 1: Standalone Server (Recommended)

The Getnet routes can run as a separate HTTP server, which is the recommended approach when using nginx as a reverse proxy.

```bash
# Development
cd apps/backend
pnpm run dev:getnet

# Production
pnpm run start:getnet
```

This starts a separate server on port 4003 (configurable via `GETNET_PORT`).

**nginx configuration:**
```nginx
location /payments/getnet/ {
    proxy_pass http://127.0.0.1:4003/payments/getnet/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Option 2: Integrated with Vendure (Alternative)

The Getnet plugin can be integrated into the Vendure bootstrap. See the Troubleshooting section for details on why this may not work in all environments.

## Testing

For testing webhooks locally, you need a public URL. Options:

1. **ngrok** (recommended):
```bash
ngrok http 3001
# Use the ngrok URL as GETNET_WEBHOOK_URL
```

2. **localtunnel**:
```bash
npx localtunnel --port 3001
```

### Test the Flow

1. Start the backend:
```bash
cd apps/backend
pnpm run start:dev
```

2. Start ngrok:
```bash
ngrok http 3001
```

3. Set environment variables:
```env
GETNET_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/payments/getnet/webhook
```

4. Create a checkout:
```bash
curl -X POST http://localhost:3001/payments/getnet/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "ORD-00001",
    "items": [{"id": "1", "name": "Test", "quantity": 1, "unitPrice": 1000}]
  }'
```

5. Redirect to the `checkoutUrl`, complete payment, and check:
```bash
curl http://localhost:3001/payments/getnet/order/{uuid}
```

## Production Checklist

- [ ] Set real `GETNET_CLIENT_ID` and `GETNET_CLIENT_SECRET`
- [ ] Configure `GETNET_WEBHOOK_URL` with your production domain
- [ ] Update `GETNET_SUCCESS_URL` and `GETNET_FAILED_URL`
- [ ] Run database migration
- [ ] Set `DB_SYNCHRONIZE=false` (use migrations instead)
- [ ] Enable HTTPS (required for cookies in production)
- [ ] Configure proper CORS origins
- [ ] Remove `dummyPaymentHandler` from payment options

## Troubleshooting

### "Cannot POST /payments/getnet/checkout" (404)

If you're getting 404 errors on the Getnet endpoints, the Express middleware might not be registered. Check the bootstrap logs for:

```
[getnet] Searching for Express app...
[getnet] SUCCESS: Routes registered at /payments/getnet/*
```

If you see "Could not find Express app to register middleware", try:

1. Ensure `GETNET_ENABLED=true` is set (or `APP_ENV=local` for dev mode)
2. Restart the backend completely
3. Check that the app is using a supported Vendure version (2.x)
4. Verify the bootstrap logs show the plugin initialization

If the middleware still won't register, you can verify by checking the app structure:
```bash
curl -v http://localhost:3001/payments/getnet/health
```

### "Entity not found in DataSource"

The table should be created automatically in development mode with `DB_SYNCHRONIZE=true`. For production, run the migration:

```bash
pnpm run migration:run
```

### "Vendure services not available"

Make sure `GETNET_ENABLED=true` is set and the plugin initializes correctly. Check the bootstrap logs for:
```
[getnet] Plugin initialized successfully
[getnet] Vendure services registered
```

### Webhook not being received

1. Verify the webhook URL is publicly accessible
2. Check that your server is reachable from the internet
3. Ensure the webhook endpoint is not blocked by firewall
4. Check server logs for incoming webhook requests

## Security Considerations

- Never expose `GETNET_CLIENT_SECRET` to the frontend
- Always use HTTPS in production
- Validate webhook payloads before processing
- Use idempotency checks to prevent duplicate processing
- Log security-relevant events but never log sensitive data

## Files Structure

```
apps/backend/src/plugins/payments/getnet/
├── index.ts                      # Plugin entry point
├── getnet.service.ts             # Main service (OAuth, orders, webhooks)
├── getnet.controller.ts          # REST API handlers
├── getnet.types.ts               # TypeScript interfaces
├── getnet-transaction.entity.ts  # TypeORM entity
├── getnet-transaction.repository.ts  # Database operations
├── getnet-payment.handler.ts      # Vendure PaymentMethodHandler
└── README.md                     # This file
```

## License

Internal use - CLA Soulprint
