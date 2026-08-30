import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDeclarationsList, useGoodsLinesList, useScope } from '../../api/queries';
import type { SortKey } from '../../api/declarations-client';
import type { Confidence, ExtractInterpretation } from '../../ai/ask-types';
import { useEntityFilter } from '../../app/entity-context';
import { useToast } from '../../app/ToastContext';
import { DECLARATION_STATUSES } from '../../domain/declaration';
import { formatCount } from '../../domain/money';
import { ExportDialog, EXPORT_NOTE } from '../export/ExportDialog';
import { fileSlug } from '../export/export-service';
import { useViewExport } from '../export/useViewExport';
import { ColumnPicker } from '../register/ColumnPicker';
import { RegisterTable } from '../register/DeclarationsTable';
import { Pagination } from '../register/Pagination';
import { DEFAULT_COLUMNS, GRAIN_LABEL, resolveColumns, type Grain, type RegisterRow } from '../register/columns';
import { PERIOD_LABEL, toFilter, type RegisterState } from '../register/register-state';
import { newViewId, useSavedViews } from '../register/saved-views-store';
import { BUILT_IN_VIEWS, findView, viewMatches, type RegisterView, type ViewConfig } from '../register/views';
import { useAskSession } from './ask-session';
import reg from '../register/register.module.css';
import styles from './ask.module.css';

const PAGE_SIZE = 10;
const GRAINS: readonly Grain[] = ['declaration', 'line'];

/**
 * An extract answer: the register, configured by the interpretation, inside an
 * answer card. Its chips are the view's filters, its column picker is the
 * register's, and its export is the register's — so a report asked for here
 * is the same rows, columns and file as the MVP's saved report of that name.
 * The rows are the evidence: each opens the full declaration.
 */
