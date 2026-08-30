import type { ReactNode } from 'react';
import type { Declaration, GoodsLine } from '../../domain/declaration';
import { typeLabel } from '../../domain/declaration';
import type { SortKey } from '../../api/declarations-client';
import { catalogueField } from '../../domain/field-catalogue';
import { countryLabel } from '../../domain/countries';
import { formatIsoDate } from '../../domain/dates';
import { formatCount, formatMoney } from '../../domain/money';
import { FieldCell, StatusBadge, Term } from '../../components/FieldDisplay';

export type Grain = 'declaration' | 'line';

export const GRAIN_LABEL: Record<Grain, string> = {
  declaration: 'Declarations',
  line: 'Goods lines',
};

/**
 * One register row at either grain. At declaration grain `line` is null; at
 * goods-line grain both are present, so any header column can also be shown
 * beside a line.
 */
export interface RegisterRow {
  declaration: Declaration;
  line: GoodsLine | null;
}

export interface RegisterColumn {
  readonly id: string;
  /** Plain-English name, from the field catalogue unless the value is derived. */
  readonly label: string;
  /** Denser header for the table; falls back to `label`. */
  readonly header: string;
  readonly grains: readonly Grain[];
  readonly align?: 'right';
  readonly sortKey?: SortKey;
  /** Set only on columns with no field behind them — see DERIVED below. */
  readonly derivedNote?: string;
  readonly render: (row: RegisterRow) => ReactNode;
}

interface Spec {
  id: string;
  /** Catalogue field id, or null for a derived column (then `label` is required). */
  field: string | null;
  label?: string;
  header?: string;
  grains: readonly Grain[];
  align?: 'right';
  sortKey?: SortKey;
  derivedNote?: string;
  render: (row: RegisterRow) => ReactNode;
}

function build(spec: Spec): RegisterColumn {
  const label = spec.field ? catalogueField(spec.field).label : spec.label;
  if (!label) throw new Error(`Column "${spec.id}" has neither a catalogue field nor a label`);
  if (!spec.field && !spec.derivedNote) {
    throw new Error(`Derived column "${spec.id}" must say why it has no source field`);
  }
  return {
    id: spec.id,
    label,
    header: spec.header ?? label,
    grains: spec.grains,
    align: spec.align,
    sortKey: spec.sortKey,
    derivedNote: spec.derivedNote,
    render: spec.render,
  };
}

const BOTH: readonly Grain[] = ['declaration', 'line'];
const LINE_ONLY: readonly Grain[] = ['line'];
const DECL_ONLY: readonly Grain[] = ['declaration'];

const mono = (v: string) => <span className="mono">{v}</span>;
const num = (v: ReactNode) => <span className="num">{v}</span>;

/**
 * Every column the register can show. Header columns are available at both
 * grains because the goods-line grain carries its parent declaration.
 *
 * A column either names a field in the catalogue — in which case its label comes
 * from there and cannot drift — or is explicitly derived and says why. The only
 * derived columns are sums the source list has no header field for (see
 * docs/field-catalogue.md, decision 2) and `customerReference`, which has no
 * source field at all (decision 5).
 */
