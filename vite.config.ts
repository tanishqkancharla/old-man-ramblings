import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom', 'purse-styles'],
    alias: {
      // Maui imports lodash named exports; CJS lodash breaks Vite SSR.
      lodash: path.resolve(rootDir, 'node_modules/lodash-es'),
    },
  },
  ssr: {
    // Maui ships extensionless ESM relative imports; Vite must bundle them for SSR.
    noExternal: ['maui', 'purse-styles', 'lodash', 'lodash-es'],
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    nitro({
      experimental: {
        tasks: true,
      },
      scanDirs: [rootDir],
      tasks: {
        ingest: {
          description:
            'Fetch Mario recommended-reading posts from FxTwitter and upsert into Postgres',
          handler: path.join(rootDir, 'tasks/ingest.ts'),
        },
        newsletter: {
          description: 'Send the weekly recommended readings digest',
          handler: path.join(rootDir, 'tasks/newsletter.ts'),
        },
      },
      scheduledTasks: {
        // Every 6 hours — small catch-up fetch (see tasks/ingest.ts).
        '0 */6 * * *': 'ingest',
        // Newsletter UI is paused; keep task + DB. Re-enable when frontend ships.
        // '0 14 * * 1': 'newsletter',
      },
    } as any),
  ],
})
