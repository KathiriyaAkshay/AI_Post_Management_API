# ADR 0002: Image providers and encrypted DB credentials

| Field | Value |
|--------|--------|
| **Status** | Accepted |
| **Date** | 2026-03-28 |
| **Deciders** | Product / engineering |

## Context

We need to **switch image backends** (mock, OpenAI, Google, Grok, optional legacy HTTP gateway) for testing and production without redeploying keys every time. We are **not** using Vault/AWS Secrets Manager initially; keys must live in **Postgres encrypted at rest** from the application’s perspective.

## Decision

1. **Singleton settings** table `image_generation_settings` holds **`active_provider`** (`mock`, `openai`, `google`, `grok`, `external_http`).
2. **Per-provider secrets** in `image_provider_credentials`: **AES-256-GCM** with random **12-byte IV** and **auth tag per row**; **master key only in env** (`PROVIDER_KEYS_MASTER_KEY`, 32-byte base64 or 64 hex chars).
3. **Admins** manage keys and active provider via **`/admin/image-generation/*`** (never return plaintext keys in list APIs).
4. **Legacy** env-based HTTP gateway remains: if `IMAGE_GENERATION_USE_EXTERNAL=true` and `IMAGE_GENERATION_API_URL` are set, it **takes precedence** over DB routing so existing stacks keep working until migrated.

## Consequences

### Positive

- One place to flip providers for QA; keys rotatable from admin UI without code changes.
- Ciphertext + IV + tag per row supports **key rotation** (future `key_version` / multiple master keys).

### Negative / trade-offs

- **DB backup + master key** together still recover plaintext — operational discipline required.
- Server must load master key at runtime; **multi-region** needs the same key or a re-encryption story.

## Related

- [ADR 0001 — Async + WebSocket](./0001-async-image-generation-websocket.md)
- [Image generation flow](../image-generation-flow.md)
