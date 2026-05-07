import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Vercel Cron: runs every Monday at 06:00 UTC (vercel.json schedule: "0 6 * * 1")
// Generates a weekly headcount snapshot into report_snapshots table.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { count: totalEmployees } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: onLeave } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('from_date', new Date().toISOString().split('T')[0])
      .lte('to_date', new Date().toISOString().split('T')[0])

    await supabaseAdmin.from('report_snapshots').insert({
      report_type: 'weekly_headcount',
      snapshot_date: new Date().toISOString().split('T')[0],
      data: {
        active_employees: totalEmployees ?? 0,
        on_leave_today: onLeave ?? 0,
        generated_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ ok: true, active_employees: totalEmployees, on_leave_today: onLeave })
  } catch (err) {
    console.error('[cron/reports]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Cron failed' }, { status: 500 })
  }
}
