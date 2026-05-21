# CLAUDE.md

## Project

Excel運用の業務カレンダー（テーブル+ガント）を Web アプリ化。シート1/シート2 のどちらを編集しても同じ `Job.data` を更新する1モデル2ビュー。詳細は [README.md](README.md)。

**Tech Stack**: Hono + Prisma(SQLite) + React + Vite + TypeScript + Zod

## Commands

| コマンド | 用途 |
|---|---|
| `npm run dev:all` | BE(3025) + FE(5198) 同時起動 |
| `npm run dev` / `npm run dev:fe` | 個別起動 |
| `npm run dev:kill` | 全停止 |
| `npm run build` | tsc 型チェック (--noEmit) |
| `npm run db:migrate` | prisma migrate dev |
| `npm run db:seed` | シードデータ投入 |
| `npm run db:reset` | DB 全リセット (migrate reset --force) |
| `bash scripts/dd-index-gen.sh` | DD-INDEX.md 再生成 |

## 設計の核

- **データモデル**: `Job { rowNo, data: String(JSON), updatedAt }` の1テーブル。中身は JSON で動的に持つ（UIが固まったらカラム化）
- **JSON 検証**: BE/FE 共有の Zod schema (`src/lib/schemas.ts`) で必ず検証
- **日付**: `"YYYY-MM-DD"` 文字列で統一。Date 型は使わない（タイムゾーンずれ防止）
- **API**: `GET /api/jobs`, `GET /api/jobs/:rowNo`, `PUT /api/jobs/:rowNo` (upsert・JobData丸ごとPUT)
- **同期**: シート1/シート2 はどちらも同じ `Job.data` を編集する → サーバ往復で自動同期
- **ガントUI**: 自作 (pointer events + CSS Grid)。frappe-gantt 等は不採用

## DD 設計書

- 本体: `doc/DD/DD-{番号}_{タイトル}.md`（200行以内、超えるなら添付分離 or 親子分割）
- アーカイブ: `doc/archived/DD/`
- テンプレート: `doc/templates/dd_template.md` + 差分テンプレ (`dd_template_mock.md` 等)
- 詳細ルール: [doc/templates/guides.md](doc/templates/guides.md)、DA品質基準: [doc/da-method.md](doc/da-method.md)
- スキル: `/dd new|list|log|archive|search|rebuild-index`

## Reference

参考にする近傍プロジェクト: `c:\repo\nanairoware3`（Hono + Prisma + React の親構成。DBドライバのみ MySQL→SQLite に差し替えたのが本プロジェクト）
