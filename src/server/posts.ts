import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getHomepagePosts } from '~/lib/ingest'
import { subscribeEmail } from '~/lib/subscribers'

export const getPostsFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getHomepagePosts()
})

// Kept for the newsletter frontend (subscribe UI paused for now).
export const subscribeFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      email: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    return subscribeEmail(data.email)
  })
