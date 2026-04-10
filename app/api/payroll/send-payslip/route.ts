import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendPayslipEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    // Basic email validation
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
    })

    return NextResponse.json({ success: true, message: `Payslip sent to ${to}` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-payslip]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
