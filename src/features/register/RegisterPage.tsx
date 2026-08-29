import { useState } from 'react';
import { useDeclarationsClient, useDeclarationsList, useRegisterSummary, useScope } from '../../api/queries';
import type { SortKey } from '../../api/declarations-client';
import { formatCount } from '../../domain/money';
import { typeLabel, DECLARATION_STATUSES } from '../../domain/declaration';
import { LoadingScreen, ErrorScreen } from '../../app/StatusScreens';
import { useEntityFilter } from '../../app/MvpShell';
import { useToast } from '../../app/ToastContext';
import { ExportDialog } from '../export/ExportDialog';
import { exportDeclarations } from '../export/export-service';
import {
  activeChips,
  DEFAULT_REGISTER_STATE,
  PERIOD_LABEL,
  toFilter,
  type RegisterState,
} from './register-state';
import { SummaryCards } from './SummaryCards';
import { DataScopePanel } from './DataScopePanel';
import { DeclarationsTable, type TableSort } from './DeclarationsTable';
import styles from './register.module.css';

const PAGE_SIZE = 15;

export function RegisterPage() {
  const [entity] = useEntityFilter();
  const [state, setState] = useState<RegisterState>(DEFAULT_REGISTER_STATE);
  const [sort, setSort] = useState<TableSort>({ key: 'date', order: 'desc' });
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const toast = useToast();
  const client = useDeclarationsClient();

  const filter = toFilter(state, entity);
  const scope = useScope();
  const list = useDeclarationsList({ filter, sort: sort.key, order: sort.order, page, pageSize: PAGE_SIZE });
  const summary = useRegisterSummary(filter);

  if (scope.isPending || (list.isPending && !list.data)) return <LoadingScreen />;
  if (scope.isError || list.isError) {
    return (
      <ErrorScreen
        onRetry={() => {
          void scope.refetch();
          void list.refetch();
        }}
      />
    );
  }

  const patch = (p: Partial<RegisterState>) => {
    setState((s) => ({ ...s, ...p }));
    setPage(1);
  };
  const chips = activeChips(state, entity);
  const data = list.data!;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const shownPage = Math.min(page, pages);

  const onSort = (key: SortKey) => {
    setSort((s) => ({ key, order: s.key === key && s.order === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };

  const doExport = async (format: 'csv' | 'xlsx', includeLines: boolean) => {
    const rows = await client.listAllDeclarations(filter);
    exportDeclarations(rows, { format, includeLines, filename: 'declarations-export' });
    setExportOpen(false);
    toast('Export ready — file downloaded');
  };

  return (
    <div className={styles.page} data-screen-label="Declarations">
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Declarations</h1>
        <div className={styles.count}>{formatCount(data.total)} declarations</div>
        <div className={styles.spacer} />
        <button type="button" className={styles.primaryBtn} onClick={() => setExportOpen(true)}>
          Export results
        </button>
      </div>

      {scope.data && <DataScopePanel scope={scope.data} />}

      {summary.data && (
        <SummaryCards
          summary={summary.data}
          awaitingActive={state.status === 'Awaiting release'}
          gapsActive={state.gapsOnly}
          onToggleAwaiting={() =>
            patch({ status: state.status === 'Awaiting release' ? 'all' : 'Awaiting release' })
          }
          onToggleGaps={() => patch({ gapsOnly: !state.gapsOnly })}
        />
      )}

      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <input
            className={styles.search}
            value={state.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Search by MRN or customer reference…"
            aria-label="Search declarations"
          />
          <select
            className={styles.select}
            value={state.period}
            onChange={(e) => patch({ period: e.target.value as RegisterState['period'] })}
            aria-label="Date range"
          >
            {(Object.keys(PERIOD_LABEL) as RegisterState['period'][]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p].replace(/ \(.*\)/, '')}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={state.country}
            onChange={(e) => patch({ country: e.target.value })}
            aria-label="Declaration country"
          >
            <option value="all">All countries</option>
            {scope.data?.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={state.type}
            onChange={(e) => patch({ type: e.target.value as RegisterState['type'] })}
            aria-label="Declaration type"
          >
            <option value="all">All types</option>
            <option value="import">Import</option>
            <option value="export">Export</option>
            <option value="transit">Transit</option>
          </select>
          <select
            className={styles.select}
            value={state.status}
            onChange={(e) => patch({ status: e.target.value as RegisterState['status'] })}
            aria-label="Declaration status"
          >
            <option value="all">All statuses</option>
            {DECLARATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="button" className={styles.resetBtn} onClick={() => patch(DEFAULT_REGISTER_STATE)}>
            Reset
          </button>
        </div>
        {chips.length > 0 && (
          <div className={styles.chipsRow}>
            <span className={styles.chipsLabel}>Active filters:</span>
            {chips.map((ch) => (
              <button
                key={ch.key}
                type="button"
                title="Remove filter"
                className={styles.chip}
                onClick={() =>
                  ch.key === 'search'
                    ? patch({ search: '' })
                    : ch.key === 'gapsOnly'
                      ? patch({ gapsOnly: false })
                      : ch.key === 'entity'
                        ? undefined
                        : patch({ [ch.key]: 'all' } as Partial<RegisterState>)
                }
              >
                {ch.label} <span className={styles.chipX}>✕</span>
              </button>
            ))}
            <button type="button" className={styles.clearAll} onClick={() => patch(DEFAULT_REGISTER_STATE)}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {data.total === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No declarations match your filters</div>
          <div className={styles.emptyBody}>
            Try widening the date range or removing a filter. Data begins 1 March 2026.
          </div>
          <button type="button" className={styles.resetBtn} onClick={() => patch(DEFAULT_REGISTER_STATE)}>
            Clear all filters
          </button>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <DeclarationsTable rows={data.items} sort={sort} onSort={onSort} />
          <div className={styles.pagination}>
            <div className={`${styles.pageInfo} num`}>
              Showing {(shownPage - 1) * PAGE_SIZE + 1}–{Math.min(shownPage * PAGE_SIZE, data.total)} of{' '}
              {data.total} declarations
            </div>
            <div className={styles.pageControls}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={shownPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className={`${styles.pageInfo} num`}>
                Page {shownPage} of {pages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={shownPage >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {exportOpen && summary.data && (
        <ExportDialog
          title="Export declarations"
          defaultIncludeLines={false}
          summary={[
            ['Legal entity', entity === 'all' ? `${scope.data?.customerName ?? ''} — all entities` : entity],
            ['Date range', PERIOD_LABEL[state.period]],
            ['Countries', state.country === 'all' ? `All ${scope.data?.countries.length ?? 0} countries` : (scope.data?.countries.find((c) => c.code === state.country)?.name ?? state.country)],
            ['Declaration types', state.type === 'all' ? 'Import, export and transit' : typeLabel(state.type)],
            ['Declarations', formatCount(data.total)],
          ]}
          onCancel={() => setExportOpen(false)}
          onConfirm={doExport}
        />
      )}
    </div>
  );
}
