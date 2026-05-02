const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

function collectOrigins() {
  const envCorsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    ...defaultCorsOrigins,
    ...envCorsOrigins,
    process.env.FRONTEND_URL,
    process.env.CUSTOMER_APP_URL,
  ].filter(Boolean);
}

/** @type {string[]} */
export const corsAllowedOrigins = collectOrigins();

export function isOriginAllowed(origin) {
  if (!origin) return true;
  return corsAllowedOrigins.includes(origin);
}

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
