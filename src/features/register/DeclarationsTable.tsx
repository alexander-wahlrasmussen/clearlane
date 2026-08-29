import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { Declaration } from '../../domain/declaration';
import { typeLabel } from '../../domain/declaration';
import type { SortKey } from '../../api/declarations-client';
import { formatIsoDate } from '../../domain/dates';
import { formatMoney } from '../../domain/money';
import { StatusBadge, Term } from '../../components/FieldDisplay';
import styles from './register.module.css';

export interface TableSort {
  key: SortKey;
  order: 'asc' | 'desc';
}

const col = createColumnHelper<Declaration>();

/**
 * The register table — TanStack Table in fully manual mode: sorting and
 * pagination are server concerns (the dataset reaches tens of thousands of
 * rows in production), the table only renders the current page.
 */
export function DeclarationsTable(props: {
  rows: Declaration[];
  sort: TableSort;
  onSort: (key: SortKey) => void;
}) {
  const navigate = useNavigate();
  const { sort, onSort } = props;

  const sortHeader = useMemo(
    () =>
      function SortHeader(p: { label: string; sortKey: SortKey }) {
        const arrow = sort.key === p.sortKey ? (sort.order === 'desc' ? ' ↓' : ' ↑') : '';
        return (
          <button type="button" className={styles.sortBtn} onClick={() => onSort(p.sortKey)}>
            {p.label}
            {arrow}
          </button>
        );
      },
    [sort, onSort],
  );
  const SortHeader = sortHeader;

  const columns = useMemo(
    () => [
      col.accessor('status', {
        header: 'Status',
        cell: (c) => <StatusBadge status={c.getValue()} />,
      }),
      col.accessor('mrn', {
        header: () => (
          <Term help="Movement Reference Number — the unique identifier customs assigns to a declaration.">
            MRN
          </Term>
        ),
        cell: (c) => <span className="mono">{c.getValue()}</span>,
      }),
      col.accessor('customerReference', {
        header: 'Customer ref.',
        cell: (c) => <span className="mono">{c.getValue()}</span>,
      }),
      col.accessor((d) => d.releaseDate ?? d.clearanceDate, {
        id: 'cleared',
        header: () => <SortHeader label="Cleared" sortKey="date" />,
        cell: (c) => <span className="num">{formatIsoDate(c.getValue())}</span>,
      }),
      col.accessor('countryName', { header: 'Country' }),
      col.accessor('type', { header: 'Type', cell: (c) => typeLabel(c.getValue()) }),
      col.accessor((d) => d.importer.name, { id: 'importer', header: 'Importer / buyer' }),
      col.accessor((d) => d.exporter.name, { id: 'exporter', header: 'Exporter / seller' }),
      col.accessor('originCountry', { header: 'Origin' }),
      col.accessor('destinationCountry', { header: 'Destination' }),
      col.accessor('customsValueTotal', {
        header: () => <SortHeader label="Customs value" sortKey="customsValue" />,
        cell: (c) => <span className="num">{formatMoney(c.getValue())}</span>,
        meta: { align: 'right' },
      }),
      col.accessor('dutyTotal', {
        header: () => <SortHeader label="Duty" sortKey="duty" />,
        cell: (c) => <span className="num">{formatMoney(c.getValue())}</span>,
        meta: { align: 'right' },
      }),
      col.accessor('vatTotal', {
        header: () => <SortHeader label="VAT" sortKey="vat" />,
        cell: (c) => <span className="num">{formatMoney(c.getValue())}</span>,
        meta: { align: 'right' },
      }),
    ],
    [SortHeader],
  );

  const table = useReactTable({
    data: props.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const open = (mrn: string) => navigate({ to: '/mvp/declarations/$mrn', params: { mrn } });

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h, i) => (
                <th
                  key={h.id}
                  className={i < 2 ? styles.stickyCol : undefined}
                  data-align={(h.column.columnDef.meta as { align?: string } | undefined)?.align}
                  style={i === 1 ? { left: 150 } : i === 0 ? { left: 0 } : undefined}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.original.mrn}
              className={styles.dataRow}
              tabIndex={0}
              onClick={() => open(row.original.mrn)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') open(row.original.mrn);
              }}
            >
              {row.getVisibleCells().map((cell, i) => (
                <td
                  key={cell.id}
                  className={i < 2 ? styles.stickyCol : undefined}
                  data-align={(cell.column.columnDef.meta as { align?: string } | undefined)?.align}
                  style={i === 1 ? { left: 150 } : i === 0 ? { left: 0 } : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
