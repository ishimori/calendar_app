import { z } from 'zod'

// "YYYY-MM-DD" 形式の日付文字列
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')

// 色: "#RRGGBB" 等の CSS カラー（緩く string で受ける）
const ColorSchema = z.string()

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
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  color: ColorSchema.optional(),
  notes: z.array(NoteSchema).default([]),
})
export type Step = z.infer<typeof StepSchema>

export const JobDataSchema = z.object({
  category: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
  steps: z.array(StepSchema).default([]),
})
export type JobData = z.infer<typeof JobDataSchema>

// API レスポンス用: rowNoとdataを並べたフラットな型
export const JobResponseSchema = z.object({
  rowNo: z.number().int(),
  data: JobDataSchema,
  updatedAt: z.string(),
})
export type JobResponse = z.infer<typeof JobResponseSchema>
