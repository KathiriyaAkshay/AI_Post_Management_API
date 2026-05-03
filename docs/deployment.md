# Deployment

## Local

1. From the repo root: `npm install`
2. Configure `packages/backend/.env` and `packages/frontend/.env` (see `packages/frontend/.env.example` for `VITE_API_URL`).
3. Redis for async image generation (BullMQ + Socket.io): from the repo root run `docker compose up -d redis`, then set `REDIS_URL=redis://localhost:6379` in `packages/backend/.env`. There is no app `Dockerfile` in this repo; `docker-compose.yml` only runs Redis.
4. Start the API: `npm run dev:backend` from the repo root, or `npm run dev` inside `packages/backend`.
5. Start the admin app: `npm run dev:frontend` from the repo root, or `npm run dev` inside `packages/frontend`.

## Production

1. Set the same backend env as local on your host. Before building the frontend, set `VITE_API_URL` to your public API URL.
2. From the repo root: `npm install` then `npm run build`.
3. Run the backend: `cd packages/backend && npm start`.
4. Serve the admin SPA from `packages/frontend/dist` with any static file host or reverse proxy.
5. docker compose run will be same as local but production changes will come if require.

