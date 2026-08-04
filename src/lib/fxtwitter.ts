import type { RecommendedReading } from '~/data/posts'

const SEARCH_QUERY = 'from:badlogicgames "recommended reading"'

type FxImage = {
  url?: string
  width?: number
  height?: number
}

type FxCard = {
  url?: string
  title?: string
  description?: string
  domain?: string
  image?: FxImage
}

type FxArticle = {
  title?: string
  preview_text?: string
  cover_media?: {
    media_info?: {
      original_img_url?: string
    }
  }
}

type FxMedia = {
  photos?: Array<{ url?: string }>
  videos?: Array<{ thumbnail_url?: string }>
}

type FxTweet = {
  id?: string
  url?: string
  text?: string
  created_timestamp?: number
  likes?: number
  retweets?: number
  card?: FxCard
  media?: FxMedia
  quote?: {
    url?: string
    text?: string
    card?: FxCard
    article?: FxArticle
    media?: FxMedia
  }
}

type FxSearchPage = {
  code?: number
  results?: FxTweet[]
  cursor?: { top?: string; bottom?: string }
}

export async function fetchRecommendedReadings(options?: {
  maxPosts?: number
}): Promise<RecommendedReading[]> {
  const maxPosts = options?.maxPosts ?? 200
  const posts: RecommendedReading[] = []
  const seen = new Set<string>()
  let cursor: string | undefined

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
      throw new Error(
        `FxTwitter search failed (${response.status}): ${(await response.text()).slice(0, 200)}`,
      )
    }

    const body = (await response.json()) as FxSearchPage
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
      posts.push({
        id,
        tweetUrl: tweet.url ?? `https://x.com/badlogicgames/status/${id}`,
        text,
        date: new Date(createdTimestamp * 1000).toISOString(),
        createdTimestamp,
        likes: tweet.likes,
        retweets: tweet.retweets,
        linkUrl: link?.url,
        linkTitle: link?.title,
        imageUrl: extractImage(tweet),
        quotedTitle:
          tweet.quote?.article?.title ||
          tweet.quote?.card?.title ||
          tweet.quote?.text ||
          undefined,
        quotedUrl: tweet.quote?.url,
      })

      if (posts.length >= maxPosts) break
    }

    const next = body.cursor?.bottom
    if (!next || next === cursor) break
    cursor = next
  }

  posts.sort((a, b) => b.createdTimestamp - a.createdTimestamp)
  return posts
}

function extractLink(tweet: FxTweet, text: string) {
  const card = tweet.card ?? tweet.quote?.card
  const articleTitle = tweet.quote?.article?.title?.trim()
  const cardTitle = card?.title?.trim()
  const quoteTitle = firstQuoteLineTitle(tweet.quote?.text)
  const title = cardTitle || articleTitle || quoteTitle || undefined

  if (card?.url) {
    return { url: card.url, title }
  }

  if (articleTitle) {
    const fromQuote = firstHttpUrl(tweet.quote?.text ?? '')
    return {
      url: fromQuote || tweet.quote?.url,
      title: articleTitle,
    }
  }

  const fromText = firstHttpUrl(text)
  if (fromText) {
    return { url: fromText, title }
  }

  const fromQuote = firstHttpUrl(tweet.quote?.text ?? '')
  if (fromQuote) {
    return { url: fromQuote, title }
  }

  if (tweet.quote?.url) {
    return { url: tweet.quote.url, title }
  }

  return null
}

function extractImage(tweet: FxTweet) {
  return (
    tweet.card?.image?.url ||
    tweet.quote?.card?.image?.url ||
    tweet.quote?.article?.cover_media?.media_info?.original_img_url ||
    tweet.media?.photos?.[0]?.url ||
    tweet.quote?.media?.photos?.[0]?.url ||
    tweet.media?.videos?.[0]?.thumbnail_url ||
    tweet.quote?.media?.videos?.[0]?.thumbnail_url ||
    undefined
  )
}

/** First non-URL line of a quote tweet — often the article title when card is thin. */
function firstQuoteLineTitle(quoteText?: string) {
  const line = (quoteText ?? '')
    .split('\n')
    .map((part) => part.trim())
    .find((part) => part.length > 0 && !/^https?:\/\//i.test(part))
  return line || undefined
}

function firstHttpUrl(text: string) {
  return text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[).,;]+$/, '')
}
