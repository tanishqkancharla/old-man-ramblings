import { createFileRoute } from '@tanstack/react-router'
import { style, useStyles } from 'purse-styles'
import { Flex, Gap, colors, radius, text } from 'maui'
import { Masonry } from '~/components/Masonry'
import { getPostsFn } from '~/server/posts'

export const Route = createFileRoute('/')({
  loader: () => getPostsFn(),
  component: Home,
})

const MARIO_X = 'https://x.com/badlogicgames'
const MARIO_AVATAR =
  'https://pbs.twimg.com/profile_images/1553485821767991296/87k3l720_200x200.jpg'
const REPO_URL = 'https://github.com/tanishqkancharla/old-man-ramblings'

const headerClass = style({
  paddingTop: 72,
})

const avatarClass = style(radius.circle, {
  width: 24,
  height: 24,
  objectFit: 'cover',
  display: 'block',
})

const titleClass = style(text('md', 500, 'highContrast'), {
  fontWeight: 550,
})

const subtitleClass = text('md', 400, 'highContrast')

const nameLinkClass = style(text('md', 400, 'highContrast'), {
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  color: 'inherit',
  transition: 'color 120ms ease',
  '&:hover': {
    color: colors.accent[11],
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
})

const masonryGapClass = style({
  height: 80,
  flexShrink: 0,
})

const pageClass = style({
  maxWidth: 1080,
  marginInline: 'auto',
  width: '100%',
})

const introClass = style({
  maxWidth: '72ch',
  width: '100%',
  marginInline: 'auto',
})

function Home() {
  const posts = Route.useLoaderData()

  const headerClassName = useStyles(headerClass)
  const avatarClassName = useStyles(avatarClass)
  const titleClassName = useStyles(titleClass)
  const subtitleClassName = useStyles(subtitleClass)
  const nameLinkClassName = useStyles(nameLinkClass)
  const masonryGapClassName = useStyles(masonryGapClass)
  const pageClassName = useStyles(pageClass)
  const introClassName = useStyles(introClass)

  return (
    <div className={pageClassName}>
      <Flex column>
        <div className={introClassName}>
          <div className={headerClassName}>
            <a href={MARIO_X} target="_blank" rel="noreferrer">
              <img
                className={avatarClassName}
                src={MARIO_AVATAR}
                alt="Mario Zechner"
                width={24}
                height={24}
              />
            </a>
          </div>
          <Gap height={16} />
          <h1 className={titleClassName}>Recommended Readings</h1>
          <Gap height={12} />
          <p className={subtitleClassName}>
            Ramblings by old man{' '}
            <a
              className={nameLinkClassName}
              href={MARIO_X}
              target="_blank"
              rel="noreferrer"
            >
              Mario Zechner
            </a>
            . Updated daily from his X profile.{' '}
            <a
              className={nameLinkClassName}
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
            >
              Github
            </a>
            .
          </p>
        </div>
        <div className={masonryGapClassName} />
        <Masonry posts={posts} />
      </Flex>
    </div>
  )
}
