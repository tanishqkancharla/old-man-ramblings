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

export async function upsertReadings(readings: RecommendedReading[]) {
  await ensureSchema()
  const db = getSql()
  let upserted = 0

  for (const reading of readings) {
    const post = toPost(reading)
    await db`
      INSERT INTO posts (
        id, url, text, title, excerpt, post_date, created_at,
        created_timestamp, likes, retweets, quoted_title, quoted_url,
        link_url, link_label, image_url, body, ingested_at
      ) VALUES (
        ${post.id},
        ${post.tweetUrl},
        ${reading.text},
        ${(post.linkTitle ?? post.body.slice(0, 120)) || 'Recommended reading'},
        ${post.body},
        ${post.date},
        ${post.createdAt},
        ${reading.createdTimestamp},
        ${reading.likes ?? null},
        ${reading.retweets ?? null},
        ${reading.quotedTitle ?? null},
        ${reading.quotedUrl ?? null},
        ${post.linkUrl},
        ${post.linkTitle},
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
    upserted += 1
  }

  return upserted
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
  return toPost({
    id: row.id,
    tweetUrl: row.url,
    text: row.text,
    date: row.created_at,
    createdTimestamp: Number(row.created_timestamp),
    likes: row.likes ?? undefined,
    retweets: row.retweets ?? undefined,
    linkUrl: row.link_url ?? undefined,
    linkTitle: row.link_label || row.title || undefined,
    imageUrl: row.image_url ?? undefined,
    quotedTitle: row.quoted_title ?? undefined,
    quotedUrl: row.quoted_url ?? undefined,
  })
}
