import { z } from 'zod'
import { workflow, type LibrettoWorkflowContext } from 'libretto'
import { fetchRecommendedReadings } from '../lib/fxtwitter'

/**
 * Pulls Mario Zechner's X posts that say "recommended reading", newest first.
 *
 * Production ingest uses the same FxTwitter helper (`src/lib/fxtwitter.ts`)
 * via a daily Nitro/Vercel cron task. This workflow is for local/debug runs.
 */

const START_URL = 'https://x.com/badlogicgames'

const inputSchema = z.object({
  maxPosts: z.number().int().positive().max(500).default(50),
})

const postSchema = z.object({
  id: z.string(),
  tweetUrl: z.string().url(),
  text: z.string(),
  date: z.string(),
  createdTimestamp: z.number().int(),
  likes: z.number().int().optional(),
  retweets: z.number().int().optional(),
  linkUrl: z.string().url().optional(),
  linkTitle: z.string().optional(),
  imageUrl: z.string().url().optional(),
  quotedTitle: z.string().optional(),
  quotedUrl: z.string().url().optional(),
})

const outputSchema = z.object({
  posts: z.array(postSchema),
})

export default workflow('mario-recommended-readings', {
  input: inputSchema,
  output: outputSchema,
  startUrl: START_URL,
  handler: async (ctx: LibrettoWorkflowContext, input) => {
    const { page } = ctx
    await page.waitForTimeout(300)

    const posts = await fetchRecommendedReadings({
      maxPosts: input.maxPosts ?? 50,
    })

    console.log('recommended-reading-posts', {
      count: posts.length,
      source: 'api.fxtwitter.com/2/search',
    })
    console.log(JSON.stringify({ posts }, null, 2))
    return { posts }
  },
})