export const REGISTER_COLUMNS: readonly RegisterColumn[] = [
  // ---- header fields, available at both grains ----
  build({
    id: 'status', field: 'declaration_status', header: 'Status', grains: BOTH,
    render: (r) => <StatusBadge status={r.declaration.status} />,
  }),
  build({
    id: 'mrn', field: 'mrn', grains: BOTH,
    render: (r) => mono(r.declaration.mrn),
  }),
  build({
    id: 'declarationNumber', field: 'declaration_no', header: 'Declaration no.', grains: BOTH,
    render: (r) => mono(r.declaration.declarationNumber),
  }),
  build({
    id: 'customerReference', field: null, label: 'Customer reference', header: 'Customer ref.',
    grains: BOTH,
    derivedNote:
      'No field in the source list carries the customer’s own reference. Shown from the ' +
      'existing model pending decision 5 in docs/field-catalogue.md.',
    render: (r) => mono(r.declaration.customerReference),
  }),
  build({
    id: 'cleared', field: null, label: 'Cleared', grains: BOTH, sortKey: 'date',
    derivedNote: 'Release date where the goods are released, otherwise the clearance date.',
    render: (r) => num(formatIsoDate(r.declaration.releaseDate ?? r.declaration.clearanceDate)),
  }),
  build({
    id: 'clearanceDate', field: 'clearance_date', header: 'Clearance date', grains: BOTH,
    render: (r) => num(formatIsoDate(r.declaration.clearanceDate)),
  }),
  build({
    id: 'releaseDate', field: 'release_date', header: 'Released', grains: BOTH,
    render: (r) =>
      num(r.declaration.releaseDate ? formatIsoDate(r.declaration.releaseDate) : 'Not yet released'),
  }),
  build({
    id: 'country', field: 'declaration_country', header: 'Country', grains: BOTH,
    render: (r) => r.declaration.countryName,
  }),
  build({
    id: 'type', field: 'declaration_type', header: 'Type', grains: BOTH,
    render: (r) => typeLabel(r.declaration.type),
  }),
  build({
    id: 'importer', field: 'consignee_name', header: 'Importer / buyer', grains: BOTH,
    render: (r) => r.declaration.importer.name,
  }),
  build({
    id: 'exporter', field: 'consignor_name', header: 'Exporter / seller', grains: BOTH,
    render: (r) => r.declaration.exporter.name,
  }),
  build({
    id: 'declarant', field: 'declarant_name', grains: BOTH,
    render: (r) => r.declaration.declarant.name,
  }),
  build({
    id: 'broker', field: 'customs_broker', header: 'Broker', grains: BOTH,
    render: (r) => r.declaration.broker.name,
  }),
  build({
    id: 'departure', field: 'departure_country', header: 'Departure', grains: BOTH,
    render: (r) => countryLabel(r.declaration.departureCountry),
  }),
  build({
    id: 'destination', field: 'destination_country', header: 'Destination', grains: BOTH,
    render: (r) => countryLabel(r.declaration.destinationCountry),
  }),
  build({
    id: 'transportMode', field: 'transport_mode', header: 'Transport', grains: BOTH,
    render: (r) => r.declaration.transportMode,
  }),
  build({
    id: 'incoterms', field: 'incoterms', grains: BOTH,
    render: (r) => r.declaration.incoterms,
  }),
  build({
    id: 'presentationOffice', field: 'presentation_office', header: 'Office', grains: BOTH,
    render: (r) => <FieldCell field={r.declaration.presentationOffice} render={mono} />,
  }),
  build({
    id: 'currency', field: 'invoice_currency', header: 'Currency', grains: BOTH,
    render: (r) => r.declaration.currency,
  }),

  // ---- declaration grain only ----
  build({
    id: 'invoiceTotal', field: 'invoice_amount', header: 'Invoice amount', grains: DECL_ONLY,
    align: 'right',
    render: (r) => num(formatMoney(r.declaration.invoiceTotal)),
  }),
  build({
    id: 'customsValueTotal', field: null, label: 'Customs value', grains: DECL_ONLY,
    align: 'right', sortKey: 'customsValue',
    derivedNote:
      'Summed from the goods lines. The source list has no header-level customs value — ' +
      'see decision 2 in docs/field-catalogue.md.',
    render: (r) => num(formatMoney(r.declaration.customsValueTotal)),
  }),
  build({
    id: 'dutyTotal', field: null, label: 'Duty', grains: DECL_ONLY,
    align: 'right', sortKey: 'duty',
    derivedNote: 'Summed from the goods lines; no header-level duty total exists in the source list.',
    render: (r) => num(formatMoney(r.declaration.dutyTotal)),
  }),
  build({
    id: 'vatTotal', field: null, label: 'VAT', grains: DECL_ONLY,
    align: 'right', sortKey: 'vat',
    derivedNote: 'Summed from the goods lines; no header-level VAT total exists in the source list.',
    render: (r) => num(formatMoney(r.declaration.vatTotal)),
  }),
  build({
    id: 'goods', field: null, label: 'Goods', grains: DECL_ONLY,
    derivedNote: 'The first goods description, with a count of the remaining lines.',
    render: (r) => r.declaration.commoditySummary,
  }),
  build({
    id: 'lineCount', field: null, label: 'Goods lines', header: 'Lines', grains: DECL_ONLY,
    align: 'right',
    derivedNote: 'Count of goods lines on the declaration.',
    render: (r) => num(formatCount(r.declaration.lines.length)),
  }),

  // ---- goods-line grain only ----
  build({
    id: 'lineNo', field: 'line_no', header: 'Line', grains: LINE_ONLY, align: 'right',
    render: (r) => num(r.line?.lineNo ?? ''),
  }),
  build({
    id: 'commodityCode', field: 'commodity_code', header: 'Commodity code', grains: LINE_ONLY,
    render: (r) => (r.line ? mono(r.line.commodityCode) : null),
  }),
  build({
    id: 'description', field: 'commodity_description', header: 'Description', grains: LINE_ONLY,
    render: (r) => r.line?.description ?? null,
  }),
  build({
    id: 'lineOrigin', field: 'origin_country', header: 'Origin', grains: LINE_ONLY,
    render: (r) => (r.line ? countryLabel(r.line.originCountry) : null),
  }),
  build({
    id: 'procedure', field: 'procedure_code', header: 'Procedure', grains: LINE_ONLY,
    render: (r) => r.line?.procedure ?? null,
  }),
  build({
    id: 'preference', field: 'duty_regime_code', header: 'Preference', grains: LINE_ONLY,
    render: (r) => (r.line ? <FieldCell field={r.line.preference} /> : null),
  }),
  build({
    id: 'articleNumber', field: 'article_number', header: 'Article no.', grains: LINE_ONLY,
    render: (r) => (r.line ? <FieldCell field={r.line.sku} render={mono} /> : null),
  }),
  build({
    id: 'quantity', field: 'article_quantity', header: 'Quantity', grains: LINE_ONLY, align: 'right',
    render: (r) => num(r.line ? formatCount(r.line.quantity) : ''),
  }),
  build({
    id: 'grossMass', field: 'gross_mass', header: 'Gross kg', grains: LINE_ONLY, align: 'right',
    render: (r) => (r.line ? num(<FieldCell field={r.line.grossKg} />) : null),
  }),
  build({
    id: 'netMass', field: 'net_mass', header: 'Net kg', grains: LINE_ONLY, align: 'right',
    render: (r) => (r.line ? num(<FieldCell field={r.line.netKg} />) : null),
  }),
  build({
    id: 'packageQuantity', field: 'package_quantity', header: 'Packages', grains: LINE_ONLY,
    align: 'right',
    render: (r) => (r.line ? num(<FieldCell field={r.line.packageQuantity} />) : null),
  }),
  build({
    id: 'packagingType', field: 'packaging_type', header: 'Packaging', grains: LINE_ONLY,
    render: (r) => (r.line ? <FieldCell field={r.line.packagingType} /> : null),
  }),
  build({
    id: 'supplementaryUnits', field: 'tariff_quantity', header: 'Supp. units', grains: LINE_ONLY,
    render: (r) => (r.line ? <FieldCell field={r.line.supplementaryUnits} /> : null),
  }),
  build({
    id: 'quota', field: 'quota_order_id', header: 'Quota', grains: LINE_ONLY,
    render: (r) => (r.line ? <FieldCell field={r.line.quotaReference} render={mono} /> : null),
  }),
  build({
    id: 'additionalReference', field: 'additional_references', header: 'Additional refs',
    grains: LINE_ONLY,
    render: (r) => (r.line ? <FieldCell field={r.line.additionalReference} render={mono} /> : null),
  }),
  build({
    id: 'itemValue', field: 'item_value', header: 'Item value', grains: LINE_ONLY, align: 'right',
    render: (r) => num(r.line ? formatMoney(r.line.itemValue) : ''),
  }),
  build({
    id: 'lineCustomsValue', field: 'customs_value', header: 'Customs value', grains: LINE_ONLY,
    align: 'right', sortKey: 'customsValue',
    render: (r) => num(r.line ? formatMoney(r.line.customsValue) : ''),
  }),
  build({
    id: 'dutyRate', field: 'duty_rate', header: 'Duty rate', grains: LINE_ONLY, align: 'right',
    render: (r) =>
      r.line ? num(<FieldCell field={r.line.dutyRatePct} render={(p) => (p === 0 ? 'Free' : `${p}%`)} />) : null,
  }),
  build({
    id: 'lineDuty', field: 'duty_amount', header: 'Duty', grains: LINE_ONLY,
    align: 'right', sortKey: 'duty',
    render: (r) => num(r.line ? formatMoney(r.line.dutyAmount) : ''),
  }),
  build({
    id: 'vatRate', field: 'vat_rate', header: 'VAT rate', grains: LINE_ONLY, align: 'right',
    render: (r) => (r.line ? num(<FieldCell field={r.line.vatRatePct} render={(p) => `${p}%`} />) : null),
  }),
  build({
    id: 'lineVat', field: 'vat_amount', header: 'VAT', grains: LINE_ONLY,
    align: 'right', sortKey: 'vat',
    render: (r) => num(r.line ? formatMoney(r.line.vatAmount) : ''),
  }),
  build({
    id: 'excise', field: 'excise_amount', header: 'Excise', grains: LINE_ONLY, align: 'right',
    render: (r) => (r.line ? num(<FieldCell field={r.line.excise} render={formatMoney} />) : null),
  }),
];

