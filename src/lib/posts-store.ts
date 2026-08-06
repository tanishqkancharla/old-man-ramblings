import { toPost, type Post, type RecommendedReading } from '~/data/posts'
import { ensureSchema, getSql } from '~/lib/db'

type PostRow = {
  id: string
  url: string
  text: string
  title: string
  excerpt: string
  post_date: string
  created_at: string
  created_timestamp: string | number
  likes: number | null
  retweets: number | null
  quoted_title: string | null
  quoted_url: string | null
  link_url: string | null
  link_label: string | null
  image_url: string | null
  body: string | null
}

const UPSERT_CONCURRENCY = 10

export async function upsertReadings(readings: RecommendedReading[]) {
  await ensureSchema()
  const db = getSql()
  let upserted = 0

  for (let i = 0; i < readings.length; i += UPSERT_CONCURRENCY) {
    const chunk = readings.slice(i, i + UPSERT_CONCURRENCY)
    await Promise.all(
      chunk.map(async (reading) => {
        const post = toPost(reading)
        const linkTitle = post.linkTitle?.trim() || null
        await db`
          INSERT INTO posts (
            id, url, text, title, excerpt, post_date, created_at,
            created_timestamp, likes, retweets, quoted_title, quoted_url,
            link_url, link_label, image_url, body, ingested_at
          ) VALUES (
            ${post.id},
            ${post.tweetUrl},
            ${reading.text},
            ${linkTitle || '(no title)'},
            ${post.body},
            ${post.date},
            ${post.createdAt},
            ${reading.createdTimestamp},
            ${reading.likes ?? null},
            ${reading.retweets ?? null},
            ${reading.quotedTitle ?? null},
            ${reading.quotedUrl ?? null},
            ${post.linkUrl},
            ${linkTitle},
            ${post.imageUrl},
            ${post.body},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            url = EXCLUDED.url,
            text = EXCLUDED.text,
            title = EXCLUDED.title,
            excerpt = EXCLUDED.excerpt,
            post_date = EXCLUDED.post_date,
            created_at = EXCLUDED.created_at,
            created_timestamp = EXCLUDED.created_timestamp,
            likes = EXCLUDED.likes,
            retweets = EXCLUDED.retweets,
            quoted_title = EXCLUDED.quoted_title,
            quoted_url = EXCLUDED.quoted_url,
            link_url = EXCLUDED.link_url,
            link_label = EXCLUDED.link_label,
            image_url = EXCLUDED.image_url,
            body = EXCLUDED.body,
            ingested_at = NOW()
        `
      }),
    )
    upserted += chunk.length
  }

  return upserted
}

/** Latest successful row write time — used to throttle catch-up ingests. */
export async function getLatestIngestedAt(): Promise<number | null> {
  await ensureSchema()
  const db = getSql()
  const rows = (await db`
    SELECT MAX(ingested_at) AS latest FROM posts
  `) as Array<{ latest: string | Date | null }>
  const latest = rows[0]?.latest
  if (!latest) return null
  const ms = new Date(latest).getTime()
  return Number.isFinite(ms) ? ms : null
}

export async function listPosts(limit = 200): Promise<Post[]> {
  await ensureSchema()
  const db = getSql()
  const rows = (await db`
    SELECT
      id, url, text, title, excerpt, post_date::text AS post_date,
      created_at::text AS created_at, created_timestamp,
      likes, retweets, quoted_title, quoted_url,
      link_url, link_label, image_url, body
    FROM posts
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as PostRow[]

  return rows.map(rowToPost)
}

export async function listPostsSince(sinceIso: string): Promise<Post[]> {
  await ensureSchema()
  const db = getSql()
  const rows = (await db`
    SELECT
      id, url, text, title, excerpt, post_date::text AS post_date,
      created_at::text AS created_at, created_timestamp,
      likes, retweets, quoted_title, quoted_url,
      link_url, link_label, image_url, body
    FROM posts
    WHERE created_at >= ${sinceIso}::timestamptz
    ORDER BY created_at DESC
  `) as PostRow[]

  return rows.map(rowToPost)
}

export async function countPosts() {
  await ensureSchema()
  const db = getSql()
  const rows = (await db`SELECT COUNT(*)::int AS count FROM posts`) as Array<{
    count: number
  }>
  return rows[0]?.count ?? 0
}

function rowToPost(row: PostRow): Post {
  // Prefer link_label. Never fall back to body/excerpt — an older ingest used
  // Mario's tweet text as `title` when OG title was missing.
  const storedTitle = row.link_label?.trim() || row.title?.trim() || null
  const linkTitle =
    !storedTitle ||
    storedTitle === '(no title)' ||
    storedTitle === row.body?.trim() ||
    storedTitle === row.excerpt?.trim()
      ? null
      : storedTitle

  return toPost({
    id: row.id,
    tweetUrl: row.url,
    text: row.text,
    date: row.created_at,
    createdTimestamp: Number(row.created_timestamp),
    likes: row.likes ?? undefined,
    retweets: row.retweets ?? undefined,
    linkUrl: row.link_url ?? undefined,
    linkTitle: linkTitle ?? undefined,
    imageUrl: row.image_url ?? undefined,
    quotedTitle: row.quoted_title ?? undefined,
    quotedUrl: row.quoted_url ?? undefined,
  })
}
