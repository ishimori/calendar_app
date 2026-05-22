// シードスクリプト: design/data.js の 5 ロット (T-01×2, T-02×2, T-03×1) を投入
// 月は 2026 年 5月、day=1..30 が 2026-05-01..2026-05-30 に対応
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { JobDataSchema, type JobData, type StepStatus } from '../src/lib/schemas'

const prisma = new PrismaClient()

const STATUS_COLORS: Record<StepStatus, string> = {
  done: '#22a06b',
  running: '#f5a623',
  planned: '#3b82f6',
  overdue: '#e5484d',
  blocked: '#8b8d98',
}

const STEP_LABELS = {
  A: '前処理',
  B: '塗布',
  C: '露光',
  D: '現像',
  E: '検査出荷',
} as const

function d(day: number): string {
  return `2026-05-${String(day).padStart(2, '0')}`
}

type StepSeed = {
  code: 'A' | 'B' | 'C' | 'D' | 'E'
  status: StepStatus
  start: number
  end: number
  notes?: Array<{ day: number; label: string; color?: string }>
}

type EventSeed = {
  start: number
  end: number
  label: string
  kind: 'milestone' | 'event'
}

type RowSeed = {
  tank: string
  lotId: string
  lotName: string
  owner: string
  priority: '高' | '中' | '低'
  kubun: string
  comment: string
  events: EventSeed[]
  steps: StepSeed[]
}

const rows: RowSeed[] = [
  {
    tank: 'T-01',
    lotId: 'L-2401',
    lotName: 'PR-A12-Lot041',
    owner: '田中',
    priority: '高',
    kubun: '区分1',
    comment: '優先案件 — 顧客緊急対応',
    events: [
      { start: 1, end: 1, label: '着手', kind: 'milestone' },
      { start: 7, end: 7, label: '材料着荷', kind: 'milestone' },
      { start: 14, end: 14, label: '顧客レビュー', kind: 'milestone' },
      { start: 21, end: 21, label: '出荷予定', kind: 'milestone' },
    ],
    steps: [
      { code: 'A', status: 'done', start: 1, end: 5, notes: [
        { day: 1, label: '洗浄' }, { day: 3, label: '乾燥' }, { day: 5, label: '受入検査' },
      ]},
      { code: 'B', status: 'running', start: 6, end: 13, notes: [
        { day: 7, label: '塗布', color: '#fde68a' }, { day: 11, label: 'ベーク' },
      ]},
      { code: 'C', status: 'planned', start: 10, end: 14 },
      { code: 'D', status: 'planned', start: 13, end: 17 },
      { code: 'E', status: 'planned', start: 19, end: 21, notes: [
        { day: 21, label: '出荷' },
      ]},
    ],
  },
  {
    tank: 'T-01',
    lotId: 'L-2402',
    lotName: 'PR-A12-Lot042',
    owner: '田中',
    priority: '中',
    kubun: '区分1',
    comment: '通常進行',
    events: [
      { start: 3, end: 3, label: '着手', kind: 'milestone' },
      { start: 10, end: 12, label: '社内監査', kind: 'event' },
      { start: 23, end: 23, label: '出荷予定', kind: 'milestone' },
    ],
    steps: [
      { code: 'A', status: 'done', start: 3, end: 7 },
      { code: 'B', status: 'running', start: 8, end: 14 },
      { code: 'C', status: 'planned', start: 12, end: 16 },
      { code: 'D', status: 'planned', start: 15, end: 19 },
      { code: 'E', status: 'planned', start: 21, end: 23 },
    ],
  },
  {
    tank: 'T-02',
    lotId: 'L-2403',
    lotName: 'PR-B07-Lot019',
    owner: '佐藤',
    priority: '高',
    kubun: '区分2',
    comment: '遅延対応中',
    events: [
      { start: 5, end: 5, label: '着手', kind: 'milestone' },
      { start: 13, end: 13, label: '工程切替', kind: 'event' },
      { start: 25, end: 25, label: '出荷予定', kind: 'milestone' },
    ],
    steps: [
      { code: 'A', status: 'running', start: 5, end: 9 },
      { code: 'B', status: 'planned', start: 10, end: 16 },
      { code: 'C', status: 'planned', start: 14, end: 18 },
      { code: 'D', status: 'overdue', start: 17, end: 21, notes: [
        { day: 18, label: '現像', color: '#fecaca' }, { day: 20, label: '乾燥' },
      ]},
      { code: 'E', status: 'planned', start: 23, end: 25 },
    ],
  },
  {
    tank: 'T-02',
    lotId: 'L-2404',
    lotName: 'PR-B07-Lot020',
    owner: '佐藤',
    priority: '中',
    kubun: '区分2',
    comment: '通常進行',
    events: [
      { start: 8, end: 8, label: '着手', kind: 'milestone' },
      { start: 28, end: 28, label: '出荷予定', kind: 'milestone' },
    ],
    steps: [
      { code: 'A', status: 'planned', start: 8, end: 12 },
      { code: 'B', status: 'planned', start: 13, end: 19 },
      { code: 'C', status: 'planned', start: 17, end: 21 },
      { code: 'D', status: 'planned', start: 20, end: 24 },
      { code: 'E', status: 'planned', start: 26, end: 28 },
    ],
  },
  {
    tank: 'T-03',
    lotId: 'L-2405',
    lotName: 'PR-C03-Lot008',
    owner: '鈴木',
    priority: '低',
    kubun: '区分3',
    comment: '装置メンテ後',
    events: [
      { start: 11, end: 11, label: '着手', kind: 'milestone' },
      { start: 18, end: 20, label: '装置メンテ', kind: 'event' },
      { start: 30, end: 30, label: '出荷予定', kind: 'milestone' },
    ],
    steps: [
      { code: 'A', status: 'planned', start: 11, end: 15 },
      { code: 'B', status: 'planned', start: 16, end: 22 },
      { code: 'C', status: 'planned', start: 20, end: 24 },
      { code: 'D', status: 'planned', start: 23, end: 27 },
      { code: 'E', status: 'planned', start: 29, end: 30 },
    ],
  },
]

function toJobData(r: RowSeed): JobData {
  return {
    tank: r.tank,
    lotId: r.lotId,
    lotName: r.lotName,
    owner: r.owner,
    priority: r.priority,
    category: r.kubun,
    comment: r.comment,
    events: r.events.map((e) => ({
      id: randomUUID(),
      startDate: d(e.start),
      endDate: d(e.end),
      text: e.label,
      kind: e.kind,
    })),
    steps: r.steps.map((s) => ({
      name: s.code,
      label: STEP_LABELS[s.code],
      status: s.status,
      startDate: d(s.start),
      endDate: d(s.end),
      color: STATUS_COLORS[s.status],
      notes: (s.notes ?? []).map((n) => ({
        id: randomUUID(),
        startDate: d(n.day),
        endDate: d(n.day),
        text: n.label,
        ...(n.color ? { color: n.color } : {}),
      })),
    })),
  }
}

async function main() {
  // 既存データを全削除して投入
  await prisma.job.deleteMany({})

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 1
    const parsed = JobDataSchema.parse(toJobData(rows[i]!))
    await prisma.job.create({
      data: { rowNo, data: JSON.stringify(parsed) },
    })
    console.log(`Seeded rowNo=${rowNo} (${rows[i]!.tank} / ${rows[i]!.lotId})`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
