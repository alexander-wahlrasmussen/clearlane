import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useDeclaration } from '../../api/queries';
import { typeLabel } from '../../domain/declaration';
import { formatIsoDate } from '../../domain/dates';
import { formatCount, formatMoney } from '../../domain/money';
import { LoadingScreen, ErrorScreen } from '../../app/StatusScreens';
import { useToast } from '../../app/ToastContext';
import { StatusBadge, Term } from '../../components/FieldDisplay';
import { ExportDialog, EXPORT_NOTE } from '../export/ExportDialog';
import { exportRows, fileSlug } from '../export/export-service';
import { columnsForGrain, GRAIN_LABEL, type RegisterRow } from '../register/columns';
import { SummaryTab } from './tabs/SummaryTab';
import { PartiesTab } from './tabs/PartiesTab';
import { GoodsLinesTab } from './tabs/GoodsLinesTab';
import { ValuesTab } from './tabs/ValuesTab';
import { ReferencesTab } from './tabs/ReferencesTab';
import { AvailabilityTab } from './tabs/AvailabilityTab';
import styles from './declaration.module.css';

type TabKey = 'summary' | 'parties' | 'goods' | 'values' | 'references' | 'availability';

export function DeclarationPage() {
  const { mrn } = useParams({ from: '/mvp/declarations/$mrn' });
  const query = useDeclaration(mrn);
  const [tab, setTab] = useState<TabKey>('summary');
  const [exportOpen, setExportOpen] = useState(false);
  const toast = useToast();

  if (query.isPending) return <LoadingScreen />;
  if (query.isError) return <ErrorScreen onRetry={() => void query.refetch()} />;
  const d = query.data;

  const copyMrn = async () => {
    try {
      await navigator.clipboard.writeText(d.mrn);
    } catch {
      /* clipboard unavailable — the toast still confirms intent */
    }
    toast('MRN copied to clipboard');
  };

  const tabs: [TabKey, string][] = [
    ['summary', 'Summary'],
    ['parties', 'Parties and movement'],
    ['goods', `Goods lines (${d.lines.length})`],
    ['values', 'Values, duties and taxes'],
    ['references', 'References and information'],
    ['availability', 'Data availability and freshness'],
  ];

  return (
    <div className={styles.page} data-screen-label="Declaration detail">
      <Link to="/mvp" className={styles.backLink}>
        ← Back to declarations
      </Link>

      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerMain}>
            <div className={styles.mrnRow}>
              <Term help="Movement Reference Number — the unique identifier customs assigns to a declaration.">
                <span className={styles.mrn}>{d.mrn}</span>
              </Term>
              <button type="button" className={styles.copyBtn} title="Copy MRN" onClick={() => void copyMrn()}>
                Copy
              </button>
              <StatusBadge status={d.status} pill />
            </div>
            <div className={styles.metaGrid}>
              <Meta label="Type" value={typeLabel(d.type)} />
              <Meta label="Country" value={d.countryName} />
              <Meta label="Clearance date" value={formatIsoDate(d.clearanceDate)} num />
              <Meta label="Release date" value={d.releaseDate ? formatIsoDate(d.releaseDate) : 'Not yet released'} num />
              <Meta label="Customer reference" value={d.customerReference} mono />
              <Meta label="Goods lines" value={formatCount(d.lines.length)} num />
            </div>
          </div>
          <div className={styles.headerTotals}>
            <Total label="Customs value" value={formatMoney(d.customsValueTotal)} />
            <Total label="Total duty" value={formatMoney(d.dutyTotal)} />
            <Total label="Total VAT" value={formatMoney(d.vatTotal)} />
          </div>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.primaryBtn} onClick={() => setExportOpen(true)}>
            Export declaration
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={() => setTab('availability')}>
            Data availability
          </button>
        </div>
      </div>

      <div className={styles.tabBar} role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? styles.tabActive : styles.tab}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <SummaryTab d={d} />}
      {tab === 'parties' && <PartiesTab d={d} />}
      {tab === 'goods' && <GoodsLinesTab d={d} />}
      {tab === 'values' && <ValuesTab d={d} />}
      {tab === 'references' && <ReferencesTab d={d} />}
      {tab === 'availability' && <AvailabilityTab d={d} />}

      {exportOpen && (
        <ExportDialog
          title="Export declaration"
          lineOption={{ defaultOn: true }}
          summary={[
            ['Legal entity', d.legalEntity],
            ['Date range', formatIsoDate(d.clearanceDate)],
            ['Countries', d.countryName],
            ['Declaration types', typeLabel(d.type)],
          ]}
          plan={(includeLines) =>
            includeLines
              ? {
                  rows: `${formatCount(d.lines.length)} goods lines — one row per goods line`,
                  columns: columnsForGrain('line'),
                  note: `Every field of this declaration and its goods lines. ${EXPORT_NOTE.line}`,
                }
              : {
                  rows: '1 declaration — one row',
                  columns: columnsForGrain('declaration'),
                  note: `Every declaration-level field. ${EXPORT_NOTE.declaration}`,
                }
          }
          onCancel={() => setExportOpen(false)}
          onConfirm={(format, includeLines) => {
            const grain = includeLines ? 'line' : 'declaration';
            const rows: RegisterRow[] = includeLines
              ? d.lines.map((line) => ({ declaration: d, line }))
              : [{ declaration: d, line: null }];
            exportRows(rows, columnsForGrain(grain), {
              format,
              filename: `declaration-${fileSlug(d.mrn)}`,
              sheetName: GRAIN_LABEL[grain],
            });
            setExportOpen(false);
            toast('Export ready — file downloaded');
          }}
        />
      )}
    </div>
  );
}

function Meta(props: { label: string; value: string; mono?: boolean; num?: boolean }) {
  return (
    <div>
      <div className={styles.metaLabel}>{props.label}</div>
      <div className={`${styles.metaValue} ${props.mono ? 'mono' : ''} ${props.num ? 'num' : ''}`}>
        {props.value}
      </div>
    </div>
  );
}

function Total(props: { label: string; value: string }) {
  return (
    <div className={styles.total}>
      <div className={styles.metaLabel}>{props.label}</div>
      <div className={`${styles.totalValue} num`}>{props.value}</div>
    </div>
  );
}
