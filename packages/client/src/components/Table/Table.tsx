import type { ReactNode } from 'react'
import styles from './Table.module.css'

export interface Column<T> {
  key: string
  title: ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
  render?: (row: T, index: number) => ReactNode
  /** 当不提供 render 时，按 key 取值。 */
  dataIndex?: keyof T
}

interface Props<T> {
  rowKey: keyof T | ((row: T) => string)
  columns: Column<T>[]
  data: T[]
  empty?: ReactNode
  loading?: boolean
}

export function Table<T extends object>({
  rowKey,
  columns,
  data,
  empty = '暂无数据',
  loading = false,
}: Props<T>) {
  const getKey = (row: T) =>
    typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey])

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width, textAlign: c.align ?? 'left' }}
              >
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && !loading && (
            <tr>
              <td className={styles.empty} colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr key={getKey(row)}>
              {columns.map((c) => {
                const content = c.render
                  ? c.render(row, i)
                  : c.dataIndex
                    ? (row[c.dataIndex] as unknown as ReactNode)
                    : null
                return (
                  <td
                    key={c.key}
                    style={{ textAlign: c.align ?? 'left' }}
                  >
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {loading && (
        <div className={styles.loading}>
          <span className={styles.spinner} />
          加载中...
        </div>
      )}
    </div>
  )
}
