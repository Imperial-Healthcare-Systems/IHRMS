/**
 * Next.js instrumentation hook — runs once per server start.
 *
 * Phase 7 of IMPERIAL_TENANT_SPEC v1.0: Sentry is configured per-app
 * but the actual SDK install is deferred (free-tier sign-up + DSN
 * provisioning is a manual ops step). This shim activates Sentry only
 * when:
 *
 *   1. `@sentry/nextjs` is installed (dynamic import — no hard dep)
 *   2. `SENTRY_DSN` is set in env
 *
 * Until both are true the function is a no-op. To turn Sentry on:
 *   - npm install --save @sentry/nextjs
 *   - Set SENTRY_DSN in your environment
 *   - (optional) Set SENTRY_TRACES_SAMPLE_RATE, SENTRY_ENVIRONMENT
 *
 * No code changes required after the install — the dynamic import
 * picks up the SDK on the next deploy.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return

  try {
    if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
      // The webpackIgnore magic comment keeps webpack from trying to resolve
      // @sentry/nextjs at build time — without it, builds warn whenever the
      // SDK isn't installed. The dynamic import resolves at runtime via the
      // Node module resolver, so installing the package and redeploying is
      // all that's needed to activate Sentry.
      // @ts-expect-error optional dependency, see comment above
      const SentryMod = await import(/* webpackIgnore: true */ '@sentry/nextjs').catch(() => null)
      const Sentry = SentryMod as { init: (opts: Record<string, unknown>) => void } | null
      if (!Sentry) return
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'production',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      })
    }
  } catch {
    // Never let instrumentation crash the server.
  }
}
