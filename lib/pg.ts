import postgres from 'postgres'

// Direct PostgreSQL connection — bypasses PostgREST schema cache entirely.
const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // suppress NOTICE-level messages (e.g. "relation already exists, skipping")
})

// ensureSchema() runs ADD COLUMN IF NOT EXISTS for every column that Supabase
// free-tier drops on project pause/resume. Called before every write that uses
// these columns — IF NOT EXISTS is instant when the column already exists.
export async function ensureSchema(): Promise<void> {
  try {
    // Single DO block = single round-trip, always returns a row so the
    // postgres npm package never sees an undefined result set.
    await sql`
      DO $$ BEGIN
        -- assets
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='purchase_value')
          THEN ALTER TABLE assets ADD COLUMN purchase_value NUMERIC(12,2); END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='notes')
          THEN ALTER TABLE assets ADD COLUMN notes TEXT; END IF;

        -- announcements
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='body')
          THEN ALTER TABLE announcements ADD COLUMN body TEXT; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='audience')
          THEN ALTER TABLE announcements ADD COLUMN audience TEXT NOT NULL DEFAULT 'all'; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='priority')
          THEN ALTER TABLE announcements ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='is_pinned')
          THEN ALTER TABLE announcements ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='publish_at')
          THEN ALTER TABLE announcements ADD COLUMN publish_at TIMESTAMPTZ DEFAULT NOW(); END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='expires_at')
          THEN ALTER TABLE announcements ADD COLUMN expires_at TIMESTAMPTZ; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='created_by')
          THEN ALTER TABLE announcements ADD COLUMN created_by UUID; END IF;

        -- app_settings key-value store
        CREATE TABLE IF NOT EXISTS app_settings (
          key        TEXT PRIMARY KEY,
          value      JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- in-app notifications
        CREATE TABLE IF NOT EXISTS notifications (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient_id UUID NOT NULL,
          title        TEXT NOT NULL,
          body         TEXT,
          type         TEXT NOT NULL DEFAULT 'info',
          is_read      BOOLEAN NOT NULL DEFAULT false,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      END $$
    `
    await sql`NOTIFY pgrst, 'reload schema'`
  } catch (e) {
    console.warn('[pg] ensureSchema warning:', e)
  }
}

// Kept for backward-compat with any import that uses `ready`
export const ready: Promise<void> = ensureSchema()

export default sql
