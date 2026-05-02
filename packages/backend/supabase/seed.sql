-- Seed data for generated_images table
-- Run after migrations. Requires at least one customer profile to exist.
-- Usage: psql <connection> -f seed.sql  OR  supabase db reset (runs seed automatically)

DO $$
DECLARE
  v_user_id uuid;
  v_campaign_id uuid;
  v_prompts text[] := ARRAY[
    'Cyberpunk City at night with neon lights',
    'Abstract Nebula in deep space',
    'Golden Hour Peaks mountain landscape',
    'Emerald Forest with morning mist',
    'Product on white marble surface',
    'Jewelry in soft bokeh lighting',
    'Minimalist product shot on gradient',
    'Luxury watch with cinematic lighting',
    'Cosmetic bottle in elegant setting',
    'Fashion accessory on velvet backdrop',
    'Tech gadget with reflective surface',
    'Food photography with natural light',
    'Interior design mood board',
    'Urban street fashion editorial',
    'Coastal sunset product placement',
    'Studio portrait with golden hour',
    'Architectural visualization render',
    'Nature-inspired brand imagery',
    'Retro vintage product aesthetic',
    'High contrast minimalist design'
  ];
  v_prompt text;
  v_i int;
  v_day_offset int;
  v_seed_suffix int;
BEGIN
  -- Get first customer
  SELECT id INTO v_user_id FROM profiles WHERE role = 'customer' ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No customer profile found. Skipping generated_images seed.';
    RETURN;
  END IF;

  -- Get first campaign for this customer (optional)
  SELECT id INTO v_campaign_id FROM campaigns WHERE user_id = v_user_id LIMIT 1;

  -- Insert ~70 images spread over last 30 days
  FOR v_i IN 1..70 LOOP
    v_prompt := v_prompts[1 + (v_i - 1) % array_length(v_prompts, 1)];
    v_day_offset := (v_i % 30);  -- 0 to 29 days ago
    v_seed_suffix := 100 + v_i;

    INSERT INTO generated_images (
      user_id,
      campaign_id,
      prompt_used,
      image_url,
      width,
      height,
      format,
      color_space,
      metadata,
      created_at
    ) VALUES (
      v_user_id,
      v_campaign_id,
      v_prompt,
      'https://picsum.photos/seed/nexus' || v_seed_suffix || '/1024/1024',
      1024,
      1024,
      CASE (v_i % 3) WHEN 0 THEN 'PNG' WHEN 1 THEN 'JPEG' ELSE 'WEBP' END,
      'sRGB',
      jsonb_build_object('generatedAt', (NOW() - (v_day_offset || ' days')::interval)::timestamptz),
      NOW() - (v_day_offset || ' days')::interval - (random() * interval '23 hours')
    );
  END LOOP;

  RAISE NOTICE 'Inserted 70 generated_images for customer %', v_user_id;
END $$;
