# Field catalogue — the 77-field diff

`contracts/fields.json` is the catalogue: one entry per field in `DataFields.csv`, carrying the
source name, header/line position, the mandatory flags per declaration type, the domain path it maps
to, a plain-English label and a proposed detail-tab placement. Regenerate with `npm run fields`
(`scripts/build-field-catalogue.mjs`) rather than hand-editing — the generator fails loudly on an
unmapped source field, a duplicate id or a mapping entry with no CSV row.

| | |
|---|---|
| Fields in the source list | 77 (36 header, 41 line) |
| Already modelled | 40 |
| Modelled, but differently | 6 |
| Not modelled at all | 31 |
| Mandatory per type | import 45, export 36, transit 24 |
| Optional on all three types | 26 |
| Applicability cells (77 × 3 types) | 105 expected, 33 not applicable, 93 optional |

Each field carries a `states` block giving its applicability per declaration type:

- **`expected`** — mandatory here. Absent renders *Not populated*.
- **`optional`** — may legitimately be present or absent. Absent renders *Not available*.
- **`not-applicable`** — never applies to this type. Renders *Not applicable* whether populated or not.

Every domain path claimed in the catalogue was checked to resolve against a real property in
`src/domain/declaration.ts`. The generator fails on an unmapped source field, a duplicate id, a
mapping entry with no CSV row, an override naming an unknown field, and an override that could never
fire. Nothing in `src/` has been changed.

## Five decisions before any of this gets wired up

Each changes what the code should be, not just how much of it there is.

### 1. Currency is per amount, not per declaration — *blocks*

The source carries eight currency fields: item value, transport to border, transport from border,
VAT, duty, excise, invoice, and a `File Currency` whose relationship to the other seven cannot be
inferred from the list. The model has one `Declaration.currency`, and every `Money` on a goods line
inherits it.

A single declaration can therefore hold amounts in different currencies, and today's code would add
them. `sumMoney` throws on mixed currencies, so this surfaces as a crash rather than a wrong number —
but the reconciliation table, the declaration-amounts card and the register summary all assume one
currency per declaration. This is principle #2 at declaration scope rather than portfolio scope.

Deriving applicability surfaced a sharper version of this on transit. `GoodsItem_CustomsValueAmount`
is mandatory on all three types, but `Declaration_RateNumeric` and `Commodity_ValueAmount_CurrencyID`
are both blank on transit — so a transit declaration carries a mandatory customs value with no
declared conversion rate and no item-value currency. `SummaryCards` converts customs value to EUR
using `declaredFxToEur`; for transit that rate will not exist, and principle #2 forbids substituting
any other. Either transit is excluded from the EUR total, or the total is shown per currency.

**Need:** can these currencies actually differ within one declaration in practice, or is the schema
simply more permissive than the data? If they can differ, the totals card cannot show a single
customs value at all. Separately: what currency a transit customs value is denominated in, and what
the register summary should do with it.

### 2. There is no declared total to reconcile against — *blocks*

`Declaration_InvoiceAmount` is the only header-level money field in the whole list. The model has
five declaration-level totals — `customsValueTotal`, `dutyTotal`, `vatTotal`, `transportTotal`,
`insuranceTotal` — and none has a source field.

That guts the current reconciliation. `reconcile()` compares the sum of goods lines against those
totals, but if the totals are themselves computed by summing the same goods lines, the check is a
tautology: it can never fail, and the "✓ Reconciled" badge asserts something it has not tested. The
check that *can* fail is line values summed against the declared `Declaration_InvoiceAmount`, which
is a genuinely independent figure.

**Need:** confirmation that duty and VAT totals really are only ever line sums. If so, reconciliation
should be re-pointed at the invoice amount, and the copy on the other three rewritten to say "summed
from goods lines" rather than "reconciled".

### 3. Confirm the fourteen applicability overrides — *shapes*

*Not applicable* **is** derivable, and the catalogue now derives it. The signal is the contrast
between types: a field mandatory on one type and blank on another is a statement about that type,
not a blank. A field blank on all three is merely optional.

```
mandatory on this type          -> expected
blank here, mandatory elsewhere -> not-applicable
blank on every type             -> optional
```

Thirty-three of the 77 fields carry that contrast, and the default gets the structural cases exactly
right — the families where a declaration type genuinely lacks the concept. On an export, the
consignee is the foreign buyer and no duty or VAT is assessed: `Consignee_EORI`, `TaxBaseAmount`,
`TaxRate`, `Tax_PaymentAmount`, `VATCurrency`, `DutyRate`, `Duty_PaymentAmount`, `DutyCurrency` and
`CustomsValuation_PaymentTermsCode` are all *Not applicable*, derived rather than hard-coded. On an
import, `Consignor_EORI` is *Not applicable* for the mirror reason. Offices of entry and exit and the
acceptance date are transit constructs and fall out the same way.

