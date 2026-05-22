import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { JobDataSchema } from '../lib/schemas'

export const jobs = new Hono()

// 全件取得
jobs.get('/', async (c) => {
  const rows = await prisma.job.findMany({ orderBy: { rowNo: 'asc' } })
  const out = rows.map((row) => ({
    rowNo: row.rowNo,
    data: JobDataSchema.parse(JSON.parse(row.data)),
    updatedAt: row.updatedAt.toISOString(),
  }))
  return c.json(out)
})

// 1件取得
jobs.get('/:rowNo', async (c) => {
  const rowNo = Number(c.req.param('rowNo'))
  if (!Number.isInteger(rowNo) || rowNo < 1) {
    return c.json({ error: 'invalid rowNo' }, 400)
  }
  const row = await prisma.job.findUnique({ where: { rowNo } })
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json({
    rowNo: row.rowNo,
    data: JobDataSchema.parse(JSON.parse(row.data)),
    updatedAt: row.updatedAt.toISOString(),
  })
})

// 削除 (存在しなくても 204)
jobs.delete('/:rowNo', async (c) => {
  const rowNo = Number(c.req.param('rowNo'))
  if (!Number.isInteger(rowNo) || rowNo < 1) {
    return c.json({ error: 'invalid rowNo' }, 400)
  }
  await prisma.job.deleteMany({ where: { rowNo } })
  return c.body(null, 204)
})

// 作成 or 更新 (upsert)
jobs.put('/:rowNo', async (c) => {
  const rowNo = Number(c.req.param('rowNo'))
  if (!Number.isInteger(rowNo) || rowNo < 1) {
    return c.json({ error: 'invalid rowNo' }, 400)
  }
  const body = await c.req.json().catch(() => null)
  const parsed = JobDataSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'invalid body', details: parsed.error.flatten() }, 400)
  }
  const json = JSON.stringify(parsed.data)
  const row = await prisma.job.upsert({
    where: { rowNo },
    create: { rowNo, data: json },
    update: { data: json },
  })
  return c.json({
    rowNo: row.rowNo,
    data: parsed.data,
    updatedAt: row.updatedAt.toISOString(),
  })
})
