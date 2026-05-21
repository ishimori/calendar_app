import { z } from 'zod'

// "YYYY-MM-DD" 形式の日付文字列
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')

export const StepSchema = z.object({
  name: z.string(), // "A" / "B" / "工程A" など
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  dailyNotes: z.record(DateStringSchema, z.string()).default({}),
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
