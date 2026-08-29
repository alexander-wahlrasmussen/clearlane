import type { FieldValue } from './field-value';
import type { Money } from './money';

export type DeclarationType = 'import' | 'export' | 'transit';
export const DECLARATION_TYPES: readonly DeclarationType[] = ['import', 'export', 'transit'];

export type DeclarationStatus =
  | 'Released'
  | 'Amended'
  | 'Under customs control'
  | 'Awaiting release'
  | 'In transit'
  | 'Completed';
export const DECLARATION_STATUSES: readonly DeclarationStatus[] = [
  'Released', 'Amended', 'Under customs control', 'Awaiting release', 'In transit', 'Completed',
];

export function typeLabel(t: DeclarationType): string {
  return { import: 'Import', export: 'Export', transit: 'Transit' }[t];
}

export interface Party {
  name: string;
  /** not-applicable for non-EU parties. */
  eori: FieldValue<string>;
}

export interface GoodsLine {
  lineNo: number;
  commodityCode: string;
  description: string;
  originCountry: string;
  procedure: string;
  preference: FieldValue<string>;
  grossKg: FieldValue<number>;
  netKg: FieldValue<number>;
  quantity: number;
  sku: FieldValue<string>;
  packagingType: FieldValue<string>;
  packageQuantity: FieldValue<number>;
  supplementaryUnits: FieldValue<string>;
  quotaReference: FieldValue<string>;
  additionalReference: FieldValue<string>;
  itemValue: Money;
  customsValue: Money;
  transportCosts: Money;
  insuranceCosts: Money;
  /** not-applicable on export/transit; 0 renders "Free". */
  dutyRatePct: FieldValue<number>;
  dutyAmount: Money;
  vatRatePct: FieldValue<number>;
  vatAmount: Money;
  excise: FieldValue<Money>;
}

export interface AssuranceMissingField {
  field: string;
  impact: string;
}

export interface Assurance {
  includedInInsights: boolean;
  receivedAt: string; // 'YYYY-MM-DD HH:mm UTC'
  processedAt: string;
  lastUpdatedAt: string;
  completionPct: number;
  verification: 'Verified' | 'Unverified';
  missing: AssuranceMissingField[];
}

export type AttentionTab = 'overview' | 'goods' | 'references' | 'assurance';

export interface Attention {
  issue: string;
  detail: string;
  tab: AttentionTab;
  detectedOn: string;
  lineNo?: number;
}

export interface Declaration {
  mrn: string;
  declarationNumber: string;
  customerReference: string;
  ucr: string;
  countryCode: string;
  countryName: string;
  legalEntity: string;
  type: DeclarationType;
  status: DeclarationStatus;
  currency: string;
  /** The conversion rate declared on this declaration — the only rate ever used. */
  declaredFxToEur: number;
  clearanceDate: string;
  /** null = not yet released — render "Not yet released", never a blank. */
  releaseDate: string | null;
  /** Country of departure/dispatch (header level). Goods origin is per line. */
  departureCountry: string;
  destinationCountry: string;
  transportMode: string;
  incoterms: string;
  containerNumber: FieldValue<string>;
  /** Mandatory on transit; may legitimately be absent on import/export. */
  presentationOffice: FieldValue<string>;
  importer: Party;
  exporter: Party;
  /** Who filed the declaration. Distinct from the broker — they can differ. */
  declarant: Party;
  broker: { name: string; eori: string };
  invoiceTotal: Money;
  transportTotal: Money;
  insuranceTotal: Money;
  customsValueTotal: Money;
  dutyTotal: Money;
  vatTotal: Money;
  commoditySummary: string;
  lines: GoodsLine[];
  assurance: Assurance;
  attention: Attention | null;
}

/** A declaration has a data gap if a required field is missing or values are unverified. */
export function hasDataGap(d: Declaration): boolean {
  return d.assurance.missing.length > 0 || d.assurance.verification !== 'Verified';
}

export const STATUS_DOT: Record<DeclarationStatus, string> = {
  Released: 'var(--positive)',
  Completed: 'var(--positive)',
  Amended: '#2e5fa3',
  'In transit': '#2e5fa3',
  'Awaiting release': '#b45309',
  'Under customs control': '#b45309',
};
