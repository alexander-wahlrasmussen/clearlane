/**
 * Wire shapes — the agreed API contract (see ../../contracts/openapi.yaml).
 * Ported from reference/customs-data.js. The `§na` / `§np` / `§nav` / `§unv`
 * sentinels encode the four field states on the wire; convert them to
 * `FieldValue<T>` on the way in (mapping.ts) so the four states are impossible
 * to forget at render time.
 *
 * All money fields are integers in minor units (`*Minor`).
 */
export type Sentinel = '§na' | '§np' | '§nav' | '§unv';
export type WireField<T> = T | Sentinel;

export interface GoodsLineDto {
  no: number;
  code: string;
  desc: string;
  origin: string;
  proc: string;
  pref: WireField<string>;
  grossKg: WireField<number>;
  netKg: WireField<number>;
  sku: WireField<string>;
  qty: number;
  itemMinor: number;
  customsMinor: number;
  transportMinor: number;
  insuranceMinor: number;
  /** null = not applicable (export/transit). */
  dutyRatePct: number | null;
  dutyMinor: number;
  vatRatePct: number | null;
  vatMinor: number;
  packaging: WireField<string>;
  pkgQty: WireField<number>;
  suppUnits: WireField<string>;
  quota: WireField<string>;
  exciseMinor: WireField<number>;
  addRef: WireField<string>;
}

/** One goods line with its parent declaration (GET /declarations/lines). */
export interface GoodsLineRowDto {
  declaration: DeclarationDto;
  line: GoodsLineDto;
}

export interface PartyDto {
  name: string;
  /** null = non-EU party (renders "Not applicable — non-EU party"). */
  eori: string | null;
}

export interface AssuranceDto {
  included: boolean;
  received: string;
  processed: string;
  updated: string;
  completion: number;
  verification: 'Verified' | 'Unverified';
  missing: { field: string; impact: string }[];
}

export interface AttentionDto {
  issue: string;
  detail: string;
  tab: 'overview' | 'goods' | 'references' | 'assurance';
  detected: string;
  line?: number;
}

export interface DeclarationDto {
  mrn: string;
  declNo: string;
  ref: string;
  ucr: string;
  cc: string;
  entity: string;
  type: 'import' | 'export' | 'transit';
  status: string;
  cur: string;
  /** Conversion rate declared on the declaration. */
  fx: number;
  date: string;
  release: string | null;
  /** Country of departure/dispatch. Goods origin is per line (GoodsLineDto.origin). */
  departure: string;
  dest: string;
  mode: string;
  incoterms: string;
  container: WireField<string>;
  office: WireField<string>;
  importer: PartyDto;
  exporter: PartyDto;
  declarant: PartyDto;
  broker: string;
  brokerEori: string;
  invoiceMinor: number;
  transportMinor: number;
  insuranceMinor: number;
  customsValueMinor: number;
  dutyMinor: number;
  vatMinor: number;
  commSummary: string;
  lines: GoodsLineDto[];
  assure: AssuranceDto;
  attention: AttentionDto | null;
}
