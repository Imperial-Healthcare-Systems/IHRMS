/**
 * Resolves the active employees row for the current identity in the
 * current org. Used by routes that filter by employees.id (NOT identity_id).
 *
 * Why this helper exists:
 *   lib/session.ts gives you `ctx.identityId` — the identities.id of the
 *   logged-in user. But ~25 routes were filtering employee FKs like
 *   .eq('employee_id', ctx.identityId), which is wrong: identities.id !=
 *   employees.id. The query matches zero rows and the user sees an empty
 *   list of their own data.
 *
 *   This helper resolves the employees row once per request. Routes that
 *   need it call:
 *
 *     const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
 *     if (!me) return NextResponse.json({ error: 'No employee profile' }, { status: 404 })
 *     query = query.eq('employee_id', me.id)
 *
 * It does NOT cache across requests — each call goes to the DB. The cost
 * is one indexed lookup; routes that don't need it shouldn't call it.
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

export type ActiveEmployee = {
  /** employees.id — the FK target for every employee_id column */
  id: string
  /** identities.id — same as ctx.identityId */
  identityId: string
  /** organisations.id — same as ctx.orgId */
  orgId: string
  /** employees.reporting_manager_id — FK to employees.id (NOT identity_id) */
  reportingManagerId: string | null
  /** Human-readable employee code (e.g. EMP/2024/001) */
  empId: string | null
}

export async function getActiveEmployee(
  identityId: string,
  orgId: string,
): Promise<ActiveEmployee | null> {
  const { data } = await supabaseAdmin
    .from('employees')
    .select('id, identity_id, org_id, reporting_manager_id, emp_id')
    .eq('identity_id', identityId)
    .eq('org_id', orgId)
    .maybeSingle() as {
      data: {
        id: string
        identity_id: string
        org_id: string
        reporting_manager_id: string | null
        emp_id: string | null
      } | null
    }

  if (!data) return null
  return {
    id: data.id,
    identityId: data.identity_id,
    orgId: data.org_id,
    reportingManagerId: data.reporting_manager_id,
    empId: data.emp_id,
  }
}

/**
 * Same as getActiveEmployee but returns a 404 response when no employees
 * row exists. Use when the route MUST have an employee profile to function
 * (self-view of attendance, leaves, documents, etc).
 */
export async function requireActiveEmployee(
  identityId: string,
  orgId: string,
): Promise<{ employee: ActiveEmployee; error: null } | { employee: null; error: NextResponse }> {
  const employee = await getActiveEmployee(identityId, orgId)
  if (!employee) {
    return {
      employee: null,
      error: NextResponse.json(
        { error: 'You do not have an employee profile in this organisation.' },
        { status: 404 },
      ),
    }
  }
  return { employee, error: null }
}
