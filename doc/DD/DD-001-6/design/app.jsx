// App entry — composes the design canvas with all variants.

const App = () => {
  const data = window.GANTT_DATA;
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "density": "normal",
    "barStyleA": "flat",
    "spanStyle": "track",
    "dark": false
  }/*EDITMODE-END*/);

  const [modalContext, setModalContext] = React.useState(null);
  const openModal = (ctx) => setModalContext(ctx);
  const closeModal = () => setModalContext(null);

  const themeClass = t.dark ? 'dark' : '';

  return (
    <>
      <DesignCanvas>
        <DCSection
          id="planner"
          title="入力者ビュー — 生産管理者用 (2画面構成)"
          subtitle="シート1で全体像を把握 → シート2でガントを見ながら細かい前後関係を調整。同じデザイン言語で行き来できる。"
        >
          <DCArtboard id="sheet1" label="シート1 · 業務一覧 (全体像・複数工程のバランス)" width={1400} height={680}>
            <div className={themeClass} style={{height:'100%'}}>
              <Sheet1 data={data} density={t.density} onOpenDetail={openModal}/>
            </div>
          </DCArtboard>
          <DCArtboard id="sheet2" label="シート2 · ガント (細かい日別作業・前後関係)" width={1400} height={780}>
            <div className={themeClass} style={{height:'100%'}}>
              <VariantA data={data} density={t.density} barStyle={t.barStyleA} spanStyle={t.spanStyle} onOpenDetail={openModal} withTabs={true}/>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="detail"
          title="詳細編集 — モーダル"
          subtitle="シート1のセル、または シート2のバーをダブルクリックで開く。日別作業を Excel 風に一気に入力。"
        >
          <DCArtboard id="modal-A" label="コンパクトフォーム (A案準拠)" width={680} height={560}>
            <DetailPreview variant="A" data={data}/>
          </DCArtboard>
        </DCSection>

        <DCPostIt top={70} left={1400} width={220} rotate={2}>
          シート1とシート2はタブで切り替え。同じデータを別アングルから見る。
        </DCPostIt>
        <DCPostIt top={840} left={1400} width={220} rotate={-2}>
          シート2の各ロットには「全体」行を追加。工程と無関係なイベント (出荷予定など) を置ける。
        </DCPostIt>
      </DesignCanvas>

      {/* Detail modal — opens when a bar / cell is double-clicked */}
      {modalContext && <ModalA context={modalContext} onClose={closeModal} data={data}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="表示密度">
          <TweakRadio label="行の高さ" value={t.density}
            onChange={(v) => setTweak('density', v)}
            options={[{value:'compact', label:'密'},{value:'normal', label:'標準'},{value:'comfy', label:'広め'}]}/>
        </TweakSection>
        <TweakSection label="バースタイル (シート2)">
          <TweakRadio label="工程バー" value={t.barStyleA}
            onChange={(v) => setTweak('barStyleA', v)}
            options={[{value:'flat', label:'フラット'},{value:'soft', label:'グラデ'},{value:'outline', label:'枠線'}]}/>
          <TweakRadio label="ロット範囲" value={t.spanStyle}
            onChange={(v) => setTweak('spanStyle', v)}
            options={[{value:'track', label:'トラック'},{value:'ribbon', label:'リボン'},{value:'bracket', label:'括弧'}]}/>
        </TweakSection>
        <TweakSection label="テーマ">
          <TweakToggle label="ダークモード" value={t.dark}
            onChange={(v) => setTweak('dark', v)}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
};

// Tiny preview for the modal artboards — renders the modal directly without
// the overlay/portal so the user can see it without clicking.
const DetailPreview = ({ variant, data }) => {
  const row = data.rows[0];
  const proc = row.processes[1]; // 工程B which is "進行中"
  const ctx = { row, process: proc };
  return (
    <div style={{height:'100%', position:'relative', background:'#e9e7e0', overflow:'auto'}}>
      <div style={{position:'absolute', inset: 0, display:'flex', alignItems:'flex-start', justifyContent:'center', padding: 24}}>
        <div className="md-card" style={{width: 600, maxWidth: '100%', maxHeight: 'none'}}>
          <ModalAInner context={ctx} data={data}/>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { App });
