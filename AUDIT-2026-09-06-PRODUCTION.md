# IHRMS — Full Audit

**Date:** 2026-09-06
**Scope:** both live codebases — `main` (what serves imperialhrms.com today) and `feat/team-attendance` (the unmerged Supabase Auth migration)
**Method:** route-by-route authorization review, cross-branch diff, `tsc --noEmit`, `next build`, and **direct read-only queries against the production Postgres** to confirm FK targets and measure real impact
**Supersedes:** the drift findings in `AUDIT.md` (see Part 3)

---

## Why this audit is split in two

The two branches are 91 files and +5,360/−1,102 apart, and they differ in the one place that matters most for an audit: **what `ctx.identityId` actually contains.**

| | `main` (production) | `feat/team-attendance` |
|---|---|---|
| Auth | NextAuth + custom HMAC OTP | Supabase Auth (`@supabase/ssr`) |
| `session.user.id` | `emp?.id ?? identity.id` — **employees.id** | `auth.users.id` — **identities.id** |
| `getActiveEmployee()` helper | absent | present, 24 callers |

That single line — [`lib/auth.ts:93`](lib/auth.ts) — inverts the meaning of nearly every finding. A query that is correct on `main` becomes a foreign-key violation on the feature branch, and vice versa. Auditing one branch and applying the conclusions to the other produces garbage, which is exactly what happened to the previous audit.

### Headline

- **Production is functionally sound on identity handling** — but has **6 live authorization holes** and one **completely dead subsystem**.
- **The pending merge introduces 2 new critical regressions** that will take down leave approval and five other features on the day it ships.

### Counts

| | Live in prod (`main`) | Merge blockers (`feat`) |
|---|---:|---:|
| Critical | 1 | 2 |
| High | 6 | — |
| Medium | 4 | — |

---

# Part 1 — Live in production right now

### P1. In-app notifications are 100% dead — measured, not inferred

The reader filters `recipient_id = ctx.identityId`. Every producer writes something else.

```
app/api/announcements/route.ts:45              recipient_id: emp.id
app/api/attendance/regularization/route.ts:204 recipient_id: reg.employee_id
app/api/ecosystem/consume/route.ts:30          recipient_id: employee_id
app/api/exit/route.ts:224                      recipient_id: exitRow.employee_id
app/api/leaves/[id]/route.ts:26                recipient_id: employeeId
```

On `main`, `ctx.identityId` **is** employees.id, so you would expect these to line up. They don't, and I confirmed it against the live database rather than reasoning about it:

```sql
SELECT count(*) FROM notifications n
LEFT JOIN identities i ON i.id = n.recipient_id
WHERE i.id IS NULL;
-- 9 of 9
```

**All nine notification rows ever written have a `recipient_id` that matches no identity.** The table has accumulated 9 rows in the app's lifetime, which is itself the tell — the bell icon has never shown anything to anyone.

`notifications.recipient_id` carries **no foreign key** (confirmed against `information_schema`), so every one of these writes succeeds silently. Nothing errors, nothing logs, and the feature has been invisibly broken since it shipped.

**Severity: critical (functional).** An HR system that cannot notify anyone about a leave decision, an exit, or an announcement is missing a load-bearing feature.

**Fix:** settle the convention — `recipient_id` should be `identities.id`, since that is what survives an employee record being replaced — then correct all five producers and add the FK constraint so the next mismatch fails loudly. The 9 existing rows are junk; discard them.

### P2. Any employee can read any colleague's attendance, including GPS

[`app/api/attendance/route.ts:82`](app/api/attendance/route.ts)

```ts
if (employee_id) {
  query = query.eq('employee_id', employee_id)   // no role check
} else if (!FULL_ACCESS_ROLES.includes(ctx.role)) {
  query = query.eq('employee_id', ctx.identityId)
}
```

Self-scoping applies only when `employee_id` is **absent**. `GET /api/attendance?employee_id=<colleague-uuid>` returns their full history, and the select includes `geo_lat, geo_lng, geo_location` — an employee can reconstruct a coworker's daily movements.

This is an outlier rather than a decision: `leaves`, `reimbursements`, `documents` and `attendance/summary` all gate the same parameter by role.

### P3. Any employee can punch in/out as any colleague

[`app/api/attendance/route.ts:116`](app/api/attendance/route.ts) — POST takes `employee_id` from the body and only verifies the target is in the same org. No role gate. Direct attendance and payroll fraud.

[`app/api/leaves/route.ts:107`](app/api/leaves/route.ts) has the identical shape — file a leave request in a colleague's name.

### P4. Leave cancellation has no authorization check whatsoever

[`app/api/leaves/[id]/route.ts:131`](app/api/leaves/[id]/route.ts). The approve/reject branch correctly requires HR or the reporting manager (line 118). The `cancel` branch requires only that the row exists in your org — any employee can cancel anyone's approved leave.

Compounding it: the approval already decremented the balance, and cancelling does not credit it back. The victim loses the days *and* the time off.

### P5. Any employee can read — and write — any colleague's HR documents

