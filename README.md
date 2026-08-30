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
npm run test:e2e   # the critical flows (playwright)
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

## Preview deployment (for internal review)

`.github/workflows/preview.yml` builds on every push to `main` and publishes
`dist/` to the **public** repository `clearlane-preview`, which serves it on
GitHub Pages at `https://alexander-wahlrasmussen.github.io/clearlane-preview/`.
The source stays private; only the built bundle is published — the same bytes
any visitor's browser receives. The site runs entirely on synthetic data with
the mock Ask engine, so it needs no backend and no keys.

One-time setup:

1. Create the empty public repo `alexander-wahlrasmussen/clearlane-preview`.
2. `ssh-keygen -t ed25519 -C preview-deploy -f preview-key -N ""`. Add
   `preview-key.pub` to clearlane-preview → Settings → Deploy keys, ticking
   *Allow write access*. Add the contents of `preview-key` to **this** repo →
   Settings → Secrets → Actions as `PREVIEW_DEPLOY_KEY`. Delete both files.
3. Push to `main` (or run the workflow manually). After the first publish, in
   clearlane-preview → Settings → Pages set the source to branch `gh-pages`, root.
4. Optional: set the repository variable `FEEDBACK_URL` here to point "Give
   feedback" at a Teams channel or form instead of the default mailto.

The build stamp (short commit) is shown in the prototype bar and on the landing
page so feedback can name the build it was seen on. `BASE_PATH` makes the same
build serve under a sub-path; locally it is `/`.

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
