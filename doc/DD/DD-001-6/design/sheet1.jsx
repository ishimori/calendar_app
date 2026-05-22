// シート1 — テーブルビュー (planner overview)
// 業務用テーブル。ビジュアル装飾は排除し、テキストで素早く編集・スキャンできる
// ことを優先。視覚化は シート2 (ガント) に任せる。

const Sheet1 = ({ data, density = 'normal', onOpenDetail, onSwitchSheet }) => {
  const { rows, STATUS, TODAY } = data;
  const rowH = density === 'compact' ? 30 : density === 'comfy' ? 42 : 34;

  // Tank filter
  const allTanks = [...new Set(rows.map(r => r.tank))];
  const tankCounts = allTanks.reduce((acc, t) => {
    acc[t] = rows.filter(r => r.tank === t).length;
    return acc;
  }, {});
  const [tankFilter, setTankFilter] = React.useState(() => new Set(allTanks));
  const [filterOpen, setFilterOpen] = React.useState(false);
  const visibleRows = rows.filter(r => tankFilter.has(r.tank));
  const toggleTank = (t) => {
    setTankFilter(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  const allOn = tankFilter.size === allTanks.length;
  const toggleAll = () => setTankFilter(allOn ? new Set() : new Set(allTanks));

  // Group consecutive rows by tank so we can render the tank cell once
  // (rowspan-style merge) for all lots in the same tank.
  const tankGroups = [];
  visibleRows.forEach((row, i) => {
    const last = tankGroups[tankGroups.length - 1];
    if (last && last.tank === row.tank) {
      last.rows.push({ row, index: i });
    } else {
      tankGroups.push({ tank: row.tank, rows: [{ row, index: i }] });
    }
  });

  return (
    <div className="vA-root s1-root">
      {/* toolbar */}
      <div className="vA-toolbar">
        <div className="vA-toolbar-left">
          <div className="s1-tabs">
            <button className="s1-tab s1-tab-on">業務一覧</button>
            <button className="s1-tab" onClick={onSwitchSheet}>ガント</button>
          </div>
          <div className="vA-divider"/>
          <button className="vA-iconbtn" title="前へ">‹</button>
          <div className="vA-monthlabel">2026年 5月</div>
          <button className="vA-iconbtn" title="次へ">›</button>
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
          <div className="vA-search">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4"/><path d="M9 9l3 3"/></svg>
            <input placeholder="ロット / 担当 / コメントを検索" />
          </div>
        </div>
        <div className="vA-toolbar-right">
          <button className="vA-chipbtn"><span className="vA-dot" style={{background:'#f5a623'}}/> 進行中 12</button>
          <button className="vA-chipbtn"><span className="vA-dot" style={{background:'#e5484d'}}/> 遅延 1</button>
          <div className="vA-divider"/>
          <button className="vA-btn">列カスタマイズ</button>
          <button className="vA-btn">CSV 出力</button>
          <button className="vA-btn vA-btn-primary">+ ロット追加</button>
        </div>
      </div>

      {/* legend */}
      <div className="vA-legend">
        <span className="vA-legend-item">セルクリックで編集 / Tab で次セル / Esc でキャンセル</span>
        <span style={{flex:1}}/>
        <span className="vA-legend-hint">本日 5月{TODAY}日 (金)</span>
      </div>

      {/* table */}
      <div className="s1-tablewrap" style={{'--rowH': rowH+'px'}}>
        <table className="s1-table">
          <thead>
            <tr>
              <th className="s1-th s1-th-no">行No.</th>
              <th className="s1-th s1-th-tank">タンク</th>
              <th className="s1-th s1-th-id">ロット</th>
              <th className="s1-th s1-th-kubun">大区分</th>
              <th className="s1-th s1-th-owner">担当</th>
              <th className="s1-th s1-th-comment">コメント</th>
              {['A','B','C','D','E'].map(code => (
                <th key={code} className="s1-th s1-th-process">
                  <span className="vA-proc-code">{code}</span>
                  <span style={{marginLeft:6}}>{ ({A:'前処理',B:'塗布',C:'露光',D:'現像',E:'検査出荷'})[code] }</span>
                </th>
              ))}
              <th className="s1-th s1-th-ops">操作</th>
            </tr>
          </thead>
          <tbody>
            {tankGroups.map((grp) => grp.rows.map(({ row, index: ri }, idx) => {
              const procByCode = Object.fromEntries(row.processes.map(p => [p.code, p]));
              const isFirstInTank = idx === 0;
              const isLastInTank = idx === grp.rows.length - 1;
              const tankCount = grp.rows.length;
              return (
                <tr key={row.id} className={'s1-row ' + (isLastInTank?'s1-row-tank-last':'')}>
                  <td className="s1-td s1-td-no">{ri+1}</td>
                  {isFirstInTank && (
                    <td className="s1-td s1-td-tank" rowSpan={tankCount}>
                      <div className="s1-tank-cell">
                        <div className="s1-tank-id">{row.tank}</div>
                        {tankCount > 1 && <div className="s1-tank-count">{tankCount}ロット</div>}
                      </div>
                    </td>
                  )}
                  <td className="s1-td s1-td-id">
                    <Editable value={row.id} className="s1-mono"/>
                    <Editable value={row.lot} className="s1-mono s1-faint"/>
                  </td>
                  <td className="s1-td s1-td-kubun">
                    <Editable value={row.kubun}/>
                  </td>
                  <td className="s1-td s1-td-owner">
                    <Editable value={row.owner}/>
                  </td>
                  <td className="s1-td s1-td-comment">
                    <Editable value={row.priority==='高'?'優先案件 — 顧客緊急対応':'通常進行'}/>
                  </td>
                  {['A','B','C','D','E'].map(code => {
                    const p = procByCode[code];
                    if (!p) return <td key={code} className="s1-td s1-td-proc"><Editable value="" placeholder="—"/></td>;
                    const isOverdue = p.status === 'overdue';
                    return (
                      <td key={code} className={'s1-td s1-td-proc '+(isOverdue?'s1-overdue':'')}
                        onDoubleClick={() => onOpenDetail && onOpenDetail({row, process: p})}
                      >
                        <Editable value={`5/${p.start}〜5/${p.end}`} className="s1-mono"/>
                      </td>
                    );
                  })}
                  <td className="s1-td s1-td-ops">
                    <button className="s1-opbtn" title="複製">複製</button>
                    <button className="s1-opbtn s1-opbtn-danger" title="削除">削除</button>
                  </td>
                </tr>
              );
            }))}
            {/* empty rows for new lots */}
            {Array.from({length: Math.max(0, 12 - visibleRows.length)}, (_, i) => visibleRows.length + i + 1).map(n => (
              <tr key={'empty-'+n} className="s1-row s1-row-empty">
                <td className="s1-td s1-td-no">{n}</td>
                <td className="s1-td s1-td-tank"><Editable value="" placeholder=""/></td>
                <td className="s1-td s1-td-id"><Editable value="" placeholder=""/></td>
                <td className="s1-td s1-td-kubun"><Editable value="" placeholder=""/></td>
                <td className="s1-td s1-td-owner"><Editable value="" placeholder=""/></td>
                <td className="s1-td s1-td-comment"><Editable value="" placeholder=""/></td>
                {['A','B','C','D','E'].map(code => (
                  <td key={code} className="s1-td s1-td-proc"><Editable value="" placeholder=""/></td>
                ))}
                <td className="s1-td s1-td-ops">
                  <button className="s1-opbtn s1-opbtn-disabled" disabled>複製</button>
                  <button className="s1-opbtn s1-opbtn-disabled" disabled>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="s1-footer">
        <span>5 / 12 行表示</span>
        <span className="s1-footer-sep">·</span>
        <span>合計 25 工程</span>
        <span className="s1-footer-sep">·</span>
        <span>最終更新 14:32 by 田中</span>
        <span style={{flex:1}}/>
        <span>← → ↑ ↓ で移動</span>
      </div>
    </div>
  );
};

// Inline editable text cell — looks like plain text, becomes an input on focus.
const Editable = ({ value, placeholder, className }) => (
  <div
    className={'s1-editable ' + (className||'') + (value ? '' : ' s1-editable-empty')}
    contentEditable
    suppressContentEditableWarning
    data-placeholder={placeholder || ''}
  >{value}</div>
);

window.Sheet1 = Sheet1;
