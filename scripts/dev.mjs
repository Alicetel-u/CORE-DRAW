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

function currentCommit() {
  try {
    return git(['rev-parse', '--short', 'HEAD'])
  } catch {
    return 'unknown'
  }
}

function currentRemote() {
  try {
    return git(['remote', 'get-url', 'origin'])
  } catch {
    return 'unknown'
  }
}

function buildBadgePlugin() {
  return {
    name: 'core-draw-local-build-badge',
    configureServer(viteServer) {
      viteServer.middlewares.use('/__core_status', (_req, res) => {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store, max-age=0')
        res.end(JSON.stringify({
          app: 'CORE-DRAW',
          version: packageVersion(),
          commit: currentCommit(),
          root,
          remote: currentRemote(),
          dirty: (() => {
            try { return Boolean(git(['status', '--porcelain'])) } catch { return null }
          })(),
          servedAt: new Date().toISOString(),
        }, null, 2))
      })
    },
    transformIndexHtml(html) {
      const commit = currentCommit()
      const version = packageVersion()
      return {
        html,
        tags: [{
          tag: 'div',
          attrs: {
            id: 'core-local-build',
            style: 'position:fixed;right:10px;bottom:8px;z-index:99999;padding:5px 8px;border:1px solid rgba(255,255,255,.42);background:rgba(3,19,77,.9);color:#fff;font:11px monospace;letter-spacing:.5px;pointer-events:none;border-radius:3px',
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

function npmInstall() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install', '--package-lock=false'], { cwd: root, stdio: 'inherit', shell: true })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`npm install exited ${code}`))
    })
  })
}

function preserveLocalWorkBeforeSync() {
  const dirty = git(['status', '--porcelain'])
  if (dirty) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    git(['stash', 'push', '-u', '-m', `CORE-DRAW auto-backup ${stamp}`])
    console.log('[core-draw] local file changes were stashed before latest sync')
  }

  const ahead = Number(git(['rev-list', '--count', 'origin/main..HEAD']))
  if (ahead > 0) {
    const branch = `core-local-backup-${Date.now()}`
    git(['branch', branch, 'HEAD'])
    console.log(`[core-draw] preserved ${ahead} local commit(s) on ${branch}`)
  }
}

let server
let syncing = false

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
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
  })
  await server.listen()
  server.printUrls()
  console.log(`[core-draw] serving v${packageVersion()} @ ${currentCommit()}`)
  console.log(`[core-draw] status: http://${HOST}:${PORT}/__core_status`)
  console.log('[core-draw] watching origin/main — remote edits auto-backup local work, sync, and reload')
}

async function syncFromOrigin() {
  if (syncing) return
  syncing = true
  try {
    git(['fetch', 'origin', 'main'])
    const behind = Number(git(['rev-list', '--count', 'HEAD..origin/main']))
    if (!behind) return

    const from = currentCommit()
    const pkgBefore = git(['show', 'HEAD:package.json'])

    preserveLocalWorkBeforeSync()
    git(['reset', '--hard', 'origin/main'])

    const to = currentCommit()
    const pkgAfter = git(['show', 'HEAD:package.json'])
    console.log(`[core-draw] synced ${from} -> ${to} (${behind} remote commit(s))`)

    if (pkgBefore !== pkgAfter) {
      console.log('[core-draw] package.json changed; reinstalling and restarting Vite')
      await npmInstall()
      await startVite()
      return
    }

    server?.ws.send({ type: 'full-reload', path: '*' })
  } catch (error) {
    console.warn('[core-draw] sync failed:', error instanceof Error ? error.message : error)
  } finally {
    syncing = false
  }
}

await startVite()
await syncFromOrigin()
setInterval(() => {
  void syncFromOrigin()
}, 3000)
