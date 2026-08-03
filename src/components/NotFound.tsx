import { Link } from '@tanstack/react-router'
import { style, useStyles } from 'purse-styles'
import { Button, Flex, Gap, P, text } from 'maui'

const titleClass = text('md', 700, 'highContrast')

export function NotFound({ children }: { children?: React.ReactNode }) {
  const titleClassName = useStyles(titleClass)
  const linkClassName = useStyles(style({ textDecoration: 'none' }))

  return (
    <Flex column gap={4} alignItems="flex-start">
      <h1 className={titleClassName}>Not found</h1>
      {children ? children : <P>The page you are looking for does not exist.</P>}
      <Gap height={2} />
      <Flex row gap={3}>
        <Button onClick={() => window.history.back()}>Go back</Button>
        <Link to="/" className={linkClassName}>
          <Button variant="quiet">Home</Button>
        </Link>
      </Flex>
    </Flex>
  )
}
