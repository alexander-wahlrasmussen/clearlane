import { Link } from '@tanstack/react-router';
import { formatCount } from '../../domain/money';
import { resolveColumns } from '../register/columns';
import { useSavedViews } from '../register/saved-views-store';
import { BUILT_IN_VIEWS, describeFilter, describeGrain, type RegisterView } from '../register/views';
import styles from './reports.module.css';

/**
 * The requested reports the declaration data can produce — each is the register
 * configured a particular way — and, just as visibly, the ones it cannot
 * (principle #3: limitations are surfaced in the UI, not buried in docs).
 * Reasons are from docs/reports-sourcing.md.
 */
const NOT_OFFERED: { name: string; reason: string }[] = [
  {
    name: 'VAT Reports',
    reason:
      'Needs each legal entity’s VAT registration number, which the declaration data does not carry. Once that list is supplied, an import-only VAT report follows — duty and VAT do not apply to export or transit declarations.',
  },
  {
    name: 'MDR (Manifest Discrepancy Report)',
    reason: 'Needs the manifest itself. No manifest field exists in the source list.',
  },
  {
    name: 'MCD (Material Compliance Declaration) Report',
    reason:
      'Needs product composition and compliance data, which sits in the product master rather than on a declaration. The article number needed to join the two is optional on every declaration type.',
  },
  {
    name: 'EC Sales',
    reason:
      'Concerns intra-EU supplies, which produce no customs declaration. It comes from the sales ledger, not from declaration data.',
  },
  {
    name: 'Intrastat',
    reason:
      'Concerns intra-EU movements, which produce no customs declaration. It comes from the ERP’s goods movements, not from declaration data.',
  },
];

export function ReportsPage() {
  const [saved] = useSavedViews();
  return (
    <div className={styles.page} data-screen-label="Reports">
      <h1 className={styles.title}>Reports</h1>
      <p className={styles.intro}>
        A report is the declaration register set up a particular way — its rows, columns and filters —
        so it opens, and exports, the same way each time. Open one, adjust it, and save the result as
        your own.
      </p>

      <ReportTable title="Built-in reports" views={BUILT_IN_VIEWS} />
      <ReportTable
        title="Your reports"
        intro="Saved in this browser only — they do not follow you to another device or to a colleague. In the product they would be kept with your account."
        views={saved}
        empty="No saved reports yet. Open the register, set it up the way you want and choose “Save as report”."
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Requested reports not offered here</h2>
        <p className={styles.sectionIntro}>
          These were asked for alongside the reports above. Each needs data that a customs declaration
          does not contain, so offering them from this product would be a claim the data cannot support.
        </p>
        <dl className={styles.reasons}>
          {NOT_OFFERED.map((r) => (
            <div key={r.name} className={styles.reason}>
              <dt>{r.name}</dt>
              <dd>{r.reason}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function ReportTable(props: {
  title: string;
  intro?: string;
  views: readonly RegisterView[];
  empty?: string;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{props.title}</h2>
      {props.intro && <p className={styles.sectionIntro}>{props.intro}</p>}
      {props.views.length === 0 ? (
        <div className={styles.empty}>{props.empty}</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Report</th>
                <th>Rows</th>
                <th>Filters</th>
                <th data-align="right">Columns</th>
                <th>
                  <span className={styles.srOnly}>Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {props.views.map((v) => (
                <tr key={v.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.name}>{v.name}</div>
                    {v.description && <div className={styles.desc}>{v.description}</div>}
                  </td>
                  <td>{describeGrain(v.grain)}</td>
                  <td>{describeFilter(v.filter)}</td>
                  <td data-align="right" className="num">
                    {formatCount(resolveColumns(v.columns).length)}
                  </td>
                  <td data-align="right">
                    <Link to="/mvp" search={{ view: v.id }} className={styles.openLink}>
                      Open report →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
