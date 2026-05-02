# Backend improvement checklist

Work through phases in order. Check items off as you complete them.

---

## Phase A — Security & correctness

- [x] **A1. CORS** — Replace `origin: ['*']` + `credentials: true` with an explicit allowlist (`localhost` + `FRONTEND_URL` / `CUSTOMER_APP_URL`, optional `CORS_ORIGINS`).
- [ ] **A2. Rate limiting** — Add limits on `/auth/login`, `/api/customer/generate`, `/storage/signed-url` (e.g. `express-rate-limit`).
- [ ] **A3. Security headers** — Add `helmet` (or equivalent) for standard HTTP headers.
- [ ] **A4. `supabaseAdmin` null-safety** — Guard or fail fast when `SUPABASE_SECRET_KEY` is missing on routes that use admin client (`storage`, `assetService`, etc.).

---

## Phase B — API quality

- [ ] **B1. Validate `POST /api/customer/generate`** — `express-validator`: UUIDs, string lengths, enums for style/aspect/mood/gender.
- [ ] **B2. Swagger ↔ code** — Re-scan customer + storage paths; keep OpenAPI in sync after changes.
- [ ] **B3. `/admin` router** — Remove dead `adminRoutes` or document a single admin entry (e.g. customer creation under `/customers` only).

---

## Phase C — Image generation (provider pipeline)

*Runs **after** the agent/orchestrator (Phase E) has produced a finalized prompt + asset plan, unless you start with a minimal linear path.*

- [ ] **C1. Provider module** — Split Gemini / HTTP passthrough behind `IMAGE_GENERATION_PROVIDER` + shared result type `{ imageUrl, width, height, format }`.
- [ ] **C2. ~~Gemini prompt step~~** — *Superseded by Phase E for prompt authoring;* keep a **fallback** linear `buildPrompt` when agent is disabled via env.
- [ ] **C3. Reference images** — Pass `product_reference_url`, optional logo (`profiles.logo` or body override), map to provider limits.
- [ ] **C4. Base64 → storage** — If provider returns bytes, upload to `generated-images` and store public URL.
- [ ] **C5. External HTTP** — Timeouts, retries, structured errors for `callExternalService` / provider clients.

---

## Phase E — Agent-style orchestration (campaign-aware prompts)

Goal: an **orchestrator** (LLM agent or fixed pipeline + LLM) decides **what context is required** for this campaign and **synthesizes the image prompt** so the pixel model gets an instruction matched to the campaign—not only a concatenated string.

### Design sketch

1. **Gather** — Load campaign (name, `visual_style`, `mood`, `aspect_ratio`, `custom_sections`, `product_reference_url`, `thumbnail_url`), profile (`logo`, `business_name`), user text from request. **Fetch DB prompt blocks** via `resolvePromptBlocks({ productTypeId: campaign.product_type_id, categories: ['system','brand',...] })` and pass `combinedText` (or per-block list) into the LLM context.
2. **Classify / plan** — Agent (e.g. Gemini) outputs structured JSON: `{ intent, required_inputs[], optional_inputs[], campaign_fit_notes }` (e.g. “needs product reference for packshot”, “logo optional for brand card”).
3. **Validate** — If `required_inputs` are missing URLs/fields, respond **400** with `{ missing: [...] }` (avoid burning image API credits).
4. **Synthesize** — Second call (or same agent with tools): produce `{ final_image_prompt, negative_prompt?, logo_placement?, reference_roles: { product, logo } }` tailored to **this** campaign.
5. **Execute** — Hand off to Phase C provider with prompt + ordered reference images + dimensions.
6. **Persist** — Save `final_image_prompt`, agent trace/version, and raw inputs snapshot in `generated_images.metadata` for audit and retries.

### Checklist

- [x] **E0. DB prompt building blocks** — Table `prompt_building_blocks` + `resolvePromptBlocks()` + admin CRUD `/admin/prompt-blocks` + `GET .../resolved` (global + per–product-type overrides by `block_key`). Wire into agent / `generateImage` when ready.
- [ ] **E1. Input contract** — Document required vs optional inputs per **campaign type** or **generation mode** (e.g. “social post”, “product hero”).
- [ ] **E2. `GenerationOrchestrator` service** — Single entry from `generateImageHandler`: load context → run agent → return `{ prompt, refs, meta }` or validation error.
- [ ] **E3. Gemini (or chosen LLM) planner** — Structured output schema (JSON mode / response schema) for “what data is needed” + “ready to generate yes/no”.
- [ ] **E4. Gemini prompt writer** — System instructions: respect campaign constraints, brand voice, aspect ratio, safe zones for logo; output final prompt string + structured extras.
- [ ] **E5. Feature flag** — e.g. `IMAGE_GENERATION_AGENT_ENABLED=true`; when `false`, keep current `buildPrompt` path for backward compatibility.
- [ ] **E6. Tests / fixtures** — Golden outputs for 2–3 campaign shapes (with/without product ref, with/without logo).

---

## Phase D — Observability

- [ ] **D1. Structured logging** — Request id + key fields (no secrets); log generation failures distinctly.
- [ ] **D2. Health check** — Optional `GET /health` deep check: Supabase ping or config validation flag.

---

## Quick reference — env vars (image gen)

| Variable | Purpose |
|----------|---------|
| `IMAGE_GENERATION_USE_EXTERNAL` | `true` to call external HTTP provider |
| `IMAGE_GENERATION_API_URL` / `KEY` | Generic `/generate` gateway |
| `IMAGE_GENERATION_MOCK_IMAGE_URL` | Override mock placeholder URL |
| `CORS_ORIGINS` | Comma-separated extra allowed origins (optional) |
| `IMAGE_GENERATION_AGENT_ENABLED` | *(planned)* `true` to use agent orchestration (Phase E) instead of linear `buildPrompt` |

---

*Last updated: Phase E (agent-style orchestration) added. Recommended order: A2/A4 hardening → E2/E5 skeleton + flag → E3/E4 Gemini calls → C1/C3/C4 provider wiring.*
