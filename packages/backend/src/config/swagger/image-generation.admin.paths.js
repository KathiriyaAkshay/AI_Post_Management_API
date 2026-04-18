const security = [{ bearerAuth: [] }];
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err403 = { description: 'Forbidden — admin role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

export const imageGenerationAdminPaths = {
  '/admin/image-generation/providers': {
    get: {
      operationId: 'adminImageGenerationProviderIds',
      summary: 'List provider id options',
      description:
        'Returns allowed `active_provider` values, providers that accept encrypted API keys, and `suggested_image_models` hints for admin UI.',
      tags: ['Image Generation (Admin)'],
      security,
      responses: {
        200: { description: 'Provider id lists', content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ImageProviderIdLists' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },
  '/admin/image-generation/settings': {
    get: {
      operationId: 'adminGetImageGenerationSettings',
      summary: 'Get image generation settings',
      tags: ['Image Generation (Admin)'],
      security,
      responses: {
        200: { description: 'Settings', content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ImageGenerationSettings' },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
    put: {
      operationId: 'adminPutImageGenerationSettings',
      summary: 'Update image generation settings',
      description:
        'Set `active_provider` and/or merge `provider_models` (per-provider model ids). At least one field is required.',
      tags: ['Image Generation (Admin)'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ImageGenerationSettingsInput' } } },
      },
      responses: {
        200: { description: 'Updated', content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ImageGenerationSettings' },
          },
        }}}},
        400: { description: 'Invalid body', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        401: err401, 403: err403,
      },
    },
  },
  '/admin/image-generation/credentials': {
    get: {
      operationId: 'adminListImageProviderCredentials',
      summary: 'List stored provider credentials (metadata only)',
      description: 'Never returns decrypted API keys.',
      tags: ['Image Generation (Admin)'],
      security,
      responses: {
        200: { description: 'Credential rows without secrets', content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/ImageProviderCredentialMeta' } },
          },
        }}}},
        401: err401, 403: err403,
      },
    },
  },
  '/admin/image-generation/credentials/{provider}': {
    parameters: [
      {
        in: 'path',
        name: 'provider',
        required: true,
        schema: { type: 'string', enum: ['openai', 'google', 'grok'] },
      },
    ],
    put: {
      operationId: 'adminUpsertImageProviderCredential',
      summary: 'Store encrypted API key for a provider',
      description: 'Plaintext `api_key` is encrypted with **AES-256-GCM** using env **PROVIDER_KEYS_MASTER_KEY**; only ciphertext, IV, and auth tag are stored.',
      tags: ['Image Generation (Admin)'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ImageProviderCredentialInput' } } },
      },
      responses: {
        200: { description: 'Upserted metadata', content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/ImageProviderCredentialMeta' },
          },
        }}}},
        400: { description: 'Invalid body or master key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        401: err401, 403: err403,
      },
    },
    delete: {
      operationId: 'adminDeleteImageProviderCredential',
      summary: 'Remove stored credential for a provider',
      tags: ['Image Generation (Admin)'],
      security,
      responses: {
        200: { description: 'Removed', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        401: err401, 403: err403,
      },
    },
  },
};
