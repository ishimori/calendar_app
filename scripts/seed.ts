// シードスクリプト: 元Excelの行No.1サンプルを投入
import { PrismaClient } from '@prisma/client'
import { JobDataSchema, type JobData } from '../src/lib/schemas'

const prisma = new PrismaClient()

const sampleRow1: JobData = {
  category: '区分1',
  comment: 'これはコメントです。',
  steps: [
    {
      name: 'A',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      dailyNotes: {
        '2026-06-01': '洗浄',
        '2026-06-02': '洗浄',
        '2026-06-03': '洗浄',
      },
    },
    { name: 'B', startDate: '2026-06-05', endDate: '2026-06-08', dailyNotes: {} },
    { name: 'C', startDate: '2026-06-10', endDate: '2026-06-12', dailyNotes: {} },
    { name: 'D', startDate: '2026-06-13', endDate: '2026-06-15', dailyNotes: {} },
    { name: 'E', startDate: '2026-06-20', endDate: '2026-06-20', dailyNotes: {} },
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
