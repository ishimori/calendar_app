import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import { deleteJob, fetchJobs, putJob, type JobResponse } from '../lib/api'
import type { JobData, Step } from '../../lib/schemas'
import { STEP_LABELS } from '../../lib/schemas'
import { parseRangeLabel, rangeLabel, todayDayInCalendar, weekdayOf } from '../lib/dateUtils'
import { TankFilter } from '../components/TankFilter'
import { JobDetailModal, type DetailModalContext } from '../components/JobDetailModal'

const STEP_NAMES = ['A', 'B', 'C', 'D', 'E'] as const
const MIN_ROWS = 12

function todayLabel(): string {
  const day = todayDayInCalendar()
  if (day < 0) return '本日 (カレンダー外)'
  return `本日 5月${day}日 (${weekdayOf(day)})`
}

function isEmpty(data: JobData): boolean {
  return !data.tank && !data.lotId && !data.category && !data.comment && data.steps.length === 0
}

function newId(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)
}

function setStep(data: JobData, name: string, range: { start: string; end: string } | null): JobData {
  const others = data.steps.filter((s) => s.name !== name)
  if (range === null) return { ...data, steps: others }
  const existing = data.steps.find((s) => s.name === name)
  const next: Step = {
    name,
    label: existing?.label ?? STEP_LABELS[name] ?? null,
    status: existing?.status ?? 'planned',
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

  const allTanks = useMemo(() => {
    const set = new Set<string>()
    for (const j of jobs ?? []) {
      if (j.data.tank) set.add(j.data.tank)
    }
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

  // タンクグループ作成
  const tankGroups: { tank: string | null; rows: JobResponse[] }[] = []
  visibleJobs.forEach((j) => {
    const last = tankGroups[tankGroups.length - 1]
    if (last && last.tank === j.data.tank) {
      last.rows.push(j)
    } else {
      tankGroups.push({ tank: j.data.tank, rows: [j] })
    }
  })

  const totalRows = Math.max(MIN_ROWS, visibleJobs.length + 2)
  const emptyRowsCount = Math.max(0, totalRows - visibleJobs.length)
  const emptyRowStart = visibleJobs.length + 1

  const stats = {
    running: allJobs.flatMap((j) => j.data.steps).filter((s) => s.status === 'running').length,
    overdue: allJobs.flatMap((j) => j.data.steps).filter((s) => s.status === 'overdue').length,
    visible: visibleJobs.length,
    totalSteps: visibleJobs.reduce((acc, j) => acc + j.data.steps.length, 0),
  }

  function findNextEmptyRowNo(exclude: number): number | null {
    const occupied = new Set(allJobs.map((j) => j.rowNo))
    for (let r = 1; r <= MIN_ROWS + 10; r++) {
      if (r === exclude) continue
      if (!occupied.has(r)) return r
    }
    return null
  }

  function handleDuplicate(rowNo: number) {
    const job = allJobs.find((j) => j.rowNo === rowNo)
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
      events: job.data.events.map((e) => ({ ...e, id: newId() })),
    }
    mutation.mutate({ rowNo: target, data: cloned })
  }

  function handleDelete(rowNo: number) {
    const job = allJobs.find((j) => j.rowNo === rowNo)
    if (!job || isEmpty(job.data)) return
    if (!confirm(`行No. ${rowNo} を削除しますか？`)) return
    deleteMutation.mutate(rowNo)
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

  return (
    <div className="vA-root s1-root">
      {/* toolbar */}
      <div className="vA-toolbar">
        <div className="vA-toolbar-left">
          <div className="s1-tabs">
            <NavLink to="/sheet" className="s1-tab s1-tab-on">業務一覧</NavLink>
            <NavLink to="/gantt" className="s1-tab">ガント</NavLink>
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
          <div className="vA-search">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="4" />
              <path d="M9 9l3 3" />
            </svg>
            <input placeholder="ロット / 担当 / コメントを検索" />
          </div>
        </div>
        <div className="vA-toolbar-right">
          <button className="vA-chipbtn"><span className="vA-dot" style={{ background: '#f5a623' }} /> 進行中 {stats.running}</button>
          <button className="vA-chipbtn"><span className="vA-dot" style={{ background: '#e5484d' }} /> 遅延 {stats.overdue}</button>
          <div className="vA-divider" />
          <button className="vA-btn">列カスタマイズ</button>
          <button className="vA-btn">CSV 出力</button>
          <button className="vA-btn vA-btn-primary">+ ロット追加</button>
        </div>
      </div>

      <div className="vA-legend">
        <span className="vA-legend-item">セルクリックで編集 / Enter で確定 / Esc でキャンセル / 工程セルダブルクリックで詳細</span>
        <span style={{ flex: 1 }} />
        <span className="vA-legend-hint">{todayLabel()}</span>
      </div>

      {/* table */}
      <div className="s1-tablewrap" style={{ ['--rowH' as string]: '34px' } as React.CSSProperties}>
        <table className="s1-table">
          <thead>
            <tr>
              <th className="s1-th s1-th-no">行No.</th>
              <th className="s1-th s1-th-tank">タンク</th>
              <th className="s1-th s1-th-id">ロット</th>
              <th className="s1-th s1-th-kubun">大区分</th>
              <th className="s1-th s1-th-owner">担当</th>
              <th className="s1-th s1-th-comment">コメント</th>
              {STEP_NAMES.map((code) => (
                <th key={code} className="s1-th s1-th-process">
                  <span className="s1-proc-code">{code}</span>
                  {STEP_LABELS[code]}
                </th>
              ))}
              <th className="s1-th s1-th-ops">操作</th>
            </tr>
          </thead>
          <tbody>
            {tankGroups.flatMap((grp) =>
              grp.rows.map((job, idx) => (
                <SheetRow
                  key={job.rowNo}
                  job={job}
                  isFirstInTank={idx === 0}
                  isLastInTank={idx === grp.rows.length - 1}
                  tankCount={grp.rows.length}
                  onSave={(nextData) => mutation.mutate({ rowNo: job.rowNo, data: nextData })}
                  onDuplicate={() => handleDuplicate(job.rowNo)}
                  onDelete={() => handleDelete(job.rowNo)}
                  onOpenDetail={(stepName) => openDetail(job.rowNo, job.data, stepName)}
                />
              )),
            )}
            {Array.from({ length: emptyRowsCount }, (_, i) => emptyRowStart + i).map((n) => (
              <tr key={`empty-${n}`} className="s1-row s1-row-empty">
                <td className="s1-td s1-td-no">{n}</td>
                <td className="s1-td s1-td-tank" />
                <td className="s1-td s1-td-id" />
                <td className="s1-td s1-td-kubun" />
                <td className="s1-td s1-td-owner" />
                <td className="s1-td s1-td-comment" />
                {STEP_NAMES.map((code) => (
                  <td key={code} className="s1-td s1-td-proc" />
                ))}
                <td className="s1-td s1-td-ops">
                  <button className="s1-opbtn" disabled>複製</button>
                  <button className="s1-opbtn s1-opbtn-danger" disabled>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="s1-footer">
        <span>{stats.visible} / {allJobs.length} 行表示</span>
        <span className="s1-footer-sep">·</span>
        <span>合計 {stats.totalSteps} 工程</span>
        <span style={{ flex: 1 }} />
        <span>セルクリック → 編集 / Tab → 次セル</span>
      </div>

      <JobDetailModal
        context={modalCtx}
        onClose={() => setModalCtx(null)}
        onSave={(rowNo, nextData) => mutation.mutate({ rowNo, data: nextData })}
      />
    </div>
  )
}

function SheetRow({
  job,
  isFirstInTank,
  isLastInTank,
  tankCount,
  onSave,
  onDuplicate,
  onDelete,
  onOpenDetail,
}: {
  job: JobResponse
  isFirstInTank: boolean
  isLastInTank: boolean
  tankCount: number
  onSave: (next: JobData) => void
  onDuplicate: () => void
  onDelete: () => void
  onOpenDetail: (stepName: string) => void
}) {
  const { rowNo, data } = job
  const empty = isEmpty(data)
  const stepByName = new Map<string, Step>()
  for (const s of data.steps) stepByName.set(s.name, s)

  return (
    <tr className={'s1-row ' + (isLastInTank ? 's1-row-tank-last' : '')}>
      <td className="s1-td s1-td-no">{rowNo}</td>
      {isFirstInTank ? (
        <td className="s1-td s1-td-tank" rowSpan={tankCount}>
          <div className="s1-tank-cell">
            <div className="s1-tank-id">{data.tank ?? ''}</div>
            {tankCount > 1 && data.tank && <div className="s1-tank-count">{tankCount}ロット</div>}
          </div>
        </td>
      ) : null}
      <td className="s1-td s1-td-id">
        <TextCell
          value={data.lotId ?? ''}
          className="s1-mono"
          onCommit={(v) => onSave({ ...data, lotId: v === '' ? null : v })}
        />
        <TextCell
          value={data.lotName ?? ''}
          className="s1-mono s1-faint"
          onCommit={(v) => onSave({ ...data, lotName: v === '' ? null : v })}
        />
      </td>
      <td className="s1-td s1-td-kubun">
        <TextCell
          value={data.category ?? ''}
          onCommit={(v) => onSave({ ...data, category: v === '' ? null : v })}
        />
      </td>
      <td className="s1-td s1-td-owner">
        <TextCell
          value={data.owner ?? ''}
          onCommit={(v) => onSave({ ...data, owner: v === '' ? null : v })}
        />
      </td>
      <td className="s1-td s1-td-comment">
        <TextCell
          value={data.comment ?? ''}
          onCommit={(v) => onSave({ ...data, comment: v === '' ? null : v })}
        />
      </td>
      {STEP_NAMES.map((code) => {
        const step = stepByName.get(code)
        const initial = step ? rangeLabel(step.startDate, step.endDate) : ''
        const isOverdue = step?.status === 'overdue'
        return (
          <td
            key={code}
            className={'s1-td s1-td-proc ' + (isOverdue ? 's1-overdue' : '')}
            onDoubleClick={(e) => {
              if (step) {
                e.preventDefault()
                onOpenDetail(code)
              }
            }}
          >
            <TextCell
              value={initial}
              className="s1-mono"
              onCommit={(v) => {
                const trimmed = v.trim()
                if (trimmed === '') {
                  onSave(setStep(data, code, null))
                  return
                }
                const parsed = parseRangeLabel(trimmed)
                if (parsed) {
                  onSave(setStep(data, code, parsed))
                } else {
                  alert(`形式が不正です: "${trimmed}"\n例: 5/1〜5/5`)
                }
              }}
            />
          </td>
        )
      })}
      <td className="s1-td s1-td-ops">
        <button className="s1-opbtn" onClick={onDuplicate} disabled={empty} title="この行を複製">複製</button>
        <button className="s1-opbtn s1-opbtn-danger" onClick={onDelete} disabled={empty} title="この行を削除">削除</button>
      </td>
    </tr>
  )
}

function TextCell({
  value,
  className,
  onCommit,
}: {
  value: string
  className?: string
  onCommit: (v: string) => void
}) {
  const [local, setLocal] = useState(value)
  const initial = useMemo(() => value, [value])
  useEffect(() => {
    setLocal(value)
  }, [value])
  return (
    <input
      className={'s1-editable ' + (className ?? '')}
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

