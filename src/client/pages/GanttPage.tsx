import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJobs, putJob, type JobResponse } from '../lib/api'
import type { JobData, Note, Step } from '../../lib/schemas'
import { addDays, dateOfDay, monthEnd, monthStart } from '../lib/dateUtils'

const CELL_PX = 32
const DRAG_THRESHOLD = 5
const STEP_NAMES = ['A', 'B', 'C', 'D', 'E'] as const
const TOTAL_ROWS = 10
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1)
const COLOR_PRESETS = ['#60a5fa', '#34d399', '#fbbf24', '#fb923c', '#f87171', '#a78bfa']
const DEFAULT_BAR_COLOR = '#94a3b8'
const DEFAULT_NOTE_COLOR = '#fde68a'

function dayOf(date: string): number {
  return Number(date.split('-')[2])
}

function clampDate(date: string, lo = monthStart, hi = monthEnd): string {
  if (date < lo) return lo
  if (date > hi) return hi
  return date
}

function isOverlapping(a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }): boolean {
  return !(a.endDate < b.startDate || a.startDate > b.endDate)
}

function newId(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)
}

function emptyData(): JobData {
  return { category: null, comment: null, steps: [] }
}

// ============================================================
// JobData の immutable update helpers
// ============================================================
function patchStep(data: JobData, stepName: string, patch: Partial<Step>): JobData {
  const idx = data.steps.findIndex((s) => s.name === stepName)
  if (idx < 0) return data
  const updated: Step = { ...data.steps[idx]!, ...patch }
  return { ...data, steps: [...data.steps.slice(0, idx), updated, ...data.steps.slice(idx + 1)] }
}

function patchNote(data: JobData, stepName: string, noteId: string, patch: Partial<Note> | null): JobData {
  const sIdx = data.steps.findIndex((s) => s.name === stepName)
  if (sIdx < 0) return data
  const step = data.steps[sIdx]!
  let nextNotes: Note[]
  if (patch === null) {
    nextNotes = step.notes.filter((n) => n.id !== noteId)
  } else {
    const nIdx = step.notes.findIndex((n) => n.id === noteId)
    if (nIdx < 0) return data
    nextNotes = [...step.notes.slice(0, nIdx), { ...step.notes[nIdx]!, ...patch }, ...step.notes.slice(nIdx + 1)]
  }
  const nextStep: Step = { ...step, notes: nextNotes }
  return { ...data, steps: [...data.steps.slice(0, sIdx), nextStep, ...data.steps.slice(sIdx + 1)] }
}

function addNote(data: JobData, stepName: string, date: string): JobData {
  const sIdx = data.steps.findIndex((s) => s.name === stepName)
  if (sIdx < 0) return data
  const step = data.steps[sIdx]!
  if (step.notes.some((n) => date >= n.startDate && date <= n.endDate)) return data
  const note: Note = { id: newId(), startDate: date, endDate: date, text: '', color: DEFAULT_NOTE_COLOR }
  const nextStep: Step = { ...step, notes: [...step.notes, note] }
  return { ...data, steps: [...data.steps.slice(0, sIdx), nextStep, ...data.steps.slice(sIdx + 1)] }
}

