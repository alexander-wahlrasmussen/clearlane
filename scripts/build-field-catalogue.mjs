import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Hand-authored mapping, keyed by the exact UCC source field name in DataFields.csv.
 *   id       stable snake_case id used by code
 *   domain   dotted path in src/domain/declaration.ts, or null if unmodelled
 *   coverage modelled | partial | new
 *   label    plain British English UI label (principle #7)
 *   tab      proposed detail-tab placement
 *   format   text | mono | number | money | currency | date | percent | code
 *   export   include as a default export column
 *   note     anything a reader needs to know
 */
const MAP = {
  ClearanceDate: { id: 'clearance_date', domain: 'clearanceDate', coverage: 'modelled', label: 'Clearance date', tab: 'summary', format: 'date', export: true },
  Declaration_Status: { id: 'declaration_status', domain: 'status', coverage: 'modelled', label: 'Status', tab: 'summary', format: 'text', export: true },
  DeclarationType: { id: 'declaration_type', domain: 'type', coverage: 'modelled', label: 'Declaration type', tab: 'summary', format: 'text', export: true },
  MRN: { id: 'mrn', domain: 'mrn', coverage: 'modelled', label: 'MRN', tab: 'references', format: 'mono', export: true },
  OtherInfo: { id: 'other_info', domain: null, coverage: 'new', label: 'Other information', tab: 'references', format: 'text', export: false, note: 'Free text. Optional on every type.' },
  Declaration_ReferenceNumber: { id: 'declaration_reference_number', domain: null, coverage: 'new', label: 'Declaration reference', tab: 'references', format: 'mono', export: false, note: 'Distinct from DeclarationNo and Customs ID /MRN. Which of the four identifiers the register should key on is an open question.' },
  Agent_Role_Code: { id: 'agent_role_code', domain: null, coverage: 'new', label: 'Agent role', tab: 'parties', format: 'code', export: false, note: 'Coded value — needs a label lookup before it can be shown (principle #7).' },
  Consignor_Name: { id: 'consignor_name', domain: 'exporter.name', coverage: 'modelled', label: 'Consignor / seller', tab: 'parties', format: 'text', export: true },
  Consignor_EORI: { id: 'consignor_eori', domain: 'exporter.eori', coverage: 'modelled', label: 'Consignor EORI', tab: 'parties', format: 'mono', export: false, note: 'Mandatory on export only — on import the consignor is typically non-EU and holds no EORI.' },
  Consignee_Name: { id: 'consignee_name', domain: 'importer.name', coverage: 'modelled', label: 'Consignee / buyer', tab: 'parties', format: 'text', export: true },
  Consignee_EORI: { id: 'consignee_eori', domain: 'importer.eori', coverage: 'modelled', label: 'Consignee EORI', tab: 'parties', format: 'mono', export: false, note: 'Mandatory on import only — mirror of Consignor_EORI.' },
  Declaran_Name: { id: 'declarant_name', domain: null, coverage: 'new', label: 'Declarant', tab: 'parties', format: 'text', export: true, note: 'Source spells this "Declaran_Name" (missing t) — confirm before the API contract fixes the name. Distinct from CustomsBroker; the UI currently shows the broker under both labels.' },
  Declarant_EORI: { id: 'declarant_eori', domain: null, coverage: 'new', label: 'Declarant EORI', tab: 'parties', format: 'mono', export: false, note: 'Currently rendered from broker.eori, which is a different party.' },
  CustomsBroker: { id: 'customs_broker', domain: 'broker.name', coverage: 'partial', label: 'Customs broker', tab: 'parties', format: 'text', export: true, note: 'broker.eori has no counterpart in the source list.' },
  Departure_CountryCode: { id: 'departure_country', domain: 'originCountry', coverage: 'partial', label: 'Country of departure', tab: 'parties', format: 'text', export: true, note: 'Header-level departure country. The UI also labels this "Origin country", which is the line-level Origin_CountryCode — two different things.' },
  DestinationCountryCode: { id: 'destination_country', domain: 'destinationCountry', coverage: 'modelled', label: 'Country of destination', tab: 'parties', format: 'text', export: true },
  DeclarationCountry: { id: 'declaration_country', domain: 'countryCode', coverage: 'modelled', label: 'Declaration country', tab: 'summary', format: 'text', export: true },
  BorderTransportMeans_ModeCode: { id: 'transport_mode', domain: 'transportMode', coverage: 'modelled', label: 'Border transport mode', tab: 'parties', format: 'text', export: false },
  IncoTerms_ConditionCode: { id: 'incoterms', domain: 'incoterms', coverage: 'modelled', label: 'Incoterms', tab: 'summary', format: 'code', export: true },
  IncoTerms_LocationID: { id: 'incoterms_location', domain: null, coverage: 'new', label: 'Incoterms place', tab: 'summary', format: 'text', export: false, note: 'Import-mandatory. Incoterms are meaningless without the named place.' },

  DeclarationLineNo: { id: 'line_no', domain: 'lines[].lineNo', coverage: 'modelled', label: 'Line', tab: 'goods', format: 'number', export: true, note: 'Not mandatory on transit — transit lines may be unnumbered.' },
  Commodity_Classification_ID: { id: 'commodity_code', domain: 'lines[].commodityCode', coverage: 'modelled', label: 'Commodity code', tab: 'goods', format: 'mono', export: true },
  Origin_CountryCode: { id: 'origin_country', domain: 'lines[].originCountry', coverage: 'modelled', label: 'Country of origin', tab: 'goods', format: 'text', export: true },
  Procedure_Code: { id: 'procedure_code', domain: 'lines[].procedure', coverage: 'modelled', label: 'Procedure', tab: 'goods', format: 'code', export: true },
  DutyTaxFee_DutyRegimeCode: { id: 'duty_regime_code', domain: 'lines[].preference', coverage: 'modelled', label: 'Preference', tab: 'goods', format: 'code', export: false },
  GrossMass: { id: 'gross_mass', domain: 'lines[].grossKg', coverage: 'modelled', label: 'Gross mass', tab: 'goods', format: 'number', export: false },
  NetMass: { id: 'net_mass', domain: 'lines[].netKg', coverage: 'modelled', label: 'Net mass', tab: 'goods', format: 'number', export: false },
  ArticleNumber: { id: 'article_number', domain: 'lines[].sku', coverage: 'modelled', label: 'Article number', tab: 'goods', format: 'mono', export: false },
  Commodity_Description: { id: 'commodity_description', domain: 'lines[].description', coverage: 'modelled', label: 'Description', tab: 'goods', format: 'text', export: true },
  Commodity_ValueAmount_CurrencyID: { id: 'item_value_currency', domain: null, coverage: 'new', label: 'Item value currency', tab: 'values', format: 'currency', export: true, note: 'Per-line currency. The model holds a single Declaration.currency — see the currency finding.' },
  Declaration_RateNumeric: { id: 'declared_fx_rate', domain: 'declaredFxToEur', coverage: 'modelled', label: 'Declared conversion rate', tab: 'values', format: 'number', export: false, note: 'The only rate ever used for EUR equivalents (principle #2). Not mandatory on transit.' },
  TransportCosts_ToBorder: { id: 'transport_to_border', domain: 'lines[].transportCosts', coverage: 'modelled', label: 'Transport costs to border', tab: 'values', format: 'money', export: false },
  TransportCosts_ToBorder_Currency: { id: 'transport_to_border_currency', domain: null, coverage: 'new', label: 'Transport (to border) currency', tab: 'values', format: 'currency', export: false },
  TransportCosts_FromBorder: { id: 'transport_from_border', domain: null, coverage: 'new', label: 'Transport costs from border', tab: 'values', format: 'money', export: false, note: 'Post-border transport — excluded from the customs value. Showing it next to the to-border figure prevents a common misreading.' },
  TransportCosts_FromBorder_Currency: { id: 'transport_from_border_currency', domain: null, coverage: 'new', label: 'Transport (from border) currency', tab: 'values', format: 'currency', export: false },
  TaxBaseAmount: { id: 'vat_base', domain: null, coverage: 'new', label: 'VAT base', tab: 'values', format: 'money', export: false, note: 'The base VAT was charged on. Without it a user cannot check the VAT figure.' },
  TaxRate: { id: 'vat_rate', domain: 'lines[].vatRatePct', coverage: 'modelled', label: 'VAT rate', tab: 'values', format: 'percent', export: false },
  Tax_PaymentAmount: { id: 'vat_amount', domain: 'lines[].vatAmount', coverage: 'modelled', label: 'VAT', tab: 'values', format: 'money', export: true },
  VATCurrency: { id: 'vat_currency', domain: null, coverage: 'new', label: 'VAT currency', tab: 'values', format: 'currency', export: false, note: 'VAT may be denominated separately from the item value.' },
  GoodsItem_CustomsValueAmount: { id: 'customs_value', domain: 'lines[].customsValue', coverage: 'modelled', label: 'Customs value', tab: 'values', format: 'money', export: true },
  DutyRate: { id: 'duty_rate', domain: 'lines[].dutyRatePct', coverage: 'modelled', label: 'Duty rate', tab: 'values', format: 'percent', export: false },
  Duty_PaymentAmount: { id: 'duty_amount', domain: 'lines[].dutyAmount', coverage: 'modelled', label: 'Duty', tab: 'values', format: 'money', export: true },
  DutyCurrency: { id: 'duty_currency', domain: null, coverage: 'new', label: 'Duty currency', tab: 'values', format: 'currency', export: false },
  GoodsItem_ExciseValueAmount: { id: 'excise_base', domain: null, coverage: 'new', label: 'Excise base', tab: 'values', format: 'money', export: false },
  ExciseRate: { id: 'excise_rate', domain: null, coverage: 'new', label: 'Excise rate', tab: 'values', format: 'percent', export: false },
  Excise_PaymentAmount: { id: 'excise_amount', domain: 'lines[].excise', coverage: 'partial', label: 'Excise', tab: 'values', format: 'money', export: false, note: 'ValuesTab hard-codes "Excise: Not applicable" at declaration level — excise is optional on all three types, so absence is Not available, not Not applicable.' },
  ExciseCurrency: { id: 'excise_currency', domain: null, coverage: 'new', label: 'Excise currency', tab: 'values', format: 'currency', export: false },
  'File Currency': { id: 'file_currency', domain: null, coverage: 'new', label: 'File currency', tab: 'values', format: 'currency', export: false, note: 'A fifth currency alongside item / transport / VAT / duty / excise. Its relationship to the others needs defining before any total can be displayed.' },

  DeclarationProcedure: { id: 'declaration_procedure', domain: null, coverage: 'new', label: 'Declaration procedure', tab: 'summary', format: 'code', export: false, note: 'Header-level procedure, distinct from the line-level Procedure_Code.' },
  'Customs ID /MRN': { id: 'customs_id', domain: null, coverage: 'new', label: 'Customs ID', tab: 'references', format: 'mono', export: false, note: 'A second MRN-like identifier. Overlap with MRN needs resolving.' },
  DeclarationNo: { id: 'declaration_no', domain: 'declarationNumber', coverage: 'modelled', label: 'Declaration number', tab: 'references', format: 'mono', export: true },
  DeclarationStatusCode: { id: 'declaration_status_code', domain: null, coverage: 'new', label: 'Status code', tab: 'availability', format: 'code', export: false, note: 'A second status field alongside Declaration_Status. Which one drives the register filter is an open question.' },
  OrderDate: { id: 'order_date', domain: null, coverage: 'new', label: 'Order date', tab: 'summary', format: 'date', export: false },
  TaxationDate: { id: 'taxation_date', domain: null, coverage: 'new', label: 'Taxation date', tab: 'values', format: 'date', export: false, note: 'The date duty and VAT were assessed — the date a finance team reconciles against, and not the same as the clearance date.' },
  AcceptedDate: { id: 'accepted_date', domain: null, coverage: 'new', label: 'Accepted date', tab: 'summary', format: 'date', export: false, note: 'Transit-mandatory.' },
  ReleaseDate: { id: 'release_date', domain: 'releaseDate', coverage: 'modelled', label: 'Release date', tab: 'summary', format: 'date', export: true, note: 'null renders "Not yet released", never a blank.' },
  ExitOfficeID: { id: 'exit_office', domain: null, coverage: 'new', label: 'Office of exit', tab: 'parties', format: 'mono', export: false, note: 'Transit-mandatory. Transit movements are currently the least-modelled type.' },
  EntryOfficeID: { id: 'entry_office', domain: null, coverage: 'new', label: 'Office of entry', tab: 'parties', format: 'mono', export: false, note: 'Transit-mandatory.' },
  PresentationOffice: { id: 'presentation_office', domain: 'presentationOffice', coverage: 'partial', label: 'Presentation office', tab: 'parties', format: 'mono', export: false, note: 'Mandatory on transit only, but the UI shows it unconditionally on every declaration.' },
  Declaration_InvoiceAmount: { id: 'invoice_amount', domain: 'invoiceTotal', coverage: 'modelled', label: 'Invoice amount', tab: 'values', format: 'money', export: true, note: 'The only declared header-level money field in the source list.' },
  Declaration_InvoiceAmount_CurrencyID: { id: 'invoice_currency', domain: 'currency', coverage: 'partial', label: 'Invoice currency', tab: 'values', format: 'currency', export: true, note: 'The model treats this as the currency of the whole declaration. The source scopes it to the invoice amount only.' },
  CustomsValuation_PaymentTermsCode: { id: 'payment_terms', domain: null, coverage: 'new', label: 'Payment terms', tab: 'values', format: 'code', export: false },
  ContainerCode: { id: 'container_code', domain: 'containerNumber', coverage: 'modelled', label: 'Container', tab: 'parties', format: 'mono', export: false },
  GoodsItem_Packaging_TypeCode: { id: 'packaging_type', domain: 'lines[].packagingType', coverage: 'modelled', label: 'Packaging type', tab: 'goods', format: 'code', export: false },
  GoodsItem_TotalPackageQuantity: { id: 'package_quantity', domain: 'lines[].packageQuantity', coverage: 'modelled', label: 'Packages', tab: 'goods', format: 'number', export: false },
  Commodity_ValueAmount: { id: 'item_value', domain: 'lines[].itemValue', coverage: 'modelled', label: 'Item value', tab: 'values', format: 'money', export: true },
  OtherDuties: { id: 'other_duties', domain: null, coverage: 'new', label: 'Other duties', tab: 'values', format: 'money', export: false, note: 'Anti-dumping and countervailing duties land here. Omitting it understates what was actually paid.' },
  AdditionalReferences: { id: 'additional_references', domain: 'lines[].additionalReference', coverage: 'modelled', label: 'Additional references', tab: 'references', format: 'mono', export: false },
  'Due Diligence Statements': { id: 'due_diligence_statements', domain: null, coverage: 'new', label: 'Due-diligence statement', tab: 'references', format: 'mono', export: false, note: 'ReferencesTab already renders this as "Not available" and says the feed does not supply it. The source list says it will — the copy needs updating when it lands.' },
  TariffQuantity: { id: 'tariff_quantity', domain: 'lines[].supplementaryUnits', coverage: 'modelled', label: 'Supplementary units', tab: 'goods', format: 'text', export: false },
  QuotaOrderID: { id: 'quota_order_id', domain: 'lines[].quotaReference', coverage: 'modelled', label: 'Quota order number', tab: 'goods', format: 'mono', export: false },
  GoodsItem_TransportEquipmentID: { id: 'line_transport_equipment', domain: null, coverage: 'new', label: 'Transport equipment', tab: 'goods', format: 'mono', export: false, note: 'Line-level container id, alongside the header-level ContainerCode.' },
  TransactionNatureCode: { id: 'transaction_nature', domain: null, coverage: 'new', label: 'Nature of transaction', tab: 'goods', format: 'code', export: false },
  OtherDiscounts_Deductions: { id: 'discounts_deductions', domain: null, coverage: 'new', label: 'Discounts and deductions', tab: 'values', format: 'money', export: false, note: 'ValuesTab hard-codes "Deductions: None declared". The source has a real field for this, so the hard-coded copy asserts something unproven.' },
  UCR_TraderAssignedReferenceID: { id: 'ucr', domain: 'ucr', coverage: 'partial', label: 'UCR', tab: 'references', format: 'mono', export: false, note: 'Line-level in the source, header-level in the model. A declaration may carry several UCRs.' },
  InsuranceCosts_Additions: { id: 'insurance_additions', domain: 'lines[].insuranceCosts', coverage: 'modelled', label: 'Insurance and additions', tab: 'values', format: 'money', export: false },
  'Article Quantity': { id: 'article_quantity', domain: 'lines[].quantity', coverage: 'modelled', label: 'Quantity', tab: 'goods', format: 'number', export: true },
};

/**
 * Per-type state overrides.
 *
 * The default derivation is: mandatory on this type => "expected"; blank on this type but
 * mandatory on another => "not-applicable" (the source captures the field, so a blank here is a
 * statement about this declaration type); blank on every type => "optional".
 *
 * That default is right wherever the blank reflects something the declaration type structurally
 * lacks — no duty or VAT is assessed on an export or a transit movement, no customs valuation on
 * transit, offices of entry and exit are a transit construct. It is wrong wherever the field is a
 * general attribute that simply is not required on that type: a transit movement can still use a
 * broker, its goods still have an origin and a package count, and an import still has a country of
 * destination. Those are listed here and resolve to "optional" instead, so the UI says
 * "Not available" rather than claiming the field could never apply.
 *
 * Each entry is a claim about customs practice, not about the data. They are the short list to put
 * in front of a customs SME.
 */
const STATE_OVERRIDES = {
  DestinationCountryCode: { import: 'optional' }, // an import has a destination — the declaration country
  Departure_CountryCode: { export: 'optional' }, // an export has a country of departure
  IncoTerms_LocationID: { export: 'optional' }, // IncoTerms_ConditionCode is mandatory on export, so the named place applies
  CustomsBroker: { transit: 'optional' }, // transit movements can be filed by a broker
  Origin_CountryCode: { transit: 'optional' }, // transit goods have an origin; it is just not declared
  DeclarationLineNo: { transit: 'optional' }, // transit goods lines exist — commodity code and masses are mandatory on transit
  GoodsItem_Packaging_TypeCode: { transit: 'optional' },
  GoodsItem_TotalPackageQuantity: { transit: 'optional' },
  DeclarationNo: { transit: 'optional' }, // a transit declaration still carries a number
  'Customs ID /MRN': { transit: 'optional' },
  DeclarationStatusCode: { transit: 'optional' }, // Declaration_Status is mandatory on all three types
  // The EORI questions turn on whether the party is established in the customs territory, not on
  // the declaration type. Import/export keep the derived not-applicable — on an import the consignor
  // is the foreign seller, on an export the consignee is the foreign buyer. On transit either party
  // may be an EU trader holding an EORI.
  Consignor_EORI: { transit: 'optional' },
  Consignee_EORI: { transit: 'optional' },
  // Goods are presented to an office on an import too; the model shows this field on every
  // declaration today. Needs confirmation before it becomes not-applicable.
  PresentationOffice: { import: 'optional', export: 'optional' },
};

const TYPES = ['import', 'export', 'transit'];

/** expected = mandatory, absent means Not populated. optional = absent means Not available. */
function deriveStates(source, mandatory) {
  const anyMandatory = TYPES.some((t) => mandatory[t]);
  const override = STATE_OVERRIDES[source] ?? {};
  const states = {};
  const overridden = [];
  for (const t of TYPES) {
    if (mandatory[t]) { states[t] = 'expected'; continue; }
    if (override[t]) { states[t] = override[t]; overridden.push(t); continue; }
    states[t] = anyMandatory ? 'not-applicable' : 'optional';
  }
  return { states, overridden };
}

const raw = readFileSync(`${ROOT}/DataFields.csv`, 'utf8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');
const header = lines.shift();
if (header.split(';')[4] !== 'StandardField Name (UCC)') throw new Error(`unexpected header: ${header}`);

const fields = [];
const seenIds = new Set();
for (const line of lines) {
  const [position, imp, exp, trans, source] = line.split(';');
  const m = MAP[source];
  if (!m) throw new Error(`no mapping authored for source field: ${source}`);
  if (seenIds.has(m.id)) throw new Error(`duplicate id: ${m.id}`);
  seenIds.add(m.id);
  const pos = position.toLowerCase();
  if (pos !== 'header' && pos !== 'line') throw new Error(`bad position ${position} on ${source}`);
  const mandatory = { import: imp === 'X', export: exp === 'X', transit: trans === 'X' };
  const { states, overridden } = deriveStates(source, mandatory);
  fields.push({
    id: m.id,
    source,
    position: pos,
    mandatory,
    states,
    ...(overridden.length ? { statesOverridden: overridden } : {}),
    domain: m.domain,
    coverage: m.coverage,
    label: m.label,
    tab: m.tab,
    format: m.format,
    export: m.export,
    ...(m.note ? { note: m.note } : {}),
  });
}

const unknownOverride = Object.keys(STATE_OVERRIDES).filter((k) => !MAP[k]);
if (unknownOverride.length) throw new Error(`state override for unknown field: ${unknownOverride.join(', ')}`);
const inertOverride = Object.entries(STATE_OVERRIDES).filter(([k, v]) => {
  const f = fields.find((x) => x.source === k);
  return f && Object.keys(v).every((t) => f.mandatory[t]);
});
if (inertOverride.length) throw new Error(`state override never fires (field is mandatory there): ${inertOverride.map(([k]) => k).join(', ')}`);

const unused = Object.keys(MAP).filter((k) => !lines.some((l) => l.split(';')[4] === k));
if (unused.length) throw new Error(`mapping entries with no CSV row: ${unused.join(', ')}`);

const catalogue = {
  $comment:
    'Field catalogue — generated from DataFields.csv. The single source of truth for which fields exist, ' +
    'which are mandatory per declaration type, how each is labelled, and where it belongs in the UI. ' +
    'Regenerate rather than hand-edit. "tab" placements for coverage:"new" fields are proposals awaiting design review.',
  version: 1,
  generatedFrom: 'DataFields.csv',
  fieldCount: fields.length,
  stateRules: {
    $comment:
      'Per-field, per-declaration-type applicability, in the "states" key on each field. ' +
      'expected = mandatory on this type; absent renders "Not populated". ' +
      'optional = may legitimately be present or absent; absent renders "Not available". ' +
      'not-applicable = never applies to this type; always renders "Not applicable", present or not. ' +
      'not-verified is orthogonal — it records whether a present value has been compared with the source record.',
    derivation:
      'mandatory on this type -> expected; blank here but mandatory on another type -> not-applicable; ' +
      'blank on every type -> optional. Fields carrying "statesOverridden" deviate from that default — ' +
      'see STATE_OVERRIDES in scripts/build-field-catalogue.mjs for the reason on each.',
  },
  fields,
};

writeFileSync(`${ROOT}/contracts/fields.json`, JSON.stringify(catalogue, null, 2) + '\n');

const by = (p) => fields.filter(p).length;
console.log(`fields:      ${fields.length}`);
console.log(`  header:    ${by((f) => f.position === 'header')}`);
console.log(`  line:      ${by((f) => f.position === 'line')}`);
console.log(`  modelled:  ${by((f) => f.coverage === 'modelled')}`);
console.log(`  partial:   ${by((f) => f.coverage === 'partial')}`);
console.log(`  new:       ${by((f) => f.coverage === 'new')}`);
console.log(`mandatory — import ${by((f) => f.mandatory.import)}, export ${by((f) => f.mandatory.export)}, transit ${by((f) => f.mandatory.transit)}`);
console.log(`optional on all three: ${by((f) => !f.mandatory.import && !f.mandatory.export && !f.mandatory.transit)}`);
const cells = fields.flatMap((f) => ['import', 'export', 'transit'].map((t) => f.states[t]));
const tally = (v) => cells.filter((c) => c === v).length;
console.log(`\nstate cells (77 fields x 3 types = ${cells.length}):`);
console.log(`  expected:       ${tally('expected')}`);
console.log(`  not-applicable: ${tally('not-applicable')}`);
console.log(`  optional:       ${tally('optional')}`);
console.log(`overridden away from the default: ${fields.filter((f) => f.statesOverridden).length} fields`);
