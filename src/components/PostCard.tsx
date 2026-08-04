import { animated, useSpring } from '@react-spring/web'
import { style, useStyles } from 'purse-styles'
import {
  background,
  backgroundColor,
  border,
  colors,
  Gap,
  radius,
  shadow,
  shadowVars,
  spacing,
  text,
  Tooltip,
} from 'maui'
import { LinkIcon, XIcon } from '~/components/icons'
import { faviconUrl, type Post } from '~/data/posts'

const cardClass = style(
  background.element,
  shadow.subtle,
  radius.md,
  {
    breakInside: 'avoid',
    display: 'block',
    width: '100%',
    overflow: 'hidden',
    color: 'inherit',
    textDecoration: 'none',
    transition: 'box-shadow 160ms ease, background-color 160ms ease',
    '&:hover': {
      // Lighter than Maui's elementHover (3.5% wash).
      backgroundColor: `color-mix(in oklch, ${colors.gray[12]} 1.5%, ${backgroundColor.element})`,
      boxShadow: shadowVars.medium,
    },
    '&:hover [data-post-actions]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
)

const imageWrapClass = style(border(['bottom'], 'border'), {
  position: 'relative',
  display: 'block',
  width: '100%',
})

const imageClass = style({
  display: 'block',
  width: '100%',
  aspectRatio: '1.91 / 1',
  objectFit: 'cover',
  backgroundColor: backgroundColor.elementHover,
})

const actionsClass = style({
  position: 'absolute',
  right: 8,
  bottom: 8,
  display: 'flex',
  gap: 6,
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 160ms ease',
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
})

const actionButtonClass = style(radius.circle, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  padding: 0,
  border: '1px solid rgba(0, 0, 0, 0.08)',
  color: 'rgba(40, 40, 40, 0.85)',
  background: 'rgba(255, 255, 255, 0.62)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  cursor: 'pointer',
  textDecoration: 'none',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.82)',
  },
})

const bodyClass = style(spacing.padding({ all: 6 }), {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.value(3),
})

const linkRowClass = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  minWidth: 0,
})

const faviconClass = style(radius.sm, {
  width: 14,
  height: 14,
  flexShrink: 0,
  display: 'block',
  objectFit: 'contain',
  // Optical align with the first line of the title.
  marginTop: 3,
})

const linkTitleClass = style(text('sm', 700, 'highContrast'), {
  fontWeight: 700,
  margin: 0,
  minWidth: 0,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})

const tweetClass = style(text('sm', 400, 'lowContrast'), {
  margin: 0,
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})

const tweetAfterTitleClass = style({
  // One spacing step more between title and tweet.
  marginTop: spacing.value(2),
})

const dateClass = text('xs', 500, 'lowContrast')

const contentLinkClass = style({
  color: 'inherit',
  textDecoration: 'none',
  display: 'block',
})

const tooltipUrlClass = style(text('xs', 400, 'highContrast'), {
  display: 'block',
  maxWidth: '22ch',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

export function PostCard({ post }: { post: Post }) {
  const className = useStyles(cardClass)
  const imageWrapClassName = useStyles(imageWrapClass)
  const imageClassName = useStyles(imageClass)
  const actionsClassName = useStyles(actionsClass)
  const actionButtonClassName = useStyles(actionButtonClass)
  const bodyClassName = useStyles(bodyClass)
  const linkRowClassName = useStyles(linkRowClass)
  const faviconClassName = useStyles(faviconClass)
  const linkTitleClassName = useStyles(linkTitleClass)
  const tweetClassName = useStyles(tweetClass)
  const tweetAfterTitleClassName = useStyles(tweetAfterTitleClass)
  const dateClassName = useStyles(dateClass)
  const contentLinkClassName = useStyles(contentLinkClass)
  const tooltipUrlClassName = useStyles(tooltipUrlClass)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Fade in when the card mounts (virtualized items mount as they enter view).
  const springStyle = useSpring({
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    immediate: prefersReducedMotion,
    config: { tension: 280, friction: 28 },
  })

  const articleHref = post.linkUrl ?? post.tweetUrl
  const icon = faviconUrl(post.linkUrl)
  const title = post.linkTitle

  return (
    <animated.article className={className} style={springStyle}>
      {post.imageUrl ? (
        <div className={imageWrapClassName}>
          <a
            className={contentLinkClassName}
            href={articleHref}
            target="_blank"
            rel="noreferrer"
            tabIndex={-1}
            aria-hidden="true"
          >
            <img
              className={imageClassName}
              src={post.imageUrl}
              alt=""
              loading="lazy"
            />
          </a>
          <div className={actionsClassName} data-post-actions>
            <Tooltip
              content={
                <span className={tooltipUrlClassName} title={post.tweetUrl}>
                  {formatTooltipUrl(post.tweetUrl)}
                </span>
              }
              placement="top"
              delay={300}
            >
              <a
                className={actionButtonClassName}
                href={post.tweetUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open Mario's tweet"
                onClick={(event) => event.stopPropagation()}
              >
                <XIcon size={13} />
              </a>
            </Tooltip>
            {post.linkUrl ? (
              <Tooltip
                content={
                  <span className={tooltipUrlClassName} title={post.linkUrl}>
                    {formatTooltipUrl(post.linkUrl)}
                  </span>
                }
                placement="top"
                delay={300}
              >
                <a
                  className={actionButtonClassName}
                  href={post.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open source article"
                  onClick={(event) => event.stopPropagation()}
                >
                  <LinkIcon size={13} />
                </a>
              </Tooltip>
            ) : null}
          </div>
        </div>
      ) : null}
      <a
        className={`${bodyClassName} ${contentLinkClassName}`}
        href={articleHref}
        target="_blank"
        rel="noreferrer"
      >
        {title ? (
          <div className={linkRowClassName}>
            {icon ? (
              <img
                className={faviconClassName}
                src={icon}
                alt=""
                width={14}
                height={14}
              />
            ) : null}
            <p className={linkTitleClassName}>{title}</p>
          </div>
        ) : null}
        {post.body ? (
          <p
            className={
              title
                ? `${tweetClassName} ${tweetAfterTitleClassName}`
                : tweetClassName
            }
          >
            {post.body}
          </p>
        ) : null}
        <Gap height={1} />
        <time className={dateClassName} dateTime={post.date}>
          {post.body
            ? formatDate(post.date)
            : `Recommended ${formatDate(post.date)}.`}
        </time>
      </a>
    </animated.article>
  )
}

function formatTooltipUrl(url: string) {
  try {
    const parsed = new URL(url)
    const path =
      parsed.pathname === '/'
        ? ''
        : parsed.pathname.replace(/\/$/, '') + parsed.search
    return `${parsed.hostname.replace(/^www\./, '')}${path}`
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}
