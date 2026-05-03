const security = [{ bearerAuth: [] }];
const err400 = { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

export const storagePaths = {
  '/storage/signed-url': {
    post: {
      operationId: 'storageGetSignedUploadUrl',
      summary: 'Get a signed upload URL',
      description: `Returns a provider-specific upload URL (Supabase signed upload or S3 presigned PUT).

**Workflow:**
1. Call this endpoint to get \`signedUrl\`, optional \`uploadHeaders\` (e.g. Content-Type for S3), and \`filePath\`.
2. PUT the file to \`signedUrl\` from the browser; include \`uploadHeaders\` on the request when non-empty.
3. For public-read buckets, save \`publicUrl\` on the campaign or profile; for private buckets use \`filePath\` + \`/storage/download-url\` (or your CDN signing flow) to display.`,
      tags: ['Storage'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object',
          required: ['bucket', 'fileName'],
          properties: {
            bucket: {
              type: 'string',
              enum: ['generated-images', 'product-references', 'campaign-thumbnails', 'profile-logos'],
            },
            fileName: { type: 'string', example: 'product-shot.png' },
            contentType: { type: 'string', example: 'image/png', description: 'MIME type of the file' },
          },
        }}},
      },
      responses: {
        200: { description: 'Signed URL', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: {
              signedUrl: { type: 'string', format: 'uri', description: 'PUT to this URL to upload the file' },
              uploadHeaders: {
                type: 'object',
                additionalProperties: { type: 'string' },
                description: 'Headers to send with the PUT (often Content-Type for S3)',
              },
              filePath: { type: 'string', example: '<user-id>/1715000000000-product-shot.png' },
              publicUrl: {
                type: 'string',
                format: 'uri',
                description: 'Stable URL for public-read buckets (empty for private buckets when using S3)',
              },
            }},
          },
        }}}},
        400: err400, 401: err401,
      },
    },
  },

  '/storage/download-url': {
    post: {
      operationId: 'storageGetSignedDownloadUrl',
      summary: 'Get a signed download URL',
      description: 'Returns a time-limited signed URL for downloading an object (Supabase signed URL or S3 presigned GET).',
      tags: ['Storage'],
      security,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object',
          required: ['bucket', 'filePath'],
          properties: {
            bucket: { type: 'string', example: 'generated-images' },
            filePath: { type: 'string', example: '<user-id>/1715000000000-output.png' },
            expiresIn: { type: 'integer', default: 3600, description: 'Expiry duration in seconds' },
          },
        }}},
      },
      responses: {
        200: { description: 'Signed download URL', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: {
              signedUrl: { type: 'string', format: 'uri' },
            }},
          },
        }}}},
        400: err400, 401: err401,
      },
    },
  },
};
