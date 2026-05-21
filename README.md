# calendar_app

Excel で運用していた業務カレンダー（業務予定表＋ガントチャート）を Web アプリ化したもの。
シート1（テーブル）とシート2（ガント）のどちらで編集しても同じデータを更新するため、Excel の数式同期が不要になる。

## 技術スタック

| 層 | 採用 |
|---|---|
| BE | Hono + TypeScript |
| ORM | Prisma |
| DB | SQLite (`prisma/dev.db`) |
| FE | React 18 + Vite + TypeScript |
| 状態管理 | TanStack Query |
| バリデーション | Zod (BE/FE 共有) |

`c:\repo\nanairoware3` と同構成（DBドライバのみ SQLite に差し替え）。

## セットアップ

```bash
npm install
npx prisma migrate dev --name init   # SQLite DB 初期化
npm run db:seed                      # サンプル業務(行No.1) 投入
```

## 起動

```bash
npm run dev:all   # BE(3025) + FE(5198) 同時起動
# 個別起動: npm run dev (BE) / npm run dev:fe (FE)
# 停止: npm run dev:kill
```

ブラウザで http://localhost:5198 を開く。

## ディレクトリ

```
calendar_app/
├── prisma/
│   ├── schema.prisma          # Job { rowNo, data:String(JSON), updatedAt }
│   └── dev.db                 # gitignore
├── src/
│   ├── index.ts               # Hono サーバエントリ
│   ├── app.ts                 # ルーティング集約
│   ├── routes/                # API: health, jobs
│   ├── lib/                   # prisma client, Zod schemas
│   └── client/
│       ├── pages/             # SheetPage(テーブル) / GanttPage(ガント)
│       ├── lib/               # api.ts, dateUtils.ts
│       └── styles.css
├── scripts/
│   ├── seed.ts                # シードデータ投入
│   ├── dev-start.sh / dev-kill.sh
│   └── dd-index-gen.sh        # DD索引自動生成
└── doc/
    ├── DD/                    # 設計書本体
    ├── archived/DD/           # 完了アーカイブ
    └── templates/             # DDテンプレート
```

## データモデル

UI 固めの段階では JSON カラムで動的に持つ（カラム化はあとで）。

```ts
// src/lib/schemas.ts
JobData = {
  category: string | null,
  comment: string | null,
  steps: { name, startDate, endDate, dailyNotes: {YYYY-MM-DD → text} }[]
}
```

API:
- `GET /api/jobs` → 全件
- `GET /api/jobs/:rowNo` → 1件
- `PUT /api/jobs/:rowNo` → upsert (JobData 丸ごと送信)

## DD 設計書

仕様変更・新機能の議論は DD (Design Document) に集約する。

| コマンド | 用途 |
|---|---|
| `/dd new タイトル` | 新規DD作成 |
| `/dd list` | 一覧 |
| `/dd log メモ` | ログ追記 |
| `/dd archive 番号` | アーカイブ |
| `/dd search キーワード` | 検索 |
| `bash scripts/dd-index-gen.sh` | DD-INDEX.md 再生成 |

- DD本体: `doc/DD/DD-{番号}_{タイトル}.md`（200行以内、超えるなら添付分離 or 親子分割）
- アーカイブ: `doc/archived/DD/`
- 詳細ルール: [doc/templates/guides.md](doc/templates/guides.md)、[doc/da-method.md](doc/da-method.md)

## 開発上の注意

- **日付**: 文字列 `"YYYY-MM-DD"` に統一。Date 型は使わない（タイムゾーンずれ防止）
- **JSON データ**: BE/FE どちらでも `JobDataSchema` (Zod) でバリデーション必須
- **同期**: 1モデル2ビュー設計。シート1/シート2 はどちらも同じ `Job.data` を編集する
