import { useMemo, useState } from 'react';
import { useAllDeclarations, useScope } from '../../api/queries';
import { STATUS_DOT, typeLabel, type DeclarationType } from '../../domain/declaration';
import { formatCount, formatMoney } from '../../domain/money';
import { formatIsoDate } from '../../domain/dates';
import { LoadingScreen, ErrorScreen } from '../../app/StatusScreens';
import { useAskSession } from './ask-session';
import styles from './ask.module.css';

/**
 * Lightweight companion register for the AI surface. The full register with
 * all columns, sorting and export lives in the MVP surface.
 */
export function AiRegisterPage() {
  const session = useAskSession();
  const scope = useScope();
  const decls = useAllDeclarations({});
  const [country, setCountry] = useState('all');
  const [type, setType] = useState<DeclarationType | 'all'>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    let list = decls.data ?? [];
    if (session.handoff) list = list.filter((d) => session.handoff!.mrns.includes(d.mrn));
    else {
      list = list.filter(
        (d) => (country === 'all' || d.countryCode === country) && (type === 'all' || d.type === type),
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) => d.mrn.toLowerCase().includes(q) || d.customerReference.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => b.clearanceDate.localeCompare(a.clearanceDate));
  }, [decls.data, session.handoff, country, type, search]);

  if (decls.isPending) return <LoadingScreen />;
  if (decls.isError) return <ErrorScreen onRetry={() => void decls.refetch()} />;

  return (
    <div className={styles.regPage} data-screen-label="Declarations">
      <div className={styles.regTitleRow}>
        <h1 className={styles.regTitle}>Declarations</h1>
        <div className={styles.regCount}>{formatCount(rows.length)} declarations</div>
      </div>
      <div className={styles.regFilters}>
        <input
          className={styles.regSearch}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by MRN or customer reference…"
          aria-label="Search declarations"
        />
        <select className={styles.regSelect} value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
          <option value="all">All countries</option>
          {scope.data?.countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        <select
          className={styles.regSelect}
          value={type}
          onChange={(e) => setType(e.target.value as DeclarationType | 'all')}
          aria-label="Type"
        >
          <option value="all">All types</option>
          <option value="import">Import</option>
          <option value="export">Export</option>
          <option value="transit">Transit</option>
        </select>
        {session.handoff && (
          <span className={styles.handoffChip}>
            From answer: {session.handoff.title}
            <button
              type="button"
              title="Show all declarations"
              className={styles.interpChipX}
              onClick={() => session.setHandoff(null)}
            >
              ✕
            </button>
          </span>
        )}
      </div>
      <div className={styles.regTableCard}>
        <table className={styles.regTable}>
          <thead>
            <tr>
              <th>Status</th>
              <th>MRN</th>
              <th>Cleared</th>
              <th>Country</th>
              <th>Type</th>
              <th>Importer / buyer</th>
              <th data-align="right">Customs value</th>
              <th data-align="right">Duty</th>
              <th data-align="right">VAT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.mrn}
                className={styles.listRow}
                tabIndex={0}
                onClick={() => session.openDrawer(d.mrn)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') session.openDrawer(d.mrn);
                }}
              >
                <td>
                  <span className={styles.statusCell}>
                    <span className={styles.briefDot} style={{ background: STATUS_DOT[d.status] }} />
                    {d.status}
                  </span>
                </td>
                <td className="mono">{d.mrn}</td>
                <td className="num">{formatIsoDate(d.releaseDate ?? d.clearanceDate)}</td>
                <td>{d.countryName}</td>
                <td>{typeLabel(d.type)}</td>
                <td className={styles.listReasonPlain}>{d.importer.name}</td>
                <td data-align="right" className="num">{formatMoney(d.customsValueTotal)}</td>
                <td data-align="right" className="num">{formatMoney(d.dutyTotal)}</td>
                <td data-align="right" className="num">{formatMoney(d.vatTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.regNote}>
        Amounts are shown in the currency declared on each declaration. The full declaration
        register with all columns and export lives in the MVP surface.
      </div>
    </div>
  );
}
