import { NextRequest, NextResponse } from 'next/server'
import { findActiveEmployeeByEmail } from '@/lib/auth-utils'
import { sendOtpEmail } from '@/lib/mailer'
import { createOtpChallenge, maskEmail } from '@/lib/otp'

const REQUEST_COOLDOWN_MS = 60_000

const globalOtpRequests = globalThis as typeof globalThis & {
  __ihrmsOtpRequestTimestamps?: Map<string, number>
}

const otpRequestTimestamps = globalOtpRequests.__ihrmsOtpRequestTimestamps ?? new Map<string, number>()
globalOtpRequests.__ihrmsOtpRequestTimestamps = otpRequestTimestamps

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getRetryAfterSeconds(email: string) {
  const lastRequestedAt = otpRequestTimestamps.get(email)

  if (!lastRequestedAt) {
    return 0
  }

  const elapsed = Date.now() - lastRequestedAt

  if (elapsed >= REQUEST_COOLDOWN_MS) {
    otpRequestTimestamps.delete(email)
    return 0
  }

  return Math.ceil((REQUEST_COOLDOWN_MS - elapsed) / 1000)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid work email address.' }, { status: 400 })
    }

    const retryAfterSeconds = getRetryAfterSeconds(email)

    if (retryAfterSeconds > 0) {
      return NextResponse.json(
        { error: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.` },
        { status: 429 }
      )
    }

    const employee = await findActiveEmployeeByEmail(email)

    if (!employee) {
      return NextResponse.json({ error: 'No active employee account found for that email.' }, { status: 404 })
    }

    const { otp, challengeToken, expiresInMinutes } = createOtpChallenge(employee.email)
    const employeeName = [employee.first_name, employee.last_name].filter(Boolean).join(' ')

    try {
      await sendOtpEmail({
        to: employee.email,
        name: employeeName || 'Team Member',
        otp,
        expiresInMinutes,
      })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[IHRMS OTP] ${employee.email}: ${otp}`)
        otpRequestTimestamps.set(email, Date.now())

        return NextResponse.json({
          challengeToken,
          expiresInMinutes,
          maskedEmail: maskEmail(employee.email),
          message: 'SMTP is not configured in development, so the OTP was written to the server log.',
          devOtp: otp,
        })
      }

      throw error
    }

    otpRequestTimestamps.set(email, Date.now())

    return NextResponse.json({
      challengeToken,
      expiresInMinutes,
      maskedEmail: maskEmail(employee.email),
      message: `A 6-digit OTP has been sent to ${maskEmail(employee.email)}.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send OTP right now.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
