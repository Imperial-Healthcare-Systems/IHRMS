'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { AttendanceGrid } from './AttendanceGrid'
import { AttendanceHeader } from './AttendanceHeader'
import { AttendanceLegend } from './AttendanceLegend'
import { filterExceptionsOnly } from '@/lib/attendance'
import type { TeamAttendancePayload } from '@/types/team-attendance'

type ApiResponse = {
  data: TeamAttendancePayload
  flag_thresholds: { absent: number; punch_miss: number }
}

export function AttendanceGridClient({ initial }: { initial: ApiResponse }) {
  const [payload, setPayload] = useState<TeamAttendancePayload>(initial.data)
  const [thresholds, setThresholds] = useState(initial.flag_thresholds)
  const [year, setYear]   = useState(initial.data.period.year)
  const [month, setMonth] = useState(initial.data.period.month)
  const [exceptionsOnly, setExceptionsOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/team-attendance?year=${y}&month=${m}`)
      const json = (await res.json()) as ApiResponse | { error: string }
      if (!res.ok) throw new Error((json as { error: string }).error ?? 'Load failed')
      const ok = json as ApiResponse
      setPayload(ok.data); setThresholds(ok.flag_thresholds)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load attendance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (year === initial.data.period.year && month === initial.data.period.month) return
    void fetchMonth(year, month)
  }, [year, month, initial.data.period.year, initial.data.period.month, fetchMonth])

  function handleMonthChange(y: number, m: number) {
    setYear(y); setMonth(m)
  }

  function handleExport() {
    const params = new URLSearchParams({ year: String(year), month: String(month) })
    if (exceptionsOnly) params.set('exceptions_only', '1')
    window.location.href = `/api/team-attendance/export?${params.toString()}`
  }

  const displayedRows = exceptionsOnly
    ? filterExceptionsOnly(payload.rows, thresholds.absent, thresholds.punch_miss)
    : payload.rows

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* Imperial brand strip — per visual-reference.md */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #1B4FBF 70%, #E8600A 100%)' }} />
      <AttendanceHeader
        year={year} month={month}
        exceptionsOnly={exceptionsOnly}
        onMonthChange={handleMonthChange}
        onExceptionsToggle={setExceptionsOnly}
        onExport={handleExport}
      />

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#991B1B', fontSize: 13,
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, justifyContent: 'center', color: '#64748B', fontSize: 13 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Loading attendance for {payload.period.year}-{String(payload.period.month).padStart(2, '0')}…
        </div>
      ) : (
        <AttendanceGrid
          rows={displayedRows}
          period={payload.period}
          leaveTypes={payload.leaveTypes}
          pinnedCodes={payload.pinnedCodes}
          weeklyOffDays={payload.weeklyOffDays}
          flagAbsentAt={thresholds.absent}
          flagPunchMissAt={thresholds.punch_miss}
        />
      )}

      <AttendanceLegend leaveTypes={payload.leaveTypes} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
