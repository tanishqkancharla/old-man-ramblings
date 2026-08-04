import { defineTask } from 'nitro/task'
import { sendWeeklyNewsletter } from '../src/lib/newsletter'

export default defineTask({
  meta: {
    name: 'newsletter',
    description: 'Send the weekly recommended readings digest',
  },
  async run() {
    const result = await sendWeeklyNewsletter()
    console.log('newsletter-complete', result)
    return { result }
  },
})
