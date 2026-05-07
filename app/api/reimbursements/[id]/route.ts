import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { data, error } = await supabaseAdmin
      .from('expense_claims')
      .select(`
        *,
        employee:employees!expense_claims_employee_id_fkey(
          id, first_name, last_name, emp_id, email,
          department:departments!employees_department_id_fkey(id, name),
          designation:designations(id, title)
        )
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Expense claim not found' }, { status: 404 })
      console.error('[reimbursements GET id]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    const sessionIsAdmin = HR_ROLES.includes(ctx.role)

    if (!sessionIsAdmin && (data as Record<string, unknown> & { employee?: { id: string } })?.employee?.id !== ctx.identityId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[reimbursements GET id catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const {
      action,

      rejection_reason,
      payroll_run_id,
      category: editCategory,
      description: editDescription,
      amount: editAmount,
      month: editMonth,
      year: editYear,
    } = body as {
      action?: 'approve' | 'reject' | 'include_payroll' | 'update'
      rejection_reason?: string
      payroll_run_id?: string
      category?: string
      description?: string
      amount?: number
      month?: string
      year?: string
    }

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    // Fetch current claim (org-scoped)
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('expense_claims')
      .select('id, status, employee_id')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Expense claim not found' }, { status: 404 })
      throw fetchError
    }

    const isAdmin = HR_ROLES.includes(ctx.role)

    // 'update' action — employee editing their own pending claim
    if (action === 'update') {
      if (!['draft', 'pending', 'submitted'].includes(current.status)) {
        return NextResponse.json({ error: `Cannot edit a claim with status '${current.status}'` }, { status: 422 })
      }
      if (current.employee_id !== ctx.identityId && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const CATEGORY_MAP: Record<string, string> = {
        travel: 'travel', accommodation: 'accommodation', food: 'food',
        'food & meals': 'food', stay: 'accommodation',
        client_entertainment: 'client_entertainment', 'client entertainment': 'client_entertainment',
        communication: 'communication', telecom: 'communication',
        training: 'training', medical: 'medical', equipment: 'equipment', other: 'other',
      }
      const normalizedCategory = editCategory
        ? (CATEGORY_MAP[editCategory.toLowerCase()] ?? 'other')
        : undefined

      const editPayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (normalizedCategory) { editPayload.category = normalizedCategory; editPayload.expense_type = normalizedCategory }
      if (editDescription)    editPayload.description = editDescription
      if (editAmount !== undefined) editPayload.amount = editAmount
      if (editYear && editMonth) {
        editPayload.claim_date = `${editYear}-${String(editMonth).padStart(2, '0')}-01`
      }

      const { data, error } = await supabaseAdmin
        .from('expense_claims').update(editPayload).eq('id', id).eq('org_id', ctx.orgId).select().single()
      if (error) { console.error('[reimbursements PATCH update]', error); return NextResponse.json({ error: errMsg(error) }, { status: 500 }) }
      return NextResponse.json({ data })
    }

    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin or Manager required' }, { status: 403 })

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (action === 'approve') {
      if (!['submitted', 'draft', 'pending'].includes(current.status)) {
        return NextResponse.json(
          { error: `Cannot approve a claim with status '${current.status}'` },
          { status: 422 }
        )
      }
      updatePayload.status = 'approved'
    } else if (action === 'reject') {
      if (!['submitted', 'draft', 'pending', 'approved'].includes(current.status)) {
        return NextResponse.json(
          { error: `Cannot reject a claim with status '${current.status}'` },
          { status: 422 }
        )
      }
      if (!rejection_reason) {
        return NextResponse.json({ error: 'rejection_reason is required for reject action' }, { status: 400 })
      }
      updatePayload.status = 'rejected'
      updatePayload.rejection_note = rejection_reason ?? null
    } else if (action === 'include_payroll') {
      if (current.status !== 'approved') {
        return NextResponse.json(
          { error: `Claim must be 'approved' before including in payroll (current: '${current.status}')` },
          { status: 422 }
        )
      }
      if (!payroll_run_id) {
        return NextResponse.json({ error: 'payroll_run_id is required for include_payroll action' }, { status: 400 })
      }
      updatePayload.status  = 'paid'
      updatePayload.paid_at = new Date().toISOString().split('T')[0]
    } else {
      return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('expense_claims')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (error) {
      console.error('[reimbursements PATCH]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[reimbursements PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const isAdmin = HR_ROLES.includes(ctx.role)

    // Fetch the claim to check ownership and status (org-scoped)
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('expense_claims')
      .select('id, status, employee_id')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Expense claim not found' }, { status: 404 })
      throw fetchError
    }

    if (!isAdmin && current.employee_id !== ctx.identityId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can only delete if status is 'pending' / 'draft' / 'submitted'
    if (!['draft', 'submitted', 'pending'].includes(current.status)) {
      return NextResponse.json(
        { error: `Cannot delete a claim with status '${current.status}'. Only draft/submitted claims can be deleted.` },
        { status: 422 }
      )
    }

    const { error } = await supabaseAdmin
      .from('expense_claims')
      .delete()
      .eq('id', id)
      .eq('org_id', ctx.orgId)

    if (error) {
      console.error('[reimbursements DELETE]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ message: 'Expense claim deleted successfully' })
  } catch (err: unknown) {
    console.error('[reimbursements DELETE catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
