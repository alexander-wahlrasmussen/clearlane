import { useMemo } from 'react';
import { useAllDeclarations } from '../../api/queries';
import type { DeclarationFilter, DataScope } from '../../api/declarations-client';
import { formatIsoDate } from '../../domain/dates';
import { declarationTrendStart, monthlyDeclarationCounts } from './declaration-trend';
import styles from './declaration-trend.module.css';

interface DeclarationTrendProps {
  filter: DeclarationFilter;
  scope: DataScope;
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
}

const WIDTH = 760;
const HEIGHT = 250;
const LEFT = 44;
const RIGHT = 12;
const TOP = 26;
const BOTTOM = 42;

export function DeclarationTrend({
  filter,
  scope,
  selectedMonth,
  onSelectMonth,
}: DeclarationTrendProps) {
  const now = new Date();
  const lastYearStart = declarationTrendStart(now);
  const trendFilter = useMemo<DeclarationFilter>(
    () => ({
      ...filter,
      fromDate: filter.fromDate && filter.fromDate > lastYearStart ? filter.fromDate : lastYearStart,
      toDate: undefined,
      mrns: undefined,
    }),
    [filter, lastYearStart],
  );
  const query = useAllDeclarations(trendFilter);

  const series = useMemo(
    () => (query.data ? monthlyDeclarationCounts(query.data, scope, now) : []),
    [now, query.data, scope],
  );

  const availableCounts = series.flatMap((month) => (month.count === null ? [] : [month.count]));
  const maximum = Math.max(1, ...availableCounts);
  const ticks = [...new Set([0, Math.ceil(maximum / 2), maximum])];
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const plotWidth = WIDTH - LEFT - RIGHT;
  const slotWidth = plotWidth / 12;
  const points = series.map((month, index) => ({
    ...month,
    x: LEFT + index * slotWidth + slotWidth / 2,
    y: month.count === null ? null : TOP + plotHeight * (1 - month.count / maximum),
  }));
  const lineSegments: { x: number; y: number }[][] = [];
  let segment: { x: number; y: number }[] = [];
  for (const point of points) {
    if (point.y === null) {
      if (segment.length > 0) lineSegments.push(segment);
      segment = [];
    } else {
      segment.push({ x: point.x, y: point.y });
    }
  }
  if (segment.length > 0) lineSegments.push(segment);
  const linePath = (line: { x: number; y: number }[]) => {
    const [first, ...rest] = line;
    if (!first) return '';
    return `M ${first.x} ${first.y}${rest.map((point) => ` L ${point.x} ${point.y}`).join('')}`;
  };
  const coverageEnd = scope.availableTo < now.toISOString().slice(0, 10)
    ? scope.availableTo
    : now.toISOString().slice(0, 10);

  return (
    <section className={styles.card} aria-labelledby="declaration-trend-title">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title} id="declaration-trend-title">Declaration trends</h2>
          <p className={styles.subtitle}>Declarations by clearance month over the last 12 months</p>
        </div>
      </div>
      <p className={styles.note}>
        Counts follow the register’s current date range, country, type, status, legal entity, search and data-gap filters.
        Select an available month to filter the register; the month selection itself does not change this trend.
        Selecting a month clears search and data-gap filters so its count matches.
        Counts use the declaration clearance date; the table’s “Cleared” column may show a later release date.
        Data coverage: {formatIsoDate(scope.availableFrom)}–{formatIsoDate(coverageEnd)}.
        Months outside coverage are shown as Not available, not as zero.
      </p>
      {query.isPending ? (
        <div className={styles.message} role="status">Loading trend data…</div>
      ) : query.isError ? (
        <div className={styles.error} role="alert">
          Could not load declaration trends.
          <button type="button" className={styles.retry} onClick={() => void query.refetch()}>Retry</button>
        </div>
      ) : (
        <div className={styles.chartScroll}>
          <svg
            className={styles.chart}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-labelledby="declaration-trend-title declaration-trend-description"
          >
            <desc id="declaration-trend-description">
              Monthly declaration counts for the last 12 months. Months outside the stated data coverage are not available.
            </desc>
            {ticks.map((tick) => {
              const y = TOP + plotHeight * (1 - tick / maximum);
              return (
                <g key={tick}>
                  <line className={styles.grid} x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} />
                  <text className={styles.axisLabel} x={LEFT - 8} y={y + 4} textAnchor="end">{tick}</text>
                </g>
              );
            })}
            {lineSegments.map((line, index) =>
              line.length > 1 ? <path key={index} className={styles.line} d={linePath(line)} /> : null,
            )}
            {points.map((month) => {
              const label = month.count === null ? 'Not available' : `${month.count} declarations`;
              return (
                <g key={month.month}>
                  <title>{`${month.label}: ${label}`}</title>
                  {month.count !== null && month.y !== null && (
                    <g
                      className={styles.monthPoint}
                      role="button"
                      tabIndex={0}
                      aria-label={`Show ${month.count} declarations cleared in ${month.label}`}
                      aria-pressed={selectedMonth === month.month}
                      onClick={() => onSelectMonth(month.month)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectMonth(month.month);
                        }
                      }}
                    >
                      <circle
                        className={styles.point}
                        data-selected={selectedMonth === month.month}
                        cx={month.x}
                        cy={month.y}
                        r="5"
                      />
                    </g>
                  )}
                  <text
                    className={styles.valueLabel}
                    x={month.x}
                    y={month.y === null ? TOP + plotHeight - 8 : month.y - 9}
                    textAnchor="middle"
                  >
                    {month.count === null ? '—' : month.count}
                  </text>
                  <text
                    className={month.count === null ? styles.monthLabel : styles.monthLabelInteractive}
                    x={month.x}
                    y={HEIGHT - 14}
                    textAnchor="middle"
                    onClick={() => month.count !== null && onSelectMonth(month.month)}
                    onKeyDown={(event) => {
                      if (month.count !== null && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        onSelectMonth(month.month);
                      }
                    }}
                    role={month.count === null ? undefined : 'button'}
                    tabIndex={month.count === null ? undefined : 0}
                    aria-label={month.count === null ? undefined : `Show ${month.count} declarations cleared in ${month.label}`}
                  >
                    {month.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
