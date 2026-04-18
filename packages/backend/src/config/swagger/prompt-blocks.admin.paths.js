const security = [{ bearerAuth: [] }];
const err400 = { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err404 = { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

const blockBody = {
  required: true,
  content: { 'application/json': { schema: {
    type: 'object',
    required: ['blockKey', 'content'],
    properties: {
      productTypeId: { type: 'string', format: 'uuid', nullable: true, description: 'Omit or null for global default' },
      blockKey: { type: 'string', example: 'image_gen_system_preamble' },
      category: { type: 'string', enum: ['system', 'style', 'composition', 'brand', 'safety', 'negative', 'other'], default: 'other' },
      title: { type: 'string', nullable: true },
      content: { type: 'string', description: 'Prompt building block text' },
      isActive: { type: 'boolean', default: true },
      sortOrder: { type: 'integer', default: 0 },
    },
  }}},
};

const blockResponse = (description) => ({
  description,
  content: { 'application/json': { schema: {
    type: 'object', properties: {
      success: { type: 'boolean', example: true },
      data: { $ref: '#/components/schemas/PromptBuildingBlock' },
    },
  }}},
});

export const promptBlocksAdminPaths = {
  '/admin/prompt-blocks/resolved': {
    get: {
      operationId: 'adminPromptBlocksResolved',
      summary: 'Resolved prompt blocks (for generation / agent)',
      description: 'Returns merged active blocks: global first, then product-type overrides per `block_key`. Optional `categories` filters. Includes `combinedText` (joined contents).',
      tags: ['Prompt blocks (Admin)'],
      security,
      parameters: [
        { in: 'query', name: 'product_type_id', schema: { type: 'string', format: 'uuid' }, description: 'Scope merges like campaign options' },
        { in: 'query', name: 'categories', schema: { type: 'string' }, description: 'Comma-separated: system,style,brand,...' },
      ],
      responses: {
        200: { description: 'Merged blocks + combinedText', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object', properties: {
                blocks: { type: 'array', items: { $ref: '#/components/schemas/PromptBuildingBlock' } },
                combinedText: { type: 'string', description: 'All contents joined with blank lines' },
              },
            },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  '/admin/prompt-blocks': {
    get: {
      operationId: 'adminPromptBlocksList',
      summary: 'List prompt building blocks',
      tags: ['Prompt blocks (Admin)'],
      security,
      parameters: [
        { in: 'query', name: 'product_type_id', schema: { type: 'string' }, description: 'UUID or `global` for globals only' },
        { in: 'query', name: 'category', schema: { type: 'string' } },
        { in: 'query', name: 'block_key', schema: { type: 'string' } },
        { in: 'query', name: 'include_global', schema: { type: 'string', enum: ['true', 'false'], default: 'true' } },
      ],
      responses: {
        200: { description: 'List', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/PromptBuildingBlock' } },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
    post: {
      operationId: 'adminPromptBlocksCreate',
      summary: 'Create a prompt building block',
      tags: ['Prompt blocks (Admin)'],
      security,
      requestBody: blockBody,
      responses: { 201: blockResponse('Created'), 400: err400, 401: err401, 403: err403 },
    },
  },

  '/admin/prompt-blocks/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'adminPromptBlocksGetById',
      summary: 'Get prompt block by ID',
      tags: ['Prompt blocks (Admin)'],
      security,
      responses: { 200: blockResponse('Block'), 401: err401, 403: err403, 404: err404 },
    },
    put: {
      operationId: 'adminPromptBlocksUpdate',
      summary: 'Update prompt block',
      tags: ['Prompt blocks (Admin)'],
      security,
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object',
        properties: {
          productTypeId: { type: 'string', format: 'uuid', nullable: true },
          blockKey: { type: 'string' },
          category: { type: 'string', enum: ['system', 'style', 'composition', 'brand', 'safety', 'negative', 'other'] },
          title: { type: 'string', nullable: true },
          content: { type: 'string' },
          isActive: { type: 'boolean' },
          sortOrder: { type: 'integer' },
        },
      }}}},
      responses: { 200: blockResponse('Updated'), 400: err400, 401: err401, 403: err403, 404: err404 },
    },
    delete: {
      operationId: 'adminPromptBlocksDelete',
      summary: 'Delete prompt block',
      tags: ['Prompt blocks (Admin)'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403,
      },
    },
  },
};
