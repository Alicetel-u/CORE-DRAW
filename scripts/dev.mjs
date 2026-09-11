import { execFileSync, execSync, spawn } from 'node:child_process'
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
    const child = spawn('npm', ['install'], { cwd: root, stdio: 'inherit', shell: true })
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
    server: {
      host: HOST,
      port: PORT,
      strictPort: true,
      headers: { 'Cache-Control': 'no-store' },
    },
  })
  await server.listen()
  server.printUrls()
  console.log('[core-draw] watching origin/main — GitHub edits will reload this page')
}

async function syncFromOrigin() {
  if (syncing) return
  syncing = true
  try {
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
      console.log('[core-draw] package.json changed; reinstalling and restarting Vite')
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
