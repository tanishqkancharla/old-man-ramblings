#!/usr/bin/env node
/**
 * Browser CLI backed by libretto-browser-tools.
 *
 * Usage:
 *   npm run browser -- open https://example.com
 *   npm run browser -- snapshot
 *   npm run browser -- exec 'return await page.title()'
 *   npm run browser -- status
 *   npm run browser -- close
 *   npm run browser -- connect <cdpUrl>
 *   npm run browser -- repl
 *
 * One-shot chain:
 *   npm run browser -- open https://example.com --snapshot --exec 'return await page.title()' --close
 *
 * Provider (default: libretto-cloud):
 *   --provider libretto-cloud|local|browserbase|kernel|steel
 *   or LIBRETTO_PROVIDER / BROWSER_CLI_PROVIDER
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBrowserTools } from 'libretto-browser-tools'
import { LocalBrowserProvider } from 'libretto-browser-tools'
import { LibrettoCloudBrowserProvider } from 'libretto-browser-tools/libretto-cloud'
import { BrowserbaseBrowserProvider } from 'libretto-browser-tools/browserbase'
import { KernelBrowserProvider } from 'libretto-browser-tools/kernel'
import { SteelBrowserProvider } from 'libretto-browser-tools/steel'

const here = dirname(fileURLToPath(import.meta.url))
const projectsRoot = resolve(here, '../../..')

loadEnvFiles([
  resolve(process.cwd(), '.env'),
  resolve(projectsRoot, 'my-automations/.env'),
  resolve(projectsRoot, 'old-man-ramblings/.env'),
])

const PROVIDERS = {
  local: () => new LocalBrowserProvider(),
  'libretto-cloud': () => new LibrettoCloudBrowserProvider(),
  browserbase: () => new BrowserbaseBrowserProvider(),
  kernel: () => new KernelBrowserProvider(),
  steel: () => new SteelBrowserProvider(),
}

const HELP = `browser — Libretto browser tools CLI

Commands:
  open [url]              Open a browser session
  snapshot [--screenshot] Print accessibility snapshot
  exec <code>             Run Playwright code (page is in scope)
  status [sessionId]      List sessions / pages
  close [sessionId]       Close a session
  connect <cdpUrl>        Attach to an existing CDP endpoint
  repl                    Interactive prompt (default when no command)

Flags:
  --provider <name>       local | libretto-cloud | browserbase | kernel | steel
  --session <id>          Session id for follow-up commands
  --json                  Print raw JSON results
  --screenshot            Include screenshot on snapshot (base64 omitted unless --json)
  -h, --help              Show help

Examples:
  browser open https://example.com --provider libretto-cloud
  browser snapshot
  browser exec 'return await page.title()'
  browser open https://x.com --snapshot --close
  browser repl
`

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP)
    return
  }

  const { flags, positionals } = parseArgs(argv)
  const providerName =
    flags.provider ||
    process.env.BROWSER_CLI_PROVIDER ||
    process.env.LIBRETTO_PROVIDER ||
    'libretto-cloud'

  if (!(providerName in PROVIDERS)) {
    fail(
      `Unknown provider "${providerName}". Choose: ${Object.keys(PROVIDERS).join(', ')}`,
    )
  }

  const provider = PROVIDERS[providerName]()
  const { tools, dispose } = createBrowserTools(provider)
  const ctx = {
    tools,
    providerName,
    sessionId: flags.session || null,
    json: Boolean(flags.json),
  }

  const shutdown = async () => {
    await dispose()
  }
  process.on('SIGINT', async () => {
    await shutdown()
    process.exit(130)
  })
  process.on('SIGTERM', async () => {
    await shutdown()
    process.exit(143)
  })

  try {
    const command = positionals[0]

    if (!command || command === 'repl') {
      await runRepl(ctx)
      return
    }

    // One-shot / chained flags after the primary command
    await runCommand(ctx, command, positionals.slice(1), flags)

    if (flags.snapshot && command !== 'snapshot') {
      await runCommand(ctx, 'snapshot', [], flags)
    }
    if (flags.exec && command !== 'exec') {
      await runCommand(ctx, 'exec', [flags.exec], flags)
    }

    const chained =
      Boolean(flags.snapshot) || Boolean(flags.exec) || Boolean(flags.close)

    // `open` alone would immediately dispose the session on exit — drop into REPL.
    if (command === 'open' && !chained && ctx.sessionId) {
      await runRepl(ctx)
      return
    }

    if (flags.close && command !== 'close') {
      await runCommand(ctx, 'close', [], flags)
    }
  } finally {
    await shutdown()
  }
}

async function runCommand(ctx, command, args, flags = {}) {
  switch (command) {
    case 'open': {
      const url = args[0]
      const result = await ctx.tools.browser_open.execute(url ? { url } : {})
      printResult(ctx, result)
      if (result.ok) ctx.sessionId = result.sessionId
      return result
    }
    case 'snapshot': {
      const sessionId = requireSession(ctx, args[0])
      const result = await ctx.tools.browser_snapshot.execute({
        sessionId,
        screenshot: Boolean(flags.screenshot),
      })
      if (!result.ok) {
        printResult(ctx, result)
        return result
      }
      if (ctx.json) {
        const payload = { ...result }
        console.log(JSON.stringify(payload, null, 2))
      } else {
        console.log(result.tree)
        if (result.screenshot) {
          console.error(
            `(screenshot ${result.screenshot.mimeType}, ${result.screenshot.base64.length} base64 chars — use --json to dump)`,
          )
        }
      }
      return result
    }
    case 'exec': {
      const sessionId = requireSession(ctx, flags.session)
      const code = args.join(' ').trim()
      if (!code) fail('exec requires Playwright code, e.g. exec \'return await page.title()\'')
      const result = await ctx.tools.browser_exec.execute({ sessionId, code })
      printResult(ctx, result)
      return result
    }
    case 'status': {
      const sessionId = args[0] || ctx.sessionId || undefined
      const result = await ctx.tools.browser_status.execute(
        sessionId ? { sessionId } : {},
      )
      printResult(ctx, result)
      return result
    }
    case 'close': {
      const sessionId = requireSession(ctx, args[0])
      const result = await ctx.tools.browser_close.execute({ sessionId })
      printResult(ctx, result)
      if (result.ok && ctx.sessionId === sessionId) ctx.sessionId = null
      return result
    }
    case 'connect': {
      const cdpUrl = args[0]
      if (!cdpUrl) fail('connect requires a CDP websocket URL')
      const result = await ctx.tools.browser_connect.execute({ cdpUrl })
      printResult(ctx, result)
      if (result.ok) ctx.sessionId = result.sessionId
      return result
    }
    default:
      fail(`Unknown command "${command}". Run with --help.`)
  }
}

async function runRepl(ctx) {
  const rl = createInterface({ input, output, terminal: true })
  console.log(
    `browser repl (${ctx.providerName}) — commands: open, snapshot, exec, status, close, connect, help, exit`,
  )

  try {
    while (true) {
      const prefix = ctx.sessionId ? `browser:${ctx.sessionId}` : 'browser'
      let line
      try {
        line = (await rl.question(`${prefix}> `)).trim()
      } catch {
        break
      }
      if (!line) continue
      if (line === 'exit' || line === 'quit') break
      if (line === 'help' || line === '?') {
        console.log(HELP)
        continue
      }

      const { flags, positionals } = parseArgs(splitArgs(line))
      const command = positionals[0]
      if (!command) continue
      Object.assign(ctx, { json: ctx.json || Boolean(flags.json) })

      try {
        await runCommand(ctx, command, positionals.slice(1), flags)
      } catch (err) {
        console.error(err instanceof Error ? err.message : err)
      }
    }
  } finally {
    rl.close()
  }
}

function requireSession(ctx, override) {
  const sessionId = override || ctx.sessionId
  if (!sessionId) {
    fail('No session. Run `open [url]` first, or pass a session id / --session.')
  }
  return sessionId
}

function printResult(ctx, result) {
  if (ctx.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  if (!result.ok) {
    console.error(`error: ${result.error}`)
    if (result.stderr) console.error(result.stderr)
    process.exitCode = 1
    return
  }

  const { ok: _ok, ...rest } = result
  if ('sessionId' in rest && Object.keys(rest).length === 1) {
    console.log(rest.sessionId)
    return
  }
  if ('tree' in rest) {
    console.log(rest.tree)
    return
  }
  if ('result' in rest) {
    if (rest.stdout) process.stdout.write(rest.stdout)
    if (rest.stderr) process.stderr.write(rest.stderr)
    console.log(
      typeof rest.result === 'string'
        ? rest.result
        : JSON.stringify(rest.result, null, 2),
    )
    if (rest.snapshotDiff) {
      console.error('--- snapshot diff ---')
      console.error(rest.snapshotDiff)
    }
    return
  }
  console.log(JSON.stringify(rest, null, 2))
}

function parseArgs(argv) {
  const flags = {}
  const positionals = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--provider') {
      flags.provider = argv[++i]
    } else if (arg.startsWith('--provider=')) {
      flags.provider = arg.slice('--provider='.length)
    } else if (arg === '--session') {
      flags.session = argv[++i]
    } else if (arg.startsWith('--session=')) {
      flags.session = arg.slice('--session='.length)
    } else if (arg === '--exec') {
      flags.exec = argv[++i]
    } else if (arg.startsWith('--exec=')) {
      flags.exec = arg.slice('--exec='.length)
    } else if (arg === '--exec-file') {
      const file = argv[++i]
      flags.exec = readFileSync(file, 'utf8')
    } else if (arg.startsWith('--exec-file=')) {
      flags.exec = readFileSync(arg.slice('--exec-file='.length), 'utf8')
    } else if (arg === '--json') {
      flags.json = true
    } else if (arg === '--screenshot') {
      flags.screenshot = true
    } else if (arg === '--snapshot') {
      flags.snapshot = true
    } else if (arg === '--close') {
      flags.close = true
    } else if (arg.startsWith('-')) {
      fail(`Unknown flag ${arg}`)
    } else {
      positionals.push(arg)
    }
  }
  return { flags, positionals }
}

/** Minimal shell-ish split that respects single/double quotes. */
function splitArgs(line) {
  const out = []
  let cur = ''
  let quote = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur) out.push(cur)
  return out
}

function loadEnvFiles(paths) {
  for (const filePath of paths) {
    if (!filePath || !existsSync(filePath)) continue
    const text = readFileSync(filePath, 'utf8')
    for (const line of text.split(/\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
