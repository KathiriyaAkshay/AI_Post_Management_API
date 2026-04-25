const security = [{ bearerAuth: [] }];
const err400 = { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err404 = { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

const profileResponse = { description: 'Customer profile', content: { 'application/json': { schema: {
  type: 'object', properties: {
    success: { type: 'boolean', example: true },
    data: { $ref: '#/components/schemas/Profile' },
  },
}}}};

export const customersPaths = {
  '/customers': {
    get: {
      operationId: 'customersList',
      summary: 'List all customers',
      tags: ['Customers (Admin)'],
      security,
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Filter by name or email' },
      ],
      responses: {
        200: { description: 'Paginated customer list', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/Profile' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
    post: {
      operationId: 'customersCreate',
      summary: 'Create a new customer',
      description: 'Admin creates a customer account. Provisions Supabase auth user + Stripe customer.',
      tags: ['Customers (Admin)'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object',
          required: ['email', 'password', 'username', 'business_name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'customer@business.com' },
            password: { type: 'string', minLength: 6, example: 'securepass123' },
            username: { type: 'string', example: 'business_user' },
            business_name: { type: 'string', example: 'Acme Corp' },
            logo: { type: 'string', format: 'uri', example: 'https://example.com/logo.png' },
            logo_position: {
              type: 'string',
              enum: [
                'auto',
                'top_left',
                'top_right',
                'top_center',
                'bottom_left',
                'bottom_right',
                'bottom_center',
                'center',
              ],
              example: 'bottom_right',
            },
            contact_number: { type: 'string', example: '+1-555-123-4567' },
            address: { type: 'string', example: '123 Main St, City, State 12345' },
          },
        }}},
      },
      responses: {
        201: { description: 'Customer created', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: {
              user: { $ref: '#/components/schemas/Profile' },
              message: { type: 'string' },
            }},
          },
        }}}},
        400: err400, 401: err401, 403: err403,
      },
    },
  },

  '/customers/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'customersGetById',
      summary: 'Get a customer by ID',
      tags: ['Customers (Admin)'],
      security,
      responses: { 200: profileResponse, 401: err401, 403: err403, 404: err404 },
    },
    put: {
      operationId: 'customersUpdate',
      summary: 'Update a customer',
      tags: ['Customers (Admin)'],
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
            logo_position: {
              type: 'string',
              enum: [
                'auto',
                'top_left',
                'top_right',
                'top_center',
                'bottom_left',
                'bottom_right',
                'bottom_center',
                'center',
              ],
            },
            contact_number: { type: 'string' },
            address: { type: 'string' },
          },
        }}},
      },
      responses: { 200: profileResponse, 400: err400, 401: err401, 403: err403, 404: err404 },
    },
    delete: {
      operationId: 'customersDelete',
      summary: 'Delete a customer',
      tags: ['Customers (Admin)'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },
};
