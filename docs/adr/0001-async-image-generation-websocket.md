# ADR 0001: Async image generation with WebSocket delivery

| Field | Value |
|--------|--------|
| **Status** | Accepted |
| **Date** | 2026-03-28 |
| **Deciders** | Product / engineering |

## Context

Image generation can take a long time. Blocking the HTTP request until the image exists hurts UX (timeouts, frozen UI, poor mobile behavior). Alternatives considered included **Supabase Realtime** (Postgres change subscriptions), **Firebase-style push**, and a **first-party WebSocket** from the Node API to the client.

## Decision

1. **Split accept from work:** When **`REDIS_URL`** is configured, `POST /api/customer/generate` returns **`202 Accepted`** with a **`jobId`** immediately after a **`generation_jobs`** row is inserted and the job is enqueued on **BullMQ**. Without Redis, the same route stays **`201`** synchronous for local dev.
2. **Delivery:** The backend emits **Socket.io** events to the authenticated client when a job **completes** or **fails** (optional: progress). Payloads are documented in OpenAPI as reusable schemas (informational; WebSocket is not an HTTP path in OAS 3.0).
3. **Persistence:** Supabase remains authoritative for **`generated_images`** (and any **`generation_jobs`** table). The WebSocket layer is for **timely UI updates**, not replacing the database.

### Platform system prompt (related)

Customer image generation prepends a **global platform preamble** from **`prompt_building_blocks`** (`block_key = image_gen_platform_system`, `category = system`) when an active row exists (migration `015` seeds a default). There is no application-level string fallback; see `docs/image-generation-flow.md` and Swagger API overview.

## Product context & default infrastructure

**Who uses the product:** Business owners generating images for **social posts, marketplaces, ads, and general marketing** — many small tenants, **moderate** concurrency per tenant, **bursts** during campaigns, not hyperscale social feeds.

**What matters most:** reliable completion (retries on flaky image APIs), **fair usage / rate limits**, predictable cost, and **low operational surface area** — not building a company-wide event bus on day one.

### Recommended stack for Nexus Hub

| Concern | Default choice | Why |
|---------|----------------|-----|
| Auth, relational data, storage | **Supabase** (existing) | Single source of truth for users, campaigns, assets, files. |
| **Background image jobs** | **Redis-backed queue** (e.g. **BullMQ**) | Durable jobs, retries with backoff, concurrency per user, dead-letter–style handling — fits “long API call” work without a second message broker. Job rows in Postgres can still mirror status for support and idempotency. |
| **Multi-instance WebSockets** | **Redis + Socket.io adapter** | Same Redis deployment can serve **both** BullMQ and the adapter (different key namespaces / logical separation). |
| **RabbitMQ** | **Defer** | Only add if you need AMQP-specific patterns, strict multi-protocol routing, or an org mandate — not required for SMB image generation. |
| **Kafka** | **Defer** | Reserved for a future where you need **very high-volume streams**, **replay across many services**, or a central analytics/event platform — not for “notify one user their image is ready.” |

**Summary:** For an **end-user SMB / creator** product, **Supabase + Node + WebSocket + one Redis** (jobs + socket fan-out) is the right default. **Do not introduce RabbitMQ or Kafka** until concrete product or scale requirements appear (e.g. multi-region event sourcing, dedicated data team consuming all domain events).

## Consequences

### Positive

- Predictable contract for Studio: connect WS → POST generate → show spinner → handle `generation.completed` / `generation.failed`.
- No dependency on Supabase Realtime for this flow; same auth story as the REST API (JWT on socket handshake).
- Easier to attach **domain-specific events** (progress, partial previews) without coupling to table shapes.

### Negative / trade-offs

- **Operational:** if you run **multiple Node replicas**, a WebSocket is pinned to **one** process while HTTP/workers may hit **another** — you need a **coordination strategy** (see below).
- **Documentation:** OpenAPI does not model WebSocket endpoints; we document event shapes in **components/schemas** and narrative in Swagger + this ADR. A future **AsyncAPI** spec can be added if multiple teams consume the socket.

### Horizontal scaling — coordination options

| Approach | Idea | When it fits |
|----------|------|----------------|
| **Redis pub/sub + adapter** | Any replica publishes “notify job/user X”; the replica that holds the socket subscribes and emits locally. Socket.io: `@socket.io/redis-adapter`. Plain `ws`: same pattern with a small channel naming convention. | **Default** once you have 2+ app instances and need even load. |
| **Sticky sessions** | Load balancer ties a client (cookie or IP) to **one** instance for HTTP + WS. | **Early** multi-instance setups; watch deploys, mobile networks, and hot spots. |
| **Dedicated WS service** | Only one (or a tiny fixed pool) of nodes handle sockets; scale HTTP/workers separately. | Middle ground when you want to defer Redis but avoid cross-talk. |
| **Managed realtime** | Workers call vendor API to push to a channel; clients use vendor SDK. | When you want to outsource fan-out and ops entirely. |

**Suggested path for this project:** single instance or sticky sessions until traffic requires it, then **Redis + Socket.io adapter** (or equivalent pub/sub) so workers on any node can signal completions without caring which node owns the socket.

### Follow-up

- Apply migration **`014_create_generation_jobs_table.sql`** and configure **`REDIS_URL`** for async mode.
- ~~Implement WS server~~ **Done:** Socket.io on **`/socket.io`**, JWT via `handshake.auth.token` or `Authorization: Bearer` (or query `token` / `access_token`), room `user:<id>`.
- ~~BullMQ worker~~ **Done:** queue `image-generation`, emits after `generation_jobs` + `generated_images` update.
- When running **>1** app replica, keep **Redis + Socket.io adapter** (already used when `REDIS_URL` is set).

## Related documents

- [Image generation UX and architecture](../image-generation-flow.md)
- [ADR 0002 — Image providers and encrypted credentials](./0002-image-providers-encrypted-credentials.md)
