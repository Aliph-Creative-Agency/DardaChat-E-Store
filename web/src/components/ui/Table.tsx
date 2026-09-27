import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TableColumn<Row> = {
  /** Stable column id (used as React key). */
  id: string;
  /** Header cell content (already translated). */
  header: ReactNode;
  /** Cell content for a row. */
  cell: (row: Row) => ReactNode;
  /** Numbers, money, quantities: end-aligned with tabular figures so digits line up (NFR-LOC-004). */
  numeric?: boolean;
  /** Renders this column's cells as `<th scope="row">` (the cell that names the row, e.g. the order ref). */
  rowHeader?: boolean;
  /** Extra classes for this column's header and cells (e.g. a min width). */
  className?: string;
};

export type TableProps<Row> = {
  /** Every table is captioned (read by screen readers, names the scroll region). */
  caption: ReactNode;
  /** Keep the caption for assistive tech only. */
  captionHidden?: boolean;
  columns: ReadonlyArray<TableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row, index: number) => string;
  /** Shown in a single full-width cell when `rows` is empty (e.g. an `<EmptyState>`). */
  empty?: ReactNode;
  /** Dense rows for admin lists. */
  density?: "comfortable" | "compact";
  className?: string;
};

/**
 * Data table (UI-004). Wide tables scroll sideways INSIDE their own wrapper, never the page: the wrapper is a
 * focusable, labelled region so keyboard users can scroll it too. Header cells carry `scope`; numeric columns align
 * to the logical end, which is the left edge in Arabic.
 */
export function Table<Row>({
  caption,
  captionHidden,
  columns,
  rows,
  rowKey,
  empty,
  density = "comfortable",
  className,
}: TableProps<Row>) {
  const captionId = useId();
  const pad = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className={cn(
        "w-full max-w-full overflow-x-auto rounded-card border border-line bg-surface focus-visible:-outline-offset-3",
        className,
      )}
      data-table-scroll
    >
      <table className="w-full border-collapse text-start text-sm">
        <caption
          id={captionId}
          className={cn(
            captionHidden ? "sr-only" : "px-4 pb-2 pt-4 text-start text-lg font-semibold text-ink",
          )}
        >
          {caption}
        </caption>
        <thead className="bg-paper-deep">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  pad,
                  "whitespace-nowrap border-b border-line-strong font-semibold text-ink",
                  col.numeric ? "text-end" : "text-start",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr>
              <td colSpan={columns.length} className="p-4">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="border-b border-line last:border-b-0 hover:bg-paper">
                {columns.map((col) => {
                  const classes = cn(
                    pad,
                    "align-top text-ink",
                    col.numeric ? "whitespace-nowrap text-end tabular-nums" : "text-start",
                    col.rowHeader && "font-semibold",
                    col.className,
                  );
                  return col.rowHeader ? (
                    <th key={col.id} scope="row" className={classes}>
                      {col.cell(row)}
                    </th>
                  ) : (
                    <td key={col.id} className={classes}>
                      {col.cell(row)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
