import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id') ?? (session.user as any)?.id
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

    const { data, error } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('year', year)
      .order('leave_type')

    if (error) throw error
    return NextResponse.json({ data: data ?? [], employee_id, year })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
