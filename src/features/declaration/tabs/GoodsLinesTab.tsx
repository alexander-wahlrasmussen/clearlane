import { Fragment, useState } from 'react';
import type { Declaration, GoodsLine } from '../../../domain/declaration';
import { isValue, mapValue } from '../../../domain/field-value';
import { formatCount } from '../../../domain/money';
import { FieldCell, FieldStateChip, Term } from '../../../components/FieldDisplay';
import { amountOrDash, rateLabel, units } from '../derived';
import styles from '../declaration.module.css';

const kg = (v: number) => v.toLocaleString('en-GB');

function ExtraField(props: { label: string; line: GoodsLine; d: Declaration; field: keyof GoodsLine }) {
  const value = props.line[props.field];
  return (
    <div>
      <div className={styles.extraLabel}>{props.label}</div>
      <div className={styles.extraValue}>
        {/* All extra fields are FieldValue — the chip renders the state, never a blank. */}
        <FieldCell field={value as never} render={(v) => String(v)} />
      </div>
    </div>
  );
}

export function GoodsLinesTab({ d }: { d: Declaration }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (no: number) => setExpanded((e) => ({ ...e, [no]: !e[no] }));

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHead}>
        <div className={styles.cardTitle}>Goods lines</div>
        <div className={styles.tableHint}>
          Values in {d.currency} · select a line for additional information
        </div>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.linesTable}>
          <thead>
            <tr>
              <th aria-label="Expand" />
              <th>Line</th>
              <th>
                <Term help="The tariff classification of the goods, which determines the duty rate.">
                  Commodity
                </Term>
              </th>
              <th>Goods description</th>
              <th>Origin</th>
              <th>Customs procedure</th>
              <th>
                <Term help="Whether a reduced or zero duty rate is claimed under a trade agreement.">
                  Preference
                </Term>
              </th>
              <th data-align="right">Gross kg</th>
              <th data-align="right">Net kg</th>
              <th data-align="right">Quantity</th>
              <th data-align="right">Item value</th>
              <th data-align="right">Customs value</th>
              <th data-align="right">Duty rate</th>
              <th data-align="right">Duty</th>
              <th data-align="right">VAT rate</th>
              <th data-align="right">VAT</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <Fragment key={l.lineNo}>
                <tr
                  className={styles.dataRow}
                  tabIndex={0}
                  onClick={() => toggle(l.lineNo)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') toggle(l.lineNo);
                  }}
                >
                  <td className={styles.caret}>{expanded[l.lineNo] ? '▾' : '▸'}</td>
                  <td className="num">{l.lineNo}</td>
                  <td className="mono">{l.commodityCode}</td>
                  <td>{l.description}</td>
                  <td>{l.originCountry}</td>
                  <td className={styles.mutedCell}>{l.procedure}</td>
                  <td className={styles.mutedCell}>
                    {isValue(l.preference) ? l.preference.value : '—'}
                  </td>
                  <td data-align="right" className="num">
                    <FieldCell field={mapValue(l.grossKg, kg)} />
                  </td>
                  <td data-align="right" className="num">
                    <FieldCell field={mapValue(l.netKg, kg)} />
                  </td>
                  <td data-align="right" className="num">{formatCount(l.quantity)}</td>
                  <td data-align="right" className="num">{units(l.itemValue)}</td>
                  <td data-align="right" className="num">{units(l.customsValue)}</td>
                  <td data-align="right" className="num">
                    {isValue(l.dutyRatePct) ? rateLabel(l.dutyRatePct.value) : '—'}
                  </td>
                  <td data-align="right" className="num">{amountOrDash(l.dutyAmount)}</td>
                  <td data-align="right" className="num">
                    {isValue(l.vatRatePct) ? `${l.vatRatePct.value}%` : '—'}
                  </td>
                  <td data-align="right" className="num">{amountOrDash(l.vatAmount)}</td>
                </tr>
                {expanded[l.lineNo] && (
                  <tr className={styles.expandRow}>
                    <td colSpan={16}>
                      <div className={styles.expandInner}>
                        <div className={styles.extraTitle}>
                          Line {l.lineNo} — additional information
                        </div>
                        <div className={styles.extraGrid}>
                          <ExtraField label="Article / SKU" line={l} d={d} field="sku" />
                          <ExtraField label="Packaging type" line={l} d={d} field="packagingType" />
                          <ExtraField label="Package quantity" line={l} d={d} field="packageQuantity" />
                          <ExtraField label="Supplementary units" line={l} d={d} field="supplementaryUnits" />
                          <ExtraField label="Quota reference" line={l} d={d} field="quotaReference" />
                          <div>
                            <div className={styles.extraLabel}>Transport equipment</div>
                            <div className={styles.extraValue}>
                              <FieldCell field={d.containerNumber} />
                            </div>
                          </div>
                          <ExtraField label="Additional reference" line={l} d={d} field="additionalReference" />
                          <div>
                            <div className={styles.extraLabel}>Transport costs</div>
                            <div className={styles.extraValue}>{units(l.transportCosts)}</div>
                          </div>
                          <div>
                            <div className={styles.extraLabel}>Insurance costs</div>
                            <div className={styles.extraValue}>{units(l.insuranceCosts)}</div>
                          </div>
                          <div>
                            <div className={styles.extraLabel}>Excise</div>
                            <div className={styles.extraValue}>
                              <FieldCell field={l.excise} render={(m) => units(m)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.legend}>
        <span>Field states:</span>
        <span>
          <FieldStateChip state="not-applicable" /> — does not apply to this declaration
        </span>
        <span>
          <FieldStateChip state="not-available" /> — not provided by the source
        </span>
        <span>
          <FieldStateChip state="not-populated" /> — required but missing
        </span>
        <span>
          <FieldStateChip state="not-verified" /> — not yet compared with the source record
        </span>
      </div>
    </div>
  );
}
