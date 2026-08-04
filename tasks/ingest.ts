import { defineTask } from 'nitro/task'
import { ingestRecommendedReadings } from '../src/lib/ingest'

export default defineTask({
  meta: {
    name: 'ingest',
    description: 'Fetch Mario recommended-reading posts from FxTwitter and upsert into Postgres',
  },
  async run() {
    const result = await ingestRecommendedReadings({ maxPosts: 200 })
    console.log('ingest-complete', result)
    return { result }
  },
})
