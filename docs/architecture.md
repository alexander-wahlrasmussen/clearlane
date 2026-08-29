# Architecture

Two product surfaces, one data layer. Nothing forks the data model per surface.

```
┌─ src/features ────────────────────────────────────────────────┐
│  register/   declaration/   export/        ask/               │  UI (React, CSS modules)
└──────┬──────────────┬──────────┬──────────────┬───────────────┘
       │              │          │              │
┌──────▼──────────────▼──────────▼──────┐  ┌────▼─────────────────┐
│ src/api — DeclarationsClient (seam)   │  │ src/ai — AskEngine    │
│  queries.tsx (TanStack Query hooks)   │  │  answer-compute.ts    │
│  http-declarations-client.ts          │  │  (deterministic)      │
│  mapping.ts (DTO → domain)            │  │  claude-ask-engine.ts │
└──────┬────────────────────────────────┘  │  mock-ask-engine.ts   │
       │                                   └────┬─────────────────┘
┌──────▼────────────────────────────────────────▼─────────────────┐
│ src/domain — FieldValue, Money, Declaration, reconciliation     │  pure, no React
└─────────────────────────────────────────────────────────────────┘
   src/mocks — synthetic DTOs + MockDeclarationsClient (local dev)
   src/auth  — AuthProvider seam (Entra External ID in production)
   src/main.tsx — composition root: the only place implementations are chosen
```

## The two seams

**`DeclarationsClient`** (src/api/declarations-client.ts) is the only way the UI
reads data. `HttpDeclarationsClient` implements it against
`contracts/openapi.yaml`; `MockDeclarationsClient` implements it in memory over
the synthetic dataset. Both run wire DTOs through the same `mapping.ts`, so the
sentinel → `FieldValue` conversion is always exercised.

**`AskEngine`** (src/ai/ask-engine.ts) turns a question into a structured
`Interpretation` — that is all a model ever does. Numbers are computed by
`answer-compute.ts`, pure functions that also emit the complete evidence MRN
list. Editing interpretation chips recomputes without a model call
(`POST /ask/compute` in production).

## Where the Microsoft stack lands

- **SQL**: the backend owns it. The wire contract encodes what the UI needs —
  minor-unit integers, field-state sentinels, the declared FX rate per
  declaration. A natural SQL encoding is a nullable column plus a `*_state`
  discriminator (`OK / NA / NP / NAV / UNV`); the API layer folds the pair into
  the sentinel convention.
- **CIAM**: Entra External ID — see docs/auth-entra-external-id.md.
- **LLM hosting**: Claude via the Anthropic API or via Azure AI Foundry —
  see docs/ai-orchestration.md.

## Decisions (deviations from CLAUDE.md, made deliberately)

1. **Code-based route tree** instead of file-based TanStack Router: same
   library, no generated `routeTree.gen.ts` artifact committed. Flip to the
   vite plugin later without moving files.
2. **In-memory mock client** instead of MSW: the seam CLAUDE.md actually
   mandates is `DeclarationsClient`; an in-memory implementation avoids the
   generated service-worker file and is directly reusable in tests. MSW can be
   layered on later to exercise the HTTP client itself.
3. **Server-side pagination instead of client virtualisation**: production
   reaches tens of thousands of rows, so the register asks the API for pages
   (`page`/`pageSize`, capped at 500). TanStack Table runs in fully manual
   mode. Virtualise only if a "load all" view is ever required.
4. **Native `title` tooltips** for term explanations (MRN, EORI, UCR…): the
   dotted-underline affordance from the design is kept; a custom tooltip
   component is a straightforward later swap.

## Invariants the code enforces

- `Money` is integer minor units; `sumMoney` throws on mixed currencies.
- EUR equivalents only ever use `declaredFxToEur` from the same declaration.
- `FieldValue<T>` makes the four field states impossible to forget at render
  time; `FieldCell` renders a labelled chip, never a blank.
- `reconcile()` compares goods-line sums to declaration totals exactly, and
  both detail tabs state the result — a mismatch is shown, not hidden.
- Every AI answer carries `evidenceMrns` — the exact declarations it was
  computed from; the evidence drawer lists every one.
