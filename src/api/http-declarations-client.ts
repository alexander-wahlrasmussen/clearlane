import type { AuthProvider } from '../auth/auth-provider';
import { API_SCOPES } from '../auth/auth-provider';
import { mapDeclaration, mapLine } from './mapping';
import type { DeclarationDto, GoodsLineRowDto } from './dto';
import type {
  DataScope,
  DeclarationFilter,
  DeclarationsClient,
  GoodsLineRow,
  ListParams,
  Page,
  RegisterSummary,
} from './declarations-client';
import type { Declaration } from '../domain/declaration';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`API request failed with ${status}: ${url}`);
    this.name = 'ApiError';
  }
}

/**
 * Real-backend implementation of DeclarationsClient against the contract in
 * contracts/openapi.yaml. Attaches a bearer token from the AuthProvider on
 * every request (Entra External ID in production — see docs/auth-entra-external-id.md).
 */
export class HttpDeclarationsClient implements DeclarationsClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly auth: AuthProvider) {
    // `new URL('declarations', '…/v1')` would drop `v1`; a trailing slash keeps the base path.
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  private async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
    const token = await this.auth.acquireToken(API_SCOPES);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError(res.status, url.toString());
    return (await res.json()) as T;
  }

  private static filterQuery(f: DeclarationFilter) {
    return {
      entity: f.entity,
      country: f.country,
      type: f.type,
      status: f.status,
      from: f.fromDate,
      search: f.search,
      withGapsOnly: f.withGapsOnly ? true : undefined,
    };
  }

  getScope(): Promise<DataScope> {
    return this.get<DataScope>('meta/scope');
  }

  async listDeclarations(p: ListParams): Promise<Page<Declaration>> {
    const page = await this.get<Page<DeclarationDto>>('declarations', {
      ...HttpDeclarationsClient.filterQuery(p.filter),
      sort: p.sort,
      order: p.order,
      page: p.page,
      pageSize: p.pageSize,
    });
    return { ...page, items: page.items.map(mapDeclaration) };
  }

  async listGoodsLines(p: ListParams): Promise<Page<GoodsLineRow>> {
    const page = await this.get<Page<GoodsLineRowDto>>('declarations/lines', {
      ...HttpDeclarationsClient.filterQuery(p.filter),
      sort: p.sort,
      order: p.order,
      page: p.page,
      pageSize: p.pageSize,
    });
    return {
      ...page,
      items: page.items.map((r) => ({
        declaration: mapDeclaration(r.declaration),
        line: mapLine(r.line, r.declaration.cur),
      })),
    };
  }

  getRegisterSummary(f: DeclarationFilter): Promise<RegisterSummary> {
    return this.get<RegisterSummary>('declarations/summary', HttpDeclarationsClient.filterQuery(f));
  }

  async getDeclaration(mrn: string): Promise<Declaration> {
    return mapDeclaration(await this.get<DeclarationDto>(`declarations/${encodeURIComponent(mrn)}`));
  }

  async listAllDeclarations(f: DeclarationFilter): Promise<Declaration[]> {
    const all: Declaration[] = [];
    let page = 1;
    for (;;) {
      const res = await this.listDeclarations({ filter: f, sort: 'date', order: 'desc', page, pageSize: 500 });
      all.push(...res.items);
      if (all.length >= res.total || res.items.length === 0) return all;
      page += 1;
    }
  }
}
