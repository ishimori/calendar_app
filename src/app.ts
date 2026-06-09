import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { health } from './routes/health'
import { jobs } from './routes/jobs'

export const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors())

app.route('/api/health', health)
app.route('/api/jobs', jobs)

// 本番: vite build 成果物(dist/client)を配信する。
// 開発時(npm run dev:all)は Vite(:5198) が FE を配信し /api だけ BE に proxy するため、
// 以下は本番のみ実効。dist/client が無い dev では単に未マッチで素通りする。
app.use('/*', serveStatic({ root: './dist/client' }))
// SPA フォールバック: ファイルに該当しない GET は index.html を返す
app.get('*', serveStatic({ path: './dist/client/index.html' }))
