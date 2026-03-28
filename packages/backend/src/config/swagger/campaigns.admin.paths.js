const security = [{ bearerAuth: [] }];
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — admin only', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
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

const campaignBody = {
  required: true,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/CampaignInput' } } },
};

export const campaignsAdminPaths = {
  '/admin/campaigns': {
    get: {
      operationId: 'adminCampaignsList',
      summary: 'List prebuilt campaigns',
      description: 'Returns all platform prebuilt campaigns (is_prebuilt=true), paginated.',
      tags: ['Campaigns (Admin)'],
      security,
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Filter by campaign name' },
      ],
      responses: {
        200: { description: 'Paginated prebuilt campaigns', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
    post: {
      operationId: 'adminCampaignsCreate',
      summary: 'Create a prebuilt campaign',
      description: 'Admin creates a platform-wide prebuilt campaign visible to all customers.',
      tags: ['Campaigns (Admin)'],
      security,
      requestBody: campaignBody,
      responses: { 201: campaignResponse('Campaign created'), 401: err401, 403: err403 },
    },
  },

  '/admin/campaigns/{id}': {
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
    get: {
      operationId: 'adminCampaignsGetById',
      summary: 'Get a prebuilt campaign by ID',
      tags: ['Campaigns (Admin)'],
      security,
      responses: { 200: campaignResponse('Campaign details'), 401: err401, 403: err403, 404: err404 },
    },
    put: {
      operationId: 'adminCampaignsUpdate',
      summary: 'Update a prebuilt campaign',
      tags: ['Campaigns (Admin)'],
      security,
      requestBody: campaignBody,
      responses: { 200: campaignResponse('Campaign updated'), 401: err401, 403: err403, 404: err404 },
    },
    delete: {
      operationId: 'adminCampaignsDelete',
      summary: 'Delete a prebuilt campaign',
      tags: ['Campaigns (Admin)'],
      security,
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403, 404: err404,
      },
    },
  },
};
