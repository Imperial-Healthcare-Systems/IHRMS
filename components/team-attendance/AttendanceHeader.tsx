'use client'

import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react'

type Props = {
  year: number
  month: number
  exceptionsOnly: boolean
  onMonthChange: (year: number, month: number) => void
  onExceptionsToggle: (value: boolean) => void
  onExport: () => void
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function AttendanceHeader({
  year, month, exceptionsOnly, onMonthChange, onExceptionsToggle, onExport,
}: Props) {
  function shift(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1;  y += 1 }
    onMonthChange(y, m)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: '0.5px solid #E2E8F0',
      background: '#FFFFFF',
      flexWrap: 'wrap',
    }}>
      {/* Month nav */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => shift(-1)}
          aria-label="Previous month"
          style={navBtn}
        >
          <ChevronLeft size={14} />
        </button>
        <div style={{
          padding: '6px 12px',
          fontSize: 13, fontWeight: 600, color: '#0F172A',
          minWidth: 110, textAlign: 'center',
        }}>
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <button
          onClick={() => shift(1)}
          aria-label="Next month"
          style={navBtn}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Exceptions toggle */}
      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid #E2E8F0',
        background: exceptionsOnly ? '#FFF7ED' : '#FFFFFF',
        cursor: 'pointer',
        fontSize: 12.5, fontWeight: 500,
        color: exceptionsOnly ? '#C2410C' : '#475569',
      }}>
        <Filter size={13} />
        <input
          type="checkbox"
          checked={exceptionsOnly}
          onChange={e => onExceptionsToggle(e.target.checked)}
          style={{ margin: 0, cursor: 'pointer' }}
        />
        <span>Exceptions only</span>
      </label>

      {/* Export */}
      <button
        onClick={onExport}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px',
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(135deg, #F47920 0%, #FB8C3A 50%, #E53E1A 100%)',
          color: '#FFFFFF',
          fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(244,121,32,0.25)',
        }}
      >
        <Download size={13} />
        Export CSV
      </button>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid #E2E8F0', background: '#FFFFFF',
  color: '#475569', cursor: 'pointer',
}
