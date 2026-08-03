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
    nitro(),
  ],
})
