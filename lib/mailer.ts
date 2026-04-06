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
