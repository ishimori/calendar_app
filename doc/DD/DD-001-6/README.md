# Handoff: 製造ライン ガントチャート / カレンダー UI 再設計

## Overview
Excel で運用していた製造ライン（フォトレジスト製造工程）のスケジュール管理アプリの UI/UX 改善案。生産管理者が予定を入力するための「シート1（業務一覧）」と「シート2（ガント）」の 2 画面構成。

主な改善ポイント:
- セル / バーをクリック・ドラッグドロップで直接編集できる操作感
- タンク単位で複数ロットをグルーピング（タンク内に複数ロットが入る前提）
- 工程行に加えて「全体」行を追加し、工程に紐づかないイベント（着手・材料着荷・出荷予定など）を配置可能
- ロット範囲を視覚的に表示（タンク内ロットの開始〜終了）
- 工程セル内に日別作業（サブタスク）チップを表示
- 多選択タンクフィルタ

## About the Design Files
本パッケージの `design/` 配下のファイルは **HTML で作成したデザインリファレンス**です。プロダクションコードとしてそのまま組み込むためのものではなく、見た目と挙動の意図を示すプロトタイプです。

実装タスクは **このデザインを、対象プロジェクトの既存環境（React / Vue / etc.）と既存パターン・ライブラリで再現する** ことです。既存環境がない場合は最適なフレームワークを選定して実装してください。

デザインファイルは React + JSX で書かれていますが、これは作成プロトタイプの構造を示しているだけで、実装言語の指定ではありません。

## Fidelity
**High-fidelity (hifi)**: 配色・タイポグラフィ・余白・インタラクションは最終仕様に近いレベル。既存ライブラリ・デザインシステムを使いつつ、ピクセル単位で再現してください。

## Screens / Views

### 1. シート1 — 業務一覧（テーブルビュー）
**Purpose**: 生産管理者がロットの全体像・複数工程のバランスを把握し、日付範囲を一気に入力する。

**Layout**:
- 縦方向: ツールバー (高さ ~40px) / レジェンド (~25px) / テーブル本体 (flex 1) / フッター (~30px)
- テーブル列順 (左→右): `行No. | タンク | ロット | 大区分 | 担当 | コメント | 工程A | 工程B | 工程C | 工程D | 工程E | 操作`
- ヘッダー sticky（縦スクロール時に追従）

**Components**:

#### 1-1. ツールバー
- 左: タブ切替 (`業務一覧` / `ガント`)、月ナビ (`‹ 2026年 5月 ›`)、タンクフィルタ、検索ボックス
- 右: ステータスチップ（`進行中 12` / `遅延 1`）、`列カスタマイズ`、`CSV 出力`、`+ ロット追加`（プライマリ）
- 背景: `#ffffff` / 下境界: `1px solid #e3e3df`

#### 1-2. 行 (rows)
- 高さ: `34px` (normal) / `30px` (compact) / `42px` (comfy)
- ホバー時: `background: rgba(29, 78, 216, 0.025)`
- 同一タンク内の最後の行は下境界を `2px solid` で強調しタンクグループを区切る
- 空行（追加用）: 同じ高さでセルは空欄 + プレースホルダー表示

#### 1-3. タンクセル (merged)
- `<td rowSpan={n}>` で同一タンクの複数ロットをマージ
- 背景: `#f7f7f5` (var(--bg))
- 中央寄せ、タンク ID (`T-01` 等 / 13px, bold) + 「2ロット」バッジ (9px, 灰色背景)
- 右境界: `2px solid` で本体テーブルと視覚的に分離

#### 1-4. 編集可能セル (Editable)
- 通常時はプレーンテキスト表示（`12px`, color: `var(--ink)`）
- クリック (focus) で背景白 + `box-shadow: inset 0 0 0 1.5px #1d4ed8`（青い枠線）
- 等幅数字が必要な列（ロット ID, 日付）には `font-variant-numeric: tabular-nums`
- Tab で次セル、Esc でキャンセル（仕様）

