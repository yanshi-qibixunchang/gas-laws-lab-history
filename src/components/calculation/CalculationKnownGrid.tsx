import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react';
import './CalculationKnownGrid.css';

export interface CalculationKnownDatum {
  key: string;
  label: ReactNode;
  value: string;
  formattedValue?: ReactNode;
}

export interface CalculationKnownGridClassNames {
  grid?: string;
  row?: string;
  placeholder?: string;
  item?: string;
  label?: string;
  value?: string;
  pendingValue?: string;
}

export interface CalculationKnownGridProps {
  rows: readonly (readonly CalculationKnownDatum[])[];
  columns?: number;
  shortRowAlignment?: 'start' | 'end';
  style?: CSSProperties;
  classNames?: CalculationKnownGridClassNames;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  getRowProps?: (
    row: readonly CalculationKnownDatum[],
    rowIndex: number,
  ) => HTMLAttributes<HTMLDivElement>;
}

const joinClassNames = (...values: Array<string | undefined>) => (
  values.filter(Boolean).join(' ')
);

export const splitCalculationKnownDataRows = (
  data: readonly CalculationKnownDatum[],
  columns = 4,
) => {
  const rows: CalculationKnownDatum[][] = [];
  for (let index = 0; index < data.length; index += columns) {
    rows.push(data.slice(index, index + columns));
  }
  return rows;
};

export const CalculationKnownGrid = ({
  rows,
  columns = 4,
  shortRowAlignment = 'end',
  style,
  classNames = {},
  ariaLabel,
  ariaLabelledBy,
  getRowProps,
}: CalculationKnownGridProps) => (
  <div
    className={joinClassNames('calculation-known-grid', classNames.grid)}
    style={{
      '--calculation-known-columns': columns,
      ...style,
    } as CSSProperties}
    role={ariaLabel || ariaLabelledBy ? 'group' : undefined}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    data-known-grid-columns={columns}
  >
    {rows.map((row, rowIndex) => {
      const placeholderCount = Math.max(0, columns - row.length);
      const placeholders = Array.from({ length: placeholderCount }, (_, index) => (
        <span
          className={joinClassNames(
            'calculation-known-placeholder',
            classNames.placeholder,
          )}
          key={`known-placeholder-${rowIndex}-${index}`}
          aria-hidden="true"
        />
      ));
      const rowProps = getRowProps?.(row, rowIndex) ?? {};
      return (
        <div
          {...rowProps}
          className={joinClassNames(
            'calculation-known-row',
            classNames.row,
            rowProps.className,
          )}
          key={`known-row-${rowIndex}`}
        >
          {shortRowAlignment === 'end' ? placeholders : null}
          {row.map((datum) => (
            <span
              className={joinClassNames('calculation-known-item', classNames.item)}
              key={datum.key}
            >
              <span
                className={joinClassNames('calculation-known-label', classNames.label)}
              >
                {datum.label}
              </span>
              <span
                className={joinClassNames(
                  'calculation-known-value',
                  classNames.value,
                  datum.value === ''
                    ? joinClassNames(
                        'calculation-known-value-pending',
                        classNames.pendingValue,
                      )
                    : undefined,
                )}
              >
                {datum.formattedValue ?? (datum.value || '\u00A0')}
              </span>
            </span>
          ))}
          {shortRowAlignment === 'start' ? placeholders : null}
        </div>
      );
    })}
  </div>
);

export default CalculationKnownGrid;