Where the default is wrong is where a field is a general attribute that merely is not required on
that type. A transit movement can still be filed by a broker; its goods still have an origin, a
package count and a line number; an import still has a country of destination. Calling those *Not
applicable* would assert something false, so fourteen fields are overridden to `optional` in
`STATE_OVERRIDES` (`scripts/build-field-catalogue.mjs`), each with its reason inline. Fields that
deviate carry `statesOverridden` in the catalogue, so every deviation is auditable.

Two of those overrides are judgement calls worth naming. The EORI questions turn on whether a party
is established in the customs territory, not on the declaration type — so on transit, where either
party may be an EU trader, both EORI fields resolve to `optional` rather than *Not applicable*. And
`PresentationOffice` is transit-mandatory in the source, but goods are presented to an office on an
import too, and the model shows the field on every declaration today; it is `optional` on
import and export pending confirmation.

**Need:** a customs SME to check the fourteen overrides, not a new column for all 77. The list is
short and each carries its reasoning.

### 4. Four identifiers and two statuses, undifferentiated — *shapes*

The list carries `MRN`, `Customs ID /MRN`, `Declaration_ReferenceNumber` and `DeclarationNo`; and
both `Declaration_Status` and `DeclarationStatusCode`. The MVP keys the register, the detail route
and every AI evidence link on a single MRN.

**Need:** which identifier is unique per declaration and stable across amendments — that one becomes
the route key. And which of the two status fields drives the register filter.

### 5. Two shipped features have no source field — *blocks*

`legalEntity` drives the entity switcher in the app shell. `customerReference` is displayed on the
References tab and is half of what register search matches on. Neither appears anywhere in the 77.

`UCR_TraderAssignedReferenceID` is the obvious candidate for customer reference, but it sits at line
level in the source and header level in the model, so one declaration may carry several. For legal
entity the nearest thing is `Consignee_EORI` / `Declarant_EORI`, which would make the switcher a
grouping over EORIs rather than a stored attribute.

**Need:** where legal entity comes from — a customer-account mapping outside the declaration feed, or
derived from EORI? The entity switcher is in the shell, so this is on the critical path.

## Six places the UI states more than the data supports

Ordinary fixes rather than decisions, but each is a spot where the source list proves a rendered
claim is wrong — principle #1 problems, not cosmetic ones.

| What | Where | Why |
|---|---|---|
| Declarant and customs broker shown as the same party | `PartiesTab.tsx` | Both rows render `d.broker.name`. `Declaran_Name` / `Declarant_EORI` are mandatory on all three types and `CustomsBroker` is a separate field — different parties, and they can differ. |
| "Origin country" and "Exporting country" render the same value | `PartiesTab.tsx` | Both call `countryLabel(d.originCountry)`. The source separates header-level `Departure_CountryCode` from line-level `Origin_CountryCode`, and origin is per goods line — one declaration can hold several. |
| "Deductions: None declared" hard-coded | `ValuesTab.tsx` | `OtherDiscounts_Deductions` is a real line-level field. Asserting "none declared" without reading it is the claim principle #1 forbids. |
| "Excise: Not applicable" hard-coded | `ValuesTab.tsx` | Four excise fields exist — base, rate, amount, currency — optional on all three types. Optional and absent is *Not available*; *Not applicable* claims excise could never apply. |
| Due-diligence statements described as not supplied by the feed | `ReferencesTab.tsx` | The tab comment and footnote both say so. `Due Diligence Statements` is in the source list, so the copy will be wrong once the field lands. |
| Presentation office shown on every declaration | `PartiesTab.tsx` | Mandatory on transit only, alongside `EntryOfficeID` and `ExitOfficeID`, neither modelled. Transit is the least-served type: only 24 of 77 fields are mandatory for it, and the goods-line number is not among them. |

## Notes on the source list

- `Declaran_Name` is spelled without the `t`. Confirm before the API contract adopts the name.
- The catalogue's `tab` placements for unmodelled fields are proposals awaiting a design pass, not
  decisions. Adding them to the detail view is design scope under CLAUDE.md.
- Four fields the model holds are pure derivations with no source and need no change: `countryName`,
  `commoditySummary`, plus the `assurance` and `attention` blocks, which are our own layer.
