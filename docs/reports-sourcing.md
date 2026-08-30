# The eight reports — sourcing and surface

Assessment of the report list in `Todo.txt` against `contracts/fields.json`. The note that prompted
it ends "Its believed that these reports can be created by having the 77 fields" — that belief holds
for three of the eight. The feed is confirmed as customs declarations only.

## Verdict

| Report | From the 77 alone? | What is missing | Customer could supply it? |
|---|---|---|---|
| Declaration Summary | **Yes** | — | n/a |
| Declaration Line Overview | **Yes** | — | n/a |
| Order/Declaration status | **Mostly** | `OrderDate` is optional everywhere; two undisambiguated status fields | Order data, yes — but see the join-key problem |
| VAT Reports | **No** | The entity's VAT registration number | **Yes, trivially** — a static list, one per entity per country |
| MDR (Manifest Discrepancy) | **No** | The manifest itself; no manifest field exists | Probably — but it is a per-shipment feed, not a reference list |
| MCD (Material Compliance) | **No** | Product/material composition and compliance statements | Yes, from product master — joined on article number |
| EC Sales | **Never** | Intra-EU supplies and counterparty VAT numbers | Comes from their sales ledger, not from customs data |
| Intrastat | **Never** | Intra-EU arrivals and dispatches | Comes from their ERP goods movements |

## The two that are the wrong source

Intrastat and EC Sales both concern **intra-EU** movements. Intra-EU trade produces no customs
declaration — Intrastat exists precisely to fill that gap. A feed of customs declarations therefore
cannot produce either, and no number of additional fields changes that. The Intrastat-shaped fields
that are present (`TransactionNatureCode`, `TariffQuantity`, `NetMass`, `IncoTerms_ConditionCode`)
describe the extra-EU movements we do hold, which is the trade Intrastat excludes.

There is one adjacent case worth naming so it is not mistaken for a route in: goods released to free
circulation in one member state and then moved to another do create an Intrastat obligation. The
declaration is still made from the onward intra-EU movement, not from the customs entry, so the
customs record is at best a cross-check.

Both belong in the customer's ERP or VAT engine. Offering them here would be a claim the data cannot
support.

## The join-key problem

Three reports become possible if the customer supplies data they already hold. But each needs a key
to join on, and **every candidate key except the MRN and the commodity code is optional on all three
declaration types**:

| Key | Position | Applicability | Joins to |
|---|---|---|---|
| `MRN` | header | expected / expected / expected | anything shipment-level |
| `Commodity_Classification_ID` | line | expected / expected / expected | tariff and compliance data |
| `Customs ID /MRN` | header | expected / expected / optional | — |
| `DeclarationNo` | header | expected / expected / optional | — |
| `UCR_TraderAssignedReferenceID` | line | optional / optional / optional | the customer's consignment records |
| `Declaration_ReferenceNumber` | header | optional / optional / optional | the customer's order records |
| `ArticleNumber` | line | optional / optional / optional | the customer's product master |
| `OrderDate` | header | optional / optional / optional | — |

So the natural key to a purchase-order system (`UCR` or `Declaration_ReferenceNumber`) and the
natural key to a product master (`ArticleNumber`) are both fields the source may simply not carry.
Any joined report will have holes wherever the key is absent, and its coverage cannot be promised in
advance — it has to be measured and stated, per principle #3.

This also runs straight into open decision 5 in `field-catalogue.md`: `customerReference`, which the
register already searches on, has no source field at all. Settling which identifier is the customer's
own reference is a prerequisite for every customer-data join, not just a tidy-up.

Ranked by effort against value:

1. **VAT Reports** — unblocked by a static entity-to-VAT-number mapping. A configuration gap, not a
   data gap, and no per-declaration join is needed. Clearly the best return.
2. **MCD** — needs a product compliance extract joined on `ArticleNumber`. Feasible, but the join key
   is optional and this is product data rather than trade data; it may belong in a different product.
3. **MDR** — needs structured manifest data per shipment, keyed on MRN. The key is solid; the
   integration is not a reference list but an ongoing feed, and clearlane deliberately does not store
   declaration documents.

## Reports or filters?

All three of the clean reports are projections of data the register already serves, so a separate
page per report would duplicate it and risk the register and the report disagreeing — which under
principle #4 is worse than not shipping the report.

