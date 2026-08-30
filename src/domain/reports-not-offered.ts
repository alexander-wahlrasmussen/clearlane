/**
 * The requested reports the declaration data cannot produce, and why. Reasons
 * are from docs/reports-sourcing.md. Surfaced on the MVP's Reports page and as
 * the Ask surface's answer when one is asked for — principle #3: limitations
 * live in the UI, not in docs; principle #6: if the data cannot support the
 * question, say so.
 */
export const NOT_OFFERED_REPORT_IDS = ['vat', 'mdr', 'mcd', 'ec-sales', 'intrastat'] as const;

export type NotOfferedReportId = (typeof NOT_OFFERED_REPORT_IDS)[number];

export interface NotOfferedReport {
  id: NotOfferedReportId;
  name: string;
  reason: string;
}

export const NOT_OFFERED_REPORTS: readonly NotOfferedReport[] = [
  {
    id: 'vat',
    name: 'VAT Reports',
    reason:
      'Needs each legal entity’s VAT registration number, which the declaration data does not carry. Once that list is supplied, an import-only VAT report follows — duty and VAT do not apply to export or transit declarations.',
  },
  {
    id: 'mdr',
    name: 'MDR (Manifest Discrepancy Report)',
    reason: 'Needs the manifest itself. No manifest field exists in the source list.',
  },
  {
    id: 'mcd',
    name: 'MCD (Material Compliance Declaration) Report',
    reason:
      'Needs product composition and compliance data, which sits in the product master rather than on a declaration. The article number needed to join the two is optional on every declaration type.',
  },
  {
    id: 'ec-sales',
    name: 'EC Sales',
    reason:
      'Concerns intra-EU supplies, which produce no customs declaration. It comes from the sales ledger, not from declaration data.',
  },
  {
    id: 'intrastat',
    name: 'Intrastat',
    reason:
      'Concerns intra-EU movements, which produce no customs declaration. It comes from the ERP’s goods movements, not from declaration data.',
  },
];

export function notOfferedReport(id: NotOfferedReportId): NotOfferedReport {
  // The id type is closed, so the lookup cannot miss.
  return NOT_OFFERED_REPORTS.find((r) => r.id === id)!;
}
