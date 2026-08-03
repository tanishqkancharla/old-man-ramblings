import { z } from 'zod'
import { workflow, type LibrettoWorkflowContext } from 'libretto'

/**
 * Pulls Mario Zechner's X posts that say "recommended reading", newest first.
 *
 * X's own site requires login for search/timeline. This uses FxTwitter's public
 * search proxy over X GraphQL:
 *   GET https://api.fxtwitter.com/2/search?q=from:badlogicgames+"recommended reading"
 *
 * That returns the actual tweets (id, text, created_at, url) with cursor pagination.
 */

const START_URL = 'https://x.com/badlogicgames'
const SEARCH_QUERY = 'from:badlogicgames "recommended reading"'

const inputSchema = z.object({
  maxPosts: z.number().int().positive().max(500).default(50),
})

const postSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  text: z.string(),
  date: z.string(), // ISO 8601
  createdTimestamp: z.number().int(),
  likes: z.number().int().optional(),
  retweets: z.number().int().optional(),
  quotedTitle: z.string().optional(),
  quotedUrl: z.string().url().optional(),
})

const outputSchema = z.object({
  posts: z.array(postSchema),
})

type FxTweet = {
  id?: string
  url?: string
  text?: string
  created_timestamp?: number
  likes?: number
  retweets?: number
  quote?: {
    url?: string
    text?: string
    article?: { title?: string }
  }
}

type FxSearchPage = {
  code?: number
  results?: FxTweet[]
  cursor?: { top?: string; bottom?: string }
}

export default workflow('mario-recommended-readings', {
  input: inputSchema,
  output: outputSchema,
  startUrl: START_URL,
  handler: async (ctx: LibrettoWorkflowContext, input) => {
    const { page } = ctx
    const maxPosts = input.maxPosts ?? 50

    // Confirm the X entry point loaded; data comes from FxTwitter (Node fetch).
    // Browser-context fetch is patched/blocked on x.com pages.
    await page.waitForTimeout(300)

    const posts: z.infer<typeof postSchema>[] = []
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
        posts.push({
          id,
          url: tweet.url ?? `https://x.com/badlogicgames/status/${id}`,
          text,
          date: new Date(createdTimestamp * 1000).toISOString(),
          createdTimestamp,
          likes: tweet.likes,
          retweets: tweet.retweets,
          quotedTitle:
            tweet.quote?.article?.title || tweet.quote?.text || undefined,
          quotedUrl: tweet.quote?.url,
        })

        if (posts.length >= maxPosts) break
      }

      const next = body.cursor?.bottom
      if (!next || next === cursor) break
      cursor = next
    }

    posts.sort((a, b) => b.createdTimestamp - a.createdTimestamp)

    console.log('recommended-reading-posts', {
      count: posts.length,
      query: SEARCH_QUERY,
      source: 'api.fxtwitter.com/2/search',
    })
    console.log(JSON.stringify({ posts }, null, 2))
    return { posts }
  },
})
