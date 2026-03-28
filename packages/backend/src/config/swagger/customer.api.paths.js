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
        
**Prompt assembly order:**
1. \`basePrompt\` (user's free-text)
2. Prompt parts from the campaign's product type
3. \`visualStyle\` and \`mood\`
4. Model/gender modifier if enabled
5. Custom sections sorted by \`prompt_weight\` (high → medium → low)

If \`campaignId\` is supplied, campaign settings are used as defaults and any per-field overrides in the request body take precedence.

**Backend behavior:** Unless \`IMAGE_GENERATION_USE_EXTERNAL=true\` and \`IMAGE_GENERATION_API_URL\` are set, the server uses mock images (placeholders), not a real provider.`,
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
          },
        }}},
      },
      responses: {
        201: assetResponse('Generated image saved as asset'),
        401: err401, 403: err403,
        500: { description: 'Generation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
  },

  // ─── Assets ───────────────────────────────────────────
  '/api/customer/assets': {
    get: {
      operationId: 'customerListAssets',
      summary: 'List generated image assets',
      tags: ['Customer API'],
      security,
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
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
