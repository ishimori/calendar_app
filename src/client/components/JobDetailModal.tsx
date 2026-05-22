import { useEffect, useState } from 'react'
import type { JobData, Step, StepStatus, Note } from '../../lib/schemas'
import { STEP_STATUS_META } from '../../lib/schemas'
import { shortLabel, rangeLabel, parseDateLabel } from '../lib/dateUtils'

function newId(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)
}

export interface DetailModalContext {
  rowNo: number
  data: JobData
  stepName: string
}

interface Props {
  context: DetailModalContext | null
  onClose: () => void
  onSave: (rowNo: number, next: JobData) => void
}

export function JobDetailModal({ context, onClose, onSave }: Props) {
  const [step, setStep] = useState<Step | null>(null)

  useEffect(() => {
    if (!context) {
      setStep(null)
      return
    }
    const s = context.data.steps.find((x) => x.name === context.stepName)
    if (!s) {
      setStep(null)
      return
    }
    setStep({ ...s, notes: s.notes.map((n) => ({ ...n })) })
  }, [context])

  useEffect(() => {
    if (!context) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [context, onClose])

  if (!context || !step) return null

  const status = step.status ?? 'planned'
  const statusMeta = STEP_STATUS_META[status]
  const ownerInitial = context.data.owner ?? ''

  function patchStep(patch: Partial<Step>) {
    setStep((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function patchNote(i: number, patch: Partial<Note>) {
    setStep((prev) => {
      if (!prev) return prev
      const notes = prev.notes.map((n, idx) => (idx === i ? { ...n, ...patch } : n))
      return { ...prev, notes }
    })
  }

  function addNote() {
    setStep((prev) => {
      if (!prev) return prev
      const newNote: Note = {
        id: newId(),
        startDate: prev.startDate,
        endDate: prev.startDate,
        text: '',
      }
      return { ...prev, notes: [...prev.notes, newNote] }
    })
  }

  function removeNote(i: number) {
    setStep((prev) => {
      if (!prev) return prev
      return { ...prev, notes: prev.notes.filter((_, idx) => idx !== i) }
    })
  }

  function handleSave() {
    if (!context || !step) return
    const nextData: JobData = {
      ...context.data,
      steps: context.data.steps.map((s) => (s.name === context.stepName ? step : s)),
    }
    onSave(context.rowNo, nextData)
    onClose()
  }

  function handleStartChange(value: string) {
    const date = parseDateLabel(value)
    if (date) patchStep({ startDate: date })
  }

  function handleEndChange(value: string) {
    const date = parseDateLabel(value)
    if (date) patchStep({ endDate: date })
  }

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-card" onClick={(e) => e.stopPropagation()}>
        <div className="mdA-header">
          <div>
            <div className="mdA-eyebrow">
              {context.data.lotId ?? `Row ${context.rowNo}`} · {context.data.category ?? ''} · {context.data.lotName ?? ''}
            </div>
            <div className="mdA-title">
              <span className="mdA-pcode" style={{ borderColor: statusMeta.color, color: statusMeta.color }}>
                {step.name}
              </span>
              <span>{step.label ?? step.name}</span>
            </div>
          </div>
          <button className="mdA-close" onClick={onClose} title="閉じる (Esc)">×</button>
        </div>

        <div className="mdA-formrow">
          <div className="mdA-field">
            <label>開始</label>
            <input
              type="text"
              defaultValue={shortLabel(step.startDate)}
              onBlur={(e) => handleStartChange(e.target.value)}
            />
          </div>
          <div className="mdA-field">
            <label>終了</label>
            <input
              type="text"
              defaultValue={shortLabel(step.endDate)}
              onBlur={(e) => handleEndChange(e.target.value)}
            />
          </div>
          <div className="mdA-field">
            <label>状態</label>
            <select
              value={step.status ?? 'planned'}
              onChange={(e) => patchStep({ status: e.target.value as StepStatus })}
            >
              <option value="done">完了</option>
              <option value="running">進行中</option>
              <option value="planned">計画</option>
              <option value="overdue">遅延</option>
              <option value="blocked">保留</option>
            </select>
          </div>
          <div className="mdA-field">
            <label>担当</label>
            <input type="text" defaultValue={ownerInitial} disabled />
          </div>
        </div>

        <div className="mdA-subhead">
          <div>日別作業 ({step.notes.length}件) — 期間: {rangeLabel(step.startDate, step.endDate)}</div>
          <button className="mdA-addbtn" onClick={addNote}>+ 行追加</button>
        </div>

        <div className="mdA-tablewrap">
          <table className="mdA-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>日付</th>
                <th>作業内容</th>
                <th style={{ width: 90 }}>担当</th>
                <th style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {step.notes.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '12px' }}>
                    日別作業はまだありません。
                  </td>
                </tr>
              )}
              {step.notes.map((n, i) => (
                  <tr key={n.id}>
                    <td className="mdA-td-day">
                      <input
                        type="text"
                        defaultValue={shortLabel(n.startDate)}
                        onBlur={(e) => {
                          const date = parseDateLabel(e.target.value)
                          if (date) patchNote(i, { startDate: date, endDate: date })
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={n.text}
                        onBlur={(e) => patchNote(i, { text: e.target.value })}
                      />
                    </td>
                    <td>
                      <input type="text" defaultValue={ownerInitial} disabled />
                    </td>
                    <td>
                      <button className="mdA-rowdel" onClick={() => removeNote(i)} title="削除">×</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mdA-footer">
          <button className="mdA-btn" onClick={onClose}>キャンセル</button>
          <button className="mdA-btn mdA-btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
