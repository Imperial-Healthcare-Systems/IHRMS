import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('expense_claims')
      .select(`
        id, claim_date, category, description, amount, currency,
        receipt_urls, status, rejection_note, paid_at, payment_ref,
        approved_at,
        employee:employees!expense_claims_employee_id_fkey(
          id, first_name, last_name, emp_id, work_email,
          department:departments(id, name),
          designation:designations(id, title)
        ),
        approved_by:employees!expense_claims_approved_by_fkey(
          id, first_name, last_name, emp_id
        ),
        created_at, updated_at
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Expense claim not found' }, { status: 404 })
      throw error
    }

    const sessionUserId  = (session.user as any)?.id
    const sessionIsAdmin = (session.user as any)?.isAdmin

    // Non-admin employees can only view their own claim
    if (!sessionIsAdmin && (data as any).employee?.id !== sessionUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      action,
      approved_amount,
      rejection_reason,
      payroll_run_id,
    } = body as {
      action?: 'approve' | 'reject' | 'include_payroll'
      approved_amount?: number
      rejection_reason?: string
      payroll_run_id?: string
    }

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    // Fetch current claim
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('expense_claims')
      .select('id, status, employee_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Expense claim not found' }, { status: 404 })
      throw fetchError
    }

    const approverUserId = (session.user as any)?.id
    const isAdmin        = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin or Manager required' }, { status: 403 })

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (action === 'approve') {
      if (!['submitted', 'draft'].includes(current.status)) {
        return NextResponse.json(
          { error: `Cannot approve a claim with status '${current.status}'` },
          { status: 422 }
        )
      }
      if (approved_amount === undefined) {
        return NextResponse.json({ error: 'approved_amount is required for approve action' }, { status: 400 })
      }
      updatePayload.status      = 'approved'
      updatePayload.approved_by = approverUserId
      updatePayload.approved_at = new Date().toISOString()
      // Store approved_amount in description prefix since schema doesn't have dedicated column
      // We update the payment_ref to track approved amount
      updatePayload.payment_ref = `approved_amount:${approved_amount}`
    } else if (action === 'reject') {
      if (!['submitted', 'draft', 'approved'].includes(current.status)) {
        return NextResponse.json(
          { error: `Cannot reject a claim with status '${current.status}'` },
          { status: 422 }
        )
      }
      if (!rejection_reason) {
        return NextResponse.json({ error: 'rejection_reason is required for reject action' }, { status: 400 })
      }
      updatePayload.status         = 'rejected'
      updatePayload.rejection_note = rejection_reason
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
      // Mark as paid and link payroll run via payment_ref
      updatePayload.status      = 'paid'
      updatePayload.paid_at     = new Date().toISOString().split('T')[0]
      updatePayload.payment_ref = `payroll_run:${payroll_run_id}`
    } else {
      return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('expense_claims')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sessionUserId = (session.user as any)?.id
    const isAdmin       = (session.user as any)?.isAdmin

    // Fetch the claim to check ownership and status
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('expense_claims')
      .select('id, status, employee_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Expense claim not found' }, { status: 404 })
      throw fetchError
    }

    // Only the claim owner or an admin can delete
    if (!isAdmin && current.employee_id !== sessionUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can only delete if status is 'pending' / 'draft' / 'submitted'
    if (!['draft', 'submitted'].includes(current.status)) {
      return NextResponse.json(
        { error: `Cannot delete a claim with status '${current.status}'. Only draft/submitted claims can be deleted.` },
        { status: 422 }
      )
    }

    const { error } = await supabaseAdmin
      .from('expense_claims')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Expense claim deleted successfully' })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
