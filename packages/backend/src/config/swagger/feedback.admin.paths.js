const security = [{ bearerAuth: [] }];
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err404 = { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

export const feedbackAdminPaths = {
  '/admin/feedback': {
    get: {
      operationId: 'adminListFeedback',
      summary: 'List all customer feedback',
      description:
        'Paginated aggregate of `customer_feedback` rows. Optional `user_id` filters to one customer. Includes nested `profiles` (email, username, business_name) when the join resolves.',
      tags: ['Feedback (Admin)'],
      security,
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        {
          in: 'query',
          name: 'user_id',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by submitting customer profile id',
        },
      ],
      responses: {
        200: { description: 'Paginated feedback', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/CustomerFeedbackEntry' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },

  '/admin/feedback/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'adminGetFeedback',
      summary: 'Get one feedback row',
      tags: ['Feedback (Admin)'],
      security,
      responses: {
        200: { description: 'Feedback row', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/CustomerFeedbackEntry' },
          },
        }}}},
        401: err401, 403: err403, 404: err404,
      },
    },
    put: {
      operationId: 'adminUpdateFeedback',
      summary: 'Replace feedback payload (moderation / correction)',
      tags: ['Feedback (Admin)'],
      security,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { oneOf: [{ $ref: '#/components/schemas/CustomerFeedbackPayloadBody' }, { type: 'object', additionalProperties: true }] },
          },
        },
      },
      responses: {
        200: { description: 'Updated', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/CustomerFeedbackEntry' },
          },
        }}}},
        400: { description: 'Invalid payload', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
    delete: {
      operationId: 'adminDeleteFeedback',
      summary: 'Delete a feedback row',
      tags: ['Feedback (Admin)'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },
};
