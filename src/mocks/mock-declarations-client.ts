import { mapDeclaration } from '../api/mapping';
import type {
  DataScope,
  DeclarationFilter,
  DeclarationsClient,
  ListParams,
  Page,
  RegisterSummary,
} from '../api/declarations-client';
import { hasDataGap, type Declaration } from '../domain/declaration';
import { eurEquivalentMinor } from '../domain/money';
import { COUNTRIES, CUSTOMER, generateDeclarations, REFRESHED_AT } from './synthetic-data';

const LATENCY_MS = 250;
const delay = <T>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), LATENCY_MS));

/**
 * In-memory implementation of DeclarationsClient over the synthetic dataset.
 * Runs the wire DTOs through the same mapping as the HTTP client, so the
 * sentinel→FieldValue conversion is exercised in local dev too.
 */
export class MockDeclarationsClient implements DeclarationsClient {
  private readonly declarations: Declaration[];

  constructor() {
    this.declarations = generateDeclarations().map(mapDeclaration);
  }

  private applyFilter(f: DeclarationFilter): Declaration[] {
    const q = f.search?.trim().toLowerCase();
    return this.declarations.filter(
      (d) =>
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
    return delay({
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

  listDeclarations(p: ListParams): Promise<Page<Declaration>> {
    const rows = this.applyFilter(p.filter);
    // Cross-currency sort keys use the EUR equivalent at the declared rate.
    const key = (d: Declaration): string | number =>
      p.sort === 'date'
        ? d.clearanceDate
        : p.sort === 'customsValue'
          ? eurEquivalentMinor(d.customsValueTotal, d.declaredFxToEur)
          : p.sort === 'duty'
            ? eurEquivalentMinor(d.dutyTotal, d.declaredFxToEur)
            : eurEquivalentMinor(d.vatTotal, d.declaredFxToEur);
    const dir = p.order === 'asc' ? 1 : -1;
    const sorted = [...rows].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return ka < kb ? -dir : ka > kb ? dir : 0;
    });
    const start = (p.page - 1) * p.pageSize;
    return delay({
      items: sorted.slice(start, start + p.pageSize),
      total: rows.length,
      page: p.page,
      pageSize: p.pageSize,
    });
  }

  getRegisterSummary(f: DeclarationFilter): Promise<RegisterSummary> {
    const rows = this.applyFilter(f);
    const eur = (fn: (d: Declaration) => number) => rows.reduce((s, d) => s + fn(d), 0);
    return delay({
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
    return delay(d);
  }

  listAllDeclarations(f: DeclarationFilter): Promise<Declaration[]> {
    return delay(this.applyFilter(f));
  }
}
