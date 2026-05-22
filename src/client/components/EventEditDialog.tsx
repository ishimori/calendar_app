import { useEffect, useState } from 'react'
import type { EventKind, JobEvent } from '../../lib/schemas'
import { shortLabel } from '../lib/dateUtils'

interface Props {
  event: JobEvent | null
  onClose: () => void
  onSave: (patch: Partial<JobEvent>) => void
  onDelete: () => void
}

export function EventEditDialog({ event, onClose, onSave, onDelete }: Props) {
  const [text, setText] = useState('')
  const [kind, setKind] = useState<EventKind>('milestone')

  useEffect(() => {
    if (event) {
      setText(event.text)
      setKind(event.kind ?? (event.startDate === event.endDate ? 'milestone' : 'event'))
    }
  }, [event])

  useEffect(() => {
    if (!event) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [event, onClose])

  if (!event) return null

  function handleSave() {
    onSave({ text, kind })
    onClose()
  }

  function handleDelete() {
    if (!confirm(`イベント「${event!.text || '(無題)'}」を削除しますか？`)) return
    onDelete()
    onClose()
  }

  const dateLabel =
    event.startDate === event.endDate
      ? shortLabel(event.startDate)
      : `${shortLabel(event.startDate)} 〜 ${shortLabel(event.endDate)}`

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-card md-card-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mdA-header">
          <div>
            <div className="mdA-eyebrow">イベント編集 · {dateLabel}</div>
            <div className="mdA-title">{event.text || '(無題)'}</div>
          </div>
          <button className="mdA-close" onClick={onClose} title="閉じる (Esc)">×</button>
        </div>

        <div className="mdA-formrow" style={{ gridTemplateColumns: '1fr 140px' }}>
          <div className="mdA-field">
            <label>イベント名</label>
            <input
              type="text"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
            />
          </div>
          <div className="mdA-field">
            <label>種別</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
              <option value="milestone">マイルストーン</option>
              <option value="event">期間イベント</option>
            </select>
          </div>
        </div>

        <div className="mdA-footer mdA-footer-split">
          <button className="mdA-btn mdA-btn-danger" onClick={handleDelete}>削除</button>
          <div style={{ flex: 1 }} />
          <button className="mdA-btn" onClick={onClose}>キャンセル</button>
          <button className="mdA-btn mdA-btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
