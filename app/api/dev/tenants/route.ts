/**
 * Dev tenant switcher API — DEV/STAGING ONLY.
 *
 * Two independent gates protect this endpoint:
 *   1. NODE_ENV !== 'production' (constant check; in prod builds the
 *      runtime branch is dead code prunable by SWC).
 *   2. Caller must be authenticated AND have 'imperial_internal' in
 *      employees.roles (runtime DB check).
 *
 * In production both gates trip, returning a bare 404 with NO body so
 * probers can't even detect the endpoint exists. Confirmed by:
 *   curl -i https://prod/api/dev/tenants  → HTTP/2 404
 *
 * GET    → list tenants the internal user can view + current override
 * POST   → set the dev_org_override cookie ({ org_id })
 * DELETE → clear the cookie
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const IS_PROD = process.env.NODE_ENV === 'production'

async function assertInternal(identityId: string): Promise<boolean> {
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('roles')
    .eq('identity_id', identityId)
    .maybeSingle() as { data: { roles: string[] | null } | null }
  return !!emp?.roles?.includes('imperial_internal')
}

export async function GET(req: NextRequest) {
  if (IS_PROD) return new NextResponse(null, { status: 404 })

  const auth = await requireAuth()
  if (auth.error) return new NextResponse(null, { status: 404 })

  const internal = await assertInternal(auth.ctx.identityId)
  if (!internal) return new NextResponse(null, { status: 404 })

  const { data, error } = await supabaseAdmin.rpc('list_tenants_for_internal_user', {
    p_identity_id: auth.ctx.identityId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data ?? [],
    current_override: req.cookies.get('dev_org_override')?.value ?? null,
    home_org_id: auth.ctx.orgId,
  })
}

export async function POST(req: NextRequest) {
  if (IS_PROD) return new NextResponse(null, { status: 404 })

  const auth = await requireAuth()
  if (auth.error) return new NextResponse(null, { status: 404 })

  const internal = await assertInternal(auth.ctx.identityId)
  if (!internal) return new NextResponse(null, { status: 404 })

  const body = await req.json().catch(() => ({})) as { org_id?: string }
  if (!body.org_id || typeof body.org_id !== 'string') {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  // Defensive — verify target org actually exists before setting the cookie.
  const { data: org } = await supabaseAdmin
    .from('organisations')
    .select('id, name')
    .eq('id', body.org_id)
    .maybeSingle() as { data: { id: string; name: string } | null }
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const res = NextResponse.json({ ok: true, org_id: org.id, org_name: org.name })
  res.cookies.set('dev_org_override', org.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return res
}

export async function DELETE() {
  if (IS_PROD) return new NextResponse(null, { status: 404 })

  const auth = await requireAuth()
  if (auth.error) return new NextResponse(null, { status: 404 })

  // No internal-check on DELETE — clearing the override is harmless and
  // useful for any authenticated user if a stale cookie sticks around.

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('dev_org_override')
  return res
}
