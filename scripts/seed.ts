// シードスクリプト: 元Excelの行No.1サンプルを投入
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { JobDataSchema, type JobData } from '../src/lib/schemas'

const prisma = new PrismaClient()

const PRESET_BLUE = '#60a5fa'
const PRESET_GREEN = '#34d399'
const PRESET_YELLOW = '#fbbf24'
const PRESET_ORANGE = '#fb923c'
const PRESET_RED = '#f87171'
const PRESET_PURPLE = '#a78bfa'

const sampleRow1: JobData = {
  category: '区分1',
  comment: 'これはコメントです。',
  events: [],
  steps: [
    {
      name: 'A',
      startDate: '2026-06-01',
      endDate: '2026-06-06',
      color: PRESET_BLUE,
      notes: [
        {
          id: randomUUID(),
          startDate: '2026-06-01',
          endDate: '2026-06-03',
          text: '洗浄',
          color: PRESET_YELLOW,
        },
      ],
    },
    { name: 'B', startDate: '2026-06-08', endDate: '2026-06-14', color: PRESET_GREEN, notes: [] },
    { name: 'C', startDate: '2026-06-10', endDate: '2026-06-12', color: PRESET_ORANGE, notes: [] },
    { name: 'D', startDate: '2026-06-13', endDate: '2026-06-15', color: PRESET_PURPLE, notes: [] },
    {
      name: 'E',
      startDate: '2026-06-20',
      endDate: '2026-06-20',
      color: PRESET_RED,
      notes: [
        {
          id: randomUUID(),
          startDate: '2026-06-20',
          endDate: '2026-06-20',
          text: '検査完了\n（複数行可\n色も任意）',
          color: PRESET_ORANGE,
        },
      ],
    },
  ],
}

async function main() {
  const parsed = JobDataSchema.parse(sampleRow1)
  await prisma.job.upsert({
    where: { rowNo: 1 },
    create: { rowNo: 1, data: JSON.stringify(parsed) },
    update: { data: JSON.stringify(parsed) },
  })
  console.log('Seeded rowNo=1')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
