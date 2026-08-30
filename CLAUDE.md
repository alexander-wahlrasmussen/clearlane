# CLAUDE.md — clearlane

Working agreement for Claude Code in this repo. Read fully before writing code.

## What this is

**clearlane** is a prototype of a customs declaration data product for shippers. A customer's
customs declarations (filed on their behalf by brokers, across multiple countries and legal
entities) are consolidated into one place so their customs & trade compliance team can find,
inspect, verify and export them.

Two product surfaces are being prototyped in parallel:

| Surface | Route | Description |
|---|---|---|
| **MVP** | `/mvp` | Table-first declaration register + full declaration detail view. This is the shippable scope. |
| **AI concept** | `/ai` | The MVP's register and declaration view, hosted unchanged, with the Reports page replaced by a natural-language "Ask" surface: answers with evidence drill-down, reports as extract answers, report drafting. Exploratory. |

Both read the **same data layer**. Never fork the data model per surface — and never re-implement an
MVP feature on the AI side: host the same component (`docs/architecture.md`, decision 6).

## Non-negotiable product principles

These came out of design review and are the reason the product is credible. Do not "improve" them away.

1. **Never assert data quality you cannot prove.** Every value is either real, or explicitly
   labelled with one of four states: `Not applicable`, `Not available`, `Not populated`,
   `Not verified`. No blanks, no zeros standing in for unknowns, no invented placeholders.
2. **Never sum unlike currencies.** Values display in the declared currency by default. EUR
   equivalents use only the conversion rate declared on that declaration — never a live FX feed.
3. **Data scope is always visible.** Available period, countries, declaration types, last-refresh
   timestamp and known limitations are surfaced in the UI, not buried in docs.
4. **Totals must reconcile.** Goods lines sum exactly to declaration totals, and the UI states
   whether they do. A mismatch is shown, not hidden.
5. **No advice, no predictions.** The product reports what was declared. It does not tell users
   what their duty *should* be, classify goods, or flag "risk".
6. **AI answers are evidence-backed only.** Every generated answer links to the exact underlying
   declarations it was computed from. No answer without a drill-down path. If the data cannot
   support the question, say so.
7. **Language is plain and British English.** "Not yet released", not "PENDING_RELEASE".
   Never expose internal codes without a human label.

## Domain glossary

- **MRN** — Movement Reference Number; unique id customs assigns to a declaration.
- **EORI** — trader registration id used by customs.
- **UCR** — Unique Consignment Reference; trader-assigned.
- **Customs value** — invoice value + transport + insurance to the border. Duty base.
- **Goods line** — one commodity item within a declaration. A declaration has 1..n.
- **Commodity code** — tariff classification; determines duty rate.
- **Preference** — reduced/zero duty claimed under a trade agreement.
- **Declaration types** — `import`, `export`, `transit`.
- **Statuses** — Released, Amended, Under customs control, Awaiting release, In transit, Completed.

## Stack

- **React + TypeScript + Vite**
- **TanStack Router** (file-based) and **TanStack Query** for server state
- **TanStack Table** for the register and goods-line tables (virtualised; declarations reach
  tens of thousands of rows in production)
- Plain CSS modules or vanilla-extract. **No Tailwind, no component library** — the visual
  language is specific and already defined (see below).
- **Vitest** + Testing Library. **Playwright** for the two critical flows.
- API: in-memory mock client behind a typed `DeclarationsClient` interface (see
  `contracts/openapi.yaml` for the real backend contract — SQL-backed, behind
  Microsoft Entra External ID). Keep all data access behind that one interface.

## Design tokens (lifted from the approved designs — use exactly)

```
Ink            #1D1F21     Muted ink      #5F6368    Label ink   #6B6E72
Faint ink      #8A8D91     App bg         #F5F6F8    Surface     #FFFFFF
Subtle bg      #F9FAFB     Border        #E1E4E8    Border 2    #D5D9DE
Accent         #1E5A8A     Accent hover  #17466C    Accent tint #E9F0F7
Positive       #1E7A46     Warning ink   #9A5B00    Warning bg  #FDF3E1
Warning border #F0DFC0     Negative      #B3261E    Negative bg #FBEAE9
```

- Type: **Instrument Sans** (UI), **Spline Sans Mono** (MRNs, EORIs, references, codes).
- Base font-size 14px (13px in tables), radius 5–6px, 1px borders, no drop shadows except
  overlays/drawers.
- All numerics: `font-variant-numeric: tabular-nums`.
- Dense, information-first, no decorative gradients or illustration.

## Data model

Port the shapes in `reference/customs-data.js` verbatim — they are the agreed contract:
`Declaration` (with `assure: { received, processed, updated, verification, missing[] }`),
`GoodsLine`, `Country`. The `§na` / `§np` / `§nav` / `§unv` sentinel values encode the four
field states; convert them to a discriminated union `FieldValue<T>` on the way in, so the four
states are impossible to forget at render time.

Synthetic data only in this repo. No real customers, MRNs, EORIs or values, ever — even in tests.

## Build order

1. Data layer: types, `FieldValue`, `DeclarationsClient` interface, synthetic generator, MSW handlers.
2. Shell: app frame, entity switcher, last-refreshed indicator, nav, loading + error states.
3. MVP register: filters, search, chips, sort, pagination/virtualisation, summary cards, data-scope panel.
4. MVP declaration detail: six tabs (Summary, Parties & movement, Goods lines, Values & duties,
   References, Data availability), with expandable goods lines and reconciliation check.
5. Export: CSV + XLSX, declaration rows and optional goods-line rows, totals never double-counted.
6. AI surface: Ask input, answer rendering, evidence drawer, declaration drawer, report draft.

Ship 1–5 before starting 6.

## Conventions

- Strict TS. No `any`, no non-null `!` on API data.
- Money and quantities are integers in minor units where possible; never floats for duty/VAT.
- Dates: ISO `YYYY-MM-DD` in state, formatted `26 Aug 2026` in UI. Timestamps always show UTC.
- Every interactive element keyboard-reachable with a visible focus ring (`2px solid #1E5A8A`).
- Tables: real `<table>` semantics or correct ARIA grid roles — the design's CSS grid rows must
  not lose screen-reader structure.
- Commits: conventional commits. One concern per PR.

## Things to ask before doing

- Adding a metric, chart or dashboard not in the approved designs.
- Anything that infers, scores, ranks or predicts.
- Changing currency handling or the four field states.
- Adding a dependency beyond the stack above.

## Reference material

`reference/` holds the approved design prototypes (`Customs Insights MVP.dc.html`,
`Customs Insights AI Concept.dc.html`, `customs-data.js`). They are the source of truth for
layout, copy and behaviour. Read the copy literally — the wording was reviewed.
