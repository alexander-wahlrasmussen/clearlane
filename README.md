# clearlane — Customs Insights

Prototype implementation of a customs declaration data product for shippers:
declarations filed on the customer's behalf by brokers, across countries and
legal entities, consolidated for their customs & trade compliance team.

Two surfaces, one data layer:

| Surface | Route | Scope |
|---|---|---|
| **MVP** | `/mvp` | Declaration register + full 6-tab declaration detail + CSV/XLSX export. Shippable scope. |
| **AI concept** | `/ai` | Natural-language Ask over the same data — evidence-backed answers, drill-down, report drafting. Exploratory. |

Read `CLAUDE.md` first — it holds the non-negotiable product principles
(the four field states, never summing unlike currencies, declared-rate EUR
equivalents, visible data scope, reconciling totals, evidence-backed AI
answers, plain British English).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 — runs on synthetic data, no backend needed
npm test           # unit tests (vitest)
npm run test:e2e   # the two critical flows (playwright)
npm run typecheck
```

No backend, no keys, no environment setup required for local dev: the
composition root (`src/main.tsx`) wires an in-memory `MockDeclarationsClient`
and a deterministic `MockAskEngine`. Copy `.env.example` to `.env.local` to
point at a real API (`VITE_API_BASE`) or a real model (`VITE_ASK_ENGINE`).

## Layout

```
contracts/openapi.yaml      the API contract (SQL-backed backend, Entra-protected)
docs/                       architecture, Entra External ID wiring, AI orchestration
reference/                  approved design prototypes — source of truth for layout & copy
src/domain/                 FieldValue, Money (integer minor units), Declaration, reconciliation
src/api/                    DeclarationsClient seam, DTOs, mapping, TanStack Query hooks
src/mocks/                  synthetic dataset (DTO-shaped) + in-memory client
src/auth/                   AuthProvider seam (stub now, MSAL/Entra in production)
src/ai/                     AskEngine seam, deterministic answer compute, Claude prompt+tool
src/features/               register / declaration / export / ask UI
src/app/                    shells, router, composition root config
e2e/                        Playwright: register→detail, ask→evidence
```

## The two seams (start any code review here)

- `src/api/declarations-client.ts` — everything the UI reads. Implementations:
  HTTP (against `contracts/openapi.yaml`) and in-memory mock.
- `src/ai/ask-engine.ts` — a model only ever turns a question into a structured
  `Interpretation`; `src/ai/answer-compute.ts` computes every number
  deterministically and emits the complete evidence list.

## Backend & platform assumptions

- Data arrives over an API from a SQL store — the contract is
  `contracts/openapi.yaml`; field-state encoding and money conventions are in
  its description and `docs/architecture.md`.
- The product sits behind CIAM: Microsoft Entra External ID
  (`docs/auth-entra-external-id.md`).
- The Ask surface uses Claude (Anthropic API or Claude on Azure AI Foundry),
  server-side in production (`docs/ai-orchestration.md`). A dev-only
  browser-direct engine exists for demos with a personal API key.

## Deliberate deviations from CLAUDE.md

Documented with rationale in `docs/architecture.md` § Decisions: code-based
route tree (no generated file), in-memory mock instead of MSW, server-side
pagination instead of client virtualisation, native tooltips.

Synthetic data only — no real customers, MRNs, EORIs or values, ever.
