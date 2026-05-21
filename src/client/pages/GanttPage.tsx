import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJobs, putJob, type JobResponse } from '../lib/api'
import type { JobData, Step } from '../../lib/schemas'
import { addDays, dateOfDay, isWithin, monthEnd, monthStart } from '../lib/dateUtils'

const TOTAL_ROWS = 10
const STEP_NAMES = ['A', 'B', 'C', 'D', 'E'] as const
const CELL_PX = 32

function daysInRange(): number[] {
  const out: number[] = []
  for (let d = 1; d <= 30; d += 1) out.push(d)
  return out
}

function emptyData(): JobData {
  return { category: null, comment: null, steps: [] }
}

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

  const days = useMemo(() => daysInRange(), [])

  if (isLoading) return <div className="loading">読み込み中...</div>
  if (isError) return <div className="error">エラー: {String(error)}</div>

  const byRowNo = new Map<number, JobResponse>()
  for (const j of jobs ?? []) byRowNo.set(j.rowNo, j)

  const gridStyle = { ['--days' as string]: days.length } as React.CSSProperties

  return (
    <div>
      <p className="page-title">
        シート2: ガント。バー本体をドラッグで移動、両端を掴むとリサイズ。セルをクリックすると日別作業内容(「洗浄」など)を入力。
      </p>
      <div className="gantt-wrap" style={gridStyle}>
        {/* ヘッダ */}
        <div className="gantt-row header" style={gridStyle}>
          <div className="gantt-cell label">行No.</div>
          <div className="gantt-cell label">大区分</div>
          <div className="gantt-cell label">工程</div>
          {days.map((d) => (
            <div key={d} className="gantt-cell">{d}</div>
          ))}
        </div>

        {/* 各業務 */}
        {Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1).map((rowNo) => {
          const job = byRowNo.get(rowNo)
          const data = job?.data ?? emptyData()
          return (
            <JobRowGroup
              key={rowNo}
              rowNo={rowNo}
              data={data}
              gridStyle={gridStyle}
              days={days}
              onSave={(nextData) => mutation.mutate({ rowNo, data: nextData })}
            />
          )
        })}
      </div>
    </div>
  )
}

function JobRowGroup({
  rowNo,
  data,
  gridStyle,
  days,
  onSave,
}: {
  rowNo: number
  data: JobData
  gridStyle: React.CSSProperties
  days: number[]
  onSave: (next: JobData) => void
}) {
  // 大区分行 + 各工程行
  return (
    <>
      {/* 大区分の見出し行 */}
      <div className="gantt-row" style={gridStyle}>
        <div className="gantt-cell row-no">{rowNo}</div>
        <div className="gantt-cell label">{data.category ?? ''}</div>
        <div className="gantt-cell label" />
        {days.map((d) => (
          <div key={d} className="gantt-cell" />
        ))}
      </div>
      {/* 工程行(A〜E) */}
      {STEP_NAMES.map((stepName) => {
        const step = data.steps.find((s) => s.name === stepName)
        return (
          <StepRow
            key={stepName}
            stepName={stepName}
            step={step}
            gridStyle={gridStyle}
            days={days}
            onChangeRange={(range) => {
              const others = data.steps.filter((s) => s.name !== stepName)
              if (range === null) {
                onSave({ ...data, steps: others })
                return
              }
              const next: Step = {
                name: stepName,
                startDate: range.start,
                endDate: range.end,
                dailyNotes: step?.dailyNotes ?? {},
              }
              onSave({
                ...data,
                steps: [...others, next].sort((a, b) => a.name.localeCompare(b.name)),
              })
            }}
            onChangeNote={(date, text) => {
              const base: Step = step ?? { name: stepName, startDate: date, endDate: date, dailyNotes: {} }
              const dailyNotes = { ...base.dailyNotes }
              if (text.trim() === '') {
                delete dailyNotes[date]
              } else {
                dailyNotes[date] = text
              }
              const next: Step = { ...base, dailyNotes }
              const others = data.steps.filter((s) => s.name !== stepName)
              onSave({
                ...data,
                steps: [...others, next].sort((a, b) => a.name.localeCompare(b.name)),
              })
            }}
          />
        )
      })}
    </>
  )
}

type DragKind = 'move' | 'resize-start' | 'resize-end'

interface DragState {
  kind: DragKind
  startMouseX: number
  startStartDate: string
  startEndDate: string
}

