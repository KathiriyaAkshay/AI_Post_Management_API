const security = [{ bearerAuth: [] }];
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — customer role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err404 = { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

const campaignResponse = (description) => ({
  description,
  content: { 'application/json': { schema: {
    type: 'object', properties: {
      success: { type: 'boolean', example: true },
      data: { $ref: '#/components/schemas/Campaign' },
    },
  }}},
});

const campaignListResponse = { description: 'Campaign list', content: { 'application/json': { schema: {
  type: 'object', properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } },
    meta: { $ref: '#/components/schemas/PaginationMeta' },
  },
}}}};

const assetResponse = (description) => ({
  description,
  content: { 'application/json': { schema: {
    type: 'object', properties: {
      success: { type: 'boolean', example: true },
      data: { $ref: '#/components/schemas/Asset' },
    },
  }}},
});

export const customerApiPaths = {
  // ─── Profile ──────────────────────────────────────────
  '/api/customer/profile': {
    get: {
      operationId: 'customerGetProfile',
      summary: 'Get my profile',
      tags: ['Customer API'],
      security,
      responses: {
        200: { description: 'Profile', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/Profile' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
    put: {
      operationId: 'customerUpdateProfile',
      summary: 'Update my profile',
      tags: ['Customer API'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            full_name: { type: 'string' },
            username: { type: 'string' },
            business_name: { type: 'string' },
            logo: { type: 'string', format: 'uri' },
            contact_number: { type: 'string' },
            address: { type: 'string' },
          },
        }}},
      },
      responses: {
        200: { description: 'Updated profile', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/Profile' },
          },
        }}}},
        400: { description: 'No valid fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        401: err401, 403: err403,
      },
    },
  },

  // ─── Dashboard ────────────────────────────────────────
  '/api/customer/dashboard': {
    get: {
      operationId: 'customerGetDashboard',
      summary: 'Dashboard stats',
      description: 'Returns total images, customer-owned campaign count, generation history, recent assets, and last-30-days chart data.',
      tags: ['Customer API'],
      security,
      responses: {
        200: { description: 'Stats', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: {
              totalImages: { type: 'integer', description: 'All generated images for this user' },
              totalCampaigns: { type: 'integer', description: 'Campaigns owned by the user (is_prebuilt=false)' },
              yesterdayImages: { type: 'integer' },
              weekImages: { type: 'integer', description: 'Images created in the last 7 days' },
              recentImages: {
                type: 'array',
                description: 'Up to 4 most recent generated images',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    image_url: { type: 'string' },
                    prompt_used: { type: 'string' },
                    product_reference_input_url: { type: 'string', format: 'uri', nullable: true },
                    product_reference_resolved_url: { type: 'string', format: 'uri', nullable: true },
                    brand_logo_url: { type: 'string', format: 'uri', nullable: true },
                    name: { type: 'string', nullable: true },
                    is_liked: { type: 'boolean' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
              chartData: { type: 'array', description: 'Daily image counts for the last 30 days', items: {
                type: 'object', properties: {
                  date: { type: 'string', format: 'date', example: '2026-03-13' },
                  count: { type: 'integer' },
                },
              }},
            }},
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  // ─── Product Types ────────────────────────────────────
  '/api/customer/product-types': {
    get: {
      operationId: 'customerGetProductTypes',
      summary: 'Get my product types',
      description: 'Returns the product types configured for the authenticated customer.',
      tags: ['Customer API'],
      security,
      responses: {
        200: { description: 'Product types', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/ProductType' } },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  // ─── Campaign Options ─────────────────────────────────
  '/api/customer/campaign-options': {
    get: {
      operationId: 'customerGetCampaignOptions',
      summary: 'Get resolved campaign options',
      description: 'Returns visual styles, aspect ratios, moods, and gender focus options for the campaign builder. If `product_type_id` is given, returns product-type-specific overrides and falls back to global defaults per group.',
      tags: ['Customer API'],
      security,
      parameters: [
        {
          in: 'query', name: 'product_type_id',
          schema: { type: 'string', format: 'uuid' },
          description: 'Leave blank to get global defaults',
        },
      ],
      responses: {
        200: { description: 'Resolved options', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ResolvedCampaignOptions' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  // ─── Campaigns ────────────────────────────────────────
  '/api/customer/campaigns': {
    get: {
      operationId: 'customerListCampaigns',
      summary: 'List campaigns',
      description: "Returns the customer's own campaigns and/or platform prebuilt campaigns.",
      tags: ['Customer API'],
      security,
      parameters: [
        {
          in: 'query', name: 'type',
          schema: { type: 'string', enum: ['all', 'mine', 'prebuilt'], default: 'all' },
          description: '"mine" = only own campaigns; "prebuilt" = platform templates; "all" = both',
        },
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        { in: 'query', name: 'search', schema: { type: 'string' } },
      ],
      responses: { 200: campaignListResponse, 401: err401, 403: err403 },
    },
    post: {
      operationId: 'customerCreateCampaign',
      summary: 'Create a campaign',
      description: 'Creates a new campaign owned by the current customer. Custom sections are stored and included in future image generation prompts.',
      tags: ['Customer API'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CampaignInput' } } },
      },
      responses: { 201: campaignResponse('Campaign created'), 401: err401, 403: err403 },
    },
  },

  '/api/customer/campaigns/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'customerGetCampaign',
      summary: 'Get a campaign by ID',
      description: "Returns a customer's own campaign or any prebuilt campaign.",
      tags: ['Customer API'],
      security,
      responses: { 200: campaignResponse('Campaign'), 401: err401, 403: err403, 404: err404 },
    },
    put: {
      operationId: 'customerUpdateCampaign',
      summary: 'Update a campaign',
      description: "Update a campaign owned by the customer. Includes updating custom_sections.",
      tags: ['Customer API'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CampaignInput' } } },
      },
      responses: { 200: campaignResponse('Campaign updated'), 401: err401, 403: err403, 404: err404 },
    },
    delete: {
      operationId: 'customerDeleteCampaign',
      summary: 'Delete a campaign',
      tags: ['Customer API'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },

  '/api/customer/campaigns/{id}/clone': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID of a prebuilt campaign to clone' }],
    post: {
      operationId: 'customerCloneCampaign',
      summary: 'Clone a prebuilt campaign',
      description: "Copies a prebuilt campaign into the customer's workspace (is_prebuilt=false, user_id=customer). Custom sections are also cloned.",
      tags: ['Customer API'],
      security,
      responses: { 201: campaignResponse('Cloned campaign'), 401: err401, 403: err403, 404: err404 },
    },
  },

  // ─── Image Generation ─────────────────────────────────
  '/api/customer/generate': {
    post: {
      operationId: 'customerGenerateImage',
      summary: 'Generate an image',
      description: `Generates an AI image using campaign settings and an optional free-text prompt.

---

### Async + WebSocket (target contract)

**ADR:** \`docs/adr/0001-async-image-generation-websocket.md\` · **Diagrams:** \`docs/image-generation-flow.md\`

1. Client opens an **authenticated Socket.io** connection **before** (or immediately after) calling generate — if the job finishes while nobody is in room \`user:<yourUserId>\`, the push is **not buffered** and you will miss events.
2. \`POST /api/customer/generate\` returns **\`202\`** with \`jobId\` (schema: **GenerationJobAccepted**).
3. Server processes the job; on success it persists **Asset** then emits **\`generation.completed\`** (**WsEventGenerationCompleted**). On failure: **\`generation.failed\`**. Optional: **\`generation.progress\`**.
4. **Poll fallback:** \`GET /api/customer/generation-jobs/:jobId\` returns status and \`asset\` when \`completed\` (Postman-friendly).

OpenAPI 3.0 does not describe WebSocket endpoints; event names and JSON bodies are documented via **components/schemas** \`WsEventGeneration*\`.

---

### Prompt assembly order

**A — Platform preamble (prepended to everything below)**  
Active \`prompt_building_blocks\` with \`block_key = image_gen_platform_system\` and \`category = system\` (global \`product_type_id\` NULL, or scoped override if the campaign has \`product_type_id\`). If missing, nothing is prepended (run migration \`015\` or create the row in Admin → prompt blocks). Joined with a blank line before part B.

**B — User-facing prompt** (same order as \`buildPrompt()\`)

1. Campaign \`description\` (when \`campaignId\` is set) then request \`basePrompt\`, joined with a blank line when both are present; request-only when there is no campaign
2. Prompt parts from the campaign's product type (only when \`campaignId\` is set **and** the campaign has \`product_type_id\`)
3. \`visualStyle\` and \`mood\`
4. Model/gender modifier if enabled
5. Custom sections sorted by \`prompt_weight\` (high → medium → low)
6. Profile \`business_name\` / \`logo\` (when set). **Product reference URL:** optional body \`productReferenceUrl\` always wins when set. For **customer-owned** campaigns, if omitted, the row's \`product_reference_url\` is used. For **platform prebuilt** campaigns, the template's \`product_reference_url\` is **not** reused (one shared row per template)—send \`productReferenceUrl\` per generation so each user can supply their own product shot. Branding / product hints go into the text prompt; \`logo_url\` and \`product_reference_url\` are also sent on the legacy external HTTP gateway when set. OpenAI DALL-E 3 is text-only.

If \`campaignId\` is supplied, campaign settings are used as defaults and any per-field overrides in the request body take precedence.

The persisted **\`prompt_used\`** field is the **full** string (A + B) sent to the image provider. Each **Asset** row also stores **\`product_reference_input_url\`**, **\`product_reference_resolved_url\`**, and **\`brand_logo_url\`** for that generation (see **Asset** schema).

### Current deployment behavior

If **\`REDIS_URL\`** is **not** set, the server responds with **\`201 Created\`** and the full **Asset** in one round-trip (synchronous). With **\`REDIS_URL\`** set (and \`IMAGE_GENERATION_ASYNC\` not \`false\`), it responds **\`202\`** and processes the job via **BullMQ**, notifying the client over **Socket.io** (\`/socket.io\`). **Socket JWT:** \`auth.token\`, or header \`Authorization: Bearer <jwt>\`, or query \`token\` / \`access_token\` (same Supabase access JWT as REST).

### Image backend (providers)

- **Legacy first:** If \`IMAGE_GENERATION_USE_EXTERNAL=true\` and \`IMAGE_GENERATION_API_URL\` are set, requests go to that HTTP gateway (env API key).
- **Otherwise:** \`image_generation_settings.active_provider\` selects **mock**, **OpenAI**, **Google (Imagen)**, **Grok**, or **external_http**. Admin: \`/admin/image-generation/*\`. **OpenAI** uses **edits** (reference images) when \`productReferenceUrl\` / profile-derived \`logoUrl\` are present; other providers still use their text path until extended.
`,
      tags: ['Customer API'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid', nullable: true },
            basePrompt: { type: 'string', example: 'product on white marble surface' },
            visualStyle: { type: 'string', example: 'cinematic', description: 'Overrides campaign setting' },
            aspectRatio: { type: 'string', example: '16:9' },
            mood: { type: 'string', example: 'golden_hour' },
            modelEnabled: { type: 'boolean' },
            genderFocus: { type: 'string', enum: ['male', 'female', 'neutral'] },
            name: {
              type: 'string',
              example: 'Cyberpunk City',
              description: 'Optional display title stored on the asset (asset library card)',
            },
            productReferenceUrl: {
              type: 'string',
              format: 'uri',
              description:
                'Per-request product reference image (HTTPS). Overrides the campaign stored URL when both exist. For prebuilt campaigns, send this each time—the template row URL is not applied so each user can use their own product image.',
            },
          },
        }}},
      },
      responses: {
        201: {
          ...assetResponse('**Synchronous (current).** Generated image saved as asset; full row returned in this response.'),
        },
        202: {
          description:
            '**Async.** Job accepted. Prefer Socket.io **already connected** before this call, or poll `GET /api/customer/generation-jobs/{jobId}` until `status` is `completed` / `failed`.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GenerationJobAccepted' },
            },
          },
        },
        401: err401,
        403: err403,
        500: { description: 'Generation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
  },

  '/api/customer/generation-jobs/{jobId}': {
    get: {
      operationId: 'customerGetGenerationJob',
      summary: 'Get async generation job status',
      description:
        'Returns `pending` | `processing` | `completed` | `failed` for your job. When `completed`, `asset` is the saved **Asset** (same shape as sync `POST /generate` response). Use when Socket.io events were missed.',
      tags: ['Customer API'],
      security,
      parameters: [
        { in: 'path', name: 'jobId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Job status',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/GenerationJobStatus' },
                },
              },
            },
          },
        },
        401: err401,
        403: err403,
        404: err404,
        500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
  },

  // ─── Assets ───────────────────────────────────────────
  '/api/customer/assets': {
    get: {
      operationId: 'customerListAssets',
      summary: 'List generated image assets',
      description:
        'Paginated list. Omits per-row `metadata` JSON in this response (use GET `/api/customer/assets/{id}` for full metadata). Pass `search`, `page`, and `limit` as **query** parameters — not a JSON body.',
      tags: ['Customer API'],
      security,
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1, minimum: 1 }, description: '1-based page' },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by prompt or display name' },
      ],
      responses: {
        200: { description: 'Asset list', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  '/api/customer/assets/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'customerGetAsset',
      summary: 'Get asset by ID',
      tags: ['Customer API'],
      security,
      responses: { 200: assetResponse('Asset details'), 401: err401, 403: err403, 404: err404 },
    },
    patch: {
      operationId: 'customerPatchAsset',
      summary: 'Update asset name and/or like',
      description: 'Set display `name` and/or toggle `isLiked` (heart). Send only fields to change.',
      tags: ['Customer API'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            name: { type: 'string', nullable: true, example: 'Cyberpunk City', description: 'Empty string or null clears the title' },
            isLiked: { type: 'boolean', example: true, description: 'Favorite / heart state' },
          },
        }}},
      },
      responses: {
        200: assetResponse('Updated asset'),
        400: { description: 'No valid fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },
};
