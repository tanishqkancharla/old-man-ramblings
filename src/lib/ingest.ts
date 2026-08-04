import { fetchRecommendedReadings } from '~/lib/fxtwitter'
import { countPosts, listPosts, upsertReadings } from '~/lib/posts-store'

export async function ingestRecommendedReadings(options?: {
  maxPosts?: number
}) {
  const readings = await fetchRecommendedReadings({
    maxPosts: options?.maxPosts ?? 200,
  })
  const upserted = await upsertReadings(readings)
  return {
    fetched: readings.length,
    upserted,
    total: await countPosts(),
  }
}

export async function getHomepagePosts() {
  const existing = await listPosts(200)
  if (existing.length > 0) return existing

  // First deploy / empty DB: seed once from FxTwitter.
  await ingestRecommendedReadings({ maxPosts: 100 })
  return listPosts(200)
}
