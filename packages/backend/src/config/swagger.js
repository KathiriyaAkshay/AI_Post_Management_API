/** @type {import('swagger-ui-express').SwaggerUiOptions} */
export const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AI Post Management API',
    description: 'Onboarding API - Admin auth and customer creation',
    version: '1.0.0',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login (Admin or Customer)',
        description: 'Login with email or username and password. Returns user info and session token.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'password'],
                properties: {
                  identifier: {
                    type: 'string',
                    description: 'Email address or username',
                    example: 'admin@example.com',
                  },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            email: { type: 'string' },
                            role: { type: 'string', example: 'admin' },
                            username: { type: 'string', nullable: true },
                            business_name: { type: 'string', nullable: true },
                          },
                        },
                        session: { type: 'object', description: 'Supabase session with access_token' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        summary: 'Request password reset',
        description: 'Sends a password reset email to the user. The email contains a link with a token to reset the password.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password reset email sent (always returns success for security)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        summary: 'Reset password with token',
        description: 'Reset password using the access token from the password reset email link.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['access_token', 'password'],
                properties: {
                  access_token: {
                    type: 'string',
                    description: 'Access token from password reset email link',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                  password: {
                    type: 'string',
                    minLength: 6,
                    example: 'newsecurepass123',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password reset successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid token or validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/update-password': {
      post: {
        summary: 'Update password (authenticated)',
        description: 'Update password for the currently authenticated user.',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: {
                    type: 'string',
                    minLength: 6,
                    example: 'newsecurepass123',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/admin/signup': {
      post: {
        summary: 'Admin signup',
        description: 'Register a new admin user via Supabase Auth. Creates user and profile with admin role.',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@example.com' },
                  password: { type: 'string', minLength: 6, example: 'secret123' },
                  full_name: { type: 'string', example: 'Admin User' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Admin created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            email: { type: 'string' },
                            role: { type: 'string', example: 'admin' },
                          },
                        },
                        session: { type: 'object', description: 'Supabase session' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation or signup error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/admin/create-customer': {
      post: {
        summary: 'Create customer (Admin only)',
        description: 'Create a new customer account with business details. Creates Supabase user, Stripe customer, and sends credentials via email.',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'username', 'business_name'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'customer@business.com' },
                  password: { type: 'string', minLength: 6, example: 'securepass123' },
                  username: { type: 'string', minLength: 3, maxLength: 50, example: 'business_user' },
                  business_name: { type: 'string', example: 'Acme Corp' },
                  logo: { type: 'string', format: 'uri', example: 'https://example.com/logo.png' },
                  contact_number: { type: 'string', example: '+1-555-123-4567' },
                  address: { type: 'string', example: '123 Main St, City, State 12345' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Customer created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            email: { type: 'string' },
                            username: { type: 'string' },
                            business_name: { type: 'string' },
                            stripe_customer_id: { type: 'string', nullable: true },
                          },
                        },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          401: {
            description: 'Unauthorized - Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { status: { type: 'string', example: 'ok' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase JWT token from admin signup',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
    },
  },
};
