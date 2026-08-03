# Old Man Ramblings

Recommended readings — ramblings by old man Mario Zechner.

## Develop

```bash
npm install
npm run dev
```

Built with [TanStack Start](https://tanstack.com/start) and [Maui](https://github.com/tanishqkancharla/maui).

## Browser CLI

Thin CLI over [libretto-browser-tools](https://libretto.sh/browser-tools). Defaults to `libretto-cloud` (`LIBRETTO_API_KEY`).

```bash
npm run browser -- --help
npm run browser -- open https://example.com --provider local
```

## Libretto workflow

Pulls Mario’s X posts that say “recommended reading” (newest first) via FxTwitter search over X GraphQL — `from:badlogicgames "recommended reading"`:

```bash
npx libretto run src/workflows/mario-recommended-readings.ts --headless --params '{"maxPosts":20}'
```

This is X tweet search (not the curated site mirror). It depends on [api.fxtwitter.com](https://api.fxtwitter.com) remaining available.
