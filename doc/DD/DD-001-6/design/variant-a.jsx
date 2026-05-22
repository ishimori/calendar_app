// Variant A — "Refined Excel"
// Dense, Excel-compatible. Preserves the original grid metaphor but cleans
// up typography, adds proper sticky headers, weekend tinting, today line,
// inline drag handles, day-by-day sub-task chips inside each bar.

const VariantA = ({ data, density = 'normal', barStyle = 'flat', spanStyle = 'track', onOpenDetail, withTabs = false }) => {
  const { rows, STATUS, TODAY, DAYS } = data;
  const rowH = density === 'compact' ? 26 : density === 'comfy' ? 38 : 32;
  const dayW = 30;
  const tankW = 64;
  const leftW = 320 + tankW; // tank + lot + kubun + owner + status

  // Filter + tank grouping
  const [tankFilter, setTankFilter] = React.useState(() => new Set(rows.map(r => r.tank)));
  const [filterOpen, setFilterOpen] = React.useState(false);
  const allTanks = [...new Set(rows.map(r => r.tank))];
  const tankCounts = allTanks.reduce((acc, t) => {
    acc[t] = rows.filter(r => r.tank === t).length;
    return acc;
  }, {});

  const visibleRows = rows.filter(r => tankFilter.has(r.tank));
  const tankGroups = [];
  visibleRows.forEach(row => {
    const last = tankGroups[tankGroups.length - 1];
    if (last && last.tank === row.tank) last.lots.push(row);
    else tankGroups.push({ tank: row.tank, lots: [row] });
  });

  const toggleTank = (t) => {
    setTankFilter(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  const allOn = tankFilter.size === allTanks.length;
  const toggleAll = () => setTankFilter(allOn ? new Set() : new Set(allTanks));

  return (
    <div className="vA-root">
      {/* toolbar */}
      <div className="vA-toolbar">
        <div className="vA-toolbar-left">
          {withTabs && (
            <>
              <div className="s1-tabs">
                <button className="s1-tab">業務一覧</button>
                <button className="s1-tab s1-tab-on">ガント</button>
              </div>
              <div className="vA-divider"/>
            </>
          )}
          <button className="vA-iconbtn" title="前へ">‹</button>
          <div className="vA-monthlabel">2026年 5月</div>
          <button className="vA-iconbtn" title="次へ">›</button>
          <div className="vA-divider"/>
          <div className="vA-segment">
            <button className="vA-seg-on">日</button>
            <button>週</button>
            <button>月</button>
          </div>
          <div className="vA-divider"/>
          <TankFilter
            allTanks={allTanks}
            tankCounts={tankCounts}
            selected={tankFilter}
            onToggle={toggleTank}
            onToggleAll={toggleAll}
            allOn={allOn}
            open={filterOpen}
            setOpen={setFilterOpen}
          />
        </div>
        <div className="vA-toolbar-right">
          <button className="vA-chipbtn">
            <span className="vA-dot" style={{background:'#f5a623'}}/> 進行中 12
          </button>
          <button className="vA-chipbtn">
            <span className="vA-dot" style={{background:'#e5484d'}}/> 遅延 1
          </button>
          <div className="vA-divider"/>
          <button className="vA-btn">フィルタ</button>
          <button className="vA-btn vA-btn-primary">+ ロット追加</button>
        </div>
      </div>

      {/* legend */}
      <div className="vA-legend">
        <span className="vA-legend-item"><span className="vA-dot" style={{background:STATUS.done.color}}/>完了</span>
        <span className="vA-legend-item"><span className="vA-dot" style={{background:STATUS.running.color}}/>進行中</span>
        <span className="vA-legend-item"><span className="vA-dot" style={{background:STATUS.planned.color}}/>計画</span>
        <span className="vA-legend-item"><span className="vA-dot" style={{background:STATUS.overdue.color}}/>遅延</span>
        <span style={{flex:1}}/>
        <span className="vA-legend-hint">バーをドラッグして移動 / 端をつかんで伸縮 / ダブルクリックで詳細</span>
      </div>

      {/* grid */}
      <div className="vA-grid" style={{'--rowH': rowH+'px', '--dayW': dayW+'px', '--leftW': leftW+'px', '--tankW': tankW+'px'}}>
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
            {Array.from({length:DAYS}, (_,i)=>i+1).map(d => {
              const wkd = data.weekday(d);
              const we = data.isWeekend(d);
              return (
                <div key={d} className={'vA-day-head ' + (we?'vA-we':'') + (d===TODAY?' vA-today':'')}>
                  <div className="vA-wkd">{wkd}</div>
                  <div className="vA-dnum">{d}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* lot rows */}
        {/* tank groups */}
        {tankGroups.map((tg) => (
          <div key={tg.tank} className="vA-tank-group">
            {tg.lots.map((row, lotIdxInTank) => {
              const isFirstInTank = lotIdxInTank === 0;
              const isLastInTank = lotIdxInTank === tg.lots.length - 1;
              const lotStart = Math.min(...row.processes.map(p=>p.start));
              const lotEnd = Math.max(...row.processes.map(p=>p.end));
              return (
              <div key={row.id} className={'vA-lot-group ' + (isLastInTank ? 'vA-lot-group-tank-last' : '')}>
                {/* Overall row */}
                <div className="vA-row vA-row-overall">
                  <div className="vA-leftcols">
                    <div className="vA-col vA-col-tank">
                      {isFirstInTank && (
                        <div className="vA-tankcell">
                          <div className="vA-tank-id">{row.tank}</div>
                          {tg.lots.length > 1 && <div className="vA-tank-count">{tg.lots.length}ロット</div>}
                        </div>
                      )}
                    </div>
                    <div className="vA-col vA-col-id">
                      <div className="vA-lotcell">
                        <div className="vA-lot-id">{row.id}</div>
                        <div className="vA-lot-sub">{row.lot}</div>
                      </div>
                    </div>
                    <div className="vA-col vA-col-kubun">{row.kubun}</div>
                    <div className="vA-col vA-col-process">
                      <span className="vA-proc-code vA-proc-code-all">全</span>
                      <span className="vA-proc-label">全体</span>
                    </div>
                    <div className="vA-col vA-col-status">
                      <span className="vA-lot-range">{lotStart}〜{lotEnd}日</span>
                    </div>
                  </div>
                  <div className="vA-timeline-body">
                    {Array.from({length:DAYS}, (_,i)=>i+1).map(d => (
                      <div key={d} className={'vA-cell ' + (data.isWeekend(d)?'vA-we':'') + (d===TODAY?' vA-today':'')}/>
                    ))}
                    {/* Lot span indicator */}
                    <div className={'vA-lotspan vA-lotspan-' + spanStyle} style={{
                      left: (lotStart-1)*dayW + 2,
                      width: (lotEnd-lotStart+1)*dayW - 4,
                    }}>
                      <div className="vA-lotspan-line"/>
                      <div className="vA-lotspan-cap vA-lotspan-cap-l"/>
                      <div className="vA-lotspan-cap vA-lotspan-cap-r"/>
                    </div>
                    {/* Overall events */}
                    {(row.overall?.events || []).map((ev, i) => {
                      const evSpan = ev.end - ev.start + 1;
                      return (
                        <div
                          key={i}
                          className={'vA-event vA-event-' + ev.kind}
                          style={{
                            left: (ev.start-1)*dayW + 2,
                            width: evSpan*dayW - 4,
                          }}
                          title={`${ev.start}日${evSpan>1?'〜'+ev.end+'日':''}: ${ev.label}`}
                        >
                          {ev.kind === 'milestone' && <div className="vA-event-diamond"/>}
                          <span className="vA-event-label">{ev.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {row.processes.map((p, pi) => {
                  const span = p.end - p.start + 1;
                  const isLast = pi === row.processes.length - 1;
                  const status = STATUS[p.status];
                  return (
                    <div key={p.code} className={'vA-row ' + (isLast?'vA-row-lastInLot':'')}>
                      <div className="vA-leftcols">
                        <div className="vA-col vA-col-tank"/>
                        <div className="vA-col vA-col-id"/>
                        <div className="vA-col vA-col-kubun"/>
                        <div className="vA-col vA-col-process">
                          <span className="vA-proc-code">{p.code}</span>
                          <span className="vA-proc-label">{p.label}</span>
                        </div>
                        <div className="vA-col vA-col-status">
                          <span className="vA-status-badge" style={{
                            background: status.color + '22',
                            color: status.color,
                            borderColor: status.color + '55',
                          }}>{status.ja}</span>
                        </div>
                      </div>

                      <div className="vA-timeline-body">
                        {Array.from({length:DAYS}, (_,i)=>i+1).map(d => (
                          <div key={d} className={'vA-cell ' + (data.isWeekend(d)?'vA-we':'') + (d===TODAY?' vA-today':'')}/>
                        ))}
                        <div
                          className={'vA-bar vA-bar-'+barStyle}
                          style={{
                            left: (p.start-1)*dayW,
                            width: span*dayW - 2,
                            background: barStyle === 'outline' ? 'transparent' : status.color,
                            borderColor: status.color,
                            color: barStyle === 'outline' ? status.color : '#fff',
                          }}
                          onDoubleClick={() => onOpenDetail && onOpenDetail({row, process: p})}
                        >
                          <div className="vA-bar-handle vA-bar-handle-l"/>
                          <div className="vA-bar-grip">
                            {p.subTasks.map((st, i) => (
                              <div key={i} className="vA-subchip"
                                style={{width: dayW-3}}
                                title={`${st.day}日: ${st.label}`}
                              >
                                <span className="vA-subchip-label">{st.label}</span>
                              </div>
                            ))}
                          </div>
                          <div className="vA-bar-handle vA-bar-handle-r"/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Multi-select tank filter — chips with a dropdown.
const TankFilter = ({ allTanks, tankCounts, selected, onToggle, onToggleAll, allOn, open, setOpen }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [open]);

  const selectedList = allTanks.filter(t => selected.has(t));
  return (
    <div className="vA-tankfilter" ref={ref}>
      <button className="vA-tankfilter-btn" onClick={() => setOpen(o => !o)}>
        <span className="vA-tankfilter-icon">⌗</span>
        <span className="vA-tankfilter-label">タンク</span>
        {allOn ? (
          <span className="vA-tankfilter-summary">すべて ({allTanks.length})</span>
        ) : selected.size === 0 ? (
          <span className="vA-tankfilter-summary vA-tankfilter-empty">未選択</span>
        ) : (
          <span className="vA-tankfilter-chips">
            {selectedList.slice(0,3).map(t => <span key={t} className="vA-tankfilter-chip">{t}</span>)}
            {selectedList.length > 3 && <span className="vA-tankfilter-chip vA-tankfilter-chip-more">+{selectedList.length-3}</span>}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" style={{marginLeft: 4, opacity: .6}}><path d="M2.5 4l2.5 2.5L7.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div className="vA-tankfilter-popup">
          <button className="vA-tankfilter-row vA-tankfilter-row-all" onClick={onToggleAll}>
            <span className={'vA-tankfilter-check ' + (allOn?'vA-tankfilter-check-on':'')}>{allOn && '✓'}</span>
            <span>すべて表示</span>
            <span className="vA-tankfilter-count">{allTanks.length}</span>
          </button>
          <div className="vA-tankfilter-sep"/>
          {allTanks.map(t => {
            const on = selected.has(t);
            return (
              <button key={t} className="vA-tankfilter-row" onClick={() => onToggle(t)}>
                <span className={'vA-tankfilter-check ' + (on?'vA-tankfilter-check-on':'')}>{on && '✓'}</span>
                <span className="vA-tankfilter-tankid">{t}</span>
                <span className="vA-tankfilter-count">{tankCounts[t]} ロット</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

window.VariantA = VariantA;
window.TankFilter = TankFilter;
