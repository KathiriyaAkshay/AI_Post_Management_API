const security = [{ bearerAuth: [] }];
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err404 = { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

const ptList = { description: 'Product type list', content: { 'application/json': { schema: {
  type: 'object', properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: { $ref: '#/components/schemas/ProductType' } },
  },
}}}};

const ptSingle = { description: 'Product type', content: { 'application/json': { schema: {
  type: 'object', properties: {
    success: { type: 'boolean', example: true },
    data: { $ref: '#/components/schemas/ProductType' },
  },
}}}};

const ptBody = {
  required: true,
  content: { 'application/json': { schema: {
    type: 'object', required: ['name'],
    properties: {
      name: { type: 'string', example: 'Jewelry' },
      template: { type: 'string', example: '{product} in {mood} lighting' },
      sort_order: { type: 'integer', default: 0 },
      active: { type: 'boolean', default: true },
    },
  }}},
};

const ppList = { description: 'Prompt parts', content: { 'application/json': { schema: {
  type: 'object', properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: { $ref: '#/components/schemas/PromptPart' } },
  },
}}}};

const ppBody = {
  required: true,
  content: { 'application/json': { schema: {
    type: 'object', required: ['content'],
    properties: {
      content: { type: 'string', example: 'ultra-sharp studio lighting' },
      order_index: { type: 'integer', default: 0 },
    },
  }}},
};

export const promptsPaths = {
  '/prompts/customer/{customerId}/product-types': {
    parameters: [{ in: 'path', name: 'customerId', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'promptsListProductTypes',
      summary: 'List product types for a customer',
      tags: ['Prompts (Admin)'],
      security,
      responses: { 200: ptList, 401: err401, 403: err403 },
    },
    post: {
      operationId: 'promptsCreateProductType',
      summary: 'Create product type for a customer',
      tags: ['Prompts (Admin)'],
      security,
      requestBody: ptBody,
      responses: { 201: ptSingle, 401: err401, 403: err403 },
    },
  },

  '/prompts/product-types/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    put: {
      operationId: 'promptsUpdateProductType',
      summary: 'Update a product type',
      tags: ['Prompts (Admin)'],
      security,
      requestBody: ptBody,
      responses: { 200: ptSingle, 401: err401, 403: err403, 404: err404 },
    },
    delete: {
      operationId: 'promptsDeleteProductType',
      summary: 'Delete a product type',
      tags: ['Prompts (Admin)'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },

  '/prompts/product-types/{productTypeId}/parts': {
    parameters: [{ in: 'path', name: 'productTypeId', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'promptsListParts',
      summary: 'List prompt parts for a product type',
      tags: ['Prompts (Admin)'],
      security,
      responses: { 200: ppList, 401: err401, 403: err403 },
    },
    post: {
      operationId: 'promptsAddPart',
      summary: 'Add a prompt part to a product type',
      tags: ['Prompts (Admin)'],
      security,
      requestBody: ppBody,
      responses: {
        201: { description: 'Part created', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/PromptPart' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  '/prompts/product-types/{productTypeId}/preview': {
    parameters: [{ in: 'path', name: 'productTypeId', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'promptsPreview',
      summary: 'Preview assembled prompt for a product type',
      description: 'Returns the final prompt string that would be sent to the AI service, assembled from all active prompt parts.',
      tags: ['Prompts (Admin)'],
      security,
      responses: {
        200: { description: 'Prompt preview', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: {
              prompt: { type: 'string', example: 'ultra-sharp studio lighting, soft bokeh background' },
            }},
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  '/prompts/parts/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    put: {
      operationId: 'promptsUpdatePart',
      summary: 'Update a prompt part',
      tags: ['Prompts (Admin)'],
      security,
      requestBody: ppBody,
      responses: {
        200: { description: 'Updated', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/PromptPart' },
          },
        }}}},
        401: err401, 403: err403, 404: err404,
      },
    },
    delete: {
      operationId: 'promptsDeletePart',
      summary: 'Delete a prompt part',
      tags: ['Prompts (Admin)'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },
};
