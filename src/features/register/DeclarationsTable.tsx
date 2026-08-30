import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { SortKey } from '../../api/declarations-client';
import { ColumnHeaderLabel, type RegisterColumn, type RegisterRow } from './columns';
import styles from './register.module.css';

export interface TableSort {
  key: SortKey;
  order: 'asc' | 'desc';
}

const col = createColumnHelper<RegisterRow>();

const rowKey = (r: RegisterRow) =>
  r.line ? `${r.declaration.mrn}#${r.line.lineNo}` : r.declaration.mrn;

/**
 * The register table — TanStack Table in fully manual mode: sorting and
 * pagination are server concerns (the dataset reaches tens of thousands of rows
 * in production), the table only renders the current page.
 *
 * Columns are chosen by the caller from the catalogue-backed registry in
 * columns.tsx, so the same table serves both grains. Only the first column is
 * sticky: which column comes first is now the user's choice, so a fixed pixel
 * offset for a second sticky column can no longer be assumed.
 */
export function RegisterTable(props: {
  rows: RegisterRow[];
  columns: readonly RegisterColumn[];
  sort: TableSort;
  onSort: (key: SortKey) => void;
}) {
  const navigate = useNavigate();
  const { sort, onSort, columns: selected } = props;

  const columns = useMemo(
    () =>
      selected.map((c) =>
        col.display({
          id: c.id,
          header: () =>
            c.sortKey ? (
              <button
                type="button"
                className={styles.sortBtn}
                onClick={() => onSort(c.sortKey as SortKey)}
              >
                {c.header}
                {sort.key === c.sortKey ? (sort.order === 'desc' ? ' ↓' : ' ↑') : ''}
              </button>
            ) : (
              <ColumnHeaderLabel column={c} />
            ),
          cell: (ctx) => c.render(ctx.row.original),
          meta: { align: c.align },
        }),
      ),
    [selected, sort, onSort],
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
                  className={i === 0 ? styles.stickyCol : undefined}
                  data-align={(h.column.columnDef.meta as { align?: string } | undefined)?.align}
                  style={i === 0 ? { left: 0 } : undefined}
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
              key={rowKey(row.original)}
              className={styles.dataRow}
              tabIndex={0}
              onClick={() => open(row.original.declaration.mrn)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') open(row.original.declaration.mrn);
              }}
            >
              {row.getVisibleCells().map((cell, i) => (
                <td
                  key={cell.id}
                  className={i === 0 ? styles.stickyCol : undefined}
                  data-align={(cell.column.columnDef.meta as { align?: string } | undefined)?.align}
                  style={i === 0 ? { left: 0 } : undefined}
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
