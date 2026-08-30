import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useScope } from '../api/queries';
import type { DeclarationFilter } from '../api/declarations-client';
import styles from './shell.module.css';

/**
 * The selected legal entity — 'all' or an entity name. It sits above both
 * surfaces: the register, the declaration view and every Ask answer read the
 * same selection, so a figure on the Ask canvas and a row in the register can
 * never disagree about whose declarations they cover.
 *
 * Deliberately not part of a saved report: a report is the same report
 * whichever entity is selected (features/register/views.ts).
 */
const EntityContext = createContext<[string, Dispatch<SetStateAction<string>>] | null>(null);

export function EntityProvider(props: { children: ReactNode }) {
  const state = useState<string>('all');
  return <EntityContext.Provider value={state}>{props.children}</EntityContext.Provider>;
}

export function useEntityFilter() {
  const ctx = useContext(EntityContext);
  if (!ctx) throw new Error('EntityProvider is missing above this component');
  return ctx;
}

/** The selected entity as the data layer's filter — nothing when all entities are selected. */
export function useEntityScope(): DeclarationFilter {
  const [entity] = useEntityFilter();
  return entity === 'all' ? {} : { entity };
}

/** The header's entity selector, shared by both shells. */
export function EntitySelect() {
  const [entity, setEntity] = useEntityFilter();
  const scope = useScope();
  return (
    <select
      className={styles.entitySelect}
      aria-label="Customer legal entity"
      value={entity}
      onChange={(e) => setEntity(e.target.value)}
    >
      <option value="all">{scope.data?.customerName ?? 'All'} — all entities</option>
      {scope.data?.entities.map((e) => (
        <option key={e} value={e}>
          {e}
        </option>
      ))}
    </select>
  );
}