[`app/api/employees/[id]/documents/route.ts:17`](app/api/employees/[id]/documents/route.ts) checks only that the target is in the caller's org, then returns every document: Aadhaar, PAN, bank proofs, education certificates. POST (line 52) is equally open, so an employee can also plant documents in a colleague's file.

`documents/download/route.ts:26` gets this right. This route simply never got the same treatment.

### P6. Role-gated modules have ungated APIs

`middleware.ts` matches page paths only — `/payroll/:path*`, `/recruitment/:path*` — and **never `/api/*`**. The role map is decoration; the data is one `fetch` away.

| Route | `requireAuth` only | Exposes |
|---|---|---|
| `recruitment/candidates` | yes | candidate PII, `current_ctc`, `expected_ctc`, resumes |
| `recruitment/interviews`, `recruitment/feedback` | yes | schedules, scorecards |
| `payroll` **GET** | yes (POST is gated) | every payroll run in the org |
| `billing/subscription`, `invoices`, `credits` | yes | billing state, invoice history |
| `exit`, `assets` | yes | resignations, asset register |

### P7. OTP brute-force is not effectively rate-limited

[`lib/otp.ts:38`](lib/otp.ts) tracks verification attempts in an in-memory `Map` on `globalThis`, capped at `MAX_VERIFY_ATTEMPTS = 5`.

On Vercel each lambda instance has its own `Map`. An attacker spreading guesses across concurrent invocations resets the counter continuously. Against a 6-digit OTP with a 10-minute TTL, the effective search space is small enough to matter.

**Fix:** move the attempt counter into Postgres or Redis, keyed on the challenge token.

### P8. Cron endpoints are open if `CRON_SECRET` is unset

All four cron routes compare against a `` `Bearer ${process.env.CRON_SECRET}` `` template. With the variable unset that renders `"Bearer undefined"` — which anyone can send. `cron/billing/daily` walks orgs through trial → past_due → **cancelled** and sends deactivation emails.

`ecosystem/consume:11` guards correctly (`if (!ECOSYSTEM_SECRET || ...)`). Copy that, and use `timingSafeEqual`.

### P9. PostgREST filter injection through search params

[`assets/route.ts:44`](app/api/assets/route.ts) and [`recruitment/candidates/route.ts:45`](app/api/recruitment/candidates/route.ts) interpolate raw user input into `or()` filter grammar. A `search` value containing `,` or `.` injects filter terms — it cannot reach arbitrary SQL, but it widens result sets and reliably 500s the endpoint.

### P10. The identity/employee compatibility layer is one signup away from breaking

`lib/auth.ts:93` — `id: emp?.id ?? identity.id`. Roughly 60 call sites then use `ctx.identityId` as an `employees.id` foreign key.

Today that is safe, and I verified it rather than assuming:

```sql
-- active HRMS memberships with no matching employees row
-- result: 0 (of 15 identities)
```

Every identity currently has an employee record, so the fallback never fires. But the moment one doesn't — an org owner who isn't an employee, which the signup flow can produce — `ctx.identityId` silently becomes an identities.id and roughly 60 queries begin returning empty results with no error. `holidays/claim:92` would insert it into an `employees`-FK column and hard-fail.

This is latent, not active. It is also precisely what the feature branch was built to fix, which brings us to Part 2.

---

# Part 2 — Regressions the pending merge introduces

These are **not** production problems. They are defects in `feat/team-attendance` that activate the moment it merges.

### M1. Impersonation permanently bricks the target account — CRITICAL

`impersonation-login` writes `is_impersonating`, `impersonator_admin_id` and `impersonation_log_id` into the **target user's** `app_metadata`. `impersonation-end` closes the log row and signs out but **never clears those keys** — across the whole repo they are written in one place and cleared in none.

Supabase's `admin.updateUserById({ app_metadata })` **merges**; it does not replace. So the flags survive every later login, including `verify-otp`'s own metadata write.

Result: after one impersonation ends, the employee logs in successfully, then `lib/session.ts:85` sees `is_impersonating` plus a log row with a non-null `ended_at`, force-signs-out, and returns 401 to **every** API call. Login appears to work and nothing else does — permanently, until someone hand-edits `app_metadata` in Supabase.

The code comment claiming the write "replaces previous metadata" is wrong for the same merge-vs-replace reason.

This does **not** affect production: `main`'s impersonation-end clears the session cookie directly and never touches `app_metadata`.

### M2. 17 sites will throw foreign-key violations on merge — CRITICAL

The migration correctly changed `ctx.identityId` to mean identities.id and introduced `getActiveEmployee()` to bridge the gap — but the conversion is **incomplete**. 17 sites still pass `ctx.identityId` straight into an employees-FK column.

I resolved every target against the live schema, so this is confirmed rather than suspected:

```
feedback_360.subject_id      -> employees
feedback_360.reviewer_id     -> employees
shift_swaps.requester_id     -> employees
shift_swaps.target_id        -> employees
leave_requests.approved_by   -> employees
review_cycles.created_by     -> employees
scheduled_reports.created_by -> employees
course_content.created_by    -> employees
```

