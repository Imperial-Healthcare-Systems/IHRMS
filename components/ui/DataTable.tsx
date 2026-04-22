'use client'
import { ReactNode, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T, index: number) => ReactNode
  sortable?: boolean
  numeric?: boolean
  width?: string | number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyTitle?: string
  emptyDesc?: string
  emptyIcon?: ReactNode
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  toolbar?: ReactNode
  footer?: ReactNode
  stickyHeader?: boolean
  className?: string
}

type SortDir = 'asc' | 'desc' | null

export function DataTable<T>({
  columns, data, loading, emptyTitle = 'No data', emptyDesc, emptyIcon, rowKey,
  onRowClick, toolbar, footer, className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return }
    if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
  }

  return (
    <div className={`table-wrapper ${className}`}>
      {toolbar && <div className="table-toolbar">{toolbar}</div>}
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.sortable ? 'sortable' : ''}
                style={{ width: col.width }}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {col.header}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      : <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key}>
                      <Skeleton variant="text" width={col.numeric ? '60%' : '80%'} />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />
                  </td>
                </tr>
              )
              : data.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'table-row-hover' : ''}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map(col => (
                    <td key={col.key} className={col.numeric ? 'numeric' : ''}>
                      {col.cell(row, idx)}
                    </td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>
      {footer && <div className="table-footer">{footer}</div>}
    </div>
  )
}
