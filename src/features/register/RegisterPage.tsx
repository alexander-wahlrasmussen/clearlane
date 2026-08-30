import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useDeclarationsList, useGoodsLinesList, useRegisterSummary, useScope } from '../../api/queries';
import type { ListSort, SortKey } from '../../api/declarations-client';
import { formatCount } from '../../domain/money';
import { typeLabel, DECLARATION_STATUSES } from '../../domain/declaration';
import { LoadingScreen, ErrorScreen } from '../../app/StatusScreens';
import { useEntityFilter } from '../../app/entity-context';
import { useToast } from '../../app/ToastContext';
import { ExportDialog, EXPORT_NOTE } from '../export/ExportDialog';
import { fileSlug } from '../export/export-service';
import { useViewExport } from '../export/useViewExport';
import {
  activeChips,
  DEFAULT_REGISTER_STATE,
  PERIOD_LABEL,
  toFilter,
  type RegisterState,
} from './register-state';
import { SummaryCards } from './SummaryCards';
import { DataScopePanel } from './DataScopePanel';
import { RegisterTable } from './DeclarationsTable';
import { ColumnPicker } from './ColumnPicker';
import { Pagination } from './Pagination';
import { ReportBar } from './ReportBar';
import { DEFAULT_COLUMNS, GRAIN_LABEL, resolveColumns, type Grain, type RegisterRow } from './columns';
import { BUILT_IN_VIEWS, findView, viewMatches, type RegisterView, type ViewConfig } from './views';
import { newViewId, useSavedViews } from './saved-views-store';
import styles from './register.module.css';

const PAGE_SIZE = 15;
const GRAINS: readonly Grain[] = ['declaration', 'line'];

/**
 * A set handed to the register from an Ask answer: the exact declarations an
 * answer was computed from, or the view an extract answer is showing.
 */
export interface RegisterHandoff {
  title: string;
  mrns?: readonly string[];
  view?: ViewConfig;
}

export interface RegisterPageProps {
  /** What opening a row does — the MVP navigates, the AI surface opens its drawer. */
  onOpenDeclaration: (mrn: string) => void;
  /**
   * Whether reports are chosen from a selector here. The MVP's way in; the AI
   * surface reaches the same reports by asking for them, so it hides this.
   */
  reportBar: boolean;
  handoff?: RegisterHandoff | null;
  onClearHandoff?: () => void;
}

/**
 * The declaration register. One component hosted by both surfaces, so there is
 * one set of filters, columns, sort and export — never a second, lesser register.
 */
