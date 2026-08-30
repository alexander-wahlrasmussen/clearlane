import type { ReactNode } from 'react';
import type { Declaration, GoodsLine } from '../../domain/declaration';
import { typeLabel } from '../../domain/declaration';
import type { SortKey } from '../../api/declarations-client';
import { catalogueField } from '../../domain/field-catalogue';
import { countryLabel } from '../../domain/countries';
import { formatIsoDate } from '../../domain/dates';
import { FIELD_STATE_LABEL, isValue, type FieldValue } from '../../domain/field-value';
import { formatCount, formatMoney, type Money } from '../../domain/money';
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

/** One cell of an export file. Amounts are whole units; everything else is text. */
export type ExportCell = string | number;

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
  /**
   * True when the cell is an amount in the declaration's currency. Export adds
   * a Currency column whenever one of these is written and the user has not
   * chosen it, so an amount is never separated from its currency.
   */
  readonly amount: boolean;
  readonly render: (row: RegisterRow) => ReactNode;
  /**
   * The same cell as plain text or a number, for export. The four field states
   * export as their labels — never a blank — and a missing release date exports
   * as "Not yet released", exactly as on screen.
   */
  readonly exportValue: (row: RegisterRow) => ExportCell;
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
  amount?: true;
  render: (row: RegisterRow) => ReactNode;
  exportValue: (row: RegisterRow) => ExportCell;
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
    amount: spec.amount ?? false,
    render: spec.render,
    exportValue: spec.exportValue,
  };
}

const BOTH: readonly Grain[] = ['declaration', 'line'];
const LINE_ONLY: readonly Grain[] = ['line'];
const DECL_ONLY: readonly Grain[] = ['declaration'];

const mono = (v: string) => <span className="mono">{v}</span>;
const num = (v: ReactNode) => <span className="num">{v}</span>;

/** Whole units in the declared currency — the export convention for amounts. */
const units = (m: Money): number => Math.round(m.amountMinor / 100);

/** A field value as export text: the value, or the state's label (principle #1). */
function fieldText<T>(f: FieldValue<T>, fn: (v: T) => ExportCell = String): ExportCell {
  return isValue(f) ? fn(f.value) : FIELD_STATE_LABEL[f.kind];
}

/** Line-only columns are never offered at declaration grain, so `line` is set. */
const line = <R,>(r: RegisterRow, fn: (l: GoodsLine) => R): R | null => (r.line ? fn(r.line) : null);
const lineText = (r: RegisterRow, fn: (l: GoodsLine) => ExportCell): ExportCell => (r.line ? fn(r.line) : '');

const dutyRateText = (p: number) => (p === 0 ? 'Free' : `${p}%`);
const vatRateText = (p: number) => `${p}%`;

/**
 * Every column the register can show. Header columns are available at both
 * grains because the goods-line grain carries its parent declaration.
 *
 * A column either names a field in the catalogue — in which case its label comes
 * from there and cannot drift — or is explicitly derived and says why. The only
 * derived columns are sums the source list has no header field for (see
 * docs/field-catalogue.md, decision 2) and `customerReference`, which has no
 * source field at all (decision 5).
 *
 * Dates export as ISO `YYYY-MM-DD`; amounts as whole units in the declared currency.
 */