Because these are real FK constraints, the inserts **fail loudly with SQLSTATE 23503** rather than corrupting data. What breaks on day one:

| Feature | Site | Effect |
|---|---|---|
| **Leave approve / reject** | `leaves/[id]/route.ts:149,212` | `approved_by` FK violation — **approval stops working entirely** |
| 360 feedback | `feedback-360:99`, `performance/feedback-360:111` | submit fails; self-view returns nothing |
| Shift swaps | `shifts/swaps:72` | create fails |
| Performance cycles | `performance/cycles:108` | create fails |
| Scheduled reports | `reports/schedule:61` | create fails |
| Training content | `training/[id]/content:116` | create fails |

Two more are silent rather than loud, because those columns have no FK: `announcements.created_by` (:201) and the `notifications` producers from P1.

Leave approval breaking is the one to care about. It is the single most-used write path in the product.

**Fix:** these are mechanical — resolve through `getActiveEmployee()` exactly as the other 24 routes already do.

### M3. The build was broken — now fixed

`next build` failed on `rules-of-hooks` errors in `DevTenantSwitcher.tsx` (seven `useState`s and a `useEffect` below an early return) plus an unescaped apostrophe. Fixed in commit `7c71c4e`; the branch now builds clean.

---

# Part 3 — Corrections to the existing `AUDIT.md`

The June audit reports 65 findings "verified by 3 adversarial reviewers, majority-real required." A large share do not survive contact with the actual schema.

**The 14 "schema-code drift" findings and Critical #6 are false positives.** They were generated against `supabase-schema.sql` — a 2026-04-01 snapshot that predates the multi-tenant migration and contains **zero occurrences of `org_id`**, no `identities`, no `memberships`, no `organisations`. Critical #6 claims `org_id` "does not exist" across 79 route files; it exists on every table I queried. Three reviewers concurred because all three were reading the same stale file. **Disregard findings 6 and 28–36 and 53–56** until the dump is regenerated.

**Critical #1–5 (identity/employee confusion) are false for production too**, for the different reason in P10: on `main`, `ctx.identityId` genuinely is employees.id. The auditors read the docstring (`identities.id — the auth root`) instead of the assignment at `lib/auth.ts:93`. Ironically the *real* version of this bug is M2 — on the branch that was supposed to fix it.

**Still valid and still open:** #37 (payroll GET ungated → P6), #38 (no leave state validation — approving twice double-decrements the balance), #39 (self-approval).

**Genuinely fixed since June:** #8 (salary structures now `requireRole`).

**Recommendation:** regenerate the schema with `pg_dump --schema-only`, commit it as generated, and re-run that workflow. Roughly a third of its current output is noise, which is worse than no audit — it trains the team to ignore it.

---

# Part 4 — What is sound

- **Tenant isolation.** 114 of 115 routes filter on `ctx.orgId`; the exception (`billing/plans`) is a global plan catalogue. Cross-tenant guards on body-supplied ids are consistent, and routes defensively `delete body.org_id` before writes.
- **Service-role containment.** `import 'server-only'` in `lib/supabase-admin.ts` makes the key unbundlable. No secrets in tracked source — `git ls-files` shows only `.env.example`.
- **Money.** `lib/money.ts` is decimal.js throughout with an explicit storage contract. The few `Number()` sites are plan seat pricing, not payroll.
- **OTP token design.** Constant-time compare, HMAC-signed challenge, hashed OTP, TTL. The construction is sound; only the attempt counter's storage is wrong (P7).
- **Dev tenant switcher.** Dual-gated, and `team-attendance/route.ts:46` re-verifies the internal role at consumption time rather than trusting the cookie. This is the pattern the routes in P6 should copy.
- **Both branches typecheck clean** and both now build.

---

# Priority

**Fix in production now — no merge required, each is a small local diff:**

1. **P4** leave cancel — missing authz, and it silently destroys leave balance.
2. **P5** employee documents — statutory PII readable and writable by any colleague.
3. **P2 / P3** attendance IDOR and punch-as-anyone.
4. **P6** put `requireRole` on the ungated module APIs.
5. **P1** notifications — pick the convention, fix five producers, add the FK.

**Before merging `feat/team-attendance`:**

6. **M2** convert the 17 remaining sites. Leave approval breaks on day one otherwise.
7. **M1** clear the impersonation flags in `impersonation-end`, and null them in `verify-otp` so a normal login self-heals a stuck account.
8. Verify login, org-switch and impersonation end-to-end against a running server. This has never been done.

**Then:**

9. **P7** move the OTP attempt counter out of process memory.
10. **P8 / P9** cron secret guards and search-param escaping.
11. Regenerate `supabase-schema.sql`; re-triage `AUDIT.md`.

**Note on observability:** `instrumentation.ts` only initialises Sentry when `@sentry/nextjs` is installed and `SENTRY_DSN` is set. Neither is true, so there is **no error reporting in production at all**. P1 sat invisible for months and M1/M2 would do the same. Installing it is cheap and belongs near the top of this list.