export function RegisterPage(props: RegisterPageProps) {
  const { onOpenDeclaration, reportBar, handoff } = props;
  const [entity, setEntity] = useEntityFilter();
  const navigate = useNavigate();
  const { view: viewParam } = useSearch({ strict: false }) as { view?: string };
  const [savedViews, setSavedViews] = useSavedViews();
  const allViews = useMemo(() => [...BUILT_IN_VIEWS, ...savedViews], [savedViews]);

  // A report named in the URL, or a view handed over from an answer, seeds the
  // initial state so the register opens on it without first fetching the defaults.
  const initialView = (reportBar ? findView(allViews, viewParam) : undefined) ?? handoff?.view;
  const [activeId, setActiveId] = useState<string | null>(
    reportBar ? (findView(allViews, viewParam)?.id ?? null) : null,
  );
  const [state, setState] = useState<RegisterState>(initialView?.filter ?? DEFAULT_REGISTER_STATE);
  const [sort, setSort] = useState<ListSort>(initialView?.sort ?? { sort: 'date', order: 'desc' });
  const [page, setPage] = useState(1);
  const [grain, setGrain] = useState<Grain>(initialView?.grain ?? 'declaration');
  const [columnIds, setColumnIds] = useState<Record<Grain, readonly string[]>>({
    declaration: DEFAULT_COLUMNS.declaration,
    line: DEFAULT_COLUMNS.line,
    ...(initialView ? { [initialView.grain]: initialView.columns } : {}),
  });
  const [exportOpen, setExportOpen] = useState(false);
  const toast = useToast();
  const exportView = useViewExport();

  const filter = { ...toFilter(state, entity), ...(handoff?.mrns ? { mrns: handoff.mrns } : {}) };
  const params = { filter, ...sort, page, pageSize: PAGE_SIZE };
  const scope = useScope();
  const declarations = useDeclarationsList(params, grain === 'declaration');
  const goodsLines = useGoodsLinesList(params, grain === 'line');
  const summary = useRegisterSummary(filter);
  const list = grain === 'declaration' ? declarations : goodsLines;

  // Unknown ids are dropped rather than thrown on: a saved column set must not
  // break the register if a column is later removed from the registry.
  const columns = useMemo(() => resolveColumns(columnIds[grain]), [columnIds, grain]);

  const applyView = (v: ViewConfig) => {
    setState(v.filter);
    setGrain(v.grain);
    setColumnIds((c) => ({ ...c, [v.grain]: v.columns }));
    setSort(v.sort);
    setPage(1);
  };

  // The URL is the way in to a report (from the Reports page, a bookmark, a
  // shared link). Selecting one here writes the URL, and this applies it.
  useEffect(() => {
    if (!reportBar) return;
    if (!viewParam) {
      setActiveId(null);
      return;
    }
    const v = findView(allViews, viewParam);
    if (!v) {
      toast('That report no longer exists');
      void navigate({ to: '/mvp', search: {}, replace: true });
      return;
    }
    setActiveId(v.id);
    applyView(v);
  }, [reportBar, viewParam, allViews]);

  // A hand-off from an answer shows that answer's rows: its view as it was, or
  // its evidence set with the filters cleared so every declaration in it is shown.
  useEffect(() => {
    if (!handoff) return;
    if (handoff.view) applyView(handoff.view);
    else {
      setState(DEFAULT_REGISTER_STATE);
      setPage(1);
    }
  }, [handoff]);

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
  /** Reset and Clear all also return the legal-entity selector to all entities. */
  const resetAll = () => {
    patch(DEFAULT_REGISTER_STATE);
    setEntity('all');
    props.onClearHandoff?.();
  };
  const chips = activeChips(state, entity);
  const total = list.data?.total ?? 0;
  const rows: RegisterRow[] =
    grain === 'declaration'
      ? (declarations.data?.items ?? []).map((d) => ({ declaration: d, line: null }))
      : (goodsLines.data?.items ?? []);
  const rowNoun = grain === 'declaration' ? 'declarations' : 'goods lines';

  const current: ViewConfig = { grain, columns: columnIds[grain], filter: state, sort };
  const activeView = reportBar ? findView(allViews, activeId) : undefined;
  const modified = activeView ? !viewMatches(activeView, current) : false;

  const selectView = (id: string | null) =>
    void navigate({ to: '/mvp', search: id ? { view: id } : {}, replace: true });

  const saveAs = (name: string) => {
    const v: RegisterView = { ...current, id: newViewId(), name, description: '', builtIn: false };
    setSavedViews([...savedViews, v]);
    selectView(v.id);
    toast(`Report “${name}” saved`);
  };
  const saveChanges = () => {
    if (!activeView || activeView.builtIn) return;
    setSavedViews(savedViews.map((v) => (v.id === activeView.id ? { ...activeView, ...current } : v)));
    toast(`Report “${activeView.name}” updated`);
  };
  const deleteView = () => {
    if (!activeView || activeView.builtIn) return;
    setSavedViews(savedViews.filter((v) => v.id !== activeView.id));
    selectView(null);
    toast(`Report “${activeView.name}” deleted`);
  };

  const switchGrain = (g: Grain) => {
    setGrain(g);
    setPage(1);
  };

  const onSort = (key: SortKey) => {
    setSort((s) => ({ sort: key, order: s.sort === key && s.order === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };

  const doExport = async (format: 'csv' | 'xlsx') => {
    const filename = activeView
      ? fileSlug(activeView.name)
      : handoff
        ? fileSlug(handoff.title)
        : grain === 'declaration'
          ? 'declarations-export'
          : 'goods-lines-export';
    // On failure the dialog stays open so the user can retry; nothing was written.
    if (await exportView({ grain, filter, sort, columns, filename, format })) setExportOpen(false);
  };

  return (
    <div className={styles.page} data-screen-label="Declarations">
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Declarations</h1>
        <div className={styles.count}>
          {formatCount(total)} {rowNoun}
        </div>
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
          <button type="button" className={styles.resetBtn} onClick={resetAll}>
            Reset
          </button>
        </div>
        {reportBar && (
          <ReportBar
            builtIn={BUILT_IN_VIEWS}
            saved={savedViews}
            active={activeView}
            modified={modified}
            onSelect={selectView}
            onSaveAs={saveAs}
            onSaveChanges={saveChanges}
            onDiscard={() => activeView && applyView(activeView)}
            onDelete={deleteView}
          />
        )}
        <div className={styles.viewRow}>
          <span className={styles.viewLabel}>Show</span>
          <div className={styles.grainToggle} role="group" aria-label="Row grain">
            {GRAINS.map((g) => (
              <button
                key={g}
                type="button"
                className={styles.grainBtn}
                aria-pressed={grain === g}
                onClick={() => switchGrain(g)}
              >
                {GRAIN_LABEL[g]}
              </button>
            ))}
          </div>
          <span className={styles.viewHint}>
            {grain === 'declaration'
              ? 'One row per declaration.'
              : 'One row per goods line, with its declaration alongside.'}
          </span>
          <div className={styles.spacer} />
          <ColumnPicker
            grain={grain}
            selected={columnIds[grain]}
            onChange={(ids) => setColumnIds((c) => ({ ...c, [grain]: ids }))}
          />
        </div>
        {(chips.length > 0 || handoff) && (
          <div className={styles.chipsRow}>
            <span className={styles.chipsLabel}>Active filters:</span>
            {handoff && (
              <button
                type="button"
                title="Show all declarations"
                className={styles.handoffChip}
                onClick={props.onClearHandoff}
              >
                From answer: {handoff.title} <span className={styles.chipX}>✕</span>
              </button>
            )}
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
                        ? setEntity('all')
                        : patch({ [ch.key]: 'all' } as Partial<RegisterState>)
                }
              >
                {ch.label} <span className={styles.chipX}>✕</span>
              </button>
            ))}
            <button type="button" className={styles.clearAll} onClick={resetAll}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No {rowNoun} match your filters</div>
          <div className={styles.emptyBody}>
            Try widening the date range or removing a filter. Data begins 1 March 2026.
          </div>
          <button type="button" className={styles.resetBtn} onClick={resetAll}>
            Clear all filters
          </button>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <RegisterTable rows={rows} columns={columns} sort={sort} onSort={onSort} onOpen={onOpenDeclaration} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} rowNoun={rowNoun} onPage={setPage} />
        </div>
      )}

      {exportOpen && summary.data && (
        <ExportDialog
          title={grain === 'declaration' ? 'Export declarations' : 'Export goods lines'}
          summary={[
            ...(activeView
              ? [['Report', modified ? `${activeView.name} (modified)` : activeView.name] as [string, string]]
              : []),
            ...(handoff ? [['From answer', handoff.title] as [string, string]] : []),
            ['Legal entity', entity === 'all' ? `${scope.data?.customerName ?? ''} — all entities` : entity],
            ['Date range', PERIOD_LABEL[state.period]],
            ['Countries', state.country === 'all' ? `All ${scope.data?.countries.length ?? 0} countries` : (scope.data?.countries.find((c) => c.code === state.country)?.name ?? state.country)],
            ['Declaration types', state.type === 'all' ? 'Import, export and transit' : typeLabel(state.type)],
          ]}
          plan={() => ({
            rows: `${formatCount(total)} ${rowNoun} — one row per ${grain === 'declaration' ? 'declaration' : 'goods line'}`,
            columns,
            note: EXPORT_NOTE[grain],
          })}
          onCancel={() => setExportOpen(false)}
          onConfirm={doExport}
        />
      )}
    </div>
  );
}
