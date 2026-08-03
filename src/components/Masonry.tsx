import { style, useStyles } from 'purse-styles'
import { spacing } from 'maui'
import type { ReactNode } from 'react'

const masonryClass = style({
  columnCount: 1,
  columnGap: spacing.value(12),
  width: '100%',
  '@media (min-width: 640px)': {
    columnCount: 2,
  },
  '@media (min-width: 960px)': {
    columnCount: 3,
  },
})

export function Masonry({ children }: { children: ReactNode }) {
  const className = useStyles(masonryClass)
  return <div className={className}>{children}</div>
}
