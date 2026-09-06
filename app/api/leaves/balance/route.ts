import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActiveEmployee } from '@/lib/employee-context'

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    let employee_id = searchParams.get('employee_id')
    if (!employee_id) {
      const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
      if (!me) return NextResponse.json({ data: [], employee_id: null, year: parseInt(searchParams.get('year') ?? String(new Date().getFullYear())) })
      employee_id = me.id
    }
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

    const { data, error: dbErr } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('org_id', ctx.orgId)
      .eq('employee_id', employee_id)
      .eq('year', year)
      .order('leave_type')

    if (dbErr) throw dbErr
    return NextResponse.json({ data: data ?? [], employee_id, year })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