export function ExtractAnswer(props: { cardId: number; interp: ExtractInterpretation; confidence: Confidence }) {
  const { cardId, interp, confidence } = props;
  const { view } = interp;
  const session = useAskSession();
  const [entity] = useEntityFilter();
  const scope = useScope();
  const navigate = useNavigate();
  const toast = useToast();
  const exportView = useViewExport();
  const [savedViews, setSavedViews] = useSavedViews();
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const filter = toFilter(view.filter, entity);
  const params = { filter, ...view.sort, page, pageSize: PAGE_SIZE };
  const declarations = useDeclarationsList(params, view.grain === 'declaration');
  const goodsLines = useGoodsLinesList(params, view.grain === 'line');
  const list = view.grain === 'declaration' ? declarations : goodsLines;
  const columns = resolveColumns(view.columns);
  const total = list.data?.total ?? 0;
  const rows: RegisterRow[] =
    view.grain === 'declaration'
      ? (declarations.data?.items ?? []).map((d) => ({ declaration: d, line: null }))
      : (goodsLines.data?.items ?? []);
  const rowNoun = view.grain === 'declaration' ? 'declarations' : 'goods lines';

  const report = findView([...BUILT_IN_VIEWS, ...savedViews], interp.reportId);
  const modified = report ? !viewMatches(report, view) : false;

  useEffect(() => {
    if (saving) nameRef.current?.select();
  }, [saving]);

  const set = (patch: Partial<ViewConfig>) => {
    session.setInterpretation(cardId, { ...interp, view: { ...view, ...patch } });
    setPage(1);
  };
  const setFilter = (p: Partial<RegisterState>) => set({ filter: { ...view.filter, ...p } });
  const switchGrain = (g: Grain) => {
    if (g === view.grain) return;
    // A different grain is a different set of rows, so it is no longer the named report.
    session.setInterpretation(cardId, {
      ...interp,
      name: g === 'declaration' ? 'Declarations' : 'Goods lines',
      reportId: null,
      view: { ...view, grain: g, columns: DEFAULT_COLUMNS[g] },
    });
    setPage(1);
  };
  const onSort = (key: SortKey) =>
    set({ sort: { sort: key, order: view.sort.sort === key && view.sort.order === 'desc' ? 'asc' : 'desc' } });

  const saveAs = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const v: RegisterView = { ...view, id: newViewId(), name: trimmed, description: '', builtIn: false };
    setSavedViews([...savedViews, v]);
    session.setInterpretation(cardId, { ...interp, name: trimmed, reportId: v.id });
    setSaving(false);
    toast(`Report “${trimmed}” saved`);
  };

  const filename = report ? fileSlug(report.name) : view.grain === 'declaration' ? 'declarations-export' : 'goods-lines-export';

  return (
    <>
      <div className={styles.interpBar}>
        <span className={styles.interpLabel}>Understood as</span>
        <select
          className={styles.interpSelect}
          aria-label="Rows"
          value={view.grain}
          onChange={(e) => switchGrain(e.target.value as Grain)}
        >
          {GRAINS.map((g) => (
            <option key={g} value={g}>{GRAIN_LABEL[g]} — one row each</option>
          ))}
        </select>
        <select
          className={styles.interpSelect}
          aria-label="Date range"
          value={view.filter.period}
          onChange={(e) => setFilter({ period: e.target.value as RegisterState['period'] })}
        >
          {(Object.keys(PERIOD_LABEL) as RegisterState['period'][]).map((p) => (
            <option key={p} value={p}>{PERIOD_LABEL[p]}</option>
          ))}
        </select>
        <select
          className={styles.interpSelect}
          aria-label="Declaration country"
          value={view.filter.country}
          onChange={(e) => setFilter({ country: e.target.value })}
        >
          <option value="all">All countries</option>
          {scope.data?.countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        <select
          className={styles.interpSelect}
          aria-label="Declaration type"
          value={view.filter.type}
          onChange={(e) => setFilter({ type: e.target.value as RegisterState['type'] })}
        >
          <option value="all">All types</option>
          <option value="import">Imports</option>
          <option value="export">Exports</option>
          <option value="transit">Transit</option>
        </select>
        <select
          className={styles.interpSelect}
          aria-label="Declaration status"
          value={view.filter.status}
          onChange={(e) => setFilter({ status: e.target.value as RegisterState['status'] })}
        >
          <option value="all">All statuses</option>
          {DECLARATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className={styles.interpSelect}
          aria-label="Data gaps"
          value={view.filter.gapsOnly ? 'gaps' : 'all'}
          onChange={(e) => setFilter({ gapsOnly: e.target.value === 'gaps' })}
        >
          <option value="all">All rows</option>
          <option value="gaps">With data gaps only</option>
        </select>
        {view.filter.search.trim() && (
          <span className={styles.interpChip}>
            Search: {view.filter.search.trim()}
            <button type="button" title="Remove search" className={styles.interpChipX} onClick={() => setFilter({ search: '' })}>
              ✕
            </button>
          </span>
        )}
        <ColumnPicker grain={view.grain} selected={view.columns} onChange={(ids) => set({ columns: ids })} />
        <span className={styles.interpSpacer} />
        {report && modified && <span className={reg.modifiedTag}>Modified from {report.name}</span>}
        <span className={styles.computedChip}>✓ Rows from source data</span>
        {confidence.low && <span className={styles.checkChip}>Check interpretation</span>}
      </div>
      {confidence.low && <div className={styles.confBanner}>{confidence.message}</div>}

      <div className={styles.answerBody}>
        {list.isPending && !list.data && (
          <div className={styles.pendingRow}>
            <div className={styles.pendingSpinner} />
            <span className={styles.pendingText}>Reading rows from source data…</span>
          </div>
        )}
        {list.isError && (
          <div className={styles.failedRow}>
            The rows could not be read right now. Your data is unchanged — please try again.
          </div>
        )}
        {list.data && total === 0 && (
          <div className={styles.answerEmpty}>
            No {rowNoun} match this interpretation. Adjust the filters above — data begins 1 March 2026.
          </div>
        )}
        {list.data && total > 0 && (
          <div className={styles.extractTable}>
            <RegisterTable rows={rows} columns={columns} sort={view.sort} onSort={onSort} onOpen={session.openDrawer} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} rowNoun={rowNoun} onPage={setPage} />
          </div>
        )}
      </div>

      <div className={styles.answerFoot}>
        <span>
          <strong className="num">{formatCount(total)}</strong> {rowNoun} · <span className="num">{columns.length}</span>{' '}
          columns
        </span>
        <button type="button" className={styles.evidenceLink} disabled={total === 0} onClick={() => setExportOpen(true)}>
          Export rows…
        </button>
        <button
          type="button"
          className={styles.evidenceLink}
          onClick={() => {
            session.setHandoff({ title: interp.name, view });
            void navigate({ to: '/ai/declarations' });
          }}
        >
          Open in the Declarations tab →
        </button>
        {!saving && (!report || modified) && (
          <button
            type="button"
            className={styles.evidenceLink}
            onClick={() => {
              setName(report ? `${report.name} (copy)` : interp.name);
              setSaving(true);
            }}
          >
            {report ? 'Save as new report…' : 'Save as report…'}
          </button>
        )}
        {saving && (
          <form className={reg.saveForm} onSubmit={saveAs}>
            <label className={reg.viewLabel} htmlFor={`extract-name-${cardId}`}>
              Report name
            </label>
            <input
              id={`extract-name-${cardId}`}
              ref={nameRef}
              className={reg.saveInput}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSaving(false);
              }}
            />
            <button type="submit" className={reg.primaryBtnSmall} disabled={!name.trim()}>
              Save
            </button>
            <button type="button" className={reg.resetBtnSmall} onClick={() => setSaving(false)}>
              Cancel
            </button>
          </form>
        )}
        <span className={styles.interpSpacer} />
        <span>Each row is a declaration record — open one for the full declaration</span>
      </div>

      {exportOpen && (
        <ExportDialog
          title={view.grain === 'declaration' ? 'Export declarations' : 'Export goods lines'}
          summary={[
            ['Answer', report ? (modified ? `${report.name} (modified)` : report.name) : interp.name],
            ['Legal entity', entity === 'all' ? `${scope.data?.customerName ?? ''} — all entities` : entity],
            ['Date range', PERIOD_LABEL[view.filter.period]],
            [
              'Countries',
              view.filter.country === 'all'
                ? `All ${scope.data?.countries.length ?? 0} countries`
                : (scope.data?.countries.find((c) => c.code === view.filter.country)?.name ?? view.filter.country),
            ],
            ['Declaration types', view.filter.type === 'all' ? 'Import, export and transit' : view.filter.type],
          ]}
          plan={() => ({
            rows: `${formatCount(total)} ${rowNoun} — one row per ${view.grain === 'declaration' ? 'declaration' : 'goods line'}`,
            columns,
            note: EXPORT_NOTE[view.grain],
          })}
          onCancel={() => setExportOpen(false)}
          onConfirm={async (format) => {
            if (await exportView({ grain: view.grain, filter, sort: view.sort, columns, filename, format })) {
              setExportOpen(false);
            }
          }}
        />
      )}
    </>
  );
}
