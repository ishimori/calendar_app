import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { health } from './routes/health'
import { jobs } from './routes/jobs'

export const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors())

app.route('/api/health', health)
app.route('/api/jobs', jobs)
