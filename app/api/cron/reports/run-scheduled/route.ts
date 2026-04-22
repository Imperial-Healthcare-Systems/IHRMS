import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Vercel Cron: runs daily at 07:00 UTC (vercel.json schedule: "0 7 * * *")
// Processes all active scheduled reports and records execution.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const dayOfMonth = today.getDate()

  try {
    const { data: schedules, error } = await supabaseAdmin
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)

    if (error) throw error

    const toRun = (schedules ?? []).filter(s => {
      if (s.frequency === 'daily') return true
      if (s.frequency === 'weekly' && dayOfWeek === 1) return true  // Monday
      if (s.frequency === 'monthly' && dayOfMonth === 1) return true // 1st of month
      return false
    })

    let ran = 0
    const errors: string[] = []

    for (const schedule of toRun) {
      try {
        // Snapshot the report execution
        await supabaseAdmin.from('report_snapshots').insert({
          report_type: schedule.report_type,
          snapshot_date: todayStr,
          org_id: schedule.org_id ?? null,
          data: {
            scheduled_report_id: schedule.id,
            frequency: schedule.frequency,
            recipients: schedule.recipients ?? [],
            filters: schedule.filters ?? {},
            generated_at: new Date().toISOString(),
          },
        })

        // Record last_run on the schedule
        await supabaseAdmin
          .from('scheduled_reports')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', schedule.id)

        ran++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${schedule.id}: ${msg}`)
        console.error('[cron/reports/run-scheduled]', schedule.id, msg)
      }
    }

    return NextResponse.json({ ok: true, date: todayStr, scheduled: toRun.length, ran, ...(errors.length ? { errors } : {}) })
  } catch (err) {
    console.error('[cron/reports/run-scheduled]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Cron failed' }, { status: 500 })
  }
}
