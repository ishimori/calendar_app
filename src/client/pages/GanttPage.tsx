import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import { fetchJobs, putJob, type JobResponse } from '../lib/api'
import type { JobData, JobEvent, Note, Step, StepStatus } from '../../lib/schemas'
import { STEP_STATUS_META } from '../../lib/schemas'
import {
  addDays,
  dateOfDay,
  dayOfMonth,
  isWeekendDay,
  monthEnd,
  monthStart,
  todayDayInCalendar,
  weekdayOf,
} from '../lib/dateUtils'
import { TankFilter } from '../components/TankFilter'
import { JobDetailModal, type DetailModalContext } from '../components/JobDetailModal'
import { EventEditDialog } from '../components/EventEditDialog'

const DAY_W = 30
const ROW_H = 32
const TANK_W = 64
const LEFT_W = TANK_W + 110 + 56 + 96 + 58 // タンク+ロット+大区分+工程+状態
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1) // 2026-05-01..2026-05-30
const TODAY_DAY = todayDayInCalendar()
const DRAG_THRESHOLD = 4

function clampDate(date: string): string {
  if (date < monthStart) return monthStart
  if (date > monthEnd) return monthEnd
  return date
}

function newId(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)
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

function patchEvent(data: JobData, eventId: string, patch: Partial<JobEvent> | null): JobData {
  if (patch === null) {
    return { ...data, events: data.events.filter((e) => e.id !== eventId) }
  }
  const idx = data.events.findIndex((e) => e.id === eventId)
  if (idx < 0) return data
  const updated: JobEvent = { ...data.events[idx]!, ...patch }
  return { ...data, events: [...data.events.slice(0, idx), updated, ...data.events.slice(idx + 1)] }
}

