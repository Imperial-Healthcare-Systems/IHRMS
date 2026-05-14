/* ─────────────────────────────────────────────────────────────
   SHARED HELPERS
───────────────────────────────────────────────────────────── */
function emailHeader(title: string, subtitle?: string) {
  return `
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1565c0 100%);padding:24px 32px;text-align:center">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:38px;height:38px;border-radius:9px;background:#E8622A;color:#fff;font-weight:800;font-size:14px;display:inline-flex;align-items:center;justify-content:center">IH</div>
      <span style="font-size:18px;font-weight:800;color:#fff">Imperial Healthcare</span>
    </div>
    <div style="display:inline-block;background:#fff2;color:#fff;border:1px solid #fff3;border-radius:20px;padding:3px 14px;font-size:12px;font-weight:700">${title}</div>
    ${subtitle ? `<p style="color:#bfdbfe;margin:6px 0 0;font-size:12px">${subtitle}</p>` : ''}
  </div>`
}

function emailFooter() {
  // The "Powered by IHRMS" watermark is part of every email by default
  // (per IMPERIAL_TENANT_SPEC v1.0 §9.2). Suppression for full / custom_domain
  // tenants happens at the call site, where the org's branding is known.
  return `
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 4px">Imperial Healthcare Systems · This is an automated message, please do not reply.</p>
    <p style="font-size:10.5px;color:#cbd5e1;text-align:center;margin:0">Powered by IHRMS (Imperial HRMS) · Made with care in India by Imperial Tech Innovations</p>
  `
}

async function createTransporter() {
  const { host, port, user, pass, from, secure } = getMailConfig()
  const nodemailerModule = await import('nodemailer')
  const nodemailer = (nodemailerModule.default ?? nodemailerModule) as typeof nodemailerModule
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
  return { transporter, from }
}

/**
 * Resolve the From header for an outgoing message — branded for level-`full`
 * (and above) tenants when their email_from_addr has been DNS-verified by ops.
 *
 * Calling without `orgId` (or for any tenant below level `full`) returns the
 * platform default from SMTP_FROM. Failure to load branding is silent — we
 * fall back to platform default rather than risk dropping the email.
 */
async function resolveBrandedFrom(orgId?: string): Promise<string> {
  const platformFrom = getMailConfig().from
  if (!orgId) return platformFrom
  try {
    // Imported lazily so the rest of the mailer module stays lightweight
    // for callers that don't need branding.
    const { getOrgBranding } = await import('./branding')
    const b = await getOrgBranding(orgId)
    const eligible = b.level === 'full' || b.level === 'custom_domain'
    if (eligible && b.email_dns_verified && b.email_from_addr) {
      const addr = b.email_from_addr
      return b.email_from_name ? `"${b.email_from_name.replace(/"/g, '')}" <${addr}>` : addr
    }
  } catch (e) {
    console.warn('[mailer] resolveBrandedFrom non-fatal:', e instanceof Error ? e.message : e)
  }
  return platformFrom
}

