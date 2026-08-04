import { Resend } from 'resend'
import type { Post } from '~/data/posts'
import { ensureSchema, getSql } from '~/lib/db'
import { listPostsSince } from '~/lib/posts-store'
import { listActiveSubscribers } from '~/lib/subscribers'

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function getNewsletterWindow(now = new Date()) {
  const weekEnd = startOfUtcDay(now)
  const weekStart = new Date(weekEnd)
  weekStart.setUTCDate(weekStart.getUTCDate() - 7)
  return {
    weekStart,
    weekEnd,
    weekStartIso: weekStart.toISOString(),
    weekEndIso: weekEnd.toISOString(),
    weekStartDay: formatDay(weekStart),
    weekEndDay: formatDay(weekEnd),
    sendId: `${formatDay(weekStart)}_${formatDay(weekEnd)}`,
  }
}

export function renderNewsletterHtml(posts: Post[], windowLabel: string) {
  const items =
    posts.length === 0
      ? `<p style="margin:0 0 16px;color:#444;">No new recommended readings this week.</p>`
      : posts
          .map(
            (post) => `
              <tr>
                <td style="padding:0 0 20px;">
                  <a href="${escapeHtml(post.linkUrl ?? post.tweetUrl)}" style="color:#111;text-decoration:underline;font-weight:600;">
                    ${escapeHtml(post.linkTitle ?? (post.body || 'Recommended reading'))}
                  </a>
                  ${
                    post.body
                      ? `<div style="margin-top:6px;color:#555;font-size:14px;line-height:1.5;">
                    ${escapeHtml(post.body)}
                  </div>`
                      : ''
                  }
                  <div style="margin-top:8px;color:#888;font-size:12px;">
                    ${escapeHtml(post.date)}
                  </div>
                </td>
              </tr>
            `,
          )
          .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f7f7f5;font-family:Georgia, 'Times New Roman', serif;color:#111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;padding:28px;">
      <tr>
        <td>
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;">Recommended Readings</h1>
          <p style="margin:0 0 24px;color:#555;font-size:14px;">Weekly digest · ${escapeHtml(windowLabel)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${items}
          </table>
          <p style="margin:24px 0 0;color:#888;font-size:12px;line-height:1.5;">
            Curated from Mario Zechner’s X posts. Maintained at
            <a href="https://recommendedreadings.com" style="color:#555;">recommendedreadings.com</a>.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export async function sendWeeklyNewsletter(now = new Date()) {
  const window = getNewsletterWindow(now)
  await ensureSchema()
  const db = getSql()

  const already = (await db`
    SELECT id FROM newsletter_sends WHERE id = ${window.sendId} LIMIT 1
  `) as Array<{ id: string }>
  if (already.length > 0) {
    return {
      skipped: true as const,
      reason: 'already-sent',
      sendId: window.sendId,
    }
  }

  const posts = await listPostsSince(window.weekStartIso)
  const subscribers = await listActiveSubscribers()
  const windowLabel = `${window.weekStartDay} → ${window.weekEndDay}`
  const html = renderNewsletterHtml(posts, windowLabel)
  const subject = `Recommended Readings · ${window.weekStartDay}`

  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.NEWSLETTER_FROM ??
    'Recommended Readings <onboarding@resend.dev>'

  if (!apiKey) {
    return {
      skipped: true as const,
      reason: 'missing-resend-api-key',
      sendId: window.sendId,
      postCount: posts.length,
      recipientCount: subscribers.length,
    }
  }

  if (subscribers.length === 0) {
    await db`
      INSERT INTO newsletter_sends (id, week_start, week_end, post_count, recipient_count)
      VALUES (${window.sendId}, ${window.weekStartDay}, ${window.weekEndDay}, ${posts.length}, 0)
    `
    return {
      skipped: true as const,
      reason: 'no-subscribers',
      sendId: window.sendId,
      postCount: posts.length,
      recipientCount: 0,
    }
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.batch.send(
    subscribers.map((email) => ({
      from,
      to: email,
      subject,
      html,
    })),
  )

  if (error) {
    throw new Error(`Resend batch send failed: ${error.message}`)
  }

  await db`
    INSERT INTO newsletter_sends (id, week_start, week_end, post_count, recipient_count)
    VALUES (
      ${window.sendId},
      ${window.weekStartDay},
      ${window.weekEndDay},
      ${posts.length},
      ${subscribers.length}
    )
  `

  return {
    skipped: false as const,
    sendId: window.sendId,
    postCount: posts.length,
    recipientCount: subscribers.length,
  }
}
