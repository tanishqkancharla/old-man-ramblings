import { animated, useSpring } from '@react-spring/web'
import { style, useStyles } from 'purse-styles'
import {
  background,
  backgroundColor,
  Flex,
  Gap,
  radius,
  shadow,
  spacing,
  text,
} from 'maui'
import type { Post } from '~/data/posts'

const cardClass = style(
  background.element,
  shadow.subtle,
  radius.md,
  spacing.padding({ all: 6 }),
  {
    breakInside: 'avoid',
    marginBottom: spacing.value(12),
    display: 'block',
    width: '100%',
    '&:hover': {
      backgroundColor: backgroundColor.elementHover,
    },
  },
)

const titleClass = style(text('md', 500, 'highContrast'), {
  fontWeight: 550,
})
const excerptClass = text('sm', 400, 'lowContrast')
const dateClass = text('xs', 500, 'lowContrast')

export function PostCard({ post, index }: { post: Post; index: number }) {
  const className = useStyles(cardClass)
  const titleClassName = useStyles(titleClass)
  const excerptClassName = useStyles(excerptClass)
  const dateClassName = useStyles(dateClass)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const springStyle = useSpring({
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: prefersReducedMotion ? 0 : index * 70,
    immediate: prefersReducedMotion,
    config: { tension: 280, friction: 28 },
  })

  return (
    <animated.article className={className} style={springStyle}>
      <Flex column gap={3}>
        <h3 className={titleClassName}>{post.title}</h3>
        <p className={excerptClassName}>{post.excerpt}</p>
        <Gap height={1} />
        <time className={dateClassName} dateTime={post.date}>
          Recommended {formatDate(post.date)}
        </time>
      </Flex>
    </animated.article>
  )
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}
