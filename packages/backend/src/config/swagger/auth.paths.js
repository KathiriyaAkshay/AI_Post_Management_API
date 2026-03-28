const err400 = { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const err401 = { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

export const authPaths = {
  '/auth/login': {
    post: {
      operationId: 'authLogin',
      summary: 'Login',
      description: 'Login with email/username and password. Returns the Supabase session (access_token) and user profile.',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', example: 'admin@example.com', description: 'Email or username' },
            password: { type: 'string', example: 'secret123' },
          },
        }}},
      },
      responses: {
        200: { description: 'Login successful', content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: {
              user: { $ref: '#/components/schemas/Profile' },
              session: { type: 'object', description: 'Supabase session containing access_token' },
            }},
          },
        }}}},
        400: err400,
        401: err401,
      },
    },
  },

  '/auth/forgot-password': {
    post: {
      operationId: 'authForgotPassword',
      summary: 'Request password reset',
      description: 'Sends a password reset email. Always returns success for security.',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['email'],
          properties: { email: { type: 'string', format: 'email', example: 'user@example.com' } },
        }}},
      },
      responses: {
        200: { description: 'Reset email sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        400: err400,
      },
    },
  },

  '/auth/reset-password': {
    post: {
      operationId: 'authResetPassword',
      summary: 'Reset password with token',
      description: 'Reset password using the access_token from the reset email link.',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['access_token', 'password'],
          properties: {
            access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
            password: { type: 'string', minLength: 6, example: 'newsecurepass123' },
          },
        }}},
      },
      responses: {
        200: { description: 'Password reset', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        400: err400,
      },
    },
  },

  '/auth/update-password': {
    post: {
      operationId: 'authUpdatePassword',
      summary: 'Update password (authenticated)',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['password'],
          properties: { password: { type: 'string', minLength: 6, example: 'newsecurepass123' } },
        }}},
      },
      responses: {
        200: { description: 'Password updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
        400: err400, 401: err401,
      },
    },
  },

  '/auth/admin/signup': {
    post: {
      operationId: 'authAdminSignup',
      summary: 'Admin signup',
      description: 'Register a new admin account. Creates Supabase user + profile with role=admin.',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
            full_name: { type: 'string', example: 'Admin User' },
          },
        }}},
      },
      responses: {
        201: { description: 'Admin created', content: { 'application/json': { schema: {
          type: 'object', properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: {
              user: { $ref: '#/components/schemas/Profile' },
              session: { type: 'object' },
            }},
          },
        }}}},
        400: err400,
      },
    },
  },
};
