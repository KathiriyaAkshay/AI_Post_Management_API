# End-to-end: campaign → generate image

QA walkthrough for the **current** customer flow: **click-style options** + **campaign `description`** and **`basePrompt`** + optional **custom sections**, optional **product reference URL** and **profile logo**, plus the **platform preamble** from the database. Import **`docs/scenarios/scenario-matrix.template.csv`** into Excel or Google Sheets to track runs.

---

## Who does what

| Step | Role | What |
|------|------|------|
| **Campaign options** (dropdowns) | **Customer** | `GET /api/customer/campaign-options` — returns **global** catalog for styles, ratios, moods (no extra query params). |
| **Campaign + generate** | **Customer** | `POST /api/customer/campaigns` → `POST /api/customer/generate`. |
| **Prebuilt templates** | **Customer** | List prebuilts, clone if needed, then generate. For **prebuilt** `campaignId`, send **`productReferenceUrl`** on each generate if you need a per-user product shot (the template row’s `product_reference_url` is not auto-applied). |

---

## Prerequisites

1. Backend running; `.env` with Supabase keys.
2. **Customer** JWT (`profiles.role = customer`).
3. For non-placeholder images: configure **Image generation** in the admin panel (provider / keys). Run migrations through **`018`** so `generated_images` audit columns exist (`product_reference_input_url`, `product_reference_resolved_url`, `brand_logo_url`).
4. **Platform preamble:** migration **`015`** (or an active `prompt_building_blocks` row for `image_gen_platform_system`) — otherwise the preamble is empty.
5. **OpenAI reference path:** when `productReferenceUrl` and/or profile **`logo`** are set, the server calls **`/v1/images/edits`** with a GPT Image model (`OPENAI_IMAGE_EDIT_MODEL` or `gpt-image-1` if the configured generations model is not `gpt-image*`). Reference URLs must be **HTTPS**.

---

## Phase 1 — Load click options

```http
GET {{BASE}}/api/customer/campaign-options
Authorization: Bearer {{CUSTOMER_TOKEN}}
```

Use the response to drive **visual style**, **aspect ratio**, **mood**, and related UI — no separate “product” API is required for this flow.

---

## Phase 2 — Create a campaign

```http
POST {{BASE}}/api/customer/campaigns
Authorization: Bearer {{CUSTOMER_TOKEN}}
Content-Type: application/json

{
  "name": "My summer promo",
  "description": "Hero iced drinks on a patio table, glassware catchlights, afternoon sun",
  "visualStyle": "cinematic",
  "aspectRatio": "16:9",
  "mood": "golden_hour",
  "modelEnabled": false,
  "genderFocus": "neutral",
  "status": "active",
  "productReferenceUrl": "https://example.com/my-packshot.jpg",
  "customSections": [
    {
      "title": "Brand",
      "description": "Warm, trustworthy small-business vibe",
      "prompt_weight": "high"
    }
  ]
}
```

Save returned **`id`** as **`campaign_id`**.

- **`description`** — merged into the scene prompt with **`basePrompt`** (campaign text first, then body, blank line between) when you generate with this `campaignId`. Omitting it and sending only a short `basePrompt` often yields **thin** prompts.
- **`productReferenceUrl`** — stored on **your** campaign; used on generate when you do **not** override with a body `productReferenceUrl`. Upload flow: `POST /storage/signed-url` (bucket `product-references`) → upload → use returned **`publicUrl`** here or on generate.
- **`custom_sections`** — optional (see **`CustomSection`** in OpenAPI).

---

## Phase 3 — Generate image

```http
POST {{BASE}}/api/customer/generate
Authorization: Bearer {{CUSTOMER_TOKEN}}
Content-Type: application/json

{
  "campaignId": "{{CAMPAIGN_ID}}",
  "basePrompt": "Subtle motion blur on condensation, premium feel",
  "productReferenceUrl": "https://example.com/override-packshot.jpg",
  "name": "e2e-summer-01"
}
```

- **`productReferenceUrl`** (optional) — per-request override; **HTTPS** only for OpenAI reference downloads. For **prebuilt** `campaignId`, include this when you need a user-specific product image.
- **`PUT /api/customer/profile`** with **`logo`** — optional; when set, contributes to the prompt and (for **OpenAI**) can trigger the **edits** path together with or without `productReferenceUrl`.

**What gets assembled:** platform preamble + `buildPrompt()` output: merged **`description`** + **`basePrompt`**, product-type **prompt parts** (if the campaign has `product_type_id`), style/mood (body overrides campaign), model line if enabled, custom sections, profile **business_name** / logo hints, product-reference line when a resolved URL exists. See `packages/backend/src/services/customerGenerationService.js` and `imageGenerationService.js`.

**Provider routing:** `imageProviders/providerRegistry.js` + `imageProviderRuntime.js`. **OpenAI:** text-only → `POST /v1/images/generations`; **reference** (URLs present) → `POST /v1/images/edits` with fetched images. Other providers use their text path unless extended.

### Sync vs async

- **No `REDIS_URL`** (or `IMAGE_GENERATION_ASYNC=false`): **`201`** + asset in the response body.
- **`REDIS_URL` set**: **`202`** + `jobId` → poll `GET /api/customer/generation-jobs/{{jobId}}` or use Socket.io **before** calling generate (`docs/image-generation-flow.md`).

### Verify

- `GET /api/customer/assets` / `GET /api/customer/assets/:id` — **`image_url`** should be your **Supabase** `generated-images` public URL (the API mirrors OpenAI’s short-lived Azure URLs into Storage on save). Also **`prompt_used`**, optional product-reference columns, **`metadata`** (`generatedAt`, `provider`, `model`, `generationMode`, `openaiRoute`, optional `storagePath`, `originalProviderImageUrl`).
- Supabase table **`generated_images`**.

---

## Phase 4 — Optional: start from a prebuilt

1. `GET /api/customer/campaigns?type=prebuilt` (or `type=all`).
2. **`POST /api/customer/campaigns/:id/clone`** to copy into your workspace, **or** call generate with a prebuilt **`campaignId`** directly.
3. **`POST /api/customer/generate`** with that **`campaignId`**, a **`basePrompt`** and/or relying on **description** after clone, and usually **`productReferenceUrl`** (HTTPS) for a real product reference (prebuilt template URL is not reused automatically).

---

## Scenario spreadsheet

Duplicate **`docs/scenarios/scenario-matrix.template.csv`**, track **`run_status`**, job/asset IDs, and **`notes`** per scenario.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Empty / few dropdown options | Admin **Campaign options** / **`campaign_config_options`** global rows seeded and active. |
| Prompt feels thin | Add **`description`** on the campaign and/or a detailed **`basePrompt`** and/or **`custom_sections`**. |
| **202** but no Socket event | Connect Socket.io **before** `POST /generate`, or poll **generation-jobs**. |
| Image unrelated to text | **`mock`** provider; configure a real image backend. For **OpenAI** text-only, DALL·E does not see reference URLs — use **edits** path (HTTPS `productReferenceUrl` / profile `logo`) or richer text. |
| Insert error on **`generated_images`** | Run migration **`018`**. |
| OpenAI edits / reference fails | **HTTPS** URLs only; GPT Image access / org verification; **`OPENAI_IMAGE_EDIT_MODEL`**. |

---

## Related docs

- [`PRODUCT_AND_FLOWS.md`](./PRODUCT_AND_FLOWS.md)
- [`image-generation-flow.md`](./image-generation-flow.md)
- [`../TESTING.md`](../TESTING.md) — migrations, env, §5.1 image generation checks
- OpenAPI: `http://localhost:3000/api-docs`
