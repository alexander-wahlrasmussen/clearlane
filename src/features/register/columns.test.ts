import { describe, expect, it } from 'vitest';
import { catalogueField, FIELD_CATALOGUE } from '../../domain/field-catalogue';
import {
  columnsForGrain,
  DEFAULT_COLUMNS,
  REGISTER_COLUMNS,
  registerColumn,
  type Grain,
} from './columns';

const GRAINS: Grain[] = ['declaration', 'line'];

describe('register columns', () => {
  it('every column either names a real catalogue field or says why it is derived', () => {
    const catalogueLabels = new Set(FIELD_CATALOGUE.map((f) => f.label));
    for (const c of REGISTER_COLUMNS) {
      if (c.derivedNote) {
        expect(c.derivedNote.length, `${c.id} derived note`).toBeGreaterThan(20);
      } else {
        // Non-derived columns take their label from the catalogue, so a label
        // that is not in the catalogue means the field was renamed or removed.
        expect(catalogueLabels, `column ${c.id}`).toContain(c.label);
      }
    }
  });

  it('column ids are unique', () => {
    const ids = REGISTER_COLUMNS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every column is available at at least one grain', () => {
    for (const c of REGISTER_COLUMNS) expect(c.grains.length).toBeGreaterThan(0);
  });

  it('default column sets reference columns valid for their grain', () => {
    for (const grain of GRAINS) {
      const available = new Set(columnsForGrain(grain).map((c) => c.id));
      for (const id of DEFAULT_COLUMNS[grain]) {
        expect(registerColumn(id), `${grain} default "${id}"`).toBeDefined();
        expect(available, `${grain} default "${id}"`).toContain(id);
      }
    }
  });

  it('goods-line columns are not offered at declaration grain', () => {
    const declaration = columnsForGrain('declaration');
    expect(declaration.some((c) => c.id === 'lineNo')).toBe(false);
    expect(declaration.some((c) => c.id === 'commodityCode')).toBe(false);
  });

  it('header columns are offered at both grains', () => {
    for (const id of ['mrn', 'status', 'country', 'declarant']) {
      const c = registerColumn(id);
      expect(c?.grains).toEqual(['declaration', 'line']);
    }
  });

  it('the derived totals name the decision that makes them derived', () => {
    for (const id of ['customsValueTotal', 'dutyTotal', 'vatTotal']) {
      expect(registerColumn(id)?.derivedNote).toMatch(/no header-level|has no header-level/i);
    }
  });

  it('catalogueField throws on an unknown id', () => {
    expect(() => catalogueField('not_a_field')).toThrow(/Unknown catalogue field/);
  });
});