const BY_ID = new Map(REGISTER_COLUMNS.map((c) => [c.id, c]));

export function registerColumn(id: string): RegisterColumn | undefined {
  return BY_ID.get(id);
}

export function columnsForGrain(grain: Grain): RegisterColumn[] {
  return REGISTER_COLUMNS.filter((c) => c.grains.includes(grain));
}

/** The column set each grain opens with. Declaration grain matches the register as shipped. */
export const DEFAULT_COLUMNS: Record<Grain, readonly string[]> = {
  declaration: [
    'status', 'mrn', 'customerReference', 'cleared', 'country', 'type',
    'importer', 'exporter', 'departure', 'destination',
    'customsValueTotal', 'dutyTotal', 'vatTotal',
  ],
  line: [
    'mrn', 'cleared', 'country', 'type', 'lineNo', 'commodityCode', 'description',
    'lineOrigin', 'quantity', 'itemValue', 'lineCustomsValue', 'lineDuty', 'lineVat',
  ],
};

/** MRN header help text, reused by the table and the picker. */
export const MRN_HELP =
  'Movement Reference Number — the unique identifier customs assigns to a declaration.';

export function ColumnHeaderLabel(props: { column: RegisterColumn }) {
  return props.column.id === 'mrn' ? (
    <Term help={MRN_HELP}>{props.column.header}</Term>
  ) : (
    <>{props.column.header}</>
  );
}
