/**
 * Cancel a pending invitation. Idempotent — re-cancelling is a no-op.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: inviteId } = await params
  const auth = await requireRole(['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin'])
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    // Verify the invite belongs to the caller's org before mutating it.
    const { data: invite } = await supabaseAdmin
      .from('org_invitations')
      .select('id, email, accepted_at, cancelled_at')
      .eq('id', inviteId)
      .eq('org_id', ctx.orgId)
      .maybeSingle() as { data: { id: string; email: string; accepted_at: string | null; cancelled_at: string | null } | null }

    if (!invite) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (invite.accepted_at) return NextResponse.json({ error: 'Already accepted' }, { status: 409 })
    if (invite.cancelled_at) return NextResponse.json({ success: true, alreadyCancelled: true })

    const { error } = await supabaseAdmin
      .from('org_invitations')
      .update({ cancelled_at: new Date().toISOString() } as never)
      .eq('id', inviteId)
      .eq('org_id', ctx.orgId)

    if (error) {
      console.error('[team/invitations DELETE]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'deleted',
      module: 'team',
      entity_id: inviteId,
      summary: `Cancelled invitation for ${invite.email}`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/invitations DELETE catch]', err)
    const message = err instanceof Error ? err.message : 'Cancel failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
