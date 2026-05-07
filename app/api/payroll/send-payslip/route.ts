import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { sendPayslipEmail } from '@/lib/mailer'
import { logAudit } from '@/lib/audit'

const PAYROLL_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'payroll_admin', 'finance_admin']

export async function POST(req: NextRequest) {
  try {
    // HR/Payroll only — sending email to arbitrary `to` address is privileged
    const { ctx, error } = await requireRole(PAYROLL_ROLES)
    if (error) return error

    const body = await req.json()
    const {
      to, name, empId, department, period,
      gross, deductions, net,
      workingDays, presentDays, lopDays,
      designation, location, bankAccount, pan, pf,
      pdfBase64,
    } = body

    if (!to || !name || !period) {
      return NextResponse.json({ error: 'Missing required fields: to, name, period' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: `Invalid email address: ${to}` }, { status: 400 })
    }

    await sendPayslipEmail({
      to, name, empId, department, period,
      gross, deductions, net,
      workingDays:  Number(workingDays)  || 0,
      presentDays:  Number(presentDays)  || 0,
      lopDays:      Number(lopDays)      || 0,
      designation:  designation  || '—',
      location:     location     || '—',
      bankAccount:  bankAccount  || '—',
      pan:          pan          || '—',
      pf:           pf           || '—',
      payslipHTML:  '',
      pdfBase64:    pdfBase64    || '',
      orgId:        ctx.orgId,
    })

    // Audit the email send so we have a record of who sent what to whom
    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'updated',
      module: 'payroll',
      entity_id: empId ?? null,
      summary: `Payslip emailed to ${to} for ${period}`,
      meta: { recipient: to, period, name },
    })

    return NextResponse.json({ success: true, message: `Payslip sent to ${to}` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-payslip]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
