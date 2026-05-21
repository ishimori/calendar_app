import type { JobData } from '../../lib/schemas'

export interface JobResponse {
  rowNo: number
  data: JobData
  updatedAt: string
}

export async function fetchJobs(): Promise<JobResponse[]> {
  const res = await fetch('/api/jobs')
  if (!res.ok) throw new Error(`GET /api/jobs ${res.status}`)
  return res.json()
}

export async function putJob(rowNo: number, data: JobData): Promise<JobResponse> {
  const res = await fetch(`/api/jobs/${rowNo}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PUT /api/jobs/${rowNo} ${res.status}`)
  return res.json()
}