function StepRow({
  stepName,
  step,
  gridStyle,
  days,
  onChangeRange,
  onChangeNote,
}: {
  stepName: string
  step: Step | undefined
  gridStyle: React.CSSProperties
  days: number[]
  onChangeRange: (range: { start: string; end: string } | null) => void
  onChangeNote: (date: string, text: string) => void
}) {
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const dragRef = useRef<DragState | null>(null)
  const [draftRange, setDraftRange] = useState<{ start: string; end: string } | null>(null)

  // ドラッグ中の表示用、それ以外は確定値
  const displayRange = draftRange ?? (step ? { start: step.startDate, end: step.endDate } : null)

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const deltaPx = e.clientX - drag.startMouseX
      const deltaDays = Math.round(deltaPx / CELL_PX)
      let start = drag.startStartDate
      let end = drag.startEndDate
      if (drag.kind === 'move') {
        start = clampDate(addDays(drag.startStartDate, deltaDays))
        end = clampDate(addDays(drag.startEndDate, deltaDays))
      } else if (drag.kind === 'resize-start') {
        const candidate = clampDate(addDays(drag.startStartDate, deltaDays))
        start = candidate <= drag.startEndDate ? candidate : drag.startEndDate
      } else if (drag.kind === 'resize-end') {
        const candidate = clampDate(addDays(drag.startEndDate, deltaDays))
        end = candidate >= drag.startStartDate ? candidate : drag.startStartDate
      }
      setDraftRange({ start, end })
    }
    function onUp() {
      if (!dragRef.current) return
      dragRef.current = null
      if (draftRange) {
        onChangeRange(draftRange)
      }
      setDraftRange(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draftRange, onChangeRange])

  function startDrag(kind: DragKind, e: React.PointerEvent) {
    if (!step) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      kind,
      startMouseX: e.clientX,
      startStartDate: step.startDate,
      startEndDate: step.endDate,
    }
  }

  function handleCellClick(date: string) {
    if (editingDate) return
    const existing = step?.dailyNotes?.[date] ?? ''
    setEditingDate(date)
    setEditingText(existing)
  }

  function commitNoteEdit() {
    if (!editingDate) return
    onChangeNote(editingDate, editingText)
    setEditingDate(null)
    setEditingText('')
  }

  // バーの占有グリッド列を計算(行No・大区分・工程の3列 + 1日目=4列目から)
  const barStyle = displayRange
    ? {
        gridColumnStart: 3 + dayOf(displayRange.start) + 1, // 3固定列 + 日 + 1
        gridColumnEnd: 3 + dayOf(displayRange.end) + 1 + 1,
        gridRow: 1,
        pointerEvents: 'auto' as const,
      }
    : null

  return (
    <div className="gantt-row" style={{ ...gridStyle, position: 'relative' }}>
      <div className="gantt-cell row-no" />
      <div className="gantt-cell label" />
      <div className="gantt-cell label">{stepName}</div>
      {days.map((d) => {
        const date = dateOfDay(d)
        const inRange = displayRange ? isWithin(date, displayRange.start, displayRange.end) : false
        const note = step?.dailyNotes?.[date]
        const isEditing = editingDate === date
        const cellClass = ['gantt-cell', 'day']
        if (inRange) cellClass.push('in-range')
        if (note) cellClass.push('has-note')
        return (
          <div
            key={d}
            className={cellClass.join(' ')}
            onClick={() => handleCellClick(date)}
            title={date}
          >
            {isEditing ? (
              <input
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={commitNoteEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') {
                    setEditingDate(null)
                    setEditingText('')
                  }
                }}
              />
            ) : (
              note ?? ''
            )}
          </div>
        )
      })}
      {/* ドラッグ用バー(透明、当たり判定用) */}
      {barStyle && step && (
        <div
          className="gantt-bar"
          style={barStyle}
          onPointerDown={(e) => startDrag('move', e)}
        >
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, cursor: 'ew-resize' }}
            onPointerDown={(e) => startDrag('resize-start', e)}
          />
          <div
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'ew-resize' }}
            onPointerDown={(e) => startDrag('resize-end', e)}
          />
        </div>
      )}
    </div>
  )
}

function dayOf(date: string): number {
  return Number(date.split('-')[2])
}

function clampDate(date: string): string {
  if (date < monthStart) return monthStart
  if (date > monthEnd) return monthEnd
  return date
}

