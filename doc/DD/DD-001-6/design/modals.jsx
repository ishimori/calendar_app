// Detail edit modal — opens when user double-clicks a bar or clicks one.
// Shows full process details + per-day sub-task editor.
// Two variants:
//   ModalA: compact form (Excel-style)
//   ModalB: side drawer with rich detail
//   ModalC: per-day cell editor (matches Variant C philosophy)

const ModalShell = ({ children, onClose, variant }) => (
  <div className={'md-overlay md-'+variant} onClick={onClose}>
    <div className="md-card" onClick={e=>e.stopPropagation()}>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Variant A's modal: dense form (Excel-like)
// ─────────────────────────────────────────────────────────────
const ModalAInner = ({ context, data, onClose }) => {
  const { row, process: p } = context;
  const status = data.STATUS[p.status];
  return (<>
      <div className="mdA-header">
        <div>
          <div className="mdA-eyebrow">{row.id} · {row.kubun} · {row.lot}</div>
          <div className="mdA-title">
            <span className="mdA-pcode" style={{borderColor: status.color, color: status.color}}>{p.code}</span>
            <span>{p.label}</span>
          </div>
        </div>
        <button className="mdA-close" onClick={onClose}>×</button>
      </div>
      <div className="mdA-formrow">
        <div className="mdA-field">
          <label>開始</label>
          <input type="text" defaultValue={`5月${p.start}日`} />
        </div>
        <div className="mdA-field">
          <label>終了</label>
          <input type="text" defaultValue={`5月${p.end}日`} />
        </div>
        <div className="mdA-field">
          <label>状態</label>
          <select defaultValue={p.status}>
            <option value="done">完了</option>
            <option value="running">進行中</option>
            <option value="planned">計画</option>
            <option value="overdue">遅延</option>
          </select>
        </div>
        <div className="mdA-field">
          <label>担当</label>
          <input type="text" defaultValue={row.owner} />
        </div>
      </div>
      <div className="mdA-subhead">
        <div>日別作業</div>
        <button className="mdA-addbtn">+ 行追加</button>
      </div>
      <table className="mdA-table">
        <thead>
          <tr>
            <th style={{width: 60}}>日付</th>
            <th>作業内容</th>
            <th style={{width: 80}}>担当</th>
            <th style={{width: 70}}>状態</th>
            <th style={{width: 28}}></th>
          </tr>
        </thead>
        <tbody>
          {p.subTasks.map((st, i) => (
            <tr key={i}>
              <td className="mdA-td-day">5/{st.day}</td>
              <td><input type="text" defaultValue={st.label}/></td>
              <td><input type="text" defaultValue={row.owner}/></td>
              <td>
                <select defaultValue={st.day < data.TODAY ? 'done' : st.day === data.TODAY ? 'running' : 'planned'}>
                  <option value="done">完了</option>
                  <option value="running">進行中</option>
                  <option value="planned">計画</option>
                </select>
              </td>
              <td><button className="mdA-rowdel">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mdA-footer">
        <button className="mdA-btn">キャンセル</button>
        <button className="mdA-btn mdA-btn-primary">保存</button>
      </div>
    </>);
};
const ModalA = ({ context, onClose, data }) => {
  if (!context) return null;
  return (
    <ModalShell variant="A" onClose={onClose}>
      <ModalAInner context={context} data={data} onClose={onClose}/>
    </ModalShell>
  );
};

// ─────────────────────────────────────────────────────────────
// Variant B's modal: side drawer with rich detail
// ─────────────────────────────────────────────────────────────
const ModalBInner = ({ context, data, onClose }) => {
  const { row, process: p } = context;
  const status = data.STATUS[p.status];
  const progress = p.status==='done'?100 : p.status==='running'? 55 : p.status==='overdue'? 80 : 0;
  return (<>
      <div className="mdB-head">
        <div className="mdB-breadcrumb">
          <span>{row.id}</span>
          <span className="mdB-bc-sep">/</span>
          <span>{row.kubun}</span>
          <span className="mdB-bc-sep">/</span>
          <span className="mdB-bc-cur">{p.label}</span>
        </div>
        <button className="mdB-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div className="mdB-body">
        <div className="mdB-titlebar">
          <div className="mdB-pcode-big" style={{background: status.color}}>{p.code}</div>
          <div>
            <h2 className="mdB-title">{p.label}</h2>
            <div className="mdB-meta">
              <span className="mdB-statuspill" style={{background: status.color+'22', color: status.color}}>{status.ja}</span>
              <span>5月{p.start}日 → 5月{p.end}日</span>
              <span>·</span>
              <span>{p.end-p.start+1}日間</span>
            </div>
          </div>
        </div>

        <div className="mdB-progress">
          <div className="mdB-progress-label">
            <span>進捗</span>
            <span className="mdB-progress-num">{progress}%</span>
          </div>
          <div className="mdB-progress-bar">
            <div className="mdB-progress-fill" style={{width: progress+'%', background: status.color}}/>
          </div>
        </div>

        <div className="mdB-section">
          <div className="mdB-section-head">
            <span>プロパティ</span>
          </div>
          <div className="mdB-props">
            <div className="mdB-prop"><div className="mdB-prop-k">担当</div><div className="mdB-prop-v"><div className="mdB-avatar">{row.owner[0]}</div>{row.owner}</div></div>
            <div className="mdB-prop"><div className="mdB-prop-k">ロット</div><div className="mdB-prop-v">{row.lot}</div></div>
            <div className="mdB-prop"><div className="mdB-prop-k">優先度</div><div className="mdB-prop-v">{row.priority}</div></div>
            <div className="mdB-prop"><div className="mdB-prop-k">前工程</div><div className="mdB-prop-v mdB-prop-link">{p.code==='A'?'—':row.processes[row.processes.findIndex(x=>x.code===p.code)-1]?.label || '—'}</div></div>
          </div>
        </div>

        <div className="mdB-section">
          <div className="mdB-section-head">
            <span>日別作業 ({p.subTasks.length}件)</span>
            <button className="mdB-add">+ 追加</button>
          </div>
          <div className="mdB-tasks">
            {p.subTasks.map((st, i) => {
              const stStatus = st.day < data.TODAY ? 'done' : st.day === data.TODAY ? 'running' : 'planned';
              const stColor = data.STATUS[stStatus].color;
              return (
                <div key={i} className="mdB-task">
                  <div className="mdB-task-day">
                    <div className="mdB-task-daynum">{st.day}</div>
                    <div className="mdB-task-daywkd">{data.weekday(st.day)}</div>
                  </div>
                  <div className="mdB-task-body">
                    <div className="mdB-task-text" contentEditable suppressContentEditableWarning>{st.label}</div>
                    <div className="mdB-task-foot">
                      <span className="mdB-task-status" style={{color: stColor}}>● {data.STATUS[stStatus].ja}</span>
                      <span className="mdB-task-meta">担当 {row.owner}</span>
                    </div>
                  </div>
                  <button className="mdB-task-more">⋯</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mdB-section">
          <div className="mdB-section-head"><span>備考</span></div>
          <textarea className="mdB-notes" defaultValue="特記事項なし"/>
        </div>
      </div>
      <div className="mdB-footer">
        <button className="mdB-fbtn mdB-fbtn-danger">削除</button>
        <span style={{flex:1}}/>
        <button className="mdB-fbtn">キャンセル</button>
        <button className="mdB-fbtn mdB-fbtn-primary">保存</button>
      </div>
    </>);
};
const ModalB = ({ context, onClose, data }) => {
  if (!context) return null;
  return (
    <ModalShell variant="B" onClose={onClose}>
      <ModalBInner context={context} data={data} onClose={onClose}/>
    </ModalShell>
  );
};

// ─────────────────────────────────────────────────────────────
// Variant C's modal: per-day cell editor (large day blocks)
// ─────────────────────────────────────────────────────────────
const ModalCInner = ({ context, data, onClose }) => {
  const { row, process: p } = context;
  const status = data.STATUS[p.status];
  return (<>
      <div className="mdC-head" style={{background: status.color}}>
        <div className="mdC-head-left">
          <div className="mdC-eyebrow">{row.kubun} · {row.id} · {row.lot}</div>
          <div className="mdC-title-row">
            <div className="mdC-code-big">{p.code}</div>
            <div className="mdC-title-stack">
              <div className="mdC-title">{p.label}</div>
              <div className="mdC-sub">5月{p.start}日 〜 5月{p.end}日 · {p.end-p.start+1}日間 · {status.ja}</div>
            </div>
          </div>
        </div>
        <button className="mdC-close" onClick={onClose}>×</button>
      </div>
      <div className="mdC-body">
        <div className="mdC-toolbar">
          <span className="mdC-toolbar-lbl">日別作業</span>
          <div style={{flex:1}}/>
          <button className="mdC-tbtn">テンプレ適用</button>
          <button className="mdC-tbtn">+ 日を追加</button>
        </div>
        <div className="mdC-daygrid">
          {p.subTasks.map((st, i) => {
            const isToday = st.day === data.TODAY;
            const stStatus = st.day < data.TODAY ? 'done' : st.day === data.TODAY ? 'running' : 'planned';
            const stColor = data.STATUS[stStatus].color;
            return (
              <div key={i} className={'mdC-daycard '+(isToday?'mdC-today':'')}>
                <div className="mdC-daycard-head">
                  <div className="mdC-daycard-day">
                    <span className="mdC-daycard-num">{st.day}</span>
                    <span className="mdC-daycard-wkd">{data.weekday(st.day)}</span>
                  </div>
                  <div className="mdC-daycard-status" style={{background: stColor+'22', color: stColor}}>
                    ● {data.STATUS[stStatus].ja}
                  </div>
                </div>
                <div className="mdC-daycard-task" contentEditable suppressContentEditableWarning>{st.label}</div>
                <div className="mdC-daycard-foot">
                  <span>担当 {row.owner}</span>
                  <button className="mdC-daycard-del">削除</button>
                </div>
              </div>
            );
          })}
          <button className="mdC-daycard-add">
            <span>+</span>
            <span>日を追加</span>
          </button>
        </div>
      </div>
      <div className="mdC-footer">
        <button className="mdC-fbtn">キャンセル</button>
        <button className="mdC-fbtn mdC-fbtn-primary" style={{background: status.color}}>変更を保存</button>
      </div>
    </>);
};
const ModalC = ({ context, onClose, data }) => {
  if (!context) return null;
  return (
    <ModalShell variant="C" onClose={onClose}>
      <ModalCInner context={context} data={data} onClose={onClose}/>
    </ModalShell>
  );
};

Object.assign(window, { ModalA, ModalB, ModalC, ModalAInner, ModalBInner, ModalCInner });
