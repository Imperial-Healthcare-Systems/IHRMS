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
  return `<p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0">Imperial Healthcare Systems · This is an automated message, please do not reply.</p>`
}

async function createTransporter() {
  const { host, port, user, pass, from, secure } = getMailConfig()
  const nodemailerModule = await import('nodemailer')
  const nodemailer = (nodemailerModule.default ?? nodemailerModule) as typeof nodemailerModule
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
  return { transporter, from }
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
}) {
  try {
    const { transporter, from } = await createTransporter()
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
}) {
  try {
    const { transporter, from } = await createTransporter()
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
}) {
  try {
    if (!params.recipients.length) return
    const { transporter, from } = await createTransporter()
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
}) {
  try {
    const { transporter, from } = await createTransporter()
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
            ${[['Employee ID', empId],['Joining Date', fmt(joiningDate)],designation?['Designation', designation]:null,department?['Department', department]:null].filter(Boolean).map(([k,v])=>`<tr><td style="padding:9px 16px;font-size:12px;color:#6b7280;width:140px;border-top:1px solid #f1f5f9">${k}</td><td style="padding:9px 16px;font-size:12px;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9">${v}</td></tr>`).join('')}
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
}

export async function sendPayslipEmail(p: SendPayslipEmailParams) {
  const { host, port, user, pass, from, secure } = getMailConfig()
  const nodemailerModule = await import('nodemailer')
  const nodemailer = (nodemailerModule.default ?? nodemailerModule) as typeof nodemailerModule
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })

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
