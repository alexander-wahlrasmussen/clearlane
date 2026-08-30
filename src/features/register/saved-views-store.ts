import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_REGISTER_STATE, type RegisterState } from './register-state';
import type { RegisterView } from './views';

/**
 * Where the user's own reports live. In this prototype that is the browser's
 * localStorage; in production they belong with the user's account on the API
 * (see docs/architecture.md, decision 5). Nothing here is declaration data, so
 * DeclarationsClient is untouched.
 *
 * Reads are defensive: a view with a shape this build does not recognise is
 * dropped rather than allowed to break the register.
 */
const STORAGE_KEY = 'clearlane.register.saved-views.v1';

const PERIODS = new Set(['1m', '3m', '6m', 'ytd']);
const TYPES = new Set(['all', 'import', 'export', 'transit']);
const SORTS = new Set(['date', 'customsValue', 'duty', 'vat']);

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function readFilter(x: unknown): RegisterState | null {
  if (!isRecord(x)) return null;
  const period = typeof x.period === 'string' && PERIODS.has(x.period) ? x.period : null;
  const type = typeof x.type === 'string' && TYPES.has(x.type) ? x.type : null;
  if (!period || !type) return null;
  return {
    ...DEFAULT_REGISTER_STATE,
    period: period as RegisterState['period'],
    type: type as RegisterState['type'],
    country: typeof x.country === 'string' ? x.country : 'all',
    status: typeof x.status === 'string' ? (x.status as RegisterState['status']) : 'all',
    search: typeof x.search === 'string' ? x.search : '',
    gapsOnly: x.gapsOnly === true,
  };
}

function readView(x: unknown): RegisterView | null {
  if (!isRecord(x)) return null;
  if (typeof x.id !== 'string' || typeof x.name !== 'string' || !x.name.trim()) return null;
  if (x.grain !== 'declaration' && x.grain !== 'line') return null;
  if (!Array.isArray(x.columns) || !x.columns.every((c) => typeof c === 'string')) return null;
  const filter = readFilter(x.filter);
  if (!filter) return null;
  const sort = isRecord(x.sort) ? x.sort : {};
  return {
    id: x.id,
    name: x.name.trim(),
    description: typeof x.description === 'string' ? x.description : '',
    builtIn: false,
    grain: x.grain,
    columns: x.columns as string[],
    filter,
    sort: {
      sort: typeof sort.sort === 'string' && SORTS.has(sort.sort) ? (sort.sort as RegisterView['sort']['sort']) : 'date',
      order: sort.order === 'asc' ? 'asc' : 'desc',
    },
  };
}

/** The browser's storage, or null where it is unavailable (private mode, quota, SSR). */
function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? (window.localStorage ?? null) : null;
  } catch {
    return null;
  }
}

export function loadSavedViews(storage: Storage | null = browserStorage()): RegisterView[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(readView).filter((v): v is RegisterView => v !== null);
  } catch {
    return [];
  }
}

export function persistSavedViews(
  views: readonly RegisterView[],
  storage: Storage | null = browserStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // Storage unavailable (private mode, quota): the views stay for this session only.
  }
}

export function newViewId(): string {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * One in-memory copy shared by every component on the page, so saving a
 * report in one place (the register's report bar, an answer card) shows it
 * everywhere else at once. Loaded from storage on first use.
 */
let cache: RegisterView[] | null = null;
const listeners = new Set<() => void>();

function read(): RegisterView[] {
  if (cache === null) cache = loadSavedViews();
  return cache;
}

function write(next: RegisterView[]): void {
  cache = next;
  persistSavedViews(next);
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Forgets the in-memory copy — for tests that swap the storage underneath. */
export function resetSavedViewsCache(): void {
  cache = null;
}

/** The user's saved reports, persisted on every change. */
export function useSavedViews(): [RegisterView[], (next: RegisterView[]) => void] {
  const views = useSyncExternalStore(subscribe, read, read);
  const update = useCallback((next: RegisterView[]) => write(next), []);
  return [views, update];
}
