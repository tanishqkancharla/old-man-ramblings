import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | null = null
let schemaReady: Promise<void> | null = null

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!sql) {
    sql = neon(url)
  }
  return sql
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getSql()
      await db`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          text TEXT NOT NULL,
          title TEXT NOT NULL,
          excerpt TEXT NOT NULL,
          post_date DATE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          created_timestamp BIGINT NOT NULL,
          likes INTEGER,
          retweets INTEGER,
          quoted_title TEXT,
          quoted_url TEXT,
          link_url TEXT,
          link_label TEXT,
          image_url TEXT,
          body TEXT,
          ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await db`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url TEXT`
      await db`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_label TEXT`
      await db`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT`
      await db`ALTER TABLE posts ADD COLUMN IF NOT EXISTS body TEXT`
      await db`
        CREATE INDEX IF NOT EXISTS posts_created_at_idx
        ON posts (created_at DESC)
      `
      await db`
        CREATE TABLE IF NOT EXISTS subscribers (
          email TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          unsubscribed_at TIMESTAMPTZ
        )
      `
      await db`
        CREATE TABLE IF NOT EXISTS newsletter_sends (
          id TEXT PRIMARY KEY,
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          post_count INTEGER NOT NULL,
          recipient_count INTEGER NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
    })().catch((error) => {
      schemaReady = null
      throw error
    })
  }
  await schemaReady
}
