import { useEffect, useRef } from 'react'

interface TankFilterProps {
  allTanks: string[]
  tankCounts: Record<string, number>
  selected: Set<string>
  onToggle: (tank: string) => void
  onToggleAll: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

export function TankFilter({
  allTanks,
  tankCounts,
  selected,
  onToggle,
  onToggleAll,
  open,
  setOpen,
}: TankFilterProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function off(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', off, true)
    return () => document.removeEventListener('pointerdown', off, true)
  }, [open, setOpen])

  const allOn = selected.size === allTanks.length
  const selectedList = allTanks.filter((t) => selected.has(t))

  return (
    <div className="vA-tankfilter" ref={ref}>
      <button className="vA-tankfilter-btn" onClick={() => setOpen(!open)}>
        <span className="vA-tankfilter-icon">⌗</span>
        <span className="vA-tankfilter-label">タンク</span>
        {allOn ? (
          <span className="vA-tankfilter-summary">すべて ({allTanks.length})</span>
        ) : selected.size === 0 ? (
          <span className="vA-tankfilter-summary vA-tankfilter-empty">未選択</span>
        ) : (
          <span className="vA-tankfilter-chips">
            {selectedList.slice(0, 3).map((t) => (
              <span key={t} className="vA-tankfilter-chip">{t}</span>
            ))}
            {selectedList.length > 3 && (
              <span className="vA-tankfilter-chip vA-tankfilter-chip-more">
                +{selectedList.length - 3}
              </span>
            )}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft: 4, opacity: 0.6 }}>
          <path d="M2.5 4l2.5 2.5L7.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="vA-tankfilter-popup">
          <button className="vA-tankfilter-row vA-tankfilter-row-all" onClick={onToggleAll}>
            <span className={'vA-tankfilter-check ' + (allOn ? 'vA-tankfilter-check-on' : '')}>{allOn && '✓'}</span>
            <span>すべて表示</span>
            <span className="vA-tankfilter-count">{allTanks.length}</span>
          </button>
          <div className="vA-tankfilter-sep" />
          {allTanks.map((t) => {
            const on = selected.has(t)
            return (
              <button key={t} className="vA-tankfilter-row" onClick={() => onToggle(t)}>
                <span className={'vA-tankfilter-check ' + (on ? 'vA-tankfilter-check-on' : '')}>{on && '✓'}</span>
                <span className="vA-tankfilter-tankid">{t}</span>
                <span className="vA-tankfilter-count">{tankCounts[t]} ロット</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