export const REGISTER_COLUMNS: readonly RegisterColumn[] = [
  // ---- header fields, available at both grains ----
  build({
    id: 'status', field: 'declaration_status', header: 'Status', grains: BOTH,
    render: (r) => <StatusBadge status={r.declaration.status} />,
    exportValue: (r) => r.declaration.status,
  }),
  build({
    id: 'mrn', field: 'mrn', grains: BOTH,
    render: (r) => mono(r.declaration.mrn),
    exportValue: (r) => r.declaration.mrn,
  }),
  build({
    id: 'declarationNumber', field: 'declaration_no', header: 'Declaration no.', grains: BOTH,
    render: (r) => mono(r.declaration.declarationNumber),
    exportValue: (r) => r.declaration.declarationNumber,
  }),
  build({
    id: 'customerReference', field: null, label: 'Customer reference', header: 'Customer ref.',
    grains: BOTH,
    derivedNote:
      'No field in the source list carries the customer’s own reference. Shown from the ' +
      'existing model pending decision 5 in docs/field-catalogue.md.',
    render: (r) => mono(r.declaration.customerReference),
    exportValue: (r) => r.declaration.customerReference,
  }),
  build({
    id: 'cleared', field: null, label: 'Cleared', grains: BOTH, sortKey: 'date',
    derivedNote: 'Release date where the goods are released, otherwise the clearance date.',
    render: (r) => num(formatIsoDate(r.declaration.releaseDate ?? r.declaration.clearanceDate)),
    exportValue: (r) => r.declaration.releaseDate ?? r.declaration.clearanceDate,
  }),
  build({
    id: 'clearanceDate', field: 'clearance_date', header: 'Clearance date', grains: BOTH,
    render: (r) => num(formatIsoDate(r.declaration.clearanceDate)),
    exportValue: (r) => r.declaration.clearanceDate,
  }),
  build({
    id: 'releaseDate', field: 'release_date', header: 'Released', grains: BOTH,
    render: (r) =>
      num(r.declaration.releaseDate ? formatIsoDate(r.declaration.releaseDate) : 'Not yet released'),
    exportValue: (r) => r.declaration.releaseDate ?? 'Not yet released',
  }),
  build({
    id: 'country', field: 'declaration_country', header: 'Country', grains: BOTH,
    render: (r) => r.declaration.countryName,
    exportValue: (r) => r.declaration.countryName,
  }),
  build({
    id: 'type', field: 'declaration_type', header: 'Type', grains: BOTH,
    render: (r) => typeLabel(r.declaration.type),
    exportValue: (r) => typeLabel(r.declaration.type),
  }),
  build({
    id: 'importer', field: 'consignee_name', header: 'Importer / buyer', grains: BOTH,
    render: (r) => r.declaration.importer.name,
    exportValue: (r) => r.declaration.importer.name,
  }),
  build({
    id: 'exporter', field: 'consignor_name', header: 'Exporter / seller', grains: BOTH,
    render: (r) => r.declaration.exporter.name,
    exportValue: (r) => r.declaration.exporter.name,
  }),
  build({
    id: 'declarant', field: 'declarant_name', grains: BOTH,
    render: (r) => r.declaration.declarant.name,
    exportValue: (r) => r.declaration.declarant.name,
  }),
  build({
    id: 'broker', field: 'customs_broker', header: 'Broker', grains: BOTH,
    render: (r) => r.declaration.broker.name,
    exportValue: (r) => r.declaration.broker.name,
  }),
  build({
    id: 'departure', field: 'departure_country', header: 'Departure', grains: BOTH,
    render: (r) => countryLabel(r.declaration.departureCountry),
    exportValue: (r) => countryLabel(r.declaration.departureCountry),
  }),
  build({
    id: 'destination', field: 'destination_country', header: 'Destination', grains: BOTH,
    render: (r) => countryLabel(r.declaration.destinationCountry),
    exportValue: (r) => countryLabel(r.declaration.destinationCountry),
  }),
  build({
    id: 'transportMode', field: 'transport_mode', header: 'Transport', grains: BOTH,
    render: (r) => r.declaration.transportMode,
    exportValue: (r) => r.declaration.transportMode,
  }),
  build({
    id: 'incoterms', field: 'incoterms', grains: BOTH,
    render: (r) => r.declaration.incoterms,
    exportValue: (r) => r.declaration.incoterms,
  }),
  build({
    id: 'presentationOffice', field: 'presentation_office', header: 'Office', grains: BOTH,
    render: (r) => <FieldCell field={r.declaration.presentationOffice} render={mono} />,
    exportValue: (r) => fieldText(r.declaration.presentationOffice),
  }),
  build({
    id: 'currency', field: 'invoice_currency', header: 'Currency', grains: BOTH,
    render: (r) => r.declaration.currency,
    exportValue: (r) => r.declaration.currency,
  }),

  // ---- declaration grain only ----
  build({
    id: 'invoiceTotal', field: 'invoice_amount', header: 'Invoice amount', grains: DECL_ONLY,
    align: 'right', amount: true,
    render: (r) => num(formatMoney(r.declaration.invoiceTotal)),
    exportValue: (r) => units(r.declaration.invoiceTotal),
  }),
  build({
    id: 'customsValueTotal', field: null, label: 'Customs value', grains: DECL_ONLY,
    align: 'right', sortKey: 'customsValue', amount: true,
    derivedNote:
      'Summed from the goods lines. The source list has no header-level customs value — ' +
      'see decision 2 in docs/field-catalogue.md.',
    render: (r) => num(formatMoney(r.declaration.customsValueTotal)),
    exportValue: (r) => units(r.declaration.customsValueTotal),
  }),
  build({
    id: 'dutyTotal', field: null, label: 'Duty', grains: DECL_ONLY,
    align: 'right', sortKey: 'duty', amount: true,
    derivedNote: 'Summed from the goods lines; no header-level duty total exists in the source list.',
    render: (r) => num(formatMoney(r.declaration.dutyTotal)),
    exportValue: (r) => units(r.declaration.dutyTotal),
  }),
  build({
    id: 'vatTotal', field: null, label: 'VAT', grains: DECL_ONLY,
    align: 'right', sortKey: 'vat', amount: true,
    derivedNote: 'Summed from the goods lines; no header-level VAT total exists in the source list.',
    render: (r) => num(formatMoney(r.declaration.vatTotal)),
    exportValue: (r) => units(r.declaration.vatTotal),
  }),
  build({
    id: 'goods', field: null, label: 'Goods', grains: DECL_ONLY,
    derivedNote: 'The first goods description, with a count of the remaining lines.',
    render: (r) => r.declaration.commoditySummary,
    exportValue: (r) => r.declaration.commoditySummary,
  }),
  build({
    id: 'lineCount', field: null, label: 'Goods lines', header: 'Lines', grains: DECL_ONLY,
    align: 'right',
    derivedNote: 'Count of goods lines on the declaration.',
    render: (r) => num(formatCount(r.declaration.lines.length)),
    exportValue: (r) => r.declaration.lines.length,
  }),

  // ---- goods-line grain only ----
  build({
    id: 'lineNo', field: 'line_no', header: 'Line', grains: LINE_ONLY, align: 'right',
    render: (r) => num(r.line?.lineNo ?? ''),
    exportValue: (r) => lineText(r, (l) => l.lineNo),
  }),
  build({
    id: 'commodityCode', field: 'commodity_code', header: 'Commodity code', grains: LINE_ONLY,
    render: (r) => line(r, (l) => mono(l.commodityCode)),
    exportValue: (r) => lineText(r, (l) => l.commodityCode),
  }),
  build({
    id: 'description', field: 'commodity_description', header: 'Description', grains: LINE_ONLY,
    render: (r) => r.line?.description ?? null,
    exportValue: (r) => lineText(r, (l) => l.description),
  }),
  build({
    id: 'lineOrigin', field: 'origin_country', header: 'Origin', grains: LINE_ONLY,
    render: (r) => line(r, (l) => countryLabel(l.originCountry)),
    exportValue: (r) => lineText(r, (l) => countryLabel(l.originCountry)),
  }),
  build({
    id: 'procedure', field: 'procedure_code', header: 'Procedure', grains: LINE_ONLY,
    render: (r) => r.line?.procedure ?? null,
    exportValue: (r) => lineText(r, (l) => l.procedure),
  }),
  build({
    id: 'preference', field: 'duty_regime_code', header: 'Preference', grains: LINE_ONLY,
    render: (r) => line(r, (l) => <FieldCell field={l.preference} />),
    exportValue: (r) => lineText(r, (l) => fieldText(l.preference)),
  }),
  build({
    id: 'articleNumber', field: 'article_number', header: 'Article no.', grains: LINE_ONLY,
    render: (r) => line(r, (l) => <FieldCell field={l.sku} render={mono} />),
    exportValue: (r) => lineText(r, (l) => fieldText(l.sku)),
  }),
  build({
    id: 'quantity', field: 'article_quantity', header: 'Quantity', grains: LINE_ONLY, align: 'right',
    render: (r) => num(r.line ? formatCount(r.line.quantity) : ''),
    exportValue: (r) => lineText(r, (l) => l.quantity),
  }),
  build({
    id: 'grossMass', field: 'gross_mass', header: 'Gross kg', grains: LINE_ONLY, align: 'right',
    render: (r) => line(r, (l) => num(<FieldCell field={l.grossKg} />)),
    exportValue: (r) => lineText(r, (l) => fieldText(l.grossKg, (n) => n)),
  }),
  build({
    id: 'netMass', field: 'net_mass', header: 'Net kg', grains: LINE_ONLY, align: 'right',
    render: (r) => line(r, (l) => num(<FieldCell field={l.netKg} />)),
    exportValue: (r) => lineText(r, (l) => fieldText(l.netKg, (n) => n)),
  }),
  build({
    id: 'packageQuantity', field: 'package_quantity', header: 'Packages', grains: LINE_ONLY,
    align: 'right',
    render: (r) => line(r, (l) => num(<FieldCell field={l.packageQuantity} />)),
    exportValue: (r) => lineText(r, (l) => fieldText(l.packageQuantity, (n) => n)),
  }),
  build({
    id: 'packagingType', field: 'packaging_type', header: 'Packaging', grains: LINE_ONLY,
    render: (r) => line(r, (l) => <FieldCell field={l.packagingType} />),
    exportValue: (r) => lineText(r, (l) => fieldText(l.packagingType)),
  }),
  build({
    id: 'supplementaryUnits', field: 'tariff_quantity', header: 'Supp. units', grains: LINE_ONLY,
    render: (r) => line(r, (l) => <FieldCell field={l.supplementaryUnits} />),
    exportValue: (r) => lineText(r, (l) => fieldText(l.supplementaryUnits)),
  }),
  build({
    id: 'quota', field: 'quota_order_id', header: 'Quota', grains: LINE_ONLY,
    render: (r) => line(r, (l) => <FieldCell field={l.quotaReference} render={mono} />),
    exportValue: (r) => lineText(r, (l) => fieldText(l.quotaReference)),
  }),
  build({
    id: 'additionalReference', field: 'additional_references', header: 'Additional refs',
    grains: LINE_ONLY,
    render: (r) => line(r, (l) => <FieldCell field={l.additionalReference} render={mono} />),
    exportValue: (r) => lineText(r, (l) => fieldText(l.additionalReference)),
  }),
  build({
    id: 'itemValue', field: 'item_value', header: 'Item value', grains: LINE_ONLY, align: 'right',
    amount: true,
    render: (r) => num(r.line ? formatMoney(r.line.itemValue) : ''),
    exportValue: (r) => lineText(r, (l) => units(l.itemValue)),
  }),
  build({
    id: 'lineCustomsValue', field: 'customs_value', header: 'Customs value', grains: LINE_ONLY,
    align: 'right', sortKey: 'customsValue', amount: true,
    render: (r) => num(r.line ? formatMoney(r.line.customsValue) : ''),
    exportValue: (r) => lineText(r, (l) => units(l.customsValue)),
  }),
  build({
    id: 'dutyRate', field: 'duty_rate', header: 'Duty rate', grains: LINE_ONLY, align: 'right',
    render: (r) => line(r, (l) => num(<FieldCell field={l.dutyRatePct} render={dutyRateText} />)),
    exportValue: (r) => lineText(r, (l) => fieldText(l.dutyRatePct, dutyRateText)),
  }),
  build({
    id: 'lineDuty', field: 'duty_amount', header: 'Duty', grains: LINE_ONLY,
    align: 'right', sortKey: 'duty', amount: true,
    render: (r) => num(r.line ? formatMoney(r.line.dutyAmount) : ''),
    exportValue: (r) => lineText(r, (l) => units(l.dutyAmount)),
  }),
  build({
    id: 'vatRate', field: 'vat_rate', header: 'VAT rate', grains: LINE_ONLY, align: 'right',
    render: (r) => line(r, (l) => num(<FieldCell field={l.vatRatePct} render={vatRateText} />)),
    exportValue: (r) => lineText(r, (l) => fieldText(l.vatRatePct, vatRateText)),
  }),
  build({
    id: 'lineVat', field: 'vat_amount', header: 'VAT', grains: LINE_ONLY,
    align: 'right', sortKey: 'vat', amount: true,
    render: (r) => num(r.line ? formatMoney(r.line.vatAmount) : ''),
    exportValue: (r) => lineText(r, (l) => units(l.vatAmount)),
  }),
  build({
    id: 'excise', field: 'excise_amount', header: 'Excise', grains: LINE_ONLY, align: 'right',
    amount: true,
    render: (r) => line(r, (l) => num(<FieldCell field={l.excise} render={formatMoney} />)),
    exportValue: (r) => lineText(r, (l) => fieldText(l.excise, units)),
  }),
];

const BY_ID = new Map(REGISTER_COLUMNS.map((c) => [c.id, c]));

export function registerColumn(id: string): RegisterColumn | undefined {
  return BY_ID.get(id);
}

export function columnsForGrain(grain: Grain): RegisterColumn[] {
  return REGISTER_COLUMNS.filter((c) => c.grains.includes(grain));
}

/** Resolves ids to columns, dropping any the registry no longer knows. */
export function resolveColumns(ids: readonly string[]): RegisterColumn[] {
  return ids.map(registerColumn).filter((c): c is RegisterColumn => c !== undefined);
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
