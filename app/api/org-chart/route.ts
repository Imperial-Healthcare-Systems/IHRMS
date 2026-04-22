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

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = (_req as any).orgId ?? (session.user as any)?.orgId as string | null

    let query = supabaseAdmin
      .from('employees')
      .select(`
        id, first_name, last_name, emp_id, role, avatar_url, status,
        manager_id,
        department:departments!department_id(id, name),
        designation:designations!designation_id(id, title)
      `)
      .eq('status', 'active')
      .order('first_name')

    if (orgId) query = (query as any).eq('org_id', orgId)

    const { data, error } = await query
    if (error) throw error

    const employees = (data ?? []) as Record<string, unknown>[]

    // Build tree: map id → node, then attach children
    const nodeMap = new Map<string, Record<string, unknown>>()
    for (const emp of employees) {
      nodeMap.set(emp.id as string, { ...emp, children: [] })
    }

    const roots: Record<string, unknown>[] = []
    for (const node of nodeMap.values()) {
      const managerId = node.manager_id as string | null
      if (managerId && nodeMap.has(managerId)) {
        (nodeMap.get(managerId)!.children as unknown[]).push(node)
      } else {
        roots.push(node)
      }
    }

    return NextResponse.json({ data: roots, total: employees.length })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
