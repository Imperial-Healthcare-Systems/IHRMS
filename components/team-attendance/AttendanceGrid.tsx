'use client'

import { useMemo } from 'react'
import { isFlagged, lookupStatus, pctColor } from '@/lib/attendance'
import type { AttendanceRow, LeaveType, StatusCode } from '@/types/team-attendance'

type Props = {
  rows: AttendanceRow[]
  period: { year: number; month: number; daysInMonth: number; workingDays: number }
  leaveTypes: LeaveType[]
  pinnedCodes: string[]
  weeklyOffDays: number[]
  flagAbsentAt: number
  flagPunchMissAt: number
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AttendanceGrid({
  rows, period, leaveTypes, pinnedCodes, weeklyOffDays, flagAbsentAt, flagPunchMissAt,
}: Props) {
  const woSet = useMemo(() => new Set(weeklyOffDays), [weeklyOffDays])
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === period.year && today.getMonth() + 1 === period.month
  const todayDay = isCurrentMonth ? today.getDate() : -1

  const days = Array.from({ length: period.daysInMonth }, (_, i) => i + 1)
  const aggCols = useMemo(() => ([
    { key: 'P',  label: 'P',  color: '#3B6D11' },
    { key: 'A',  label: 'A',  color: '#A32D2D' },
    { key: 'PM', label: 'PM', color: '#BA7517' },
    ...pinnedCodes.map(code => {
      const lt = leaveTypes.find(l => l.code === code)
      return { key: code, label: code, color: lt?.color_hex ?? '#64748B' }
    }),
    { key: 'PCT', label: '%', color: 'pct' as const },
  ]), [pinnedCodes, leaveTypes])

  if (rows.length === 0) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
          No employees match the current filter.
        </p>
      </div>
    )
  }

  const NW = 200, DW = 32, AW = 46

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{
        borderCollapse: 'separate',
        borderSpacing: 0,
        tableLayout: 'fixed',
        minWidth: `${NW + period.daysInMonth * DW + aggCols.length * AW}px`,
        width: '100%',
      }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            <th style={{
              position: 'sticky', left: 0, zIndex: 12,
              width: NW, minWidth: NW,
              background: '#F8FAFC',
              textAlign: 'left',
              padding: '9px 14px',
              fontSize: 11, fontWeight: 500,
              color: '#64748B',
              borderBottom: '0.5px solid #E2E8F0',
              borderRight: '0.5px solid #E2E8F0',
            }}>
              Employee
            </th>
            {days.map(d => {
              const dow = new Date(period.year, period.month - 1, d).getDay()
              const isWO = woSet.has(dow)
              const isToday = d === todayDay
              return (
                <th key={d} style={{
                  width: DW, minWidth: DW,
                  textAlign: 'center', padding: '6px 0',
                  borderBottom: '0.5px solid #E2E8F0',
                  background: isWO ? 'rgba(0,0,0,0.025)' : undefined,
                  boxShadow: isToday ? 'inset 2px 0 0 #185FA5' : undefined,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 500,
                    color: isToday ? '#185FA5' : isWO ? '#94A3B8' : '#64748B',
                  }}>{String(d).padStart(2, '0')}</div>
                  <div style={{
                    fontSize: 9, color: isWO ? '#B4B2A9' : '#94A3B8', marginTop: 1,
                  }}>{DOW_SHORT[dow]}</div>
                </th>
              )
            })}
            {aggCols.map((col, ci) => {
              const c = col.color === 'pct' ? '#64748B' : col.color
              return (
                <th key={col.key} style={{
                  position: 'sticky', zIndex: 12,
                  right: `${(aggCols.length - 1 - ci) * AW}px`,
                  width: AW, minWidth: AW,
                  background: '#F8FAFC',
                  textAlign: 'center', padding: '9px 4px',
                  fontSize: 11, fontWeight: 500,
                  borderBottom: '0.5px solid #E2E8F0',
                  borderLeft: ci === 0 ? '0.5px solid #E2E8F0' : undefined,
                  color: c,
                }}>{col.label}</th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const flagged = isFlagged(row.aggregate, flagAbsentAt, flagPunchMissAt)
            const rowBg = ri % 2 === 0 ? '#FFFFFF' : 'rgba(0,0,0,0.012)'
            return (
              <tr key={row.employee.id}>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 11,
                  padding: '9px 14px', background: rowBg,
                  borderBottom: '0.5px solid #E2E8F0',
                  borderRight: '0.5px solid #E2E8F0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar flagged={flagged} avatarUrl={row.employee.avatar_url} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.employee.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.employee.role}</div>
                      {flagged && <div style={{ fontSize: 10, color: '#A32D2D', background: '#FCEBEB', padding: '1px 6px', borderRadius: 10, display: 'inline-block', marginTop: 2, fontWeight: 500 }}>Action needed</div>}
                    </div>
                  </div>
                </td>
                {days.map((d, di) => {
                  const status = row.daily[di]
                  const dow = new Date(period.year, period.month - 1, d).getDay()
                  const isWO = woSet.has(dow)
                  const isToday = d === todayDay
                  return (
                    <td
                      key={d}
                      title={status ? `${row.employee.name} · ${String(d).padStart(2, '0')} · ${lookupStatus(status, leaveTypes).label}` : undefined}
                      style={{
                        textAlign: 'center', padding: '8px 2px',
                        background: isWO ? 'rgba(0,0,0,0.025)' : rowBg,
                        borderBottom: '0.5px solid #E2E8F0',
                        boxShadow: isToday ? 'inset 2px 0 0 #185FA5' : undefined,
                      }}
                    >
                      <Dot status={status} leaveTypes={leaveTypes} />
                    </td>
                  )
                })}
                {aggCols.map((col, ci) => (
                  <AggregateCell
                    key={col.key}
                    col={col}
                    row={row}
                    rowBg={rowBg}
                    rightOffset={(aggCols.length - 1 - ci) * AW}
                    aw={AW}
                    isFirst={ci === 0}
                  />
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Avatar({ flagged, avatarUrl }: { flagged: boolean; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        objectFit: 'cover',
        border: flagged ? '1px solid #F7C1C1' : '0.5px solid #E2E8F0',
      }} />
    )
  }
  const stroke = flagged ? '#A32D2D' : '#5F5E5A'
  return (
    <div
      aria-hidden="true"
      style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: flagged ? '#FCEBEB' : '#F8FAFC',
        border: flagged ? '0.5px solid #F7C1C1' : '0.5px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </div>
  )
}

function Dot({ status, leaveTypes }: { status: StatusCode | null; leaveTypes: LeaveType[] }) {
  if (status === null) return <div style={{ width: 14, height: 14 }} aria-hidden="true" />
  const s = lookupStatus(status, leaveTypes)
  return (
    <div
      style={{
        width: 14, height: 14, borderRadius: '50%', margin: '0 auto',
        background: s.color,
        opacity: status === 'WO' ? 0.55 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {s.letter && (
        <span style={{ fontSize: 7, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{s.letter}</span>
      )}
    </div>
  )
}

function AggregateCell({
  col, row, rowBg, rightOffset, aw, isFirst,
}: {
  col: { key: string; label: string; color: string | 'pct' }
  row: AttendanceRow
  rowBg: string
  rightOffset: number
  aw: number
  isFirst: boolean
}) {
  let value: string | number
  let color: string

  if (col.key === 'PCT') {
    value = `${row.aggregate.pct}%`; color = pctColor(row.aggregate.pct)
  } else if (col.key === 'P') {
    value = row.aggregate.P;  color = '#0F172A'
  } else if (col.key === 'A') {
    value = row.aggregate.A;  color = row.aggregate.A > 0 ? '#A32D2D' : '#0F172A'
  } else if (col.key === 'PM') {
    value = row.aggregate.PM; color = row.aggregate.PM > 0 ? '#BA7517' : '#0F172A'
  } else {
    value = row.aggregate.byLeaveCode[col.key] ?? 0
    color = col.color === 'pct' ? '#0F172A' : col.color
  }

  const isEmpty = col.key !== 'PCT' && value === 0

  return (
    <td style={{
      position: 'sticky', zIndex: 11,
      right: `${rightOffset}px`,
      width: aw, minWidth: aw,
      textAlign: 'center', padding: '9px 4px',
      fontSize: 13, fontWeight: 500,
      background: rowBg,
      color,
      borderBottom: '0.5px solid #E2E8F0',
      borderLeft: isFirst ? '0.5px solid #E2E8F0' : undefined,
    }}>
      {isEmpty
        ? <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 400 }}>–</span>
        : value}
    </td>
  )
}
