/**
 * Generate public/og.png (light) and public/og-dark.png (dark) with Satori,
 * matching homepage intro styles.
 *
 * Maui tokens:
 * - light bg: #ffffff, title: gray.gray12
 * - dark bg: grayDark.gray1 (#111), title: grayDark.gray12
 * - page pad x: spacing 16 → 32px
 * - avatar: 20×20 circle (slightly under page 24)
 * - Gap height 16 → 32px between avatar and title
 * - title: text md (14px), fontWeight ~550
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gray, grayDark } from '@radix-ui/colors'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const WIDTH = 1200
const HEIGHT = 630

const CHROME_SCALE = 4
const TYPE_SCALE = 2.5

const PAD_X = 32 * CHROME_SCALE
const AVATAR = 20 * CHROME_SCALE
const GAP = 32 * TYPE_SCALE
const TITLE_SIZE = 14 * TYPE_SCALE
const TITLE_LINE = 22 * TYPE_SCALE
const CONTENT_HEIGHT = AVATAR + GAP + TITLE_LINE
const PAD_TOP = Math.round((HEIGHT - CONTENT_HEIGHT) / 2)

const THEMES = {
  light: {
    out: path.join(root, 'public', 'og.png'),
    bg: '#ffffff',
    titleColor: gray.gray12,
  },
  dark: {
    out: path.join(root, 'public', 'og-dark.png'),
    bg: grayDark.gray1,
    titleColor: grayDark.gray12,
  },
}

const MARIO_AVATAR =
  'https://pbs.twimg.com/profile_images/1553485821767991296/87k3l720_400x400.jpg'

async function loadFont() {
  return readFile(
    path.join(
      root,
      'node_modules/@fontsource/inter/files/inter-latin-500-normal.woff',
    ),
  )
}

async function loadAvatarDataUrl() {
  const res = await fetch(MARIO_AVATAR, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`Failed to fetch avatar (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

async function renderTheme(theme, fontData, avatarSrc) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          backgroundColor: theme.bg,
          paddingTop: PAD_TOP,
          paddingLeft: PAD_X,
          paddingRight: PAD_X,
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'img',
            props: {
              src: avatarSrc,
              width: AVATAR,
              height: AVATAR,
              style: {
                width: AVATAR,
                height: AVATAR,
                borderRadius: AVATAR / 2,
                objectFit: 'cover',
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                marginTop: GAP,
                fontSize: TITLE_SIZE,
                lineHeight: `${TITLE_LINE}px`,
                fontWeight: 500,
                color: theme.titleColor,
                letterSpacing: '-0.01em',
              },
              children: 'Recommended Readings',
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 500,
          style: 'normal',
        },
      ],
    },
  )

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
  })
    .render()
    .asPng()

  await writeFile(theme.out, png)
  return { out: theme.out, bytes: png.byteLength, bg: theme.bg, titleColor: theme.titleColor }
}

const fontData = await loadFont()
const avatarSrc = await loadAvatarDataUrl()

const results = []
for (const theme of Object.values(THEMES)) {
  results.push(await renderTheme(theme, fontData, avatarSrc))
}

console.log(
  JSON.stringify(
    {
      results,
      layout: { PAD_X, PAD_TOP, AVATAR, GAP, TITLE_SIZE },
    },
    null,
    2,
  ),
)