#### 1-5. 工程セル
- 内容: `5/11〜5/15` 形式のプレーンテキスト
- ホバー: `background: rgba(29, 78, 216, 0.04)`、カーソル `text`
- 遅延 (overdue) ステータス: 背景 `rgba(229, 72, 77, 0.06)`、テキスト `#c83a3f` bold
- **ダブルクリックで詳細編集モーダルを開く**

#### 1-6. 操作ボタン
- `複製` / `削除` の 2 ボタン
- 通常時 `opacity: 0`、行ホバー時に `opacity: 1`
- `削除` ホバー: 背景 `#fee`、文字 `#c83a3f`、境界 `#fcc`

#### 1-7. フッター
- 表示行数 / 合計工程数 / 最終更新時刻 / ショートカットヒント
- 11px 灰色テキスト、`·` で区切り

### 2. シート2 — ガント（ガントチャート）
**Purpose**: 細かい日別作業と工程間の前後関係を見ながら調整する。バーをドラッグで移動 / 端をつかんで伸縮 / ダブルクリックで詳細編集モーダル。

**Layout**:
- ツールバー (~40px) → レジェンド (~25px) → ガントグリッド (flex 1)
- 左固定列: タンク (`64px`) | ロット (`110px`) | 大区分 (`56px`) | 工程 (`96px`) | 状態 (`58px`) = 合計 `384px`
- 右側: 日数 × `30px` (デフォルト)、横スクロール

**Components**:

#### 2-1. ヘッダー行
- sticky top（縦スクロール追従）
- 日付セル: 曜日 (10px 灰色) + 日番号 (11px 黒)、週末は背景 `#f0eee9` + 曜日 `#c97a4e`
- 今日列は背景 `rgba(229,72,77,.08)` + 日番号 `#e5484d` bold

#### 2-2. タンクグループ
- 同一タンクのロット群を `<div class="vA-tank-group">` でラップ
- タンク列はタンク最初のロットの「全体」行のみテキスト表示
- 残りの行は背景同色で「マージ風」表示
- タンクグループの境界: `border-bottom: 3px solid #cfcfca`

#### 2-3. ロット全体行 (`vA-row-overall`)
- 各ロットの 工程A の上に挿入
- 高さ: ロット行 +4px
- 背景: `linear-gradient(180deg, rgba(29,78,216,0.03), transparent)`
- 下境界: `1px dashed`
- 工程欄に `全` バッジ + `全体` ラベル
- 状態欄に「1〜21日」のような期間表示
- タイムライン上: **ロット範囲インジケータ** + **イベント**

#### 2-4. ロット範囲インジケータ (3 スタイル)
| スタイル | 説明 |
|---|---|
| `track` (default) | 柔らかい灰色グラデーションのピル + 両端に塗りつぶしドット |
| `ribbon` | カラフルなグラデーションバー (`#6366f1 → #8b5cf6 → #ec4899`) |
| `bracket` | コーナーブラケット (`[ ─── ]`) スタイル |

#### 2-5. イベント
- 種類: `milestone`（点状）と `event`（期間）
- マイルストーン: 白背景 + 1px 灰境界 + ダイヤモンドマーカー (8px, `#1d4ed8`)
- イベント: 破線青枠 + 半透明青背景
- ホバー時に z-index 上昇、box-shadow

#### 2-6. 工程バー
- 高さ: 行高 - 6px (`3px` 上下マージン)
- スタイル: `flat` (default) / `soft` (グラデ) / `outline` (枠線)
- 色: ステータス色（done: `#22a06b`, running: `#f5a623`, planned: `#3b82f6`, overdue: `#e5484d`, blocked: `#8b8d98`）
- 内部: 1日 = 1チップで日別サブタスクを表示（`28px × 高さ-6px`）
- ホバー: 両端にリサイズハンドル (6px 幅, `rgba(0,0,0,.15)`)
- カーソル: `grab` (ホバー) / `grabbing` (アクティブ)