**Recommendation: named saved views, surfaced as "Reports".** One register, configured three ways,
rather than three surfaces:

- A **grain toggle** — declaration rows or goods-line rows. This is the only genuinely new capability
  of the three: Declaration Line Overview is the register at line grain, which the UI cannot do today
  (the export already can, optionally).
- A **column picker** driven by `contracts/fields.json`. The catalogue already carries a label, a tab
  placement and an export flag per field, so the column set is data, not code.
- **Export exports what is on screen.** Today the export column set is fixed and unrelated to the
  current view, which is a real inconsistency and gets fixed for free.
- A saved view = filter + columns + grain + a name. "Declaration Summary" and "Order status" are then
  configuration, and report nine costs nothing to add.

Keep calling them reports in the UI. That is the customer's word for them, and principle #7 says the
user's vocabulary wins over ours.

A dedicated report page earns its place only where the output has a prescribed statutory shape — a
VAT return, an Intrastat submission — because those are a fixed layout rather than a filtered table.
None of the three clean reports is one of those, and the ones that are cannot be sourced here.

## Partial reports

A report does not have to be complete to be worth shipping, provided its coverage is stated rather
than implied — that is principle #3 doing its job rather than an exception to principle #1.

- **VAT Reports over imports only.** Duty and VAT are `not-applicable` on export and transit, so an
  import-only VAT report is not a partial report at all — it is the whole of what a VAT report can
  mean over declaration data. It still needs the entity VAT number before it can be filed against
  anything.
- **MCD over the lines that carry an article number.** `ArticleNumber` is optional, so the join will
  not reach every line. A report that names its own coverage — "1,204 of 1,486 goods lines could be
  matched to a product record" — is useful; one that silently reports on the matched subset is not.
- **MDR over the shipments with a manifest.** Same shape: honest if the unmatched shipments are
  counted and shown, misleading if they are dropped.

The rule that makes these safe is the one already in the product: state the denominator. A partial
report must say what it could not cover and why, in the same place it shows the result — not in a
footnote and not in the docs.

This does not rescue Intrastat or EC Sales. Those are not partially covered by declaration data;
they are covered by none of it.

## What is built

The grain toggle and catalogue-driven column picker are in (`src/features/register/columns.tsx`,
`ColumnPicker.tsx`). The register serves both grains from `DeclarationsClient.listGoodsLines`,
paginated by line, and every column either names a field in `contracts/fields.json` — taking its
label from there — or is marked `derived` in the picker with a note saying why it has no source
field. The two derived-and-unsourced columns are `Customer reference` and the summed totals, which
is decisions 5 and 2 made visible in the UI rather than buried.

Saved views are in (`views.ts`, `saved-views-store.ts`, `ReportBar.tsx`, `features/reports/`). A view
is grain + columns + filters + sort + a name; the legal-entity selector is deliberately outside it. The
three clean reports ship as built-in views, the "Reports" nav item lists them beside the user's own,
and `?view=<id>` on the register URL opens one, so a report is a link. A built-in view can be opened
and adjusted but not changed in place — adjustments are saved as the user's own. User views live in
localStorage for the prototype (docs/architecture.md, decision 5). The Reports page also names the
five requested reports that are not offered, with the reason, so the limitation is in the UI rather
than in this document alone (principle #3).

Export follows the view (`export-rows.ts`). Every column in the registry carries an `exportValue`
beside its `render`, so the file is the visible columns in the visible order, at the visible grain,
over the full filtered set in the on-screen sort. Field states export as their labels — never a
blank or a zero — and a Currency column is added whenever an amount is written and the user has not
chosen it. Declaration totals are only offered at declaration grain, so a goods-line file cannot
repeat a header total on every line; that is what makes a line export safe to sum. The declaration
detail page's export writes every column of the grain, since a single-declaration export is a full
record rather than a view.

## Suggested order

1. ~~Grain toggle plus catalogue-driven column picker.~~ Done.
2. ~~Saved views, shipped with Declaration Summary, Declaration Line Overview and Order/Declaration
   status preconfigured; export follows the view.~~ Done.
3. Take the entity-to-VAT-number mapping to the customer; VAT Reports follows once it exists.
4. Settle the identifier question (decision 4 and 5) before committing to MCD or MDR.
5. Tell the customer plainly that Intrastat and EC Sales are not derivable from declaration data.

