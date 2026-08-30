import { mapDeclaration } from '../api/mapping';
import type {
  DataScope,
  DeclarationFilter,
  DeclarationsClient,
  GoodsLineRow,
  ListParams,
  ListSort,
  Page,
  RegisterSummary,
} from '../api/declarations-client';
import { DEFAULT_SORT } from '../api/declarations-client';
import { hasDataGap, type Declaration } from '../domain/declaration';
import { eurEquivalentMinor } from '../domain/money';
import { COUNTRIES, CUSTOMER, generateDeclarations, REFRESHED_AT } from './synthetic-data';

/** Simulated network latency for local dev; tests pass 0 to skip the wait. */
const DEFAULT_LATENCY_MS = 250;

/**
 * In-memory implementation of DeclarationsClient over the synthetic dataset.
 * Runs the wire DTOs through the same mapping as the HTTP client, so the
 * sentinel→FieldValue conversion is exercised in local dev too.
 */
export class MockDeclarationsClient implements DeclarationsClient {
  private readonly declarations: Declaration[];
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.declarations = generateDeclarations().map(mapDeclaration);
    this.latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  }

  private delay<T>(value: T): Promise<T> {
    if (this.latencyMs <= 0) return Promise.resolve(value);
    return new Promise((resolve) => setTimeout(() => resolve(value), this.latencyMs));
  }

  private applyFilter(f: DeclarationFilter): Declaration[] {
    const q = f.search?.trim().toLowerCase();
    const mrns = f.mrns ? new Set(f.mrns) : null;
    return this.declarations.filter(
      (d) =>
        (!mrns || mrns.has(d.mrn)) &&
        (!f.fromDate || d.clearanceDate >= f.fromDate) &&
        (!f.entity || d.legalEntity === f.entity) &&
        (!f.country || d.countryCode === f.country) &&
        (!f.type || d.type === f.type) &&
        (!f.status || d.status === f.status) &&
        (!q || d.mrn.toLowerCase().includes(q) || d.customerReference.toLowerCase().includes(q)) &&
        (!f.withGapsOnly || hasDataGap(d)),
    );
  }

  getScope(): Promise<DataScope> {
    return this.delay({
      availableFrom: '2026-03-01',
      availableTo: '2026-08-26',
      refreshedAt: REFRESHED_AT,
      countries: COUNTRIES.map((c) => ({ code: c.c, name: c.name })),
      entities: [...new Set(COUNTRIES.map((c) => c.entity))].sort(),
      customerName: CUSTOMER,
      limitations: [
        'Net mass is not populated on a small number of goods lines — these are labelled “Not populated”.',
        'Some records have not yet been compared with the source record — these are labelled “Not verified”.',
        'Values are shown in the declared currency; unlike currencies are never added together.',
      ],
    });
  }

  private sortDeclarations(rows: Declaration[], s: ListSort): Declaration[] {
    // Cross-currency sort keys use the EUR equivalent at the declared rate.
    const key = (d: Declaration): string | number =>
      s.sort === 'date'
        ? d.clearanceDate
        : s.sort === 'customsValue'
          ? eurEquivalentMinor(d.customsValueTotal, d.declaredFxToEur)
          : s.sort === 'duty'
            ? eurEquivalentMinor(d.dutyTotal, d.declaredFxToEur)
            : eurEquivalentMinor(d.vatTotal, d.declaredFxToEur);
    const dir = s.order === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return ka < kb ? -dir : ka > kb ? dir : 0;
    });
  }

  private sortLines(rows: GoodsLineRow[], s: ListSort): GoodsLineRow[] {
    // Line-grain sort keys read the line's own amounts, converted at the rate
    // declared on its parent — never a live rate (principle #2).
    const key = (r: GoodsLineRow): string | number =>
      s.sort === 'date'
        ? r.declaration.clearanceDate
        : s.sort === 'customsValue'
          ? eurEquivalentMinor(r.line.customsValue, r.declaration.declaredFxToEur)
          : s.sort === 'duty'
            ? eurEquivalentMinor(r.line.dutyAmount, r.declaration.declaredFxToEur)
            : eurEquivalentMinor(r.line.vatAmount, r.declaration.declaredFxToEur);
    const dir = s.order === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (ka < kb) return -dir;
      if (ka > kb) return dir;
      // Stable within a declaration so its lines stay in declared order.
      return a.line.lineNo - b.line.lineNo;
    });
  }

  private filteredLines(f: DeclarationFilter): GoodsLineRow[] {
    return this.applyFilter(f).flatMap((declaration) =>
      declaration.lines.map((line) => ({ declaration, line })),
    );
  }

  listDeclarations(p: ListParams): Promise<Page<Declaration>> {
    const rows = this.applyFilter(p.filter);
    const sorted = this.sortDeclarations(rows, p);
    const start = (p.page - 1) * p.pageSize;
    return this.delay({
      items: sorted.slice(start, start + p.pageSize),
      total: rows.length,
      page: p.page,
      pageSize: p.pageSize,
    });
  }

  listGoodsLines(p: ListParams): Promise<Page<GoodsLineRow>> {
    const rows = this.filteredLines(p.filter);
    const sorted = this.sortLines(rows, p);
    const start = (p.page - 1) * p.pageSize;
    return this.delay({
      items: sorted.slice(start, start + p.pageSize),
      total: rows.length,
      page: p.page,
      pageSize: p.pageSize,
    });
  }

  getRegisterSummary(f: DeclarationFilter): Promise<RegisterSummary> {
    const rows = this.applyFilter(f);
    const eur = (fn: (d: Declaration) => number) => rows.reduce((s, d) => s + fn(d), 0);
    return this.delay({
      total: rows.length,
      imports: rows.filter((d) => d.type === 'import').length,
      exports: rows.filter((d) => d.type === 'export').length,
      transits: rows.filter((d) => d.type === 'transit').length,
      customsValueEurMinor: eur((d) => eurEquivalentMinor(d.customsValueTotal, d.declaredFxToEur)),
      dutyVatEurMinor: eur(
        (d) =>
          eurEquivalentMinor(d.dutyTotal, d.declaredFxToEur) +
          eurEquivalentMinor(d.vatTotal, d.declaredFxToEur),
      ),
      awaitingRelease: rows.filter((d) => d.status === 'Awaiting release').length,
      withDataGaps: rows.filter(hasDataGap).length,
      currencies: [...new Set(rows.map((d) => d.currency))].sort(),
    });
  }

  getDeclaration(mrn: string): Promise<Declaration> {
    const d = this.declarations.find((x) => x.mrn === mrn);
    if (!d) return Promise.reject(new Error(`Declaration ${mrn} not found`));
    return this.delay(d);
  }

  listAllDeclarations(f: DeclarationFilter, sort: ListSort = DEFAULT_SORT): Promise<Declaration[]> {
    return this.delay(this.sortDeclarations(this.applyFilter(f), sort));
  }

  listAllGoodsLines(f: DeclarationFilter, sort: ListSort = DEFAULT_SORT): Promise<GoodsLineRow[]> {
    return this.delay(this.sortLines(this.filteredLines(f), sort));
  }
}