#### 2-7. 今日線
- タイムライン全体に縦の `1.5px solid #e5484d` ライン
- 位置: `(TODAY - 0.5) * dayW`

#### 2-8. タンクフィルタ（多選択ドロップダウン）
- ボタン: タンク数 / 選択中チップ表示（3つまで、超えたら +N）
- ポップアップ:
  - `すべて表示` トグル
  - 各タンクのチェックボックス（`✓` 表示）+ ロット数表示
  - 外側クリックで自動クローズ
- 背景白、`box-shadow: 0 8px 28px rgba(0,0,0,.12)`

### 3. 詳細編集モーダル
**Purpose**: シート1 のセル / シート2 のバーをダブルクリックで開く。工程の基本情報 + 日別作業（サブタスク）を一気に編集。

**Layout**: 600px 幅、中央配置、最大高さ 85%

**Components**:
- ヘッダー: ロット ID（小）+ 工程コード（バッジ）+ 工程名（17px bold）+ `×` クローズ
- フィールドフォーム: `開始 / 終了 / 状態 / 担当` (4 列 grid, 各列 12px input)
- 日別作業テーブル: `日付 / 作業内容 / 担当 / 状態 / ×`
  - インプットはボーダーレス、フォーカス時に `outline: 1px solid #1d4ed8`
- フッター: `キャンセル` / `保存`（プライマリ）

## Interactions & Behavior

### シート1
- セルクリック → インライン編集モード（`contentEditable`）
- フォーカス時に青い枠線（`box-shadow: inset 0 0 0 1.5px #1d4ed8`）
- 工程セルダブルクリック → 詳細モーダル
- 行ホバー → 操作ボタン表示
- Tab / Shift+Tab で前後セル移動（実装推奨）
- Esc でキャンセル（実装推奨）

### シート2
- バードラッグ → 開始日を変更（move）
- バー端ドラッグ → 期間を変更（resize）
- バーダブルクリック → 詳細モーダル
- バー上ダブルクリック → 日別作業 (サブタスク) 追加
- 全体行のイベントもドラッグ・伸縮可能
- タンクフィルタ → 選択タンクのみ表示

### モーダル
- オーバーレイクリック / `×` ボタン / Esc で閉じる
- 日別作業の行追加 / 削除
- 保存ボタンでデータを更新

## State Management

### 必要な State
```ts
type Row = {
  id: string;        // ロット ID (例: "L-2401")
  tank: string;      // タンク ID (例: "T-01")
  kubun: string;     // 大区分 (例: "区分1")
  lot: string;       // ロット名 (例: "PR-A12-Lot041")
  owner: string;     // 担当
  priority: '高' | '中' | '低';
  overall?: {
    events: Array<{
      start: number;  // 日 (1-indexed)
      end: number;
      label: string;
      kind: 'milestone' | 'event';
    }>;
  };
  processes: Array<{
    code: string;     // 'A' | 'B' | 'C' | 'D' | 'E'
    label: string;    // '前処理' / '塗布' / '露光' / '現像' / '検査出荷'
    status: 'done' | 'running' | 'planned' | 'overdue' | 'blocked';
    start: number;
    end: number;
    subTasks: Array<{ day: number; label: string }>;
  }>;
};

type ViewState = {
  density: 'compact' | 'normal' | 'comfy';
  barStyle: 'flat' | 'soft' | 'outline';
  spanStyle: 'track' | 'ribbon' | 'bracket';
  tankFilter: Set<string>;      // 表示中のタンク
  modalContext: { row: Row; process: Process } | null;
};
```

### 状態遷移
- フィルタ変更 → 表示行を再計算
- バー / セル編集 → row データを更新 → 永続化（API call）
- モーダル開閉 → modalContext set/unset

## Design Tokens

