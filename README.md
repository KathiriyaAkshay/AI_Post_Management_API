# AI Post Management API

AI Image Generation platform onboarding API — Admin auth and customer creation.

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials:
   - **Supabase**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
   - **Stripe**: `STRIPE_SECRET_KEY` (get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys))
   - **Email (SMTP)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
2. Run migrations: `supabase db push`
3. Install dependencies: `npm install`
4. Start the server: `npm run dev`

## Swagger / API Docs

Open **http://localhost:3000/api-docs** when the server is running to view and test the API.

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | None |
| POST | `/auth/login` | Login with email or username | None |
| POST | `/auth/forgot-password` | Request password reset email | None |
| POST | `/auth/reset-password` | Reset password with token | None |
| POST | `/auth/update-password` | Update password (authenticated) | User |
| POST | `/auth/admin/signup` | Admin signup (creates user + profile with admin role) | None |
| POST | `/admin/create-customer` | Create customer (creates user, Stripe customer, sends email) | Admin |

## Request/Response Format

All responses follow: `{ success: boolean, data?: object, error?: string }`

## Example: Login

```bash
# Login with email
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "secret123"
  }'

# Login with username (for customers)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "business_user",
    "password": "securepass123"
  }'
```

## Example: Forgot Password

```bash
# Request password reset
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

## Example: Reset Password

```bash
# Reset password with token from email
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "token_from_reset_email",
    "password": "newsecurepass123"
  }'
```

## Example: Update Password (Authenticated)

```bash
# Update password while logged in
curl -X POST http://localhost:3000/auth/update-password \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newsecurepass123"
  }'
```

## Example: Create Customer (Admin)

```bash
curl -X POST http://localhost:3000/admin/create-customer \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@business.com",
    "password": "securepass123",
    "username": "business_user",
    "business_name": "Acme Corp",
    "logo": "https://example.com/logo.png",
    "contact_number": "+1-555-123-4567",
    "address": "123 Main St, City, State 12345"
  }'
```

## Database Schema

- **profiles**: 
  - `id`, `email`, `full_name`, `role` (admin/customer), `created_at`
  - `username`, `business_name`, `logo`, `contact_number`, `address`
  - `stripe_customer_id` (linked to Stripe customer)

## Features

- ✅ Admin signup with role assignment
- ✅ Admin creates customers with business details
- ✅ Automatic Stripe customer creation
- ✅ Email credentials sent via Nodemailer
- ✅ Username validation (alphanumeric + underscores)
- ✅ Protected admin endpoints with JWT + role check
