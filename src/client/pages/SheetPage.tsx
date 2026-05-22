import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteJob, fetchJobs, putJob, type JobResponse } from '../lib/api'
import type { JobData, Step } from '../../lib/schemas'
import { parseRangeLabel, rangeLabel } from '../lib/dateUtils'

const TOTAL_ROWS = 10
const STEP_NAMES = ['A', 'B', 'C', 'D', 'E'] as const

function emptyData(): JobData {
  return { category: null, comment: null, steps: [], events: [] }
}

function isEmpty(data: JobData): boolean {
  return !data.category && !data.comment && data.steps.length === 0
}

function newId(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)
}

function getStep(data: JobData, name: string): Step | undefined {
  return data.steps.find((s) => s.name === name)
}

function setStep(data: JobData, name: string, range: { start: string; end: string } | null): JobData {
  const others = data.steps.filter((s) => s.name !== name)
  if (range === null) return { ...data, steps: others }
  const existing = data.steps.find((s) => s.name === name)
  const next: Step = {
    name,
    startDate: range.start,
    endDate: range.end,
    notes: existing?.notes ?? [],
    ...(existing?.color ? { color: existing.color } : {}),
  }
  return { ...data, steps: [...others, next].sort((a, b) => a.name.localeCompare(b.name)) }
}

export function SheetPage() {
  const qc = useQueryClient()
  const { data: jobs, isLoading, isError, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  })

  const mutation = useMutation({
    mutationFn: ({ rowNo, data }: { rowNo: number; data: JobData }) => putJob(rowNo, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (rowNo: number) => deleteJob(rowNo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  if (isLoading) return <div className="loading">読み込み中...</div>
  if (isError) return <div className="error">エラー: {String(error)}</div>

  const byRowNo = new Map<number, JobResponse>()
  for (const j of jobs ?? []) byRowNo.set(j.rowNo, j)

  function findNextEmptyRowNo(exclude: number): number | null {
    for (let r = 1; r <= TOTAL_ROWS; r++) {
      if (r === exclude) continue
      const job = byRowNo.get(r)
      if (!job || isEmpty(job.data)) return r
    }
    return null
  }

  function handleDuplicate(rowNo: number) {
    const job = byRowNo.get(rowNo)
    if (!job || isEmpty(job.data)) return
    const target = findNextEmptyRowNo(rowNo)
    if (!target) {
      alert('複製先の空き行がありません')
      return
    }
    const cloned: JobData = {
      ...job.data,
      steps: job.data.steps.map((s) => ({
        ...s,
        notes: s.notes.map((n) => ({ ...n, id: newId() })),
      })),
    }
    mutation.mutate({ rowNo: target, data: cloned })
  }

  function handleDelete(rowNo: number) {
    const job = byRowNo.get(rowNo)
    if (!job || isEmpty(job.data)) return
    if (!confirm(`行No. ${rowNo} を削除しますか？`)) return
    deleteMutation.mutate(rowNo)
  }

  return (
    <div>
      <p className="page-title">シート1: 業務一覧。セルをクリックして編集 → フォーカスを外すと保存。工程セルは「6/1〜6/3」形式。</p>
      <table className="sheet-table">
        <thead>
          <tr>
            <th className="row-no">行No.</th>
            <th className="col-category">大区分</th>
            <th className="col-comment">コメント</th>
            {STEP_NAMES.map((n) => (
              <th key={n} className="col-step">工程{n}</th>
            ))}
            <th className="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1).map((rowNo) => {
            const job = byRowNo.get(rowNo)
            const data = job?.data ?? emptyData()
            return (
              <SheetRow
                key={rowNo}
                rowNo={rowNo}
                data={data}
                onSave={(nextData) => mutation.mutate({ rowNo, data: nextData })}
                onDuplicate={() => handleDuplicate(rowNo)}
                onDelete={() => handleDelete(rowNo)}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SheetRow({
  rowNo,
  data,
  onSave,
  onDuplicate,
  onDelete,
}: {
  rowNo: number
  data: JobData
  onSave: (next: JobData) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const empty = isEmpty(data)
  return (
    <tr>
      <td className="row-no">{rowNo}</td>
      <td className="col-category">
        <TextCell
          value={data.category ?? ''}
          onCommit={(v) => onSave({ ...data, category: v === '' ? null : v })}
        />
      </td>
      <td className="col-comment">
        <TextCell
          value={data.comment ?? ''}
          onCommit={(v) => onSave({ ...data, comment: v === '' ? null : v })}
        />
      </td>
      {STEP_NAMES.map((name) => {
        const step = getStep(data, name)
        const initial = step ? rangeLabel(step.startDate, step.endDate) : ''
        return (
          <td key={name} className="col-step">
            <TextCell
              value={initial}
              onCommit={(v) => {
                const trimmed = v.trim()
                if (trimmed === '') {
                  onSave(setStep(data, name, null))
                  return
                }
                const parsed = parseRangeLabel(trimmed)
                if (parsed) {
                  onSave(setStep(data, name, parsed))
                } else {
                  alert(`形式が不正です: "${trimmed}"\n例: 6/1〜6/3`)
                }
              }}
            />
          </td>
        )
      })}
      <td className="col-actions">
        {!empty && (
          <div className="row-actions">
            <button className="row-action" onClick={onDuplicate} title="この行を空き行に複製">複製</button>
            <button className="row-action danger" onClick={onDelete} title="この行を削除">削除</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function TextCell({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value)
  const initial = useMemo(() => value, [value])
  useEffect(() => {
    setLocal(value)
  }, [value])
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== initial) onCommit(local)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setLocal(initial)
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}
