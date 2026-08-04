import { neon } from '@neondatabase/serverless'

const SEARCH_QUERY = 'from:badlogicgames "recommended reading"'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const sql = neon(process.env.DATABASE_URL)

await sql`
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
await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url TEXT`
await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_label TEXT`
await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT`
await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS body TEXT`
await sql`
  CREATE TABLE IF NOT EXISTS subscribers (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ
  )
`
await sql`
  CREATE TABLE IF NOT EXISTS newsletter_sends (
    id TEXT PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    post_count INTEGER NOT NULL,
    recipient_count INTEGER NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`

function firstHttpUrl(text) {
  return text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[).,;]+$/, '')
}

function cleanBody(text, linkUrl) {
  let body = text.replace(/\brecommended reading\.*/gi, '')
  if (linkUrl) body = body.replaceAll(linkUrl, '')
  body = body.replace(/https?:\/\/\S+/gi, '')
  body = body
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[.\s]+$/.test(line))
    .join('\n')
  return body.trim().replace(/^\.+|\.+$/g, '').trim()
}

function extractLink(tweet, text) {
  const card = tweet.card ?? tweet.quote?.card
  const articleTitle = tweet.quote?.article?.title?.trim()
  const cardTitle = card?.title?.trim()
  if (card?.url) {
    return { url: card.url, title: cardTitle || articleTitle || undefined }
  }
  if (articleTitle) {
    const fromQuote = firstHttpUrl(tweet.quote?.text ?? '')
    return {
      url: fromQuote || tweet.quote?.url,
      title: articleTitle,
    }
  }
  const fromText = firstHttpUrl(text)
  if (fromText) return { url: fromText, title: cardTitle || undefined }
  const fromQuote = firstHttpUrl(tweet.quote?.text ?? '')
  if (fromQuote) return { url: fromQuote, title: cardTitle || undefined }
  if (tweet.quote?.url) {
    return { url: tweet.quote.url, title: cardTitle || undefined }
  }
  return null
}

function extractImage(tweet) {
  return (
    tweet.card?.image?.url ||
    tweet.quote?.card?.image?.url ||
    tweet.quote?.article?.cover_media?.media_info?.original_img_url ||
    tweet.media?.photos?.[0]?.url ||
    tweet.quote?.media?.photos?.[0]?.url ||
    undefined
  )
}

const posts = []
const seen = new Set()
let cursor
const maxPosts = Number(process.env.MAX_POSTS || 100)

while (posts.length < maxPosts) {
  const params = new URLSearchParams({
    q: SEARCH_QUERY,
    feed: 'latest',
    count: String(Math.min(20, maxPosts - posts.length)),
  })
  if (cursor) params.set('cursor', cursor)

  const response = await fetch(
    `https://api.fxtwitter.com/2/search?${params.toString()}`,
    { headers: { 'user-agent': 'Mozilla/5.0' } },
  )
  if (!response.ok) {
    throw new Error(`FxTwitter failed: ${response.status}`)
  }
  const body = await response.json()
  const results = body.results ?? []
  if (results.length === 0) break

  for (const tweet of results) {
    const id = tweet.id
    const text = (tweet.text ?? '').trim()
    const createdTimestamp = tweet.created_timestamp
    if (!id || !createdTimestamp || seen.has(id)) continue
    if (!/recommended reading/i.test(text)) continue
    seen.add(id)

    const link = extractLink(tweet, text)
    const cleaned = cleanBody(text, link?.url)
    const date = new Date(createdTimestamp * 1000).toISOString()

    posts.push({
      id,
      url: tweet.url ?? `https://x.com/badlogicgames/status/${id}`,
      text,
      title: (link?.title ?? cleaned.slice(0, 120)) || 'Recommended reading',
      excerpt: cleaned,
      body: cleaned,
      date,
      createdTimestamp,
      likes: tweet.likes ?? null,
      retweets: tweet.retweets ?? null,
      quotedTitle:
        tweet.quote?.article?.title ||
        tweet.quote?.card?.title ||
        tweet.quote?.text ||
        null,
      quotedUrl: tweet.quote?.url ?? null,
      linkUrl: link?.url ?? null,
      linkLabel: link?.title ?? null,
      imageUrl: extractImage(tweet) ?? null,
    })
    if (posts.length >= maxPosts) break
  }

  const next = body.cursor?.bottom
  if (!next || next === cursor) break
  cursor = next
}

for (const post of posts) {
  await sql`
    INSERT INTO posts (
      id, url, text, title, excerpt, post_date, created_at,
      created_timestamp, likes, retweets, quoted_title, quoted_url,
      link_url, link_label, image_url, body, ingested_at
    ) VALUES (
      ${post.id},
      ${post.url},
      ${post.text},
      ${post.title},
      ${post.excerpt},
      ${post.date.slice(0, 10)},
      ${post.date},
      ${post.createdTimestamp},
      ${post.likes},
      ${post.retweets},
      ${post.quotedTitle},
      ${post.quotedUrl},
      ${post.linkUrl},
      ${post.linkLabel},
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
}

const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM posts`
console.log(JSON.stringify({ upserted: posts.length, total: count }, null, 2))
