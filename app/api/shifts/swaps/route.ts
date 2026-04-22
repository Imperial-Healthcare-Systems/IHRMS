import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id as string
    const orgId = (session.user as any)?.orgId as string | null
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('shift_swaps')
      .select(`
        *,
        requester:employees!requester_id(id, first_name, last_name, emp_id),
        target:employees!target_id(id, first_name, last_name, emp_id)
      `)
      .order('created_at', { ascending: false })
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)

    if (orgId) query = query.eq('org_id', orgId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      throw error
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { target_id, swap_date, reason } = body
    if (!target_id || !swap_date) {
      return NextResponse.json({ error: 'target_id and swap_date are required' }, { status: 400 })
    }

    const requesterId = (session.user as any)?.id as string
    const orgId = (session.user as any)?.orgId as string | null

    const { data, error } = await supabaseAdmin
      .from('shift_swaps')
      .insert({ requester_id: requesterId, target_id, swap_date, reason: reason ?? null, status: 'pending', org_id: orgId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, status } = body
    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'id and status (approved|rejected) required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('shift_swaps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
