import { schemas } from './swagger/schemas.js';
import { authPaths } from './swagger/auth.paths.js';
import { customersPaths } from './swagger/customers.paths.js';
import { promptsPaths } from './swagger/prompts.paths.js';
import { campaignsAdminPaths } from './swagger/campaigns.admin.paths.js';
import { campaignOptionsPaths } from './swagger/campaign-options.paths.js';
import { customerApiPaths } from './swagger/customer.api.paths.js';
import { storagePaths } from './swagger/storage.paths.js';
import { promptBlocksAdminPaths } from './swagger/prompt-blocks.admin.paths.js';
import { imageGenerationAdminPaths } from './swagger/image-generation.admin.paths.js';

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
    deepLinking: true,
    displayRequestDuration: true,
  },
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus Hub API',
    description: `
## Overview

**Admin — image AI providers:** HTTP routes under \`/admin/image-generation/*\` are documented under the Swagger tag **Image Generation (Admin)** (expand that section in the sidebar). Requires admin JWT.

The Nexus Hub backend exposes two sets of APIs:

| Prefix | Audience | Auth |
|---|---|---|
| \`/auth\` | All | None / Bearer |
| \`/customers\`, \`/prompts\`, \`/admin/*\` (incl. \`/admin/prompt-blocks\`, \`/admin/image-generation\`) | Admin only | Bearer (admin) |
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

## Image generation — async and WebSockets

**Target contract:** \`POST /api/customer/generate\` returns **\`202 Accepted\`** with a \`jobId\`; the client receives the finished asset over an **authenticated WebSocket** (\`generation.completed\` / \`generation.failed\`, optional \`generation.progress\`). See **Customer API → Generate an image** for request/response and payload schemas.

**Decision record:** repository file \`docs/adr/0001-async-image-generation-websocket.md\`. **UX and sequence diagrams:** \`docs/image-generation-flow.md\`.

**Runtime:** If **\`REDIS_URL\`** is set, the server uses **BullMQ + Socket.io** (see \`POST /api/customer/generate\`) and returns **\`202\`**. Without \`REDIS_URL\`, responses stay **\`201\`** (synchronous), which is convenient for local development without Redis.

## Image generation — platform system prompt

Every customer generation prepends a **platform preamble** to the user-facing prompt before calling the image provider. **Source of truth:** active global \`prompt_building_blocks\` row with \`block_key = image_gen_platform_system\` and \`category = system\` (migration \`015_seed_platform_image_system_block.sql\` seeds a default). **Optional override:** same \`block_key\` with a non-null \`product_type_id\` when campaigns carry a product type. If no matching active row exists, no preamble is prepended (configure via Admin → **Prompt blocks**). Stored \`prompt_used\` on the asset is the **full** string sent to the model (preamble + user prompt).

## Image providers (admin + runtime)

- **Active provider** is read from \`image_generation_settings\` (\`GET/PUT /admin/image-generation/settings\`). Default after migration \`016\` is **\`mock\`**.
- **Encrypted keys:** \`PUT /admin/image-generation/credentials/:provider\` with \`api_key\`; stored using **AES-256-GCM** with per-row **IV** and **auth tag**. Master key: env **\`PROVIDER_KEYS_MASTER_KEY\`** (32-byte base64 or 64 hex chars).
- **OpenAI:** \`/v1/images/generations\` for text-only; when \`productReferenceUrl\` and/or \`logoUrl\` are set, \`/v1/images/edits\` with a GPT Image model (\`OPENAI_IMAGE_EDIT_MODEL\` or \`gpt-image-1\` if the configured generations model is not \`gpt-image*\`). See \`openaiAdapter.js\` and \`generationContext.js\`.
- **Google / Grok:** adapters are placeholders until implemented.
- **Legacy HTTP gateway:** if \`IMAGE_GENERATION_USE_EXTERNAL=true\` and \`IMAGE_GENERATION_API_URL\` are set, that path **overrides** DB routing (same as before migration \`016\`).
    `,
    version: '2.1.0',
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
    { name: 'Prompt blocks (Admin)', description: 'Reusable DB-backed prompt fragments — admin only. Global `image_gen_platform_system` (category `system`) prepends to every customer image prompt; see API overview.' },
    { name: 'Image Generation (Admin)', description: 'Active image provider + encrypted API keys (`/admin/image-generation/*`). See API overview for PROVIDER_KEYS_MASTER_KEY and legacy env external gateway.' },
    {
      name: 'Customer API',
      description: `Customer JWT APIs — profile, dashboard, campaigns, campaign options, assets, storage.

**Image generation:** \`POST /api/customer/generate\` — see operation notes for **synchronous (201)** vs **async + WebSocket (202 + jobId)**, platform system preamble (\`image_gen_platform_system\`), and prompt assembly. WebSocket payload shapes: **components/schemas** (\`WsEventGeneration*\`).`,
    },
    { name: 'Storage', description: 'Signed upload / download URLs for Supabase Storage — any authenticated user' },
    { name: 'Health', description: 'Server health check' },
  ],
  paths: {
    ...authPaths,
    ...customersPaths,
    ...promptsPaths,
    ...campaignsAdminPaths,
    ...campaignOptionsPaths,
    ...promptBlocksAdminPaths,
    ...imageGenerationAdminPaths,
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
