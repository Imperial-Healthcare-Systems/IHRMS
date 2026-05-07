import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const buildQuery = (deptHint: string) => {
      return supabaseAdmin
        .from('employees')
        .select(`
          id, first_name, last_name, emp_id, role, avatar_url, status,
          manager_id:reporting_manager_id,
          department:${deptHint}(id, name),
          designation:designations!designation_id(id, title)
        `)
        .eq('org_id', ctx.orgId)
        .eq('status', 'active')
        .order('first_name')
    }

    let { data, error: dbErr } = await buildQuery('departments!department_id')
    if (dbErr && (dbErr.code === 'PGRST201' || dbErr.code === 'PGRST200')) {
      console.warn('[org-chart] departments hint failed, retrying with explicit FK')
      const retry = await buildQuery('departments!employees_department_id_fkey')
      data = retry.data; dbErr = retry.error
    }
    if (dbErr) throw dbErr

    const employees = (data ?? []) as unknown as Record<string, unknown>[]

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
