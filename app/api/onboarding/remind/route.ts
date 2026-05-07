import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { employee_id, pending_steps } = body as {
      employee_id?: string
      pending_steps?: Array<{ id: string; label: string; section: string }>
    }

    if (!employee_id || !pending_steps || pending_steps.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, pending_steps' },
        { status: 400 }
      )
    }

    // Fetch employee details (org-scoped)
    const { data: emp, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, work_email, emp_id, department:departments!employees_department_id_fkey(name)')
      .eq('id', employee_id)
      .eq('org_id', ctx.orgId)
      .maybeSingle()

    if (empErr) return NextResponse.json({ error: errMsg(empErr) }, { status: 500 })
    if (!emp)   return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const empName  = `${emp.first_name} ${emp.last_name}`
    const empEmail = emp.work_email
    const empId    = emp.emp_id ?? ''
    const dept     = (emp.department as { name?: string } | null)?.name ?? ''

    if (!empEmail) {
      return NextResponse.json({ error: 'Employee has no work email on record' }, { status: 422 })
    }

    // Group pending steps by section for a clean email layout
    const bySection: Record<string, string[]> = {}
    for (const step of pending_steps) {
      if (!bySection[step.section]) bySection[step.section] = []
      bySection[step.section].push(step.label)
    }

    const sectionRows = Object.entries(bySection).map(([section, items]) => `
      <tr>
        <td colspan="2" style="padding:10px 16px 4px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;background:#f8fafc;border-top:1px solid #e5e7eb">
          ${section}
        </td>
      </tr>
      ${items.map(label => `
      <tr>
        <td style="padding:8px 16px;font-size:13px;color:#374151;border-top:1px solid #f1f5f9">
          ⏳ ${label}
        </td>
      </tr>`).join('')}
    `).join('')

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1565c0 100%);padding:24px 32px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:10px">
            <div style="width:42px;height:42px;border-radius:10px;background:#E8622A;color:#fff;font-weight:800;font-size:15px;display:inline-flex;align-items:center;justify-content:center">IH</div>
            <span style="font-size:20px;font-weight:800;color:#fff">Imperial Healthcare</span>
          </div>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">Pre-Boarding Checklist Reminder</p>
        </div>

        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 6px">Dear <strong>${empName}</strong>,</p>
          <p style="font-size:13px;color:#64748b;margin:0 0 22px;line-height:1.6">
            Welcome to the team! This is a friendly reminder to complete the following pre-boarding checklist items before your joining date.
            Completing these steps ensures a smooth onboarding experience.
          </p>

          <!-- Employee Info -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;gap:20px;font-size:12px;color:#1e40af">
            <span><strong>ID:</strong> ${empId}</span>
            <span><strong>Dept:</strong> ${dept}</span>
            <span><strong>Pending:</strong> ${pending_steps.length} item${pending_steps.length > 1 ? 's' : ''}</span>
          </div>

          <!-- Pending Steps -->
          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:24px">
            ${sectionRows}
          </table>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:13px;color:#92400e;margin-bottom:20px">
            <strong>⚠ Action Required:</strong> Please submit the above documents and complete the pending forms as soon as possible.
            Contact HR at <a href="mailto:hr@imperial.in" style="color:#E8622A">hr@imperial.in</a> if you need any assistance.
          </div>

          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
            This is a system-generated reminder from IHRMS. Do not reply to this email.
          </p>
        </div>
      </div>
    </div>`

    // Send via nodemailer
    try {
      const nodemailerModule = await import('nodemailer')
      const nodemailer = (nodemailerModule.default ?? nodemailerModule) as typeof nodemailerModule

      const host   = process.env.SMTP_HOST
      const port   = Number(process.env.SMTP_PORT ?? '465')
      const user   = process.env.SMTP_USER
      const pass   = process.env.SMTP_PASS
      const from   = process.env.SMTP_FROM
      const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465

      if (!host || !user || !pass || !from) {
        // SMTP not configured — return success so UI still works
        console.warn('[onboarding remind] SMTP not configured — skipping email send')
        return NextResponse.json({
          sent: false,
          message: 'Reminder recorded. Email delivery not configured (set SMTP_* env vars to enable).',
          recipient: empEmail,
          count: pending_steps.length,
        })
      }

      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
      await transporter.sendMail({
        from,
        to: empEmail,
        subject: `Action Required: Complete Your Pre-Boarding Checklist — ${pending_steps.length} item${pending_steps.length > 1 ? 's' : ''} pending`,
        html,
        text: `Dear ${empName},\n\nPlease complete the following pre-boarding steps:\n\n${pending_steps.map(s => `- ${s.section}: ${s.label}`).join('\n')}\n\nContact hr@imperial.in for assistance.`,
      })

      return NextResponse.json({
        sent: true,
        message: `Reminder email sent to ${empEmail}`,
        recipient: empEmail,
        count: pending_steps.length,
      })
    } catch (mailErr) {
      console.error('[onboarding remind] mail send failed:', errMsg(mailErr))
      // Return success anyway — UI reminder is still recorded locally
      return NextResponse.json({
        sent: false,
        message: `Reminder recorded. Email delivery failed: ${errMsg(mailErr)}`,
        recipient: empEmail,
        count: pending_steps.length,
      })
    }
  } catch (err) {
    console.error('[onboarding remind]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
