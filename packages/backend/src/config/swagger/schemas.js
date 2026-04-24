export const schemas = {
  // ─── Generic ────────────────────────────────────
  Error: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Something went wrong' },
    },
  },
  SuccessMessage: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operation successful' },
    },
  },
  PaginationMeta: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 42 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      totalPages: { type: 'integer', example: 3 },
    },
  },

  // ─── Profile ────────────────────────────────────
  Profile: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      full_name: { type: 'string', nullable: true },
      username: { type: 'string', nullable: true },
      business_name: { type: 'string', nullable: true },
      logo: { type: 'string', format: 'uri', nullable: true },
      contact_number: { type: 'string', nullable: true },
      address: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['admin', 'customer'] },
      created_at: { type: 'string', format: 'date-time' },
    },
  },

  // ─── Product Type ────────────────────────────────
  ProductType: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Jewelry' },
      template: { type: 'string', nullable: true, example: '{product} in {mood} lighting' },
      sort_order: { type: 'integer', default: 0 },
      active: { type: 'boolean', default: true },
      created_at: { type: 'string', format: 'date-time' },
    },
  },

  PromptPart: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      product_type_id: { type: 'string', format: 'uuid' },
      content: { type: 'string', example: 'ultra-sharp studio lighting' },
      order_index: { type: 'integer', default: 0 },
      created_at: { type: 'string', format: 'date-time' },
    },
  },

  // ─── Campaign Config Option ───────────────────────
  CampaignConfigOption: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      product_type_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        description: 'NULL = global platform default; non-null = override for this product type',
      },
      option_type: {
        type: 'string',
        enum: ['visual_style', 'aspect_ratio', 'mood', 'gender_focus'],
      },
      value: { type: 'string', example: 'golden_hour' },
      label: { type: 'string', example: 'Golden Hour' },
      description: { type: 'string', nullable: true },
      icon: { type: 'string', nullable: true, example: 'photo_camera', description: 'Material Symbol icon name' },
      gradient_from: { type: 'string', nullable: true, example: 'from-yellow-400', description: 'Tailwind CSS gradient class' },
      gradient_to: { type: 'string', nullable: true, example: 'to-orange-600' },
      is_active: { type: 'boolean', default: true },
      sort_order: { type: 'integer', default: 0 },
      created_at: { type: 'string', format: 'date-time' },
    },
  },

  ResolvedCampaignOptions: {
    type: 'object',
    description: 'Campaign options resolved for a product type. Product-type-specific options override global defaults per group.',
    properties: {
      visual_styles: { type: 'array', items: { $ref: '#/components/schemas/CampaignConfigOption' } },
      aspect_ratios: { type: 'array', items: { $ref: '#/components/schemas/CampaignConfigOption' } },
      moods: { type: 'array', items: { $ref: '#/components/schemas/CampaignConfigOption' } },
      gender_focus: { type: 'array', items: { $ref: '#/components/schemas/CampaignConfigOption' } },
    },
  },

  PromptBuildingBlock: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      product_type_id: {
        type: 'string', format: 'uuid', nullable: true,
        description: 'NULL = global; set = override for that product type (same block_key)',
      },
      block_key: { type: 'string', example: 'image_gen_quality_bar', description: 'Stable id: lowercase, numbers, underscores' },
      category: {
        type: 'string',
        enum: ['system', 'style', 'composition', 'brand', 'safety', 'negative', 'other'],
        example: 'system',
      },
      title: { type: 'string', nullable: true },
      content: { type: 'string', description: 'Prompt fragment text' },
      is_active: { type: 'boolean', default: true },
      sort_order: { type: 'integer', default: 0 },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  // ─── Custom Section ────────────────────────────────
  CustomSection: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string', example: 'Background Setting' },
      description: {
        type: 'string',
        example: 'Urban street at night with rain-slicked roads',
        description: 'This text is injected into the AI prompt',
      },
      prompt_weight: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        description: 'Controls priority order when building the final prompt',
      },
      sort_order: { type: 'integer', default: 0 },
    },
  },

  // ─── Campaign ─────────────────────────────────────
  Campaign: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid', nullable: true, description: 'NULL for prebuilt platform campaigns' },
      product_type_id: { type: 'string', format: 'uuid', nullable: true },
      created_by: { type: 'string', format: 'uuid', nullable: true, description: 'Admin who created a prebuilt campaign' },
      cloned_from: { type: 'string', format: 'uuid', nullable: true, description: 'Source campaign ID if cloned from prebuilt' },
      name: { type: 'string', example: 'Summer Gold Collection' },
      description: { type: 'string', nullable: true },
      visual_style: { type: 'string', enum: ['photorealistic', '3d_render', 'cinematic', 'oil_painting'] },
      aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3'] },
      mood: { type: 'string', nullable: true, example: 'golden_hour' },
      model_enabled: { type: 'boolean', default: false },
      gender_focus: { type: 'string', enum: ['male', 'female', 'neutral'], default: 'neutral' },
      status: { type: 'string', enum: ['draft', 'active', 'completed'], default: 'draft' },
      product_reference_url: { type: 'string', format: 'uri', nullable: true },
      thumbnail_url: { type: 'string', format: 'uri', nullable: true },
      is_prebuilt: { type: 'boolean', default: false },
      custom_sections: {
        type: 'array',
        items: { $ref: '#/components/schemas/CustomSection' },
        description: 'User-defined prompt modifiers',
      },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  CampaignInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Summer Gold Collection' },
      description: { type: 'string' },
      visualStyle: { type: 'string', example: 'photorealistic' },
      aspectRatio: { type: 'string', example: '1:1' },
      mood: { type: 'string', nullable: true, example: 'golden_hour' },
      modelEnabled: { type: 'boolean', default: false },
      genderFocus: { type: 'string', default: 'neutral' },
      status: { type: 'string', enum: ['draft', 'active', 'completed'], default: 'draft' },
      productReferenceUrl: { type: 'string', format: 'uri' },
      thumbnailUrl: { type: 'string', format: 'uri' },
      productTypeId: { type: 'string', format: 'uuid', nullable: true },
      customSections: {
        type: 'array',
        items: { $ref: '#/components/schemas/CustomSection' },
      },
    },
  },

  // ─── Generated Image / Asset ──────────────────────
  Asset: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_id: { type: 'string', format: 'uuid' },
      campaign_id: { type: 'string', format: 'uuid', nullable: true },
      name: {
        type: 'string',
        nullable: true,
        example: 'Cyberpunk City',
        description: 'Display title for the asset library; null means show prompt_used in UI',
      },
      is_liked: { type: 'boolean', default: false, description: 'User favorite / heart toggle' },
      prompt_used: { type: 'string' },
      product_reference_input_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        description: 'Product reference URL from the generate request body (if any).',
      },
      product_reference_resolved_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        description: 'Product reference URL after server resolution (used for this generation).',
      },
      brand_logo_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        description: 'Profile logo URL at generation time.',
      },
      image_url: { type: 'string', format: 'uri' },
      file_size: { type: 'integer', nullable: true },
      format: { type: 'string', example: 'PNG' },
      width: { type: 'integer', example: 1024 },
      height: { type: 'integer', example: 1024 },
      color_space: { type: 'string', example: 'sRGB', nullable: true },
      metadata: {
        type: 'object',
        nullable: true,
        description:
          'Includes `generatedAt`. May include `provider`, `model`, `generationMode`, `openaiRoute`; after mirror to Storage, `storagePath`, `mirroredToSupabase`. `originalProviderImageUrl` may be an ephemeral https URL before copy. API and WebSocket payloads omit any `data:` (inline) image values; use `image_url` for the image.',
      },
      created_at: { type: 'string', format: 'date-time' },
    },
  },

  // ─── Image generation — async + WebSocket (target contract) ───
  // WsEvent* schemas document server→client WebSocket JSON payloads. OpenAPI 3.0
  // does not define WebSocket paths; these are referenced from operation docs.

  GenerationJobAccepted: {
    type: 'object',
    description: 'Returned with HTTP 202 when generation is queued for async processing.',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          jobId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'queued'], example: 'pending' },
        },
        required: ['jobId', 'status'],
      },
    },
    required: ['success', 'data'],
  },

  GenerationJobStatus: {
    type: 'object',
    description: 'Async job row + asset when completed (GET poll).',
    properties: {
      jobId: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
      errorMessage: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      asset: { allOf: [{ $ref: '#/components/schemas/Asset' }], nullable: true, description: 'Present when status is completed and asset exists' },
    },
    required: ['jobId', 'status', 'createdAt', 'updatedAt'],
  },

  WsEventGenerationCompleted: {
    type: 'object',
    description: 'WebSocket: event name `generation.completed`. Final asset after DB write.',
    properties: {
      jobId: { type: 'string', format: 'uuid' },
      data: { $ref: '#/components/schemas/Asset' },
    },
    required: ['jobId', 'data'],
  },

  WsEventGenerationFailed: {
    type: 'object',
    description: 'WebSocket: event name `generation.failed`.',
    properties: {
      jobId: { type: 'string', format: 'uuid' },
      error: { type: 'string' },
      code: { type: 'string', nullable: true, description: 'Stable machine-readable code when available' },
    },
    required: ['jobId', 'error'],
  },

  WsEventGenerationProgress: {
    type: 'object',
    description: 'WebSocket: optional event name `generation.progress`.',
    properties: {
      jobId: { type: 'string', format: 'uuid' },
      message: { type: 'string' },
      pct: { type: 'integer', minimum: 0, maximum: 100, nullable: true },
    },
    required: ['jobId'],
  },

  // ─── Image generation — admin settings / encrypted credentials ───
  ImageProviderIdLists: {
    type: 'object',
    properties: {
      active_provider_options: {
        type: 'array',
        items: { type: 'string', enum: ['mock', 'openai', 'google', 'grok', 'external_http'] },
      },
      credential_providers: {
        type: 'array',
        items: { type: 'string', enum: ['openai', 'google', 'grok'] },
      },
      suggested_image_models: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
        description: 'Example model ids per credential provider (UI hints; not authoritative)',
      },
    },
  },

  ImageGenerationSettings: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'default' },
      active_provider: {
        type: 'string',
        enum: ['mock', 'openai', 'google', 'grok', 'external_http'],
        description: 'Which adapter `generateImage` uses (unless legacy env external is enabled)',
      },
      provider_models: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Per-credential-provider model id (e.g. openai: dall-e-3). Merged on PATCH; empty string clears a key.',
        example: { openai: 'dall-e-3', google: '', grok: '' },
      },
      updated_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },

  ImageGenerationSettingsInput: {
    type: 'object',
    description: 'Send at least one of `active_provider` or `provider_models`.',
    properties: {
      active_provider: {
        type: 'string',
        enum: ['mock', 'openai', 'google', 'grok', 'external_http'],
      },
      provider_models: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Partial map; omitted keys unchanged; empty string removes that provider entry',
      },
    },
  },

  ImageProviderCredentialMeta: {
    type: 'object',
    description: 'Stored credential metadata — never includes the API key.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      provider: { type: 'string', enum: ['openai', 'google', 'grok'] },
      label: { type: 'string', nullable: true },
      key_version: { type: 'integer', example: 1 },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  ImageProviderCredentialInput: {
    type: 'object',
    required: ['api_key'],
    properties: {
      api_key: { type: 'string', description: 'Plaintext API key; encrypted server-side before storage' },
      label: { type: 'string', nullable: true },
    },
  },
};
