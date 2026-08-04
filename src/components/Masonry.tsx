import { VirtuosoMasonry, type ItemContent } from '@virtuoso.dev/masonry'
import { useSyncExternalStore } from 'react'
import { style, useStyles } from 'purse-styles'
import { spacing } from 'maui'
import { PostCard } from '~/components/PostCard'
import type { Post } from '~/data/posts'

function getColumnCount() {
  if (typeof window === 'undefined') return 1
  if (window.matchMedia('(min-width: 960px)').matches) return 3
  if (window.matchMedia('(min-width: 640px)').matches) return 2
  return 1
}

function subscribeColumnCount(onChange: () => void) {
  const mq640 = window.matchMedia('(min-width: 640px)')
  const mq960 = window.matchMedia('(min-width: 960px)')
  mq640.addEventListener('change', onChange)
  mq960.addEventListener('change', onChange)
  return () => {
    mq640.removeEventListener('change', onChange)
    mq960.removeEventListener('change', onChange)
  }
}

const itemWrapClass = style({
  paddingBottom: spacing.value(12),
  paddingInline: spacing.value(6),
  boxSizing: 'border-box',
})

const ItemContent: ItemContent<Post> = ({ data }) => {
  const className = useStyles(itemWrapClass)
  return (
    <div className={className}>
      <PostCard post={data} />
    </div>
  )
}

/**
 * Virtualized masonry via @virtuoso.dev/masonry.
 * Only items near the viewport are mounted (lazy rendering).
 */
export function Masonry({ posts }: { posts: Post[] }) {
  const columnCount = useSyncExternalStore(
    subscribeColumnCount,
    getColumnCount,
    () => 1,
  )

  return (
    <VirtuosoMasonry
      data={posts}
      columnCount={columnCount}
      useWindowScroll
      initialItemCount={Math.min(posts.length, 12)}
      ItemContent={ItemContent}
      style={{ width: '100%', marginInline: `-${spacing.value(6)}` }}
    />
  )
}