/* ─────────────────────────────────────────────────────────────
   LEAVE: SUBMITTED (notify HR / manager)
───────────────────────────────────────────────────────────── */
export async function sendLeaveSubmittedEmail(params: {
  to: string           // HR or manager email
  hrName: string
  empName: string
  empId: string
  leaveType: string
  fromDate: string
  toDate: string
  totalDays: number
  reason: string
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, hrName, empName, empId, leaveType, fromDate, toDate, totalDays, reason } = params
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('New Leave Request', 'Action required')}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 6px">Dear <strong>${hrName}</strong>,</p>
          <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6">A new leave request has been submitted and requires your attention.</p>
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #e5e7eb">
            <tr style="background:#f1f5f9"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em">Leave Details</td></tr>
            ${[['Employee', `${empName} (${empId})`],['Leave Type', leaveType.charAt(0).toUpperCase()+leaveType.slice(1)],['From', fmt(fromDate)],['To', fmt(toDate)],['Total Days', String(totalDays)],['Reason', reason]].map(([k,v])=>`<tr><td style="padding:9px 16px;font-size:12px;color:#6b7280;width:130px;border-top:1px solid #f1f5f9">${k}</td><td style="padding:9px 16px;font-size:12px;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9">${v}</td></tr>`).join('')}
          </table>
          <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:12px;color:#92400e">
            Please log in to IHRMS to approve or reject this request.
          </div>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `Leave Request — ${empName} (${leaveType}, ${fmt(fromDate)})`,
      html,
      text: `${empName} (${empId}) has requested ${leaveType} leave from ${fmt(fromDate)} to ${fmt(toDate)} (${totalDays} day(s)). Reason: ${reason}`,
    })
  } catch (e) { console.warn('[mailer] sendLeaveSubmittedEmail non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   LEAVE: APPROVED / REJECTED (notify employee)
───────────────────────────────────────────────────────────── */
export async function sendLeaveStatusEmail(params: {
  to: string
  empName: string
  leaveType: string
  fromDate: string
  toDate: string
  totalDays: number
  status: 'approved' | 'rejected'
  remarks?: string
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, empName, leaveType, fromDate, toDate, totalDays, status, remarks } = params
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const approved = status === 'approved'

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader(`Leave ${approved ? 'Approved' : 'Rejected'}`, approved ? 'Your leave has been approved' : 'Your leave request was not approved')}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 6px">Dear <strong>${empName}</strong>,</p>
          <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6">
            Your leave request has been <strong style="color:${approved?'#15803d':'#dc2626'}">${status}</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #e5e7eb">
            <tr style="background:#f1f5f9"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em">Leave Summary</td></tr>
            ${[['Leave Type', leaveType.charAt(0).toUpperCase()+leaveType.slice(1)],['From', fmt(fromDate)],['To', fmt(toDate)],['Total Days', String(totalDays)],['Status', status.toUpperCase()]].map(([k,v])=>`<tr><td style="padding:9px 16px;font-size:12px;color:#6b7280;width:130px;border-top:1px solid #f1f5f9">${k}</td><td style="padding:9px 16px;font-size:12px;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9">${v}</td></tr>`).join('')}
          </table>
          ${remarks ? `<div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:14px 16px;font-size:12px;color:#991b1b;margin-bottom:16px"><strong>Remarks:</strong> ${remarks}</div>` : ''}
          <div style="background:${approved?'#f0fdf4':'#fef2f2'};border:1.5px solid ${approved?'#bbf7d0':'#fecaca'};border-radius:10px;padding:14px 16px;font-size:12px;color:${approved?'#166534':'#991b1b'}">
            ${approved ? 'Enjoy your time off! Contact HR if you have any questions.' : 'Please contact HR or your manager if you have questions about this decision.'}
          </div>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `Your Leave Request has been ${status.charAt(0).toUpperCase()+status.slice(1)} — ${fmt(fromDate)}`,
      html,
      text: `Dear ${empName}, your ${leaveType} leave request from ${fmt(fromDate)} to ${fmt(toDate)} has been ${status}.${remarks ? ' Remarks: '+remarks : ''}`,
    })
  } catch (e) { console.warn('[mailer] sendLeaveStatusEmail non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   ANNOUNCEMENT: notify employees by email
───────────────────────────────────────────────────────────── */
export async function sendAnnouncementEmails(params: {
  recipients: { email: string; name: string }[]
  title: string
  body: string
  announcementType: string
  publisherName: string
  orgId?: string
}) {
  try {
    if (!params.recipients.length) return
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { title, body, announcementType, publisherName } = params

    const typeCfg: Record<string, { label: string; color: string; bg: string }> = {
      urgent:  { label: 'URGENT',  color: '#b91c1c', bg: '#fef2f2' },
      holiday: { label: 'HOLIDAY', color: '#15803d', bg: '#f0fdf4' },
      policy:  { label: 'POLICY',  color: '#1d4ed8', bg: '#eff6ff' },
      event:   { label: 'EVENT',   color: '#6d28d9', bg: '#f5f3ff' },
      general: { label: 'GENERAL', color: '#374151', bg: '#f9fafb' },
    }
    const cfg = typeCfg[announcementType] ?? typeCfg.general

    // Send to each recipient individually (personalised greeting)
    const sends = params.recipients.map(({ email, name }) => {
      const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
        <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
          ${emailHeader('Company Announcement')}
          <div style="padding:28px 32px">
            <div style="display:inline-block;background:${cfg.bg};color:${cfg.color};border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px">${cfg.label}</div>
            <p style="font-size:15px;color:#1e293b;margin:0 0 6px">Dear <strong>${name}</strong>,</p>
            <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.3">${title}</h2>
            <div style="font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap;margin-bottom:20px">${body}</div>
            <div style="border-top:1px solid #f1f5f9;padding-top:14px;font-size:12px;color:#94a3b8">
              Posted by <strong style="color:#374151">${publisherName}</strong> · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            ${emailFooter()}
          </div>
        </div>
      </div>`

      return transporter.sendMail({
        from, to: email,
        subject: `${announcementType === 'urgent' ? '🚨 URGENT: ' : ''}${title}`,
        html,
        text: `${title}\n\n${body}\n\nPosted by ${publisherName}`,
      }).catch(e => console.warn(`[mailer] announcement to ${email} failed:`, e))
    })

    // Fire all sends concurrently, non-blocking
    Promise.all(sends).catch(() => {})
  } catch (e) { console.warn('[mailer] sendAnnouncementEmails non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   WELCOME EMAIL for new employees
───────────────────────────────────────────────────────────── */
export async function sendWelcomeEmail(params: {
  to: string
  name: string
  empId: string
  designation?: string
  department?: string
  joiningDate: string
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, name, empId, designation, department, joiningDate } = params
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('Welcome to the Team! 🎉', 'We are glad to have you')}
        <div style="padding:28px 32px">
          <p style="font-size:16px;color:#1e293b;margin:0 0 8px">Dear <strong>${name}</strong>,</p>
          <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.7">
            Welcome to <strong>Imperial Healthcare Systems</strong>! We are thrilled to have you join us. Below are your onboarding details.
          </p>
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #e5e7eb">
            <tr style="background:#f1f5f9"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em">Your Details</td></tr>
            ${([['Employee ID', empId],['Joining Date', fmt(joiningDate)],designation?['Designation', designation]:null,department?['Department', department]:null] as (string[] | null)[]).filter((r): r is string[] => r !== null).map(([k,v])=>`<tr><td style="padding:9px 16px;font-size:12px;color:#6b7280;width:140px;border-top:1px solid #f1f5f9">${k}</td><td style="padding:9px 16px;font-size:12px;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9">${v}</td></tr>`).join('')}
          </table>
          <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px;font-size:13px;color:#1e40af;line-height:1.6;margin-bottom:16px">
            You can log in to the <strong>IHRMS portal</strong> to view your profile, apply for leaves, access payslips and more.
            Your credentials will be shared separately by the HR team.
          </div>
          <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0">
            For any queries, reach out to HR at <a href="mailto:${process.env.SMTP_USER}" style="color:#E8622A">${process.env.SMTP_USER}</a>.
          </p>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `Welcome to Imperial Healthcare Systems, ${name}!`,
      html,
      text: `Dear ${name}, welcome to Imperial Healthcare Systems!\n\nEmployee ID: ${empId}\nJoining Date: ${fmt(joiningDate)}${designation?'\nDesignation: '+designation:''}${department?'\nDepartment: '+department:''}\n\nYour HR team will share login credentials shortly.`,
    })
  } catch (e) { console.warn('[mailer] sendWelcomeEmail non-fatal:', e) }
}

export type SendPayslipEmailParams = {
  to: string
  name: string
  empId: string
  department: string
  period: string
  gross: string
  deductions: string
  net: string
  workingDays: number
  presentDays: number
  lopDays: number
  designation: string
  location: string
  bankAccount: string
  pan: string
  pf: string
  payslipHTML: string
  pdfBase64?: string
  orgId?: string
}

export async function sendPayslipEmail(p: SendPayslipEmailParams) {
  const { host, port, user, pass, secure } = getMailConfig()
  const nodemailerModule = await import('nodemailer')
  const nodemailer = (nodemailerModule.default ?? nodemailerModule) as typeof nodemailerModule
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
  const from = await resolveBrandedFrom(p.orgId)

  const subject = `Your Payslip for ${p.period} — ${p.name}`

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1565c0 100%);padding:24px 32px;text-align:center">
        <div style="display:inline-flex;align-items:center;gap:10px">
          <div style="width:42px;height:42px;border-radius:10px;background:#E8622A;color:#fff;font-weight:800;font-size:15px;display:inline-flex;align-items:center;justify-content:center">IH</div>
          <span style="font-size:20px;font-weight:800;color:#fff">Imperial Healthcare</span>
        </div>
        <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">123 Business Park, Whitefield, Bengaluru – 560066</p>
        <div style="display:inline-block;margin-top:10px;background:#fff3;color:#fff;border:1px solid #fff4;border-radius:20px;padding:3px 14px;font-size:12px;font-weight:700">
          Payslip · ${p.period}
        </div>
      </div>

      <div style="padding:28px 32px">
        <p style="font-size:15px;color:#1e293b;margin:0 0 6px">Dear <strong>${p.name}</strong>,</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 22px;line-height:1.6">
          Your salary for <strong>${p.period}</strong> has been processed. Please find your payslip summary below.
        </p>

        <!-- Employee Details -->
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #e5e7eb">
          <tr style="background:#f1f5f9"><td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em">Employee Details</td></tr>
          ${[['Employee Name', p.name],['Employee ID', p.empId],['Designation', p.designation],['Department', p.department],['Location', p.location],['Bank Account', p.bankAccount],['PAN', p.pan],['PF Number', p.pf]].map(([k,v])=>`<tr><td style="padding:8px 16px;font-size:12px;color:#6b7280;width:160px;border-top:1px solid #f1f5f9">${k}</td><td style="padding:8px 16px;font-size:12px;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9">${v}</td></tr>`).join('')}
        </table>

        <!-- Attendance -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr>
            ${[['Working Days',p.workingDays,'#eff6ff','#1d4ed8'],['Days Present',p.presentDays,'#f0fdf4','#15803d'],['LOP Days',p.lopDays,p.lopDays>0?'#fef2f2':'#f9fafb',p.lopDays>0?'#dc2626':'#6b7280']].map(([l,v,bg,c])=>`<td style="width:33%;text-align:center;padding:14px 10px;background:${bg};border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:24px;font-weight:800;color:${c};line-height:1">${v}</div><div style="font-size:11px;color:#6b7280;margin-top:4px">${l}</div></td>`).join('<td style="width:12px"></td>')}
          </tr>
        </table>

        <!-- Salary Summary -->
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Net Salary (Take Home)</div>
          <div style="font-size:36px;font-weight:800;color:#15803d">${p.net}</div>
          <div style="display:flex;justify-content:center;gap:24px;margin-top:12px;font-size:12px">
            <span style="color:#6b7280">Gross: <strong style="color:#1e293b">${p.gross}</strong></span>
            <span style="color:#6b7280">Deductions: <strong style="color:#dc2626">${p.deductions}</strong></span>
          </div>
        </div>

        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
          This is a system-generated payslip. For queries: <a href="mailto:payroll@imperial.in" style="color:#E8622A">payroll@imperial.in</a>
        </p>
      </div>
    </div>
  </div>`

  const attachments = p.pdfBase64
    ? [{
        filename: `Payslip_${p.name.replace(/\s+/g, '_')}_${p.period.replace(/\s+/g, '_')}.pdf`,
        content: Buffer.from(p.pdfBase64, 'base64'),
        contentType: 'application/pdf',
      }]
    : []

  await transporter.sendMail({
    from, to: p.to, subject, html,
    text: `Payslip for ${p.period}\nEmployee: ${p.name} (${p.empId})\nGross: ${p.gross} | Deductions: ${p.deductions} | Net: ${p.net}`,
    attachments,
  })
}

type SendOtpEmailParams = {
  to: string
  name: string
  otp: string
  expiresInMinutes: number
}

function getMailConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? '465')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465

  if (!host || !port || !user || !pass || !from) {
    throw new Error('OTP email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.')
  }

  return { host, port, user, pass, from, secure }
}

/* ─────────────────────────────────────────────────────────────
   ORG WELCOME — sent after signup completes
───────────────────────────────────────────────────────────── */
export async function sendOrgWelcomeEmail(params: {
  to: string
  name: string
  orgName: string
  trialEndsAt?: string
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, name, orgName, trialEndsAt } = params
    const trialFmt = trialEndsAt
      ? new Date(trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('Welcome to Imperial', `Your ${orgName} workspace is ready`)}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 6px">Hi <strong>${name}</strong>,</p>
          <p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6">
            Your workspace <strong>${orgName}</strong> has been created. Sign in any time at
            <a href="https://imperialhrms.com/login" style="color:#E8622A">imperialhrms.com/login</a> with this email.
          </p>
          ${trialFmt ? `<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:14px 16px;font-size:12px;color:#1e40af;margin-bottom:16px">Your free trial runs until <strong>${trialFmt}</strong>. Add a payment method any time to skip the wait.</div>` : ''}
          <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:14px 16px;font-size:12px;color:#166534">
            Next steps: invite your team, create departments, and seed your first holiday list. Everything else can wait.
          </div>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `Welcome to Imperial — ${orgName} is ready`,
      html,
      text: `Hi ${name}, your workspace ${orgName} has been created. Sign in at imperialhrms.com/login.${trialFmt ? ` Trial ends on ${trialFmt}.` : ''}`,
    })
  } catch (e) { console.warn('[mailer] sendOrgWelcomeEmail non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   INVITATION — sent when an admin invites a teammate
───────────────────────────────────────────────────────────── */
export async function sendInvitationEmail(params: {
  to: string
  orgName: string
  inviterName: string
  role: string
  acceptUrl: string
  expiresAt: string
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, orgName, inviterName, role, acceptUrl, expiresAt } = params
    const expFmt = new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('You are invited', `Join ${orgName} on Imperial`)}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 14px">Hello,</p>
          <p style="font-size:13px;color:#475569;margin:0 0 18px;line-height:1.7">
            <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role.replace(/_/g, ' ')}</strong> on Imperial Healthcare Systems.
          </p>
          <div style="text-align:center;margin:0 0 22px">
            <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#F47920 0%,#FB8C3A 50%,#E53E1A 100%);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(244,121,32,0.4)">Accept invitation</a>
          </div>
          <p style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;margin:0 0 12px">
            This invite expires on <strong style="color:#475569">${expFmt}</strong>. If the button doesn't work, copy this link into your browser:
          </p>
          <p style="font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;word-break:break-all;margin:0 0 12px">${acceptUrl}</p>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `${inviterName} invited you to ${orgName} on Imperial`,
      html,
      text: `${inviterName} invited you to join ${orgName} as ${role}. Accept here: ${acceptUrl} (expires ${expFmt}).`,
    })
  } catch (e) { console.warn('[mailer] sendInvitationEmail non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   TRIAL REMINDER — sent 3 / 1 days before trial expiry
───────────────────────────────────────────────────────────── */
export async function sendTrialReminderEmail(params: {
  to: string
  orgName: string
  daysLeft: number
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, orgName, daysLeft } = params
    const billingUrl = `${process.env.IHRMS_BASE_URL ?? 'https://imperialhrms.com'}/settings/billing`

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('Trial ending soon', `${daysLeft} day${daysLeft === 1 ? '' : 's'} left for ${orgName}`)}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 14px">Hi there,</p>
          <p style="font-size:13px;color:#475569;margin:0 0 18px;line-height:1.7">
            Your Imperial trial for <strong>${orgName}</strong> ends in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.
            Add a payment method now to keep access uninterrupted — your data stays the same, only billing kicks in.
          </p>
          <div style="text-align:center;margin:0 0 18px">
            <a href="${billingUrl}" style="display:inline-block;background:linear-gradient(135deg,#F47920 0%,#FB8C3A 50%,#E53E1A 100%);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(244,121,32,0.4)">Add payment method</a>
          </div>
          <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:12px;color:#92400e">
            What happens after the trial: 3 days of full access (past_due), then 4 days read-only, then 9 days export-only, then deactivation. Data is retained for 90 days after deactivation.
          </div>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your ${orgName} trial`,
      html,
      text: `Your Imperial trial for ${orgName} ends in ${daysLeft} day(s). Add a payment method at ${billingUrl} to keep access.`,
    })
  } catch (e) { console.warn('[mailer] sendTrialReminderEmail non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   READ-ONLY — sent when subscription enters read_only state
   (Day 17 of the wind-down state machine, §7.1)
───────────────────────────────────────────────────────────── */
export async function sendReadOnlyEmail(params: {
  to: string
  orgName: string
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, orgName } = params
    const billingUrl = `${process.env.IHRMS_BASE_URL ?? 'https://imperialhrms.com'}/settings/billing`

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('Workspace is now read-only', `${orgName} requires payment`)}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 14px">Hello,</p>
          <p style="font-size:13px;color:#475569;margin:0 0 18px;line-height:1.7">
            Your Imperial workspace <strong>${orgName}</strong> is now <strong>read-only</strong>. You can still view all your data, but
            creating, updating, or deleting records is blocked until billing is resolved.
          </p>
          <div style="text-align:center;margin:0 0 18px">
            <a href="${billingUrl}" style="display:inline-block;background:#F47920;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700">Resolve billing</a>
          </div>
          <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:12px;color:#92400e">
            In 4 days, the workspace transitions to <strong>export-only</strong> (you can download data but not view it normally). 9 days after that, it is deactivated entirely.
          </div>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `${orgName} is now read-only — resolve billing to restore access`,
      html,
      text: `Your Imperial workspace ${orgName} is now read-only. Resolve billing at ${billingUrl} to restore full access.`,
    })
  } catch (e) { console.warn('[mailer] sendReadOnlyEmail non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   EXPORT-ONLY — sent when subscription enters export_only state
   (Day 21 of the wind-down state machine, §7.1)
───────────────────────────────────────────────────────────── */
export async function sendExportOnlyEmail(params: {
  to: string
  orgName: string
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, orgName } = params
    const billingUrl = `${process.env.IHRMS_BASE_URL ?? 'https://imperialhrms.com'}/settings/billing`

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('Last chance — workspace is export-only', `${orgName} access ending soon`)}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 14px">Hello,</p>
          <p style="font-size:13px;color:#475569;margin:0 0 18px;line-height:1.7">
            Your Imperial workspace <strong>${orgName}</strong> has transitioned to <strong>export-only</strong>.
            You can download your data but the main app surfaces are no longer accessible until billing is resolved.
          </p>
          <div style="text-align:center;margin:0 0 18px">
            <a href="${billingUrl}" style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700">Reactivate now</a>
          </div>
          <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:14px 16px;font-size:12px;color:#991b1b">
            In 9 days, the workspace will be deactivated. Data retention then runs for 90 days before permanent deletion.
          </div>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `${orgName} is export-only — 9 days until deactivation`,
      html,
      text: `Your Imperial workspace ${orgName} is now export-only. Resolve billing at ${billingUrl} within 9 days to avoid deactivation.`,
    })
  } catch (e) { console.warn('[mailer] sendExportOnlyEmail non-fatal:', e) }
}

/* ─────────────────────────────────────────────────────────────
   DEACTIVATION — sent when subscription enters cancelled state
───────────────────────────────────────────────────────────── */
export async function sendDeactivationEmail(params: {
  to: string
  orgName: string
  retentionDays: number
  orgId?: string
}) {
  try {
    const { transporter } = await createTransporter()
    const from = await resolveBrandedFrom(params.orgId)
    const { to, orgName, retentionDays } = params
    const billingUrl = `${process.env.IHRMS_BASE_URL ?? 'https://imperialhrms.com'}/settings/billing`

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        ${emailHeader('Workspace deactivated', `${orgName} access has ended`)}
        <div style="padding:28px 32px">
          <p style="font-size:15px;color:#1e293b;margin:0 0 14px">Hello,</p>
          <p style="font-size:13px;color:#475569;margin:0 0 18px;line-height:1.7">
            Your Imperial workspace <strong>${orgName}</strong> has been deactivated due to non-payment.
            Your data is retained for <strong>${retentionDays} days</strong> from today; reactivate any time before then by adding a payment method.
          </p>
          <div style="text-align:center;margin:0 0 18px">
            <a href="${billingUrl}" style="display:inline-block;background:#0F172A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700">Reactivate account</a>
          </div>
          <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:14px 16px;font-size:12px;color:#991b1b">
            After ${retentionDays} days, all data — employees, payroll, attendance, documents — is permanently deleted and cannot be recovered.
          </div>
          ${emailFooter()}
        </div>
      </div>
    </div>`

    await transporter.sendMail({
      from, to,
      subject: `${orgName} has been deactivated`,
      html,
      text: `Your Imperial workspace ${orgName} has been deactivated. Data retained for ${retentionDays} days. Reactivate at ${billingUrl}.`,
    })
  } catch (e) { console.warn('[mailer] sendDeactivationEmail non-fatal:', e) }
}

export async function sendOtpEmail({ to, name, otp, expiresInMinutes }: SendOtpEmailParams) {
  const { host, port, user, pass, from, secure } = getMailConfig()
  const nodemailerModule = await import('nodemailer')
  const nodemailer = (nodemailerModule.default ?? nodemailerModule) as typeof nodemailerModule
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  const subject = 'Your IHRMS sign-in code'
  const text = [
    `Hello ${name},`,
    '',
    `Your IHRMS one-time password is ${otp}.`,
    `This code will expire in ${expiresInMinutes} minutes.`,
    '',
    'If you did not request this code, you can ignore this email.',
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 12px; font-size: 15px; color: #0f172a;">Hello ${name},</p>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
          Use the OTP below to sign in to IHRMS. The code expires in ${expiresInMinutes} minutes.
        </p>
        <div style="margin: 0 0 20px; padding: 18px; border-radius: 14px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 1px solid #fdba74; text-align: center;">
          <div style="font-size: 30px; font-weight: 800; letter-spacing: 10px; color: #c2410c;">${otp}</div>
        </div>
        <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  })
}
