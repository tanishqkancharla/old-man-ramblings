import { fetchRecommendedReadings } from '~/lib/fxtwitter'
import {
  countPosts,
  getLatestIngestedAt,
  listPosts,
  upsertReadings,
} from '~/lib/posts-store'

/** Keep cron / catch-up fetches small enough for Hobby serverless timeouts. */
const CATCH_UP_MAX_POSTS = 40
const STALE_AFTER_MS = 6 * 60 * 60 * 1000

export async function ingestRecommendedReadings(options?: {
  maxPosts?: number
}) {
  const started = Date.now()
  const readings = await fetchRecommendedReadings({
    maxPosts: options?.maxPosts ?? CATCH_UP_MAX_POSTS,
  })
  const upserted = await upsertReadings(readings)
  const result = {
    fetched: readings.length,
    upserted,
    total: await countPosts(),
    ms: Date.now() - started,
  }
  console.log('ingest-complete', result)
  return result
}

export async function getHomepagePosts() {
  const existing = await listPosts(200)
  if (existing.length === 0) {
    // First deploy / empty DB: seed once from FxTwitter.
    await ingestRecommendedReadings({ maxPosts: 100 })
    return listPosts(200)
  }

  // Backup for missed crons: if we haven't written in STALE_AFTER_MS, catch up.
  const lastIngestMs = await getLatestIngestedAt()
  if (
    lastIngestMs != null &&
    Date.now() - lastIngestMs > STALE_AFTER_MS
  ) {
    try {
      await ingestRecommendedReadings({ maxPosts: CATCH_UP_MAX_POSTS })
      return listPosts(200)
    } catch (error) {
      console.error('stale-ingest-failed', error)
    }
  }

  return existing
}
