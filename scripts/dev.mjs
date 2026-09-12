import { execFileSync, execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

const PORT = 5173
const HOST = '127.0.0.1'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', cwd: root }).trim()
}

function packageVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function buildBadgePlugin() {
  return {
    name: 'core-draw-local-build-badge',
    transformIndexHtml(html) {
      let commit = 'unknown'
      try {
        commit = git(['rev-parse', '--short', 'HEAD'])
      } catch {
        // Keep the page usable even when git metadata is unavailable.
      }
      const version = packageVersion()
      return {
        html,
        tags: [{
          tag: 'div',
          attrs: {
            id: 'core-local-build',
            style: 'position:fixed;right:10px;bottom:8px;z-index:99999;padding:5px 8px;border:1px solid rgba(232,197,140,.28);background:rgba(5,9,13,.84);backdrop-filter:blur(8px);color:#b6c2ca;font:10px monospace;letter-spacing:.6px;pointer-events:none;border-radius:3px',
          },
          children: `LOCAL v${version} · ${commit}`,
          injectTo: 'body',
        }],
      }
    },
  }
}

function freePort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf8',
    })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      const pid = line.trim().split(/\s+/).pop()
      if (pid && pid !== '0' && pid !== String(process.pid)) pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
      } catch {
        /* Already gone. */
      }
    }
  } catch {
    /* Nothing listening. */
  }
}

function healGeneratedLockfile() {
  try {
    const dirtyLines = git(['status', '--porcelain'])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (dirtyLines.length > 0 && dirtyLines.every((line) => line.endsWith('package-lock.json'))) {
      git(['restore', '--', 'package-lock.json'])
      console.log('[core-draw] restored generated package-lock.json drift before sync')
    }
  } catch {
    /* Leave unusual local states untouched. */
  }
}

function npmInstall() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install', '--package-lock=false'], { cwd: root, stdio: 'inherit', shell: true })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`npm install exited ${code}`))
    })
  })
}

let server
let syncing = false
let lastSkipLog = 0

async function startVite() {
  if (server) {
    await server.close()
    server = undefined
  }
  freePort(PORT)
  server = await createServer({
    root,
    plugins: [buildBadgePlugin()],
    server: {
      host: HOST,
      port: PORT,
      strictPort: true,
      headers: { 'Cache-Control': 'no-store' },
    },
  })
  await server.listen()
  server.printUrls()
  console.log(`[core-draw] serving v${packageVersion()} @ ${git(['rev-parse', '--short', 'HEAD'])}`)
  console.log('[core-draw] watching origin/main — GitHub edits will reload this page')
}

async function syncFromOrigin() {
  if (syncing) return
  syncing = true
  try {
    healGeneratedLockfile()
    git(['fetch', 'origin', 'main'])
    const behind = Number(git(['rev-list', '--count', 'HEAD..origin/main']))
    if (!behind) return
    const dirty = git(['status', '--porcelain'])
    if (dirty) {
      if (Date.now() - lastSkipLog > 30_000) {
        console.log(`[core-draw] origin/main is ${behind} commit(s) ahead; skipped because this folder has local changes`)
        lastSkipLog = Date.now()
      }
      return
    }
    const from = git(['rev-parse', '--short', 'HEAD'])
    const pkgBefore = git(['show', 'HEAD:package.json'])
    git(['pull', '--ff-only', 'origin', 'main'])
    const to = git(['rev-parse', '--short', 'HEAD'])
    console.log(`[core-draw] synced ${from} -> ${to}`)
    const pkgAfter = git(['show', 'HEAD:package.json'])
    if (pkgBefore !== pkgAfter) {
      console.log('[core-draw] package.json changed; reinstalling without rewriting package-lock and restarting Vite')
      await npmInstall()
      await startVite()
      return
    }
    server?.ws.send({ type: 'full-reload', path: '*' })
  } catch (error) {
    console.warn('[core-draw] sync skipped:', error instanceof Error ? error.message : error)
  } finally {
    syncing = false
  }
}

await startVite()
await syncFromOrigin()
setInterval(() => {
  void syncFromOrigin()
}, 5000)