### Colors (Light theme)
```
--bg:           #f7f7f5    /* page background, head row */
--paper:        #ffffff    /* card / cell background */
--line:         #e3e3df    /* subtle border */
--line-strong:  #cfcfca    /* group separator */
--ink:          #1c1c19    /* primary text */
--ink-2:        #57574f    /* secondary text */
--ink-3:        #8b8b82    /* tertiary text / placeholder */
--we-bg:        #f0eee9    /* weekend tint */
--today:        #e5484d    /* today line + indicator */
--accent:       #1d4ed8    /* primary accent (links, focus, bars) */
```

### Status Colors
```
done:     #22a06b    /* 完了 — green */
running:  #f5a623    /* 進行中 — orange */
planned:  #3b82f6    /* 計画 — blue */
overdue:  #e5484d    /* 遅延 — red */
blocked:  #8b8d98    /* 保留 — gray */
```

ステータスチップは `背景 = color + '22'` (13% alpha), `文字 = color`, `境界 = color + '55'` (33% alpha) のパターン。

### Dark theme
```
--bg:           #16161a
--paper:        #1d1d22
--line:         #2c2c33
--line-strong:  #3a3a44
--ink:          #ececec
--ink-2:        #b6b6b6
--ink-3:        #888
--we-bg:        #1a1a1f
```

### Typography
- フォント: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`
- 基本サイズ: 12px (行内コンテンツ), 11px (ヘッダー/ラベル), 10-11px (補助情報)
- 太字: 500 (medium), 600 (semibold), 700 (bold)
- 数字の縦並べ: 等幅数字が望ましい列には `font-variant-numeric: tabular-nums`

### Spacing
- セル左右パディング: `6-10px`
- 行高: `26 / 32 / 38px` (compact / normal / comfy)
- 1日のグリッド幅: `30px` (シート2)

### Border Radius
- 通常: `3-4px` (セル, バッジ)
- ボタン: `5-6px`
- カード / モーダル: `8-10px`
- チップ: `999px` (ピル)

### Shadows
- セル: `none`（罫線のみで構成）
- 浮遊要素 (popup): `0 8px 28px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)`
- モーダル: `0 24px 60px rgba(0,0,0,.3), 0 0 0 1px rgba(0,0,0,.05)`
- バー: `0 1px 0 rgba(0,0,0,.04)`

## Assets
本デザインに画像 / アイコンファイル等はありません。すべて CSS / SVG (inline) で構成。アイコンはシンプルな SVG path を直接 JSX 内に記述しています。

実装時はプロジェクト既存のアイコンセット（Lucide / Heroicons / Material Icons 等）を使用してください。

## Files
- `design/index.html` — エントリーポイント
- `design/data.js` — サンプルデータ（ロット / タンク / 工程 / サブタスク / イベント）
- `design/sheet1.jsx` / `sheet1.css` — シート1（業務一覧）
- `design/variant-a.jsx` / `variant-a.css` — シート2（ガント）+ タンクフィルタ
- `design/modals.jsx` / `modals.css` — 詳細編集モーダル
- `design/app.jsx` — エントリ React component (DesignCanvas で 2 案を並べて表示)
- `design/design-canvas.jsx` / `design/tweaks-panel.jsx` — プロトタイプ用シェル（**実装時は不要**）

## Implementation Notes
- 既存の Excel ファイルとデータ互換性が必要であれば CSV 入出力ルートを別途検討
- ドラッグドロップは `react-dnd` / `dnd-kit` 等の既存ライブラリでの実装を推奨
- 仮想スクロール（大量行対応）: 30-100 行のケースなら不要、それ以上想定なら `react-virtual` 等
- `contentEditable` ベースの編集は ime / フォーカス管理に注意。本格的な業務アプリでは `<input>` + state 管理を推奨
- 日付計算は `date-fns` / `dayjs` 等を使用
- カラーパレットは Radix UI Colors / Tailwind Colors に近い値。既存システムにマッピング可能
