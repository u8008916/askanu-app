import { MISSING_VALUE_LABEL } from './ResultList';
import styles from './Results.module.css';

export interface ComparisonColumn {
  /** Stored canonical identity of the compared entity. */
  id: string;
  title: string;
}

export interface ComparisonRow {
  label: string;
  /** One value per column, in column order. `null` = not published. */
  values: (string | null)[];
}

/**
 * A comparison is renderable only when every row has exactly one value per
 * column. A short or long row is off-contract: padding it would invent
 * missingness and truncating it would drop a value, so the table refuses
 * instead and the caller keeps the backend's answer text.
 */
export function isRenderableComparison(
  columns: readonly ComparisonColumn[],
  rows: readonly ComparisonRow[],
): boolean {
  return (
    columns.length >= 2 &&
    new Set(columns.map((column) => column.id)).size === columns.length &&
    rows.every((row) => row.values.length === columns.length)
  );
}

/**
 * The shared comparison table. Every row appears once, in the order given;
 * a `null` cell shows the neutral "Not published" label — never blank, never
 * another entity's value, never treated as equal or as "no". Rows are keyed by
 * position so two rows with the same label cannot collide.
 */
export function ComparisonTable({
  columns,
  rows,
  caption = 'Comparison',
}: {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  caption?: string;
}) {
  if (!isRenderableComparison(columns, rows)) {
    return null;
  }

  return (
    <div className={styles.comparisonScroll}>
      <table className={styles.comparisonTable}>
        <caption className={styles.comparisonCaption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Detail</span>
            </th>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.label}`}>
              <th scope="row">{row.label}</th>
              {row.values.map((value, index) => (
                <td key={columns[index].id}>
                  {value ?? <span className={styles.missing}>{MISSING_VALUE_LABEL}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
