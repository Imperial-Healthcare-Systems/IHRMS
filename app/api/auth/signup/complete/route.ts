/**
 * Signup completion — Phase 3 of IMPERIAL_TENANT_SPEC v1.0 §5.2.
 *
 * Verifies the OTP, then provisions:
 *   1. identity (insert or reuse existing)
 *   2. organisation (with trial_ends_at = now + 14 days)
 *   3. org_branding row
 *   4. owner membership
 *   5. org_subscriptions row (status = 'trial')
 *   6. org_credits row (allowance from plan)
 *   7. employees row (the founder, role 'super_admin')
 *
 * If any step after the org insert fails we don't roll back — the user
 * already paid for the OTP roundtrip; partial state is recoverable by ops.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyOtpChallenge } from '@/lib/otp'
import { sendOrgWelcomeEmail } from '@/lib/mailer'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, challengeToken } = await req.json()
    if (!email || !otp || !challengeToken) {
      return NextResponse.json({ error: 'email, otp, challengeToken required' }, { status: 400 })
    }

    const verified = verifyOtpChallenge({ email, otp, challengeToken })
    if (!verified.valid || !verified.payload || verified.payload.kind !== 'signup') {
      return NextResponse.json({ error: verified.error ?? 'Invalid OTP' }, { status: 401 })
    }

    const p = verified.payload as {
      kind: 'signup'
      org_name: string
      full_name: string
      phone: string | null
      gstin: string | null
      product: 'ihrms' | 'icrm' | 'bundle'
      tier: 'starter' | 'growth' | 'pro' | 'enterprise'
      min_seats: number
      slug: string
      identity_exists: boolean
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // 1. Identity — reuse if it exists for this email.
    let identityId: string
    {
      const { data: existing } = await supabaseAdmin
        .from('identities').select('id').eq('email', normalizedEmail).maybeSingle() as { data: { id: string } | null }

      if (existing) {
        identityId = existing.id
      } else {
        const { data: created, error: idErr } = await supabaseAdmin
          .from('identities')
          .insert({
            email: normalizedEmail,
            full_name: p.full_name,
            phone: p.phone,
            email_verified_at: new Date().toISOString(),
          } as never)
          .select('id').single() as { data: { id: string } | null; error: { message: string } | null }
        if (idErr || !created) {
          return NextResponse.json({ error: idErr?.message ?? 'identity insert failed' }, { status: 500 })
        }
        identityId = created.id

        // Mirror into auth.users sharing the same UUID so auth.uid() = identities.id
        // after this user signs in. Idempotent: skip silently on 422 already-exists.
        const { error: authUserErr } = await supabaseAdmin.auth.admin.createUser({
          id: identityId,
          email: normalizedEmail,
          email_confirm: true,
        })
        if (authUserErr && !/already|exists|registered/i.test(authUserErr.message)) {
          console.error('[signup/complete] auth.users mirror failed:', authUserErr)
          return NextResponse.json({ error: 'Account provisioning failed', detail: authUserErr.message }, { status: 500 })
        }
      }
    }

    // 2. Organisation — slug was reserved at /signup; collision is now extremely unlikely.
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    const hrmsEnabled = p.product === 'ihrms' || p.product === 'bundle'
    const crmEnabled  = p.product === 'icrm'  || p.product === 'bundle'

    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organisations')
      .insert({
        slug: p.slug,
        name: p.org_name,
        billing_email: normalizedEmail,
        gstin: p.gstin,
        contact_phone: p.phone,
        plan_tier: p.tier,
        hrms_enabled: hrmsEnabled,
        crm_enabled: crmEnabled,
        seat_count: p.min_seats,
        trial_ends_at: trialEnd.toISOString(),
        subscription_status: 'trial',
        signup_source: process.env.NEXT_PUBLIC_APP_KIND ?? 'ihrms',
      } as never)
      .select('id').single() as { data: { id: string } | null; error: { message: string } | null }

    if (orgErr || !org) {
      return NextResponse.json({ error: 'Org create failed', detail: orgErr?.message }, { status: 500 })
    }

    // 3. Branding (best-effort — table is optional under some Phase 0 configs)
    await supabaseAdmin.from('org_branding').insert({ org_id: org.id } as never).then(({ error }) => {
      if (error) console.error('[signup/complete] org_branding INSERT FAILED:', error.message, { org_id: org.id })
    })

    // 4. Owner membership.
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('memberships')
      .insert({
        identity_id: identityId,
        org_id: org.id,
        role: 'owner',
        status: 'active',
        hrms_access: hrmsEnabled,
        crm_access: crmEnabled,
        accepted_at: new Date().toISOString(),
      } as never)
      .select('id').single() as { data: { id: string } | null; error: { message: string } | null }

    if (memErr || !membership) {
      return NextResponse.json({ error: 'Membership create failed', detail: memErr?.message }, { status: 500 })
    }

    // 5. Subscription (trial).
    const { data: planRow } = await supabaseAdmin
      .from('subscription_plans')
      .select('price_per_seat_inr, ai_credits_included_monthly')
      .eq('product', p.product).eq('tier', p.tier).maybeSingle() as { data: { price_per_seat_inr: number; ai_credits_included_monthly: number } | null }

    const monthlyAmount = planRow ? Number(planRow.price_per_seat_inr) * p.min_seats : 0
    const aiAllowance   = planRow?.ai_credits_included_monthly ?? 0

    await supabaseAdmin.from('org_subscriptions').insert({
      org_id: org.id,
      product: p.product,
      tier: p.tier,
      seats: p.min_seats,
      amount_per_month: monthlyAmount,
      next_billing_amount_inr: monthlyAmount,
      currency: 'INR',
      billing_cycle: 'monthly',
      status: 'trial',
      trial_ends_at: trialEnd.toISOString(),
    } as never).then(({ error }) => {
      if (error) console.error('[signup/complete] org_subscriptions INSERT FAILED — billing will break:', error.message, { org_id: org.id, product: p.product, tier: p.tier })
    })

    // 6. Credits (with monthly allowance).
    await supabaseAdmin.from('org_credits').insert({
      org_id: org.id,
      allowance_remaining: aiAllowance,
      allowance_carry_over: 0,
      purchased_balance: 0,
      balance: aiAllowance,
      allowance_reset_date: new Date().toISOString().split('T')[0],
    } as never).then(({ error }) => {
      if (error) console.error('[signup/complete] org_credits INSERT FAILED — AI features will break:', error.message, { org_id: org.id })
    })

    // 7. Founder employee row (only when HRMS is enabled).
    if (hrmsEnabled) {
      const firstName = p.full_name.split(' ')[0] ?? p.full_name
      const lastName  = p.full_name.split(' ').slice(1).join(' ') || '-'
      await supabaseAdmin.from('employees').insert({
        org_id: org.id,
        identity_id: identityId,
        membership_id: membership.id,
        emp_id: 'EMP001',
        first_name: firstName,
        last_name: lastName,
        work_email: normalizedEmail,
        role: 'super_admin',
        is_admin: true,
        status: 'active',
        date_of_joining: new Date().toISOString().split('T')[0],
      } as never).then(({ error }) => {
        if (error) console.error('[signup/complete] founder employee INSERT FAILED:', error.message, { org_id: org.id, identity_id: identityId })
      })
    }

    if (crmEnabled) {
      await supabaseAdmin.from('crm_users').insert({
        org_id: org.id,
        identity_id: identityId,
        membership_id: membership.id,
        email: normalizedEmail,
        full_name: p.full_name,
        role: 'super_admin',
        is_active: true,
      } as never).then(({ error }) => {
        if (error) console.error('[signup/complete] crm_users INSERT FAILED:', error.message, { org_id: org.id, identity_id: identityId })
      })
    }

    logAudit({
      org_id: org.id,
      actor_identity_id: identityId,
      actor_membership_id: membership.id,
      action: 'created',
      module: 'organisation',
      entity_id: org.id,
      summary: `Organisation "${p.org_name}" created via ${p.product} signup, ${p.tier} tier`,
    })

    sendOrgWelcomeEmail({
      to: normalizedEmail,
      name: p.full_name,
      orgName: p.org_name,
      trialEndsAt: trialEnd.toISOString(),
      orgId: org.id,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      orgId: org.id,
      activeMembershipId: membership.id,
      redirectTo: '/login',
      message: 'Organisation created. Sign in with your email to continue.',
    })
  } catch (err) {
    console.error('[auth/signup/complete POST]', err)
    const message = err instanceof Error ? err.message : 'Signup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