// ============================================================
// Page
// ============================================================
export function GanttPage() {
  const qc = useQueryClient()
  const { data: jobs, isLoading, isError, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  })

  const mutation = useMutation({
    mutationFn: ({ rowNo, data }: { rowNo: number; data: JobData }) => putJob(rowNo, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const [popover, setPopover] = useState<PopoverState | null>(null)
  const gridStyle = useMemo(() => ({ ['--days' as string]: DAYS.length } as React.CSSProperties), [])

  if (isLoading) return <div className="loading">読み込み中...</div>
  if (isError) return <div className="error">エラー: {String(error)}</div>

  const byRowNo = new Map<number, JobResponse>()
  for (const j of jobs ?? []) byRowNo.set(j.rowNo, j)

  function commit(rowNo: number, next: JobData) {
    mutation.mutate({ rowNo, data: next })
  }

  function onUpdateStep(rowNo: number, data: JobData, stepName: string, patch: Partial<Step>) {
    commit(rowNo, patchStep(data, stepName, patch))
  }

  function onUpdateNote(rowNo: number, data: JobData, stepName: string, noteId: string, patch: Partial<Note> | null) {
    commit(rowNo, patchNote(data, stepName, noteId, patch))
  }

  function onAddNote(rowNo: number, data: JobData, stepName: string, date: string) {
    commit(rowNo, addNote(data, stepName, date))
  }

  return (
    <div>
      <p className="page-title">
        シート2: バー・Note ともに掴んで動かす／伸ばす。Note クリックで編集、バー上ダブルクリックで Note 追加。
      </p>
      <div className="gantt-mock-wrap" style={gridStyle}>
        <div className="gantt-row header" style={gridStyle}>
          <div className="gantt-cell label">行No.</div>
          <div className="gantt-cell label">大区分</div>
          <div className="gantt-cell label">工程</div>
          {DAYS.map((d) => (
            <div key={d} className="gantt-cell">{d}</div>
          ))}
        </div>
        {Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1).map((rowNo) => {
          const job = byRowNo.get(rowNo)
          const data = job?.data ?? emptyData()
          return (
            <JobRowGroup
              key={rowNo}
              rowNo={rowNo}
              data={data}
              gridStyle={gridStyle}
              onUpdateStep={(stepName, patch) => onUpdateStep(rowNo, data, stepName, patch)}
              onUpdateNote={(stepName, noteId, patch) => onUpdateNote(rowNo, data, stepName, noteId, patch)}
              onAddNote={(stepName, date) => onAddNote(rowNo, data, stepName, date)}
              onOpenPopover={setPopover}
            />
          )
        })}
      </div>
      {popover && (
        <NotePopover
          key={popover.noteId}
          state={popover}
          onClose={() => setPopover(null)}
          onSave={(patch) => {
            const job = byRowNo.get(popover.rowNo)
            const data = job?.data ?? emptyData()
            onUpdateNote(popover.rowNo, data, popover.stepName, popover.noteId, patch)
            setPopover(null)
          }}
          onDelete={() => {
            const job = byRowNo.get(popover.rowNo)
            const data = job?.data ?? emptyData()
            onUpdateNote(popover.rowNo, data, popover.stepName, popover.noteId, null)
            setPopover(null)
          }}
          onChangeBarColor={(color) => {
            const job = byRowNo.get(popover.rowNo)
            const data = job?.data ?? emptyData()
            onUpdateStep(popover.rowNo, data, popover.stepName, { color })
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// JobRowGroup
// ============================================================
function JobRowGroup({
  rowNo,
  data,
  gridStyle,
  onUpdateStep,
  onUpdateNote,
  onAddNote,
  onOpenPopover,
}: {
  rowNo: number
  data: JobData
  gridStyle: React.CSSProperties
  onUpdateStep: (stepName: string, patch: Partial<Step>) => void
  onUpdateNote: (stepName: string, noteId: string, patch: Partial<Note> | null) => void
  onAddNote: (stepName: string, date: string) => void
  onOpenPopover: (state: PopoverState) => void
}) {
  return (
    <>
      <div className="gantt-row" style={gridStyle}>
        <div className="gantt-cell row-no">{rowNo}</div>
        <div className="gantt-cell label">{data.category ?? ''}</div>
        <div className="gantt-cell label" />
        {DAYS.map((d) => (
          <div key={d} className="gantt-cell" />
        ))}
      </div>
      {STEP_NAMES.map((stepName) => {
        const step = data.steps.find((s) => s.name === stepName)
        return (
          <StepRow
            key={stepName}
            rowNo={rowNo}
            stepName={stepName}
            step={step}
            gridStyle={gridStyle}
            onUpdateStep={onUpdateStep}
            onUpdateNote={onUpdateNote}
            onAddNote={onAddNote}
            onOpenPopover={onOpenPopover}
          />
        )
      })}
    </>
  )
}

// ============================================================
// StepRow — 1工程行（バー＋Note レイヤ）
// ============================================================
type BarDragKind = 'move' | 'resize-start' | 'resize-end'

function StepRow({
  rowNo,
  stepName,
  step,
  gridStyle,
  onUpdateStep,
  onUpdateNote,
  onAddNote,
  onOpenPopover,
}: {
  rowNo: number
  stepName: string
  step: Step | undefined
  gridStyle: React.CSSProperties
  onUpdateStep: (stepName: string, patch: Partial<Step>) => void
  onUpdateNote: (stepName: string, noteId: string, patch: Partial<Note> | null) => void
  onAddNote: (stepName: string, date: string) => void
  onOpenPopover: (state: PopoverState) => void
}) {
  const dragRef = useRef<{
    kind: BarDragKind
    startX: number
    startStart: string
    startEnd: string
    moved: boolean
  } | null>(null)
  const [draftBar, setDraftBar] = useState<{ start: string; end: string } | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const deltaPx = e.clientX - drag.startX
      if (!drag.moved && Math.abs(deltaPx) >= DRAG_THRESHOLD) drag.moved = true
      if (!drag.moved) return
      const deltaDays = Math.round(deltaPx / CELL_PX)
      let start = drag.startStart
      let end = drag.startEnd
      if (drag.kind === 'move') {
        start = clampDate(addDays(drag.startStart, deltaDays))
        end = clampDate(addDays(drag.startEnd, deltaDays))
      } else if (drag.kind === 'resize-start') {
        const cand = clampDate(addDays(drag.startStart, deltaDays))
        start = cand <= drag.startEnd ? cand : drag.startEnd
      } else if (drag.kind === 'resize-end') {
        const cand = clampDate(addDays(drag.startEnd, deltaDays))
        end = cand >= drag.startStart ? cand : drag.startStart
      }
      setDraftBar({ start, end })
    }
    function onUp() {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      if (drag.moved && draftBar) {
        onUpdateStep(stepName, { startDate: draftBar.start, endDate: draftBar.end })
      }
      setDraftBar(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draftBar, stepName, onUpdateStep])

  function startBarDrag(kind: BarDragKind, e: React.PointerEvent) {
    if (!step) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      kind,
      startX: e.clientX,
      startStart: step.startDate,
      startEnd: step.endDate,
      moved: false,
    }
  }

  function dateOfClientX(clientX: number): string | null {
    const rowEl = rowRef.current
    if (!rowEl) return null
    const rect = rowEl.getBoundingClientRect()
    const dayAreaLeft = rect.left + 56 + 80 + 80
    const dayIdx = Math.floor((clientX - dayAreaLeft) / CELL_PX)
    if (dayIdx < 0 || dayIdx >= DAYS.length) return null
    return dateOfDay(dayIdx + 1)
  }

  const display = draftBar ?? (step ? { start: step.startDate, end: step.endDate } : null)

  return (
    <div className="gantt-row gantt-mock-step" style={{ ...gridStyle, position: 'relative' }} ref={rowRef}>
      <div className="gantt-cell row-no" />
      <div className="gantt-cell label" />
      <div className="gantt-cell label">{stepName}</div>
      {DAYS.map((d) => (
        <div key={d} className="gantt-cell" />
      ))}
      {display && step && (
        <div
          className="gantt-mock-bar"
          style={{
            gridColumnStart: 3 + dayOf(display.start) + 1,
            gridColumnEnd: 3 + dayOf(display.end) + 1 + 1,
            background: step.color ?? DEFAULT_BAR_COLOR,
          }}
          onPointerDown={(e) => startBarDrag('move', e)}
          onDoubleClick={(e) => {
            const date = dateOfClientX(e.clientX)
            if (date && date >= display.start && date <= display.end) {
              onAddNote(stepName, date)
            }
          }}
        >
          <div className="gantt-mock-bar-handle left" onPointerDown={(e) => startBarDrag('resize-start', e)} />
          <div className="gantt-mock-bar-handle right" onPointerDown={(e) => startBarDrag('resize-end', e)} />
          {step.notes.map((note) => (
            <NoteTile
              key={note.id}
              note={note}
              barStart={display.start}
              barEnd={display.end}
              otherNotes={step.notes.filter((n) => n.id !== note.id)}
              onCommitRange={(start, end) => onUpdateNote(stepName, note.id, { startDate: start, endDate: end })}
              onClick={(e) =>
                onOpenPopover({
                  rowNo,
                  stepName,
                  noteId: note.id,
                  text: note.text,
                  color: note.color ?? DEFAULT_NOTE_COLOR,
                  x: e.clientX,
                  y: e.clientY,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// NoteTile
// ============================================================
function NoteTile({
  note,
  barStart,
  barEnd,
  otherNotes,
  onCommitRange,
  onClick,
}: {
  note: Note
  barStart: string
  barEnd: string
  otherNotes: Note[]
  onCommitRange: (start: string, end: string) => void
  onClick: (e: React.PointerEvent) => void
}) {
  const dragRef = useRef<{
    kind: BarDragKind
    startX: number
    startStart: string
    startEnd: string
    moved: boolean
  } | null>(null)
  const [draft, setDraft] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const deltaPx = e.clientX - drag.startX
      if (!drag.moved && Math.abs(deltaPx) >= DRAG_THRESHOLD) drag.moved = true
      if (!drag.moved) return
      const deltaDays = Math.round(deltaPx / CELL_PX)
      let start = drag.startStart
      let end = drag.startEnd
      if (drag.kind === 'move') {
        start = clampDate(addDays(drag.startStart, deltaDays), barStart, barEnd)
        end = clampDate(addDays(drag.startEnd, deltaDays), barStart, barEnd)
        const origLen = dayOf(drag.startEnd) - dayOf(drag.startStart)
        const newLen = dayOf(end) - dayOf(start)
        if (newLen !== origLen) {
          if (start === barStart) end = clampDate(addDays(start, origLen), barStart, barEnd)
          else if (end === barEnd) start = clampDate(addDays(end, -origLen), barStart, barEnd)
        }
      } else if (drag.kind === 'resize-start') {
        const cand = clampDate(addDays(drag.startStart, deltaDays), barStart, barEnd)
        start = cand <= drag.startEnd ? cand : drag.startEnd
      } else if (drag.kind === 'resize-end') {
        const cand = clampDate(addDays(drag.startEnd, deltaDays), barStart, barEnd)
        end = cand >= drag.startStart ? cand : drag.startStart
      }
      const overlap = otherNotes.some((n) => isOverlapping({ startDate: start, endDate: end }, { startDate: n.startDate, endDate: n.endDate }))
      if (!overlap) setDraft({ start, end })
    }
    function onUp() {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      if (drag.moved && draft) onCommitRange(draft.start, draft.end)
      setDraft(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draft, barStart, barEnd, otherNotes, onCommitRange])

  function start(kind: BarDragKind, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      kind,
      startX: e.clientX,
      startStart: note.startDate,
      startEnd: note.endDate,
      moved: false,
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const drag = dragRef.current
    if (drag && !drag.moved) onClick(e)
  }

  const display = draft ?? { start: note.startDate, end: note.endDate }
  const offsetDays = dayOf(display.start) - dayOf(barStart)
  const widthDays = dayOf(display.end) - dayOf(display.start) + 1

  return (
    <div
      className="gantt-mock-note"
      style={{
        left: offsetDays * CELL_PX,
        width: widthDays * CELL_PX - 2,
        background: note.color ?? DEFAULT_NOTE_COLOR,
      }}
      onPointerDown={(e) => start('move', e)}
      onPointerUp={handlePointerUp}
      onDoubleClick={(e) => e.stopPropagation()}
      title={note.text || '(クリックで編集)'}
    >
      <div className="gantt-mock-note-handle left" onPointerDown={(e) => start('resize-start', e)} />
      <div className="gantt-mock-note-handle right" onPointerDown={(e) => start('resize-end', e)} />
      <div className="gantt-mock-note-text">{note.text.split('\n')[0] || '(空メモ)'}</div>
    </div>
  )
}

// ============================================================
// Popover
// ============================================================
interface PopoverState {
  rowNo: number
  stepName: string
  noteId: string
  text: string
  color: string
  x: number
  y: number
}

function NotePopover({
  state,
  onClose,
  onSave,
  onDelete,
  onChangeBarColor,
}: {
  state: PopoverState
  onClose: () => void
  onSave: (patch: Partial<Note>) => void
  onDelete: () => void
  onChangeBarColor: (color: string) => void
}) {
  const [text, setText] = useState(state.text)
  const [color, setColor] = useState<string>(state.color)

  return (
    <>
      <div className="gantt-mock-popover-backdrop" onClick={onClose} />
      <div
        className="gantt-mock-popover"
        style={{ left: Math.min(state.x, window.innerWidth - 320), top: Math.min(state.y, window.innerHeight - 280) }}
      >
        <div className="gantt-mock-popover-title">Note 編集</div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'長文メモを入力\n（改行可）'}
          rows={5}
        />
        <div className="gantt-mock-popover-section">
          <span>Note 色:</span>
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              className={'gantt-mock-color-swatch' + (color === c ? ' selected' : '')}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="gantt-mock-popover-section">
          <span>バー色:</span>
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              className="gantt-mock-color-swatch"
              style={{ background: c }}
              onClick={() => onChangeBarColor(c)}
            />
          ))}
        </div>
        <div className="gantt-mock-popover-actions">
          <button onClick={onDelete} className="danger">削除</button>
          <button onClick={onClose}>キャンセル</button>
          <button onClick={() => onSave({ text, color })} className="primary">保存</button>
        </div>
      </div>
    </>
  )
}