// ============================================================
// Page
// ============================================================
export function GanttPage() {
  const qc = useQueryClient()
  const { data: jobs, isLoading, isError, error } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs })

  const mutation = useMutation({
    mutationFn: ({ rowNo, data }: { rowNo: number; data: JobData }) => putJob(rowNo, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const allTanks = useMemo(() => {
    const set = new Set<string>()
    for (const j of jobs ?? []) if (j.data.tank) set.add(j.data.tank)
    return [...set].sort()
  }, [jobs])

  const tankCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const j of jobs ?? []) {
      if (j.data.tank) counts[j.data.tank] = (counts[j.data.tank] ?? 0) + 1
    }
    return counts
  }, [jobs])

  const [tankFilter, setTankFilter] = useState<Set<string>>(() => new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterInitialized, setFilterInitialized] = useState(false)
  const [modalCtx, setModalCtx] = useState<DetailModalContext | null>(null)
  const [eventEditCtx, setEventEditCtx] = useState<{ rowNo: number; eventId: string } | null>(null)

  useEffect(() => {
    if (!filterInitialized && allTanks.length > 0) {
      setTankFilter(new Set(allTanks))
      setFilterInitialized(true)
    }
  }, [allTanks, filterInitialized])

  if (isLoading) return <div className="loading">読み込み中...</div>
  if (isError) return <div className="error">エラー: {String(error)}</div>

  const allJobs = jobs ?? []
  const visibleJobs = allJobs.filter((j) => !j.data.tank || tankFilter.has(j.data.tank))

  const tankGroups: { tank: string | null; lots: JobResponse[] }[] = []
  visibleJobs.forEach((j) => {
    const last = tankGroups[tankGroups.length - 1]
    if (last && last.tank === j.data.tank) last.lots.push(j)
    else tankGroups.push({ tank: j.data.tank, lots: [j] })
  })

  const stats = {
    running: allJobs.flatMap((j) => j.data.steps).filter((s) => s.status === 'running').length,
    overdue: allJobs.flatMap((j) => j.data.steps).filter((s) => s.status === 'overdue').length,
  }

  function commit(rowNo: number, next: JobData) {
    mutation.mutate({ rowNo, data: next })
  }

  function toggleTank(t: string) {
    setTankFilter((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function toggleAllTanks() {
    setTankFilter((prev) => (prev.size === allTanks.length ? new Set() : new Set(allTanks)))
  }

  function openDetail(rowNo: number, data: JobData, stepName: string) {
    setModalCtx({ rowNo, data, stepName })
  }

  const currentEvent = (() => {
    if (!eventEditCtx) return null
    const j = allJobs.find((j) => j.rowNo === eventEditCtx.rowNo)
    return j?.data.events.find((e) => e.id === eventEditCtx.eventId) ?? null
  })()

  const gridStyle = {
    ['--leftW' as string]: LEFT_W + 'px',
    ['--tankW' as string]: TANK_W + 'px',
    ['--dayW' as string]: DAY_W + 'px',
    ['--rowH' as string]: ROW_H + 'px',
    ['--todayDay' as string]: String(TODAY_DAY),
  } as React.CSSProperties

  return (
    <div className="vA-root">
      {/* toolbar */}
      <div className="vA-toolbar">
        <div className="vA-toolbar-left">
          <div className="s1-tabs">
            <NavLink to="/sheet" className="s1-tab">業務一覧</NavLink>
            <NavLink to="/gantt" className="s1-tab s1-tab-on">ガント</NavLink>
          </div>
          <div className="vA-divider" />
          <button className="vA-iconbtn" title="前へ">‹</button>
          <div className="vA-monthlabel">2026年 5月</div>
          <button className="vA-iconbtn" title="次へ">›</button>
          <div className="vA-divider" />
          <TankFilter
            allTanks={allTanks}
            tankCounts={tankCounts}
            selected={tankFilter}
            onToggle={toggleTank}
            onToggleAll={toggleAllTanks}
            open={filterOpen}
            setOpen={setFilterOpen}
          />
        </div>
        <div className="vA-toolbar-right">
          <button className="vA-chipbtn">
            <span className="vA-dot" style={{ background: '#f5a623' }} /> 進行中 {stats.running}
          </button>
          <button className="vA-chipbtn">
            <span className="vA-dot" style={{ background: '#e5484d' }} /> 遅延 {stats.overdue}
          </button>
          <div className="vA-divider" />
          <button className="vA-btn vA-btn-primary">+ ロット追加</button>
        </div>
      </div>

      <div className="vA-legend">
        {(['done', 'running', 'planned', 'overdue', 'blocked'] as const).map((s) => (
          <span key={s} className="vA-legend-item">
            <span className="vA-dot" style={{ background: STEP_STATUS_META[s].color }} />
            {STEP_STATUS_META[s].ja}
          </span>
        ))}
        <span style={{ flex: 1 }} />
        <span className="vA-legend-hint">バードラッグで移動 / 端ドラッグで伸縮 / ダブルクリックで詳細</span>
      </div>

      {/* grid */}
      <div className="vA-grid" style={gridStyle}>
        {/* header row */}
        <div className="vA-header-row">
          <div className="vA-leftcols vA-head-left">
            <div className="vA-col vA-col-tank">タンク</div>
            <div className="vA-col vA-col-id">ロット</div>
            <div className="vA-col vA-col-kubun">大区分</div>
            <div className="vA-col vA-col-process">工程</div>
            <div className="vA-col vA-col-status">状態</div>
          </div>
          <div className="vA-timeline-head">
            {DAYS.map((d) => {
              const we = isWeekendDay(d)
              const today = d === TODAY_DAY
              return (
                <div key={d} className={'vA-day-head' + (we ? ' vA-we' : '') + (today ? ' vA-today' : '')}>
                  <div className="vA-wkd">{weekdayOf(d)}</div>
                  <div className="vA-dnum">{d}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* tank groups */}
        {tankGroups.map((tg) => (
          <div key={tg.tank ?? 'none'} className="vA-tank-group">
            {tg.lots.map((job, lotIdx) => {
              const isFirstInTank = lotIdx === 0
              const isLastInTank = lotIdx === tg.lots.length - 1
              const lotStart =
                job.data.steps.length > 0
                  ? Math.min(...job.data.steps.map((s) => dayOfMonth(s.startDate)))
                  : null
              const lotEnd =
                job.data.steps.length > 0
                  ? Math.max(...job.data.steps.map((s) => dayOfMonth(s.endDate)))
                  : null
              return (
                <div
                  key={job.rowNo}
                  className={'vA-lot-group ' + (isLastInTank ? 'vA-lot-group-tank-last' : '')}
                >
                  {/* Overall row */}
                  <OverallRow
                    job={job}
                    isFirstInTank={isFirstInTank}
                    tankLotCount={tg.lots.length}
                    lotStart={lotStart}
                    lotEnd={lotEnd}
                    onCommit={(next) => commit(job.rowNo, next)}
                    onCommitEvent={(eventId, patch) =>
                      commit(job.rowNo, patchEvent(job.data, eventId, patch))
                    }
                    onOpenEvent={(eventId) =>
                      setEventEditCtx({ rowNo: job.rowNo, eventId })
                    }
                  />

                  {/* Process rows */}
                  {job.data.steps
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((step, pi, arr) => (
                      <ProcessRow
                        key={step.name}
                        step={step}
                        isLastInLot={pi === arr.length - 1}
                        onCommitStep={(patch) => commit(job.rowNo, patchStep(job.data, step.name, patch))}
                        onOpenDetail={() => openDetail(job.rowNo, job.data, step.name)}
                      />
                    ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <JobDetailModal
        context={modalCtx}
        onClose={() => setModalCtx(null)}
        onSave={(rowNo, nextData) => commit(rowNo, nextData)}
      />

      <EventEditDialog
        event={currentEvent}
        onClose={() => setEventEditCtx(null)}
        onSave={(patch) => {
          if (!eventEditCtx) return
          const j = allJobs.find((x) => x.rowNo === eventEditCtx.rowNo)
          if (!j) return
          commit(eventEditCtx.rowNo, patchEvent(j.data, eventEditCtx.eventId, patch))
        }}
        onDelete={() => {
          if (!eventEditCtx) return
          const j = allJobs.find((x) => x.rowNo === eventEditCtx.rowNo)
          if (!j) return
          commit(eventEditCtx.rowNo, patchEvent(j.data, eventEditCtx.eventId, null))
        }}
      />
    </div>
  )
}

// ============================================================
// Overall Row — ロット全体行 (lot span + events)
// ============================================================
function OverallRow({
  job,
  isFirstInTank,
  tankLotCount,
  lotStart,
  lotEnd,
  onCommit,
  onCommitEvent,
  onOpenEvent,
}: {
  job: JobResponse
  isFirstInTank: boolean
  tankLotCount: number
  lotStart: number | null
  lotEnd: number | null
  onCommit: (next: JobData) => void
  onCommitEvent: (eventId: string, patch: Partial<JobEvent>) => void
  onOpenEvent: (eventId: string) => void
}) {
  const { rowNo, data } = job

  function handleAddEvent(day: number) {
    const date = dateOfDay(day)
    const event: JobEvent = {
      id: newId(),
      startDate: date,
      endDate: date,
      text: '新規イベント',
      kind: 'milestone',
    }
    onCommit({ ...data, events: [...data.events, event] })
  }

  return (
    <div className="vA-row vA-row-overall">
      <div className="vA-leftcols">
        <div className="vA-col vA-col-tank">
          {isFirstInTank && (
            <div className="vA-tankcell">
              <div className="vA-tank-id">{data.tank ?? ''}</div>
              {tankLotCount > 1 && data.tank && (
                <div className="vA-tank-count">{tankLotCount}ロット</div>
              )}
            </div>
          )}
        </div>
        <div className="vA-col vA-col-id">
          <div className="vA-lotcell">
            <div className="vA-lot-id">{data.lotId ?? `Row ${rowNo}`}</div>
            <div className="vA-lot-sub">{data.lotName ?? ''}</div>
          </div>
        </div>
        <div className="vA-col vA-col-kubun">{data.category ?? ''}</div>
        <div className="vA-col vA-col-process">
          <span className="vA-proc-code vA-proc-code-all">全</span>
          <span className="vA-proc-label">全体</span>
        </div>
        <div className="vA-col vA-col-status">
          {lotStart !== null && lotEnd !== null && (
            <span className="vA-lot-range">
              {lotStart}〜{lotEnd}日
            </span>
          )}
        </div>
      </div>
      <div
        className="vA-timeline-body"
        onDoubleClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const day = Math.floor((e.clientX - rect.left) / DAY_W) + 1
          if (day >= 1 && day <= DAYS.length) handleAddEvent(day)
        }}
        title="ダブルクリックでイベント追加"
      >
        {DAYS.map((d) => (
          <div
            key={d}
            className={'vA-cell' + (isWeekendDay(d) ? ' vA-we' : '') + (d === TODAY_DAY ? ' vA-today' : '')}
          />
        ))}
        {/* Lot span indicator */}
        {lotStart !== null && lotEnd !== null && (
          <div
            className="vA-lotspan"
            style={{
              left: (lotStart - 1) * DAY_W + 2,
              width: (lotEnd - lotStart + 1) * DAY_W - 4,
            }}
          >
            <div className="vA-lotspan-line" />
            <div className="vA-lotspan-cap vA-lotspan-cap-l" />
            <div className="vA-lotspan-cap vA-lotspan-cap-r" />
          </div>
        )}
        {/* Events */}
        {data.events.map((ev) => (
          <EventTile
            key={ev.id}
            event={ev}
            onCommit={(patch) => onCommitEvent(ev.id, patch)}
            onOpenEdit={() => onOpenEvent(ev.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// EventTile — 全体行のイベント (横方向ドラッグ移動 + ダブルクリックで編集)
// ============================================================
function EventTile({
  event,
  onCommit,
  onOpenEdit,
}: {
  event: JobEvent
  onCommit: (patch: Partial<JobEvent>) => void
  onOpenEdit: () => void
}) {
  const dragRef = useRef<{
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
      const deltaDays = Math.round(deltaPx / DAY_W)
      const start = clampDate(addDays(drag.startStart, deltaDays))
      // 期間を維持して移動
      const realDelta = dayOfMonth(start) - dayOfMonth(drag.startStart)
      const end = clampDate(addDays(drag.startEnd, realDelta))
      setDraft({ start, end })
    }
    function onUp() {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      if (drag.moved && draft) {
        onCommit({ startDate: draft.start, endDate: draft.end })
      }
      setDraft(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draft, onCommit])

  function startDrag(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startStart: event.startDate,
      startEnd: event.endDate,
      moved: false,
    }
  }

  const display = draft ?? { start: event.startDate, end: event.endDate }
  const startDay = dayOfMonth(display.start)
  const endDay = dayOfMonth(display.end)
  const span = endDay - startDay + 1
  const kind = event.kind ?? (startDay === endDay ? 'milestone' : 'event')

  return (
    <div
      className={'vA-event vA-event-' + kind}
      style={{
        left: (startDay - 1) * DAY_W + 2,
        minWidth: span * DAY_W - 4,
      }}
      onPointerDown={startDrag}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpenEdit()
      }}
      onClick={(e) => e.stopPropagation()}
      title={`${startDay}日${span > 1 ? '〜' + endDay + '日' : ''}: ${event.text} (ドラッグで移動 / ダブルクリックで編集)`}
    >
      {kind === 'milestone' && <div className="vA-event-diamond" />}
      <span className="vA-event-label">{event.text}</span>
    </div>
  )
}

// ============================================================
// Process Row — 1工程行 (drag bar, sub-task chips, status badge)
// ============================================================
type BarDragKind = 'move' | 'resize-start' | 'resize-end'

function ProcessRow({
  step,
  isLastInLot,
  onCommitStep,
  onOpenDetail,
}: {
  step: Step
  isLastInLot: boolean
  onCommitStep: (patch: Partial<Step>) => void
  onOpenDetail: () => void
}) {
  const dragRef = useRef<{
    kind: BarDragKind
    startX: number
    startStart: string
    startEnd: string
    startNotes: Note[]
    moved: boolean
  } | null>(null)
  const [draftBar, setDraftBar] = useState<{ start: string; end: string; notes?: Note[] } | null>(null)

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const deltaPx = e.clientX - drag.startX
      if (!drag.moved && Math.abs(deltaPx) >= DRAG_THRESHOLD) drag.moved = true
      if (!drag.moved) return
      const deltaDays = Math.round(deltaPx / DAY_W)
      let start = drag.startStart
      let end = drag.startEnd
      let notes: Note[] | undefined
      if (drag.kind === 'move') {
        start = clampDate(addDays(drag.startStart, deltaDays))
        end = clampDate(addDays(drag.startEnd, deltaDays))
        const realDelta = dayOfMonth(start) - dayOfMonth(drag.startStart)
        notes = drag.startNotes.map((n) => ({
          ...n,
          startDate: clampDate(addDays(n.startDate, realDelta)),
          endDate: clampDate(addDays(n.endDate, realDelta)),
        }))
      } else if (drag.kind === 'resize-start') {
        const cand = clampDate(addDays(drag.startStart, deltaDays))
        start = cand <= drag.startEnd ? cand : drag.startEnd
      } else if (drag.kind === 'resize-end') {
        const cand = clampDate(addDays(drag.startEnd, deltaDays))
        end = cand >= drag.startStart ? cand : drag.startStart
      }
      setDraftBar({ start, end, ...(notes ? { notes } : {}) })
    }
    function onUp() {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      if (drag.moved && draftBar) {
        const patch: Partial<Step> = { startDate: draftBar.start, endDate: draftBar.end }
        if (draftBar.notes) patch.notes = draftBar.notes
        onCommitStep(patch)
      }
      setDraftBar(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draftBar, onCommitStep])

  function startBarDrag(kind: BarDragKind, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      kind,
      startX: e.clientX,
      startStart: step.startDate,
      startEnd: step.endDate,
      startNotes: step.notes,
      moved: false,
    }
  }

  const display = draftBar ?? { start: step.startDate, end: step.endDate }
  const displayNotes = draftBar?.notes ?? step.notes
  const startDay = dayOfMonth(display.start)
  const endDay = dayOfMonth(display.end)
  const span = endDay - startDay + 1
  const status: StepStatus = step.status ?? 'planned'
  const meta = STEP_STATUS_META[status]
  const barColor = step.color ?? meta.color

  return (
    <div className={'vA-row ' + (isLastInLot ? 'vA-row-lastInLot' : '')}>
      <div className="vA-leftcols">
        <div className="vA-col vA-col-tank" />
        <div className="vA-col vA-col-id" />
        <div className="vA-col vA-col-kubun" />
        <div className="vA-col vA-col-process">
          <span className="vA-proc-code">{step.name}</span>
          <span className="vA-proc-label">{step.label ?? ''}</span>
        </div>
        <div className="vA-col vA-col-status">
          <span
            className="vA-status-badge"
            style={{
              background: meta.color + '22',
              color: meta.color,
              borderColor: meta.color + '55',
            }}
          >
            {meta.ja}
          </span>
        </div>
      </div>
      <div className="vA-timeline-body">
        {DAYS.map((d) => (
          <div
            key={d}
            className={'vA-cell' + (isWeekendDay(d) ? ' vA-we' : '') + (d === TODAY_DAY ? ' vA-today' : '')}
          />
        ))}
        <div
          className="vA-bar"
          style={{
            left: (startDay - 1) * DAY_W,
            width: span * DAY_W - 2,
            background: barColor,
            borderColor: barColor,
          }}
          onPointerDown={(e) => startBarDrag('move', e)}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onOpenDetail()
          }}
          title={`${step.label ?? step.name}: ${startDay}日〜${endDay}日`}
        >
          <div
            className="vA-bar-handle vA-bar-handle-l"
            onPointerDown={(e) => startBarDrag('resize-start', e)}
          />
          <div className="vA-bar-grip">
            {displayNotes.map((note) => {
              const nStart = dayOfMonth(note.startDate)
              const nEnd = dayOfMonth(note.endDate)
              const nSpan = nEnd - nStart + 1
              const offsetDays = nStart - startDay
              return (
                <div
                  key={note.id}
                  className="vA-subchip"
                  style={{
                    left: offsetDays * DAY_W + 1,
                    width: nSpan * DAY_W - 3,
                    background: note.color ?? 'rgba(255,255,255,.25)',
                    color: note.color ? '#1c1c19' : 'inherit',
                  }}
                  title={`${nStart}日: ${note.text}`}
                >
                  <span className="vA-subchip-label">{note.text || '—'}</span>
                </div>
              )
            })}
          </div>
          <div
            className="vA-bar-handle vA-bar-handle-r"
            onPointerDown={(e) => startBarDrag('resize-end', e)}
          />
        </div>
      </div>
    </div>
  )
}
