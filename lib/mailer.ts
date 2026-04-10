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
