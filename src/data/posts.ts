export type Post = {
  id: string
  /** Mario's X status URL */
  tweetUrl: string
  /** External recommended URL (card / quote / link in tweet) */
  linkUrl: string | null
  /** OG / card title for the link row */
  linkTitle: string | null
  /** Open Graph / card / article cover image */
  imageUrl: string | null
  /** Tweet body with "recommended reading" and link URLs stripped */
  body: string
  date: string // YYYY-MM-DD
  createdAt: string // ISO 8601
}

export type RecommendedReading = {
  id: string
  tweetUrl: string
  text: string
  date: string // ISO 8601
  createdTimestamp: number
  likes?: number
  retweets?: number
  linkUrl?: string
  linkTitle?: string
  imageUrl?: string
  quotedTitle?: string
  quotedUrl?: string
}

export function toPost(reading: RecommendedReading): Post {
  return {
    id: reading.id,
    tweetUrl: reading.tweetUrl,
    linkUrl: reading.linkUrl ?? null,
    linkTitle: reading.linkTitle?.trim() || null,
    imageUrl: reading.imageUrl ?? null,
    body: cleanTweetBody(reading.text, reading.linkUrl),
    date: reading.date.slice(0, 10),
    createdAt: reading.date,
  }
}

export function cleanTweetBody(text: string, linkUrl?: string | null) {
  let body = text
  // Consume trailing periods so "recommended reading." doesn't leave a lone "."
  body = body.replace(/\brecommended reading\.*/gi, '')
  if (linkUrl) {
    body = body.replaceAll(linkUrl, '')
    try {
      const parsed = new URL(linkUrl)
      body = body.replaceAll(parsed.href, '')
      body = body.replaceAll(parsed.href.replace(/\/$/, ''), '')
    } catch {
      // ignore invalid URLs
    }
  }
  body = body.replace(/https?:\/\/\S+/gi, '')
  body = body.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  body = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[\s.,;:!?\-–—…]+$/.test(line))
    .join('\n')
  // Trim leftover leading/trailing punctuation from the summary
  // (e.g. ", great piece" after stripping "recommended reading").
  return body
    .trim()
    .replace(/^[\s.,;:!?\-–—…]+/, '')
    .replace(/[.\s]+$/, '')
    .trim()
}

export function faviconUrl(linkUrl: string | null | undefined) {
  if (!linkUrl) return null
  try {
    const host = new URL(linkUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`
  } catch {
    return null
  }
}
