import { Link } from '@tanstack/react-router';
import { readConfig } from './config';
import { BUILD_INFO } from './build-info';
import shell from './shell.module.css';
import styles from './landing.module.css';

/**
 * The front door for reviewers: what this is, that nothing in it is real, the
 * two surfaces, and the specific questions we want answered. Keeps feedback
 * aimed rather than scattered.
 */
export function LandingPage() {
  const { feedbackUrl } = readConfig();
  return (
    <div className={styles.page} data-screen-label="About this prototype">
      <div className={styles.wrap}>
        <div className={styles.brand}>
          <div className={shell.logoMarkLarge} />
          <div className={styles.brandName}>Customs Insights</div>
          <span className={shell.conceptPill}>Prototype for discussion</span>
        </div>

        <h1 className={styles.title}>One place for a customer’s customs declarations</h1>
        <p className={styles.lead}>
          Declarations are filed on a shipper’s behalf by brokers, across countries and legal entities.
          This prototype brings them together so the customs and trade compliance team can find,
          inspect, verify and export them — and it reports only what was declared. It never advises,
          scores or predicts.
        </p>

        <div className={styles.notice}>
          <strong>Everything here is synthetic.</strong> No real customers, declarations, references,
          parties or values appear anywhere. Numbers are generated to look plausible, not to be right.
        </div>

        <div className={styles.cards}>
          <Link to="/mvp" search={{}} className={styles.card}>
            <div className={styles.cardKicker}>Surface 1 · shippable scope</div>
            <div className={styles.cardTitle}>MVP</div>
            <p className={styles.cardBody}>
              A table-first declaration register with filters, a full six-tab declaration view, saved
              reports and export to CSV or Excel. What we would build first.
            </p>
            <span className={styles.cardCta}>Open the MVP →</span>
          </Link>
          <Link to="/ai" className={styles.card}>
            <div className={styles.cardKicker}>Surface 2 · exploratory</div>
            <div className={styles.cardTitle}>AI concept</div>
            <p className={styles.cardBody}>
              Ask a question in plain language and get an answer computed from the same data, with the
              exact declarations it came from. In this build the interpreter is a deterministic
              stand-in rather than a language model, so stay close to the suggested questions.
            </p>
            <span className={styles.cardCta}>Open the AI concept →</span>
          </Link>
        </div>

        <h2 className={styles.h2}>What we would like your view on</h2>
        <ol className={styles.questions}>
          <li>
            <strong>The register.</strong> Is this what you would look for first? Are the filters, and
            the columns on offer, the right ones?
          </li>
          <li>
            <strong>Data honesty.</strong> Every value is either real or labelled{' '}
            <em>Not applicable</em>, <em>Not available</em>, <em>Not populated</em> or{' '}
            <em>Not verified</em>. Does that make the data more trustworthy, or is it noise?
          </li>
          <li>
            <strong>Reports.</strong> Three of the eight requested reports are built in. Five are not
            offered, and the Reports page says why. Do you agree with the reasons?
          </li>
          <li>
            <strong>Export.</strong> The file is exactly what is on screen. Is it the file you would hand
            to finance, a broker or an auditor?
          </li>
          <li>
            <strong>The Ask surface.</strong> Is a question-first way of working credible for this team,
            given every answer must link to its evidence?
          </li>
        </ol>

        <h2 className={styles.h2}>Good to know</h2>
        <ul className={styles.notes}>
          <li>Sign-in is a stand-in: everyone is “Astrid Lindqvist”. Sign-out does nothing.</li>
          <li>Saved reports live in your browser only. They will not follow you to another device.</li>
          <li>The data-refresh timestamp is fixed; the dataset does not change between visits.</li>
          <li>Overview and Exceptions are marked as planned and are not functional.</li>
        </ul>

        <div className={styles.actions}>
          <a href={feedbackUrl} className={styles.feedbackBtn} target="_blank" rel="noreferrer">
            Give feedback
          </a>
          <span className={`${styles.build} mono`}>
            Build {BUILD_INFO.commit} · {BUILD_INFO.builtAt}
          </span>
        </div>
      </div>
    </div>
  );
}
