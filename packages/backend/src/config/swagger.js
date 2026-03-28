import { schemas } from './swagger/schemas.js';
import { authPaths } from './swagger/auth.paths.js';
import { customersPaths } from './swagger/customers.paths.js';
import { promptsPaths } from './swagger/prompts.paths.js';
import { campaignsAdminPaths } from './swagger/campaigns.admin.paths.js';
import { campaignOptionsPaths } from './swagger/campaign-options.paths.js';
import { customerApiPaths } from './swagger/customer.api.paths.js';
import { storagePaths } from './swagger/storage.paths.js';

/** @type {import('swagger-ui-express').SwaggerUiOptions} */
export const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { font-size: 2rem; }
  `,
  customSiteTitle: 'Nexus Hub API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus Hub API',
    description: `
## Overview

The Nexus Hub backend exposes two sets of APIs:

| Prefix | Audience | Auth |
|---|---|---|
| \`/auth\` | All | None / Bearer |
| \`/customers\`, \`/prompts\`, \`/admin/*\` | Admin only | Bearer (admin) |
| \`/api/customer/*\` | Customers | Bearer (customer) |
| \`/storage\` | Both | Bearer |

## Authentication

All protected routes expect a **Supabase JWT** in the \`Authorization\` header:

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

Obtain the token from \`POST /auth/login\`.

## Campaign Options — Fallback Logic

Options for the campaign builder (visual styles, aspect ratios, moods, gender focus) are configured per product type.

- If a product type has **specific options** for a group → use those.
- Otherwise → fall back to **global defaults** (product_type_id IS NULL).

This means a Jewelry customer sees Elegant/Minimalist moods, while a Sports customer sees Energetic/Vibrant moods.

## Custom Sections

Users can add **custom prompt sections** to any campaign. Each section has a \`title\`, \`description\` (injected into the AI prompt), and a \`prompt_weight\` (high / medium / low). Sections are sorted by weight before being appended to the final prompt.
    `,
    version: '2.0.0',
    contact: {
      name: 'Nexus Hub Team',
    },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication — login, password reset, admin signup' },
    { name: 'Customers (Admin)', description: 'Customer account management — admin only' },
    { name: 'Prompts (Admin)', description: 'Product types and prompt part configuration — admin only' },
    { name: 'Campaigns (Admin)', description: 'Prebuilt campaign CRUD — admin only' },
    { name: 'Campaign Options (Admin)', description: 'Visual style, aspect ratio, mood & gender focus option configuration — admin only' },
    { name: 'Customer API', description: 'All customer-facing endpoints — profile, campaigns, generation, assets' },
    { name: 'Storage', description: 'Signed upload / download URLs for Supabase Storage — any authenticated user' },
    { name: 'Health', description: 'Server health check' },
  ],
  paths: {
    ...authPaths,
    ...customersPaths,
    ...promptsPaths,
    ...campaignsAdminPaths,
    ...campaignOptionsPaths,
    ...customerApiPaths,
    ...storagePaths,
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          200: { description: 'Server is healthy', content: { 'application/json': { schema: {
            type: 'object', properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
            },
          }}}},
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase JWT — obtain from `POST /auth/login`',
      },
    },
    schemas,
  },
};
