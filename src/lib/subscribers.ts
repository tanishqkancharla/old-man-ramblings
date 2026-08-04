import { ensureSchema, getSql } from '~/lib/db'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return emailPattern.test(email)
}

export async function subscribeEmail(rawEmail: string) {
  const email = normalizeEmail(rawEmail)
  if (!isValidEmail(email)) {
    return { ok: false as const, error: 'Enter a valid email address.' }
  }

  await ensureSchema()
  const db = getSql()
  await db`
    INSERT INTO subscribers (email, created_at, unsubscribed_at)
    VALUES (${email}, NOW(), NULL)
    ON CONFLICT (email) DO UPDATE SET
      unsubscribed_at = NULL,
      created_at = COALESCE(subscribers.created_at, NOW())
  `

  return { ok: true as const, email }
}

export async function listActiveSubscribers() {
  await ensureSchema()
  const db = getSql()
  const rows = (await db`
    SELECT email
    FROM subscribers
    WHERE unsubscribed_at IS NULL
    ORDER BY created_at ASC
  `) as Array<{ email: string }>
  return rows.map((row) => row.email)
}
