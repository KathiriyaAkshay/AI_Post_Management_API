const security = [{ bearerAuth: [] }];
const err400 = { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err404 = { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

const optionResponse = (description) => ({
  description,
  content: { 'application/json': { schema: {
    type: 'object', properties: {
      success: { type: 'boolean', example: true },
      data: { $ref: '#/components/schemas/CampaignConfigOption' },
    },
  }}},
});

const optionBody = {
  required: true,
  content: { 'application/json': { schema: {
    type: 'object',
    required: ['optionType', 'value', 'label'],
    properties: {
      productTypeId: {
        type: 'string', format: 'uuid', nullable: true,
        description: 'Scope: null = global platform default; UUID = override for a specific product type',
      },
      optionType: {
        type: 'string',
        enum: ['visual_style', 'aspect_ratio', 'mood', 'gender_focus'],
      },
      value: { type: 'string', example: 'golden_hour', description: 'Machine-readable key stored in campaigns table' },
      label: { type: 'string', example: 'Golden Hour', description: 'Human-readable label shown in UI' },
      description: { type: 'string', nullable: true },
      icon: { type: 'string', nullable: true, example: 'photo_camera', description: 'Material Symbol icon name' },
      gradientFrom: { type: 'string', nullable: true, example: 'from-yellow-400' },
      gradientTo: { type: 'string', nullable: true, example: 'to-orange-600' },
      isActive: { type: 'boolean', default: true },
      sortOrder: { type: 'integer', default: 0 },
    },
  }}},
};

export const campaignOptionsPaths = {
  '/admin/campaign-options': {
    get: {
      operationId: 'adminCampaignOptionsList',
      summary: 'List campaign config options',
      description: 'Filterable by product type and option type. Use `product_type_id=global` to see only global defaults.',
      tags: ['Campaign Options (Admin)'],
      security,
      parameters: [
        { in: 'query', name: 'product_type_id', schema: { type: 'string' }, description: 'UUID or "global"' },
        { in: 'query', name: 'option_type', schema: { type: 'string', enum: ['visual_style', 'aspect_ratio', 'mood', 'gender_focus'] } },
        { in: 'query', name: 'include_global', schema: { type: 'string', enum: ['true', 'false'], default: 'true' }, description: 'When filtering by product_type_id, also include global defaults' },
      ],
      responses: {
        200: { description: 'Options list', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/CampaignConfigOption' } },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
    post: {
      operationId: 'adminCampaignOptionsCreate',
      summary: 'Create a campaign config option',
      description: 'Add a new option (global or product-type-scoped) to any option group.',
      tags: ['Campaign Options (Admin)'],
      security,
      requestBody: optionBody,
      responses: { 201: optionResponse('Option created'), 400: err400, 401: err401, 403: err403 },
    },
  },

  '/admin/campaign-options/preview': {
    get: {
      operationId: 'adminCampaignOptionsPreview',
      summary: 'Preview resolved options (as customer)',
      description: 'Returns options exactly as a customer with the given product type would see them — applies the same fallback logic (type-specific overrides > global defaults).',
      tags: ['Campaign Options (Admin)'],
      security,
      parameters: [
        { in: 'query', name: 'product_type_id', schema: { type: 'string', format: 'uuid' }, description: 'Leave blank for global defaults' },
      ],
      responses: {
        200: { description: 'Resolved option groups', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ResolvedCampaignOptions' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  '/admin/campaign-options/reorder': {
    post: {
      operationId: 'adminCampaignOptionsReorder',
      summary: 'Bulk reorder options',
      description: 'Update sort_order for multiple options at once.',
      tags: ['Campaign Options (Admin)'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object', required: ['id', 'sortOrder'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        }}},
      },
      responses: {
        200: { description: 'Reordered', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        400: err400, 401: err401, 403: err403,
      },
    },
  },

  '/admin/campaign-options/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'adminCampaignOptionsGetById',
      summary: 'Get a single option by ID',
      tags: ['Campaign Options (Admin)'],
      security,
      responses: { 200: optionResponse('Option details'), 401: err401, 403: err403, 404: err404 },
    },
    put: {
      operationId: 'adminCampaignOptionsUpdate',
      summary: 'Update a campaign config option',
      tags: ['Campaign Options (Admin)'],
      security,
      requestBody: optionBody,
      responses: { 200: optionResponse('Option updated'), 400: err400, 401: err401, 403: err403, 404: err404 },
    },
    delete: {
      operationId: 'adminCampaignOptionsDelete',
      summary: 'Delete a campaign config option',
      tags: ['Campaign Options (Admin)'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },
};
