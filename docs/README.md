# Documentation index

| Document | Description |
|----------|-------------|
| [**Product design & user flows**](./PRODUCT_AND_FLOWS.md) | Start here: actors, admin vs customer, system overview, flows, pointers for developers and AI. |
| [**E2E: campaign → image**](./E2E_CAMPAIGN_TO_IMAGE.md) | QA: campaign-options → create campaign → generate; scenario CSV. |
| [**Scenario matrix (CSV)**](./scenarios/scenario-matrix.template.csv) | Template for Excel/Sheets: scenarios, IDs, expected output, run results. |
| [**Image generation**](./image-generation-flow.md) | Prompt assembly, async 202 + Socket.io + job poll, providers. |
| [**ADRs**](./adr/README.md) | Architecture decisions (async delivery, encrypted provider keys). |

OpenAPI is served at **`/api-docs`** when the backend is running.
