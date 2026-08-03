import {
  ErrorComponent,
  Link,
  useLocation,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { style, useStyles } from 'purse-styles'
import { Button, Flex } from 'maui'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useLocation({
    select: (location) => location.pathname === '/',
  })
  const linkClassName = useStyles(style({ textDecoration: 'none' }))

  console.error('DefaultCatchBoundary Error:', error)

  return (
    <Flex column gap={6} alignItems="center">
      <ErrorComponent error={error} />
      <Flex row gap={3} alignItems="center">
        <Button onClick={() => router.invalidate()}>Try again</Button>
        {isRoot ? (
          <Link to="/" className={linkClassName}>
            <Button variant="quiet">Home</Button>
          </Link>
        ) : (
          <Button variant="quiet" onClick={() => window.history.back()}>
            Go back
          </Button>
        )}
      </Flex>
    </Flex>
  )
}
