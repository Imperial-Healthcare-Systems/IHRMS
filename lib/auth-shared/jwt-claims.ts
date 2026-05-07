/**
 * JWT claim builders — primarily used by the Admin Console to mint
 * impersonation tokens that customer-facing apps verify and consume.
 *
 * In IHRMS this file is mainly used by the impersonation receiver
 * (app/api/auth/impersonation-login/route.ts, Phase 5).
 *
 * Per spec Section 3 + 8.1.
 */
import { SignJWT, jwtVerify } from 'jose'

export interface ImpersonationClaims {
  /** identity_id (or, for legacy callers, employee.id) */
  sub: string
  /** target organisation */
  orgId: string
  /** Imperial admin's identity_id (or legacy employee.id) */
  impersonator: string
  /** platform_impersonation_log row id — receiver verifies this is still open */
  logId: string
  /** human-readable reason */
  reason?: string
  /** marker so we never confuse impersonation tokens with normal session tokens */
  isImpersonation: true
}

const ALG = 'HS256'

function getSecret(): Uint8Array {
  const secret = process.env.IMPERSONATION_SECRET
  if (!secret) {
    throw new Error('IMPERSONATION_SECRET not configured')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Issue a short-lived impersonation token (1 hour by default).
 * Called by Admin Console only.
 */
export async function signImpersonationToken(
  claims: ImpersonationClaims,
  expiresIn: string = '1h',
): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

/**
 * Verify and decode an impersonation token. Throws on invalid/expired.
 * Called by IHRMS / ICRM impersonation-login receiver.
 */
export async function verifyImpersonationToken(token: string): Promise<ImpersonationClaims> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] })
  if (!(payload as any).isImpersonation) {
    throw new Error('Token is not an impersonation token')
  }
  return payload as unknown as ImpersonationClaims
}
