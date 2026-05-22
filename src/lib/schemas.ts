import { z } from 'zod'

// "YYYY-MM-DD" 形式の日付文字列
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')

// 色: "#RRGGBB" 等の CSS カラー（緩く string で受ける）
const ColorSchema = z.string()

// 工程ステータス
export const StepStatusSchema = z.enum(['done', 'running', 'planned', 'overdue', 'blocked'])
export type StepStatus = z.infer<typeof StepStatusSchema>

// 優先度
export const PrioritySchema = z.enum(['高', '中', '低'])
export type Priority = z.infer<typeof PrioritySchema>

// イベント種別
export const EventKindSchema = z.enum(['milestone', 'event'])
export type EventKind = z.infer<typeof EventKindSchema>

export const NoteSchema = z.object({
  id: z.string(),
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  text: z.string(),
  color: ColorSchema.optional(),
})
export type Note = z.infer<typeof NoteSchema>

export const StepSchema = z.object({
  name: z.string(),
  label: z.string().nullable().default(null),
  status: StepStatusSchema.nullable().default(null),
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  color: ColorSchema.optional(),
  notes: z.array(NoteSchema).default([]),
})
export type Step = z.infer<typeof StepSchema>

export const JobEventSchema = z.object({
  id: z.string(),
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  text: z.string(),
  color: ColorSchema.optional(),
  kind: EventKindSchema.default('event'),
})
export type JobEvent = z.infer<typeof JobEventSchema>

export const JobDataSchema = z.object({
  tank: z.string().nullable().default(null),
  lotId: z.string().nullable().default(null),
  lotName: z.string().nullable().default(null),
  owner: z.string().nullable().default(null),
  priority: PrioritySchema.nullable().default(null),
  category: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
  steps: z.array(StepSchema).default([]),
  events: z.array(JobEventSchema).default([]),
})
export type JobData = z.infer<typeof JobDataSchema>

// API レスポンス用: rowNoとdataを並べたフラットな型
export const JobResponseSchema = z.object({
  rowNo: z.number().int(),
  data: JobDataSchema,
  updatedAt: z.string(),
})
export type JobResponse = z.infer<typeof JobResponseSchema>

// ステータス→表示名・色
export const STEP_STATUS_META: Record<StepStatus, { ja: string; color: string }> = {
  done: { ja: '完了', color: '#22a06b' },
  running: { ja: '進行中', color: '#f5a623' },
  planned: { ja: '計画', color: '#3b82f6' },
  overdue: { ja: '遅延', color: '#e5484d' },
  blocked: { ja: '保留', color: '#8b8d98' },
}

// 工程ラベルマスタ（A〜E）
export const STEP_LABELS: Record<string, string> = {
  A: '前処理',
  B: '塗布',
  C: '露光',
  D: '現像',
  E: '検査出荷',
}
