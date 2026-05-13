/**
 * Team Attendance — Manager View.
 *
 * Server component shell: fetches the current month's grid for the
 * authenticated manager, then hands the payload to AttendanceGridClient
 * for interaction (month nav, exceptions filter, export).
 */
export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { Topbar } from '@/components/layout/Topbar'
import { AttendanceGridClient } from '@/components/team-attendance/AttendanceGridClient'
import type { TeamAttendancePayload } from '@/types/team-attendance'

type ApiResponse =
  | { data: TeamAttendancePayload; flag_thresholds: { absent: number; punch_miss: number } }
  | { error: string }

async function fetchInitial(): Promise<{
  data: TeamAttendancePayload
  flag_thresholds: { absent: number; punch_miss: number }
} | { error: string }> {
  // Build an absolute URL — Next.js fetch from a server component needs it.
  const h = await headers()
  const host  = h.get('x-forwarded-host')  ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base  = `${proto}://${host}`

  // Forward cookies so the API route's getServerSession sees the same session.
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  const now = new Date()
  const res = await fetch(
    `${base}/api/team-attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
    { headers: { cookie: cookieHeader }, cache: 'no-store' },
  )
  return (await res.json()) as ApiResponse
}

export default async function TeamAttendancePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const result = await fetchInitial()

  return (
    <div>
      <Topbar title="Team Attendance" subtitle="Your team’s month, at a glance" />
      <div style={{ padding: '20px 28px', maxWidth: 1400, margin: '0 auto' }}>
        {'error' in result ? (
          <div style={{
            padding: 16, borderRadius: 10,
            background: '#FEF2F2', border: '1px solid #FECACA',
            color: '#991B1B', fontSize: 13,
          }}>
            Failed to load team attendance: {result.error}
          </div>
        ) : (
          <AttendanceGridClient initial={result} />
        )}
      </div>
    </div>
  )
}
