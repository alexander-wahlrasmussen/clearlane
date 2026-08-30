import type { Declaration, DeclarationStatus, DeclarationType, GoodsLine } from '../domain/declaration';

/**
 * The single seam between the UI and the backend. Everything the product reads
 * goes through this interface — never fork the data model per surface.
 * Implementations: HttpDeclarationsClient (real API), MockDeclarationsClient
 * (in-memory synthetic data for local dev and tests).
 */
export interface DeclarationFilter {
  entity?: string;
  country?: string;
  type?: DeclarationType;
  status?: DeclarationStatus;
  /** ISO date — declarations cleared on/after this date. */
  fromDate?: string;
  /** Matches MRN or customer reference, case-insensitive substring. */
  search?: string;
  /** Only declarations with a required field missing or values unverified. */
  withGapsOnly?: boolean;
  /**
   * Only these declarations — the exact evidence set an Ask answer was computed
   * from, opened in the register. Combines with the other filters.
   */
  mrns?: readonly string[];
}

export type SortKey = 'date' | 'customsValue' | 'duty' | 'vat';

export interface ListParams {
  filter: DeclarationFilter;
  sort: SortKey;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

/** Sort of a full-set read; defaults to newest first. */
export type ListSort = Pick<ListParams, 'sort' | 'order'>;

export const DEFAULT_SORT: ListSort = { sort: 'date', order: 'desc' };

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Aggregates over the full filtered set (not just the visible page). */
export interface RegisterSummary {
  total: number;
  imports: number;
  exports: number;
  transits: number;
  /** EUR equivalents use only the rate declared on each declaration. */
  customsValueEurMinor: number;
  dutyVatEurMinor: number;
  awaitingRelease: number;
  withDataGaps: number;
  /** Declared currencies present in the filtered set. */
  currencies: string[];
}

/** Principle #3: data scope is always visible — served, not hardcoded. */
export interface DataScope {
  availableFrom: string;
  availableTo: string;
  /** 'YYYY-MM-DD HH:mm UTC' */
  refreshedAt: string;
  countries: { code: string; name: string }[];
  entities: string[];
  customerName: string;
  limitations: string[];
}

/**
 * One goods line with its parent declaration, for the register's goods-line
 * grain. Paginated by line, not by declaration — a declaration's lines can span
 * two pages, so the header context travels with each row.
 */
export interface GoodsLineRow {
  declaration: Declaration;
  line: GoodsLine;
}

export interface DeclarationsClient {
  getScope(): Promise<DataScope>;
  listDeclarations(params: ListParams): Promise<Page<Declaration>>;
  getRegisterSummary(filter: DeclarationFilter): Promise<RegisterSummary>;
  getDeclaration(mrn: string): Promise<Declaration>;
  /** Goods-line grain of the same filtered set. */
  listGoodsLines(params: ListParams): Promise<Page<GoodsLineRow>>;
  /** Full filtered set — used by export and the mock ask engine. */
  listAllDeclarations(filter: DeclarationFilter, sort?: ListSort): Promise<Declaration[]>;
  /** Full filtered set at goods-line grain, in the order the register shows it — used by export. */
  listAllGoodsLines(filter: DeclarationFilter, sort?: ListSort): Promise<GoodsLineRow[]>;
}
