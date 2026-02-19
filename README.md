# AI Post Management Platform

Monorepo for AI Image Generation platform: **backend API** and **Admin Panel** (React).

> **Note:** The **user/customer panel** is in a **separate repository**. This repo contains only the shared backend and the admin-facing frontend.

## Structure

```
.
├── packages/
│   ├── backend/          # Express.js API (shared by admin + user apps)
│   └── frontend/         # Admin Panel only (React + Redux + TanStack + Ant Design)
├── package.json          # Root workspace config
└── README.md
```

## Tech Stack

### Backend
- Node.js + Express.js
- Supabase (PostgreSQL, Auth)
- Stripe
- Nodemailer
- Swagger/OpenAPI

### Frontend (Admin Panel only)
- React 19
- Redux Toolkit
- TanStack Query (React Query)
- Ant Design
- SCSS
- React Router
- Vite

## Quick Start

### Install Dependencies

```bash
npm install
```

This installs dependencies for all packages (backend + frontend).

### Backend Setup

1. Navigate to backend:
```bash
cd packages/backend
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp ../../.env.example .env
```

3. Run migrations:
```bash
supabase db push
```

4. Start backend:
```bash
npm run dev
# Or from root: npm run dev:backend
```

Backend runs on **http://localhost:3000**

### Admin Panel (Frontend) Setup

1. Navigate to admin panel:
```bash
cd packages/frontend
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Start admin panel:
```bash
npm run dev
# Or from root: npm run dev:frontend
```

Admin panel runs on **http://localhost:5173**

## Development Scripts

From root directory:

```bash
# Run both backend and frontend
npm run dev

# Run individually
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only

# Build frontend
npm run build:frontend
```

## API Documentation

When backend is running, visit **http://localhost:3000/api-docs** for Swagger documentation.

## Features

### Backend
- ✅ Admin signup/login
- ✅ Customer creation (admin only)
- ✅ Password reset flow
- ✅ Stripe integration
- ✅ Email notifications
- ✅ JWT authentication
- ✅ Role-based access control

### Admin Panel (Frontend)
- ✅ Admin login/signup
- ✅ Protected routes (admin only)
- ✅ Redux state management
- ✅ TanStack Query for data fetching
- ✅ Ant Design UI components
- ✅ SCSS styling
- ✅ Responsive design

**User/customer panel** is maintained in a **separate repository** and consumes the same backend API.

## Environment Variables

### Backend (.env in packages/backend/)
See `packages/backend/.env.example`

### Admin Panel (.env in packages/frontend/)
```
VITE_API_URL=http://localhost:3000
```

## Repositories

| Repo | Purpose |
|------|---------|
| **This monorepo** | Backend API + Admin Panel |
| **User panel** | Separate repo — customer-facing app (login, dashboard, etc.) |

## Project Structure

### Backend
```
packages/backend/
├── src/
│   ├── config/       # Supabase, Stripe, Email configs
│   ├── controllers/  # Route handlers
│   ├── middleware/   # Auth, role checks
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── validators/   # Request validation
│   ├── app.js        # Express app
│   └── index.js      # Entry point
└── supabase/
    └── migrations/   # Database migrations
```

### Admin Panel (packages/frontend/)
```
packages/frontend/
├── src/
│   ├── components/   # Reusable components
│   ├── hooks/        # Custom hooks (useAuth, etc.)
│   ├── pages/        # Admin pages (Login, Signup, Dashboard)
│   ├── services/     # API services
│   ├── store/        # Redux store & slices
│   ├── styles/       # Global SCSS
│   ├── lib/          # Utilities (API client)
│   └── App.jsx       # Root component
└── vite.config.js    # Vite configuration
```

## License

MIT
