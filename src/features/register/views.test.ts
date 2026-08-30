import { beforeEach, describe, expect, it } from 'vitest';
import { BUILT_IN_VIEWS, describeFilter, viewMatches, type RegisterView, type ViewConfig } from './views';
import { loadSavedViews, persistSavedViews } from './saved-views-store';
import { registerColumn } from './columns';
import { DEFAULT_REGISTER_STATE } from './register-state';

describe('built-in views', () => {
  it('ship the three reports the source list can produce in full', () => {
    expect(BUILT_IN_VIEWS.map((v) => v.name)).toEqual([
      'Declaration Summary',
      'Declaration Line Overview',
      'Order/Declaration status',
    ]);
  });

  it('only name columns the registry offers at their grain', () => {
    for (const v of BUILT_IN_VIEWS) {
      for (const id of v.columns) {
        const c = registerColumn(id);
        expect(c, `${v.name}: ${id}`).toBeDefined();
        expect(c!.grains, `${v.name}: ${id}`).toContain(v.grain);
      }
    }
  });

  it('have unique ids, and match themselves', () => {
    expect(new Set(BUILT_IN_VIEWS.map((v) => v.id)).size).toBe(BUILT_IN_VIEWS.length);
    for (const v of BUILT_IN_VIEWS) expect(viewMatches(v, v)).toBe(true);
  });
});

describe('viewMatches', () => {
  const base: ViewConfig = BUILT_IN_VIEWS[0]!;

  it('is false once a column, filter, grain or sort differs', () => {
    expect(viewMatches(base, { ...base, columns: [...base.columns, 'broker'] })).toBe(false);
    expect(viewMatches(base, { ...base, columns: [...base.columns].reverse() })).toBe(false);
    expect(viewMatches(base, { ...base, filter: { ...base.filter, country: 'DE' } })).toBe(false);
    expect(viewMatches(base, { ...base, grain: 'line' })).toBe(false);
    expect(viewMatches(base, { ...base, sort: { sort: 'duty', order: 'asc' } })).toBe(false);
  });

  it('ignores whitespace around the search text', () => {
    const a = { ...base, filter: { ...base.filter, search: 'abc' } };
    const b = { ...base, filter: { ...base.filter, search: '  abc ' } };
    expect(viewMatches(a, b)).toBe(true);
  });
});

describe('describeFilter', () => {
  it('reads as plain English', () => {
    expect(describeFilter(DEFAULT_REGISTER_STATE)).toBe('Last 6 months (Mar–Aug 2026)');
    expect(
      describeFilter({ ...DEFAULT_REGISTER_STATE, country: 'DE', type: 'import', gapsOnly: true }),
    ).toBe('Last 6 months (Mar–Aug 2026) · Germany · Import · With data gaps');
  });
});

/** Minimal in-memory Storage — the browser's is injected in the app. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

describe('saved-views store', () => {
  let storage: Storage;
  beforeEach(() => {
    storage = memoryStorage();
  });

  const view: RegisterView = {
    id: 'view-1',
    name: 'German imports',
    description: '',
    builtIn: false,
    grain: 'line',
    columns: ['mrn', 'commodityCode'],
    filter: { ...DEFAULT_REGISTER_STATE, country: 'DE', type: 'import' },
    sort: { sort: 'duty', order: 'asc' },
  };

  it('round-trips a saved view', () => {
    persistSavedViews([view], storage);
    expect(loadSavedViews(storage)).toEqual([view]);
  });

  it('drops entries it does not recognise rather than breaking the register', () => {
    storage.setItem(
      'clearlane.register.saved-views.v1',
      JSON.stringify([
        view,
        { id: 'x', name: '', grain: 'line', columns: [], filter: DEFAULT_REGISTER_STATE },
        { id: 'y', name: 'Bad grain', grain: 'container', columns: [], filter: DEFAULT_REGISTER_STATE },
        { id: 'z', name: 'Bad period', grain: 'line', columns: [], filter: { period: '99y', type: 'all' } },
        'not an object',
      ]),
    );
    expect(loadSavedViews(storage).map((v) => v.id)).toEqual(['view-1']);
  });

  it('never marks a stored view as built-in, and falls back on an unknown sort', () => {
    storage.setItem(
      'clearlane.register.saved-views.v1',
      JSON.stringify([{ ...view, builtIn: true, sort: { sort: 'weight', order: 'sideways' } }]),
    );
    const [loaded] = loadSavedViews(storage);
    expect(loaded?.builtIn).toBe(false);
    expect(loaded?.sort).toEqual({ sort: 'date', order: 'desc' });
  });

  it('returns nothing on unreadable storage', () => {
    storage.setItem('clearlane.register.saved-views.v1', '{not json');
    expect(loadSavedViews(storage)).toEqual([]);
  });

  it('returns nothing when no storage is available at all', () => {
    expect(loadSavedViews(null)).toEqual([]);
    expect(() => persistSavedViews([view], null)).not.toThrow();
  });
});
