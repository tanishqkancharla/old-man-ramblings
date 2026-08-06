import { defineTask } from 'nitro/task'
import { ingestRecommendedReadings } from '../src/lib/ingest'

export default defineTask({
  meta: {
    name: 'ingest',
    description: 'Fetch Mario recommended-reading posts from FxTwitter and upsert into Postgres',
  },
  async run() {
    // Keep under Vercel Hobby ~10s limit: ~2 FxTwitter pages + batched upserts.
    const result = await ingestRecommendedReadings({ maxPosts: 40 })
    return { result }
  },
})
