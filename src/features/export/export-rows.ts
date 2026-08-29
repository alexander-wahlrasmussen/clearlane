import type { Declaration } from '../../domain/declaration';

/**
 * Export row building. One "Declaration" row per declaration and one
 * "Goods line" row per line. Declaration totals appear ONLY on declaration
 * rows, so totals are never double-counted when the file is summed.
 * Amounts are whole units in the declared currency.
 *
 * "Departure" is the declaration-level country of dispatch; "Origin" is the
 * goods origin declared on each line. They are different fields and never share
 * a column — a declaration can carry several line origins.
 */
export type ExportRow = (string | number)[];

export const EXPORT_HEADER: ExportRow = [
  'Record type', 'MRN', 'Status', 'Clearance date', 'Country', 'Type', 'Customer reference',
  'Importer/buyer', 'Exporter/seller', 'Departure', 'Destination', 'Currency',
  'Customs value', 'Duty', 'VAT',
  'Line no', 'Commodity code', 'Description', 'Origin', 'Quantity', 'Item value',
  'Line customs value', 'Line duty', 'Line VAT',
];

const units = (minor: number) => Math.round(minor / 100);

export function buildExportRows(declarations: Declaration[], includeLines: boolean): ExportRow[] {
  const rows: ExportRow[] = [EXPORT_HEADER];
  for (const d of declarations) {
    rows.push([
      'Declaration', d.mrn, d.status, d.clearanceDate, d.countryName, d.type, d.customerReference,
      d.importer.name, d.exporter.name, d.departureCountry, d.destinationCountry, d.currency,
      units(d.customsValueTotal.amountMinor), units(d.dutyTotal.amountMinor), units(d.vatTotal.amountMinor),
      '', '', '', '', '', '', '', '', '',
    ]);
    if (includeLines) {
      for (const l of d.lines) {
        rows.push([
          'Goods line', d.mrn, '', '', '', '', '', '', '', '', '', d.currency,
          '', '', '',
          l.lineNo, l.commodityCode, l.description, l.originCountry, l.quantity,
          units(l.itemValue.amountMinor), units(l.customsValue.amountMinor),
          units(l.dutyAmount.amountMinor), units(l.vatAmount.amountMinor),
        ]);
      }
    }
  }
  return rows;
}
