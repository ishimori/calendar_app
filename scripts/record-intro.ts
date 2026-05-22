// DD-001-8: 紹介動画録画スクリプト
// 使い方:
//   npm run dev:all              # BE(3025) + FE(5198) を別ターミナルで起動
//   npm run db:reset && npm run db:seed   # クリーンなシード状態にする
//   npx tsx scripts/record-intro.ts       # 録画実行（30 秒前後の webm + ステップ別 png）
//
// 出力: doc/DD/DD-001-8/
//   - intro.webm  (約 30〜45 秒)
//   - 01-sheet1-overview.png .. 08-detail-modal.png
//
// 終了後は DB が触られた状態なので、必要なら再度 `npm run db:seed` で戻す。

import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'doc', 'DD', 'DD-001-8')
const BASE_URL = process.env.DEMO_BASE_URL ?? 'http://localhost:5198'
const VIEWPORT = { width: 1600, height: 900 }

// ============================================================
// オーバーレイ（キャプション）注入
// ============================================================
const OVERLAY_CSS = `
#__demo-overlay {
  position: fixed; inset: 0; pointer-events: none;
  z-index: 2147483647;
  font-family: "Hiragino Sans", "Noto Sans JP", "Segoe UI", system-ui, sans-serif;
}
#__demo-overlay .demo-caption {
  position: absolute;
  bottom: 32px; left: 50%; transform: translate(-50%, 12px);
  max-width: 720px;
  padding: 12px 22px;
  background: rgba(15, 23, 42, 0.92);
  color: white;
  border-radius: 999px;
  box-shadow: 0 12px 36px rgba(0,0,0,.32);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.02em;
  opacity: 0;
  transition: opacity 280ms ease-out, transform 280ms ease-out;
}
#__demo-overlay .demo-caption.visible { opacity: 1; transform: translate(-50%, 0); }
#__demo-overlay .demo-cover {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; color: white;
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
  opacity: 0;
  transition: opacity 400ms ease-out;
}
#__demo-overlay .demo-cover.visible { opacity: 1; }
#__demo-overlay .demo-cover .title {
  font-size: 60px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 18px;
  text-shadow: 0 6px 24px rgba(0,0,0,.3);
}
#__demo-overlay .demo-cover .subtitle {
  font-size: 22px; font-weight: 400; opacity: .85; max-width: 760px;
}
`

async function installOverlay(page: Page): Promise<void> {
  await page.evaluate((css) => {
    if (document.getElementById('__demo-overlay-style')) return
    const style = document.createElement('style')
    style.id = '__demo-overlay-style'
    style.textContent = css
    document.head.appendChild(style)
    const root = document.createElement('div')
    root.id = '__demo-overlay'
    document.body.appendChild(root)
  }, OVERLAY_CSS)
}

async function caption(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => {
    const root = document.getElementById('__demo-overlay')!
    let el = root.querySelector('.demo-caption') as HTMLDivElement | null
    if (!el) {
      el = document.createElement('div')
      el.className = 'demo-caption'
      root.appendChild(el)
    }
    el.textContent = t
    requestAnimationFrame(() => el!.classList.add('visible'))
  }, text)
}

async function clearCaption(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.querySelector('#__demo-overlay .demo-caption') as HTMLDivElement | null
    if (el) el.classList.remove('visible')
  })
}

async function showCover(page: Page, title: string, subtitle: string): Promise<void> {
  await page.evaluate(({ title, subtitle }) => {
    const root = document.getElementById('__demo-overlay')!
    let el = root.querySelector('.demo-cover') as HTMLDivElement | null
    if (!el) {
      el = document.createElement('div')
      el.className = 'demo-cover'
      root.appendChild(el)
    }
    el.innerHTML = `<div class="title">${title}</div><div class="subtitle">${subtitle}</div>`
    requestAnimationFrame(() => el!.classList.add('visible'))
  }, { title, subtitle })
}

async function hideCover(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.querySelector('#__demo-overlay .demo-cover') as HTMLDivElement | null
    if (el) el.classList.remove('visible')
  })
}

// ============================================================
// ヘルパー
// ============================================================
async function snap(page: Page, name: string): Promise<void> {
  // 撮影時はキャプションを一旦消してクリーンに撮る
  const wasCaption = await page.evaluate(() =>
    document.querySelector('#__demo-overlay .demo-caption.visible') !== null
  )
  if (wasCaption) await clearCaption(page)
  await page.waitForTimeout(150)
  await page.screenshot({ path: resolve(OUT_DIR, name), fullPage: false })
  console.log(`  📸 ${name}`)
}

async function dragByPixels(
  page: Page,
  selector: string,
  dx: number,
  dy: number,
  steps = 20,
): Promise<void> {
  const el = await page.locator(selector).first().boundingBox()
  if (!el) throw new Error(`element not found: ${selector}`)
  const fromX = el.x + el.width / 2
  const fromY = el.y + el.height / 2
  await page.mouse.move(fromX, fromY)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await page.mouse.move(fromX + dx * t, fromY + dy * t)
    await page.waitForTimeout(15)
  }
  await page.mouse.up()
}

// ============================================================
// メインシーケンス
// ============================================================
async function main(): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUT_DIR, size: VIEWPORT },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const video = page.video()

  try {
    // ── タイトルカード ────────────────────────────────
    await page.goto(`${BASE_URL}/sheet`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.s1-table', { timeout: 10_000 })
    await installOverlay(page)
    await showCover(page, '製造ライン カレンダーアプリ', '業務一覧（シート1） × ガント（シート2）の 1モデル 2ビュー')
    await page.waitForTimeout(2800)
    await hideCover(page)
    await page.waitForTimeout(600)

    // ── 1. シート1 ────────────────────────────────────
    await caption(page, 'シート1: タンク単位でロットをグルーピング、工程セルは編集可能')
    await page.waitForTimeout(2200)
    await snap(page, '01-sheet1-overview.png')

    // 1セルだけハイライト用にホバーしておく
    await page.locator('td.s1-td-proc').first().hover()
    await page.waitForTimeout(900)
    await clearCaption(page)

    // ── 2. ガント切替 ────────────────────────────────
    await page.locator('a.s1-tab', { hasText: 'ガント' }).click()
    await page.waitForSelector('.vA-grid', { timeout: 5_000 })
    await installOverlay(page) // ページ遷移後に再注入
    await page.waitForTimeout(700)
    await caption(page, 'シート2: ガント。左 5 列（タンク/ロット/区分/工程/状態）＋ 1ロット = 全体行 + 工程 A〜E')
    await page.waitForTimeout(2400)
    await snap(page, '02-gantt-overview.png')
    await clearCaption(page)

    // ── 3. 工程バーをドラッグ移動 ─────────────────────
    await caption(page, '工程バーは横ドラッグで移動、両端で期間を伸縮')
    await page.waitForTimeout(1200)
    // 2 番目のバー (L-2401 の B 塗布) を右に 2 日分 = 60px 移動
    await dragByPixels(page, '.vA-bar >> nth=1', 60, 0)
    await page.waitForTimeout(900)
    await snap(page, '03-bar-after-drag.png')
    await clearCaption(page)

    // ── 4. タンクフィルタ展開 ─────────────────────────
    await caption(page, 'タンクフィルタ: 多選択で表示するタンクを切り替え')
    await page.waitForTimeout(900)
    await page.locator('.vA-tankfilter-btn').click()
    await page.waitForTimeout(900)
    await snap(page, '04-tank-filter-open.png')

    // T-02 を OFF
    await page.locator('.vA-tankfilter-popup .vA-tankfilter-row', { hasText: 'T-02' }).click()
    await page.waitForTimeout(700)
    // 外側クリックでクローズ
    await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height - 80)
    await page.waitForTimeout(700)
    await snap(page, '05-tank-filtered.png')

    // 戻す: T-02 を再選択（現在 T-01/T-03 のみ ON → 全 ON にするだけでOK）
    await page.locator('.vA-tankfilter-btn').click()
    await page.waitForTimeout(400)
    await page.locator('.vA-tankfilter-popup .vA-tankfilter-row', { hasText: 'T-02' }).click()
    await page.waitForTimeout(400)
    await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height - 80)
    await page.waitForTimeout(700)
    await clearCaption(page)

    // ── 5. イベント編集ダイアログ ─────────────────────
    await caption(page, 'マイルストーンをダブルクリックで名前編集／削除のカスタムダイアログ')
    await page.waitForTimeout(900)
    // L-2401 の 顧客レビュー（◆ で text-content 'レビュー' を含む milestone）
    const reviewEvent = page.locator('.vA-event-milestone', { hasText: '顧客レビュー' }).first()
    await reviewEvent.dblclick()
    await page.waitForSelector('.md-card-sm', { timeout: 3000 })
    await page.waitForTimeout(900)
    await snap(page, '06-event-dialog.png')
    // 名前を変更して保存
    const nameInput = page.locator('.md-card-sm input[type="text"]').first()
    await nameInput.fill('')
    await nameInput.pressSequentially('重要レビュー', { delay: 70 })
    await page.waitForTimeout(500)
    await page.locator('.mdA-btn-primary', { hasText: '保存' }).click()
    await page.waitForTimeout(900)
    await clearCaption(page)

    // ── 6. イベントを横ドラッグ ───────────────────────
    await caption(page, 'イベント自体も横ドラッグで日付を移動')
    await page.waitForTimeout(900)
    // ◆出荷予定 を左に 2 日分 = -60px
    await dragByPixels(page, '.vA-event-milestone:has-text("出荷予定")', -60, 0)
    await page.waitForTimeout(900)
    await snap(page, '07-event-after-drag.png')
    await clearCaption(page)

    // ── 7. 工程詳細モーダル ───────────────────────────
    await caption(page, '工程バーのダブルクリックで詳細モーダル: 開始/終了/状態/日別作業を編集')
    await page.waitForTimeout(900)
    await page.locator('.vA-bar >> nth=1').dblclick()
    await page.waitForSelector('.md-card', { timeout: 3000 })
    await page.waitForTimeout(1100)
    await snap(page, '08-detail-modal.png')
    await page.waitForTimeout(700)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
    await clearCaption(page)

    // ── エンドカード ──────────────────────────────────
    await showCover(page, '1 モデル 2 ビュー', 'シート1 とガントは同じ JobData を編集 → サーバ往復で自動同期')
    await page.waitForTimeout(2800)
    await hideCover(page)
    await page.waitForTimeout(400)
  } finally {
    await page.close()
    await context.close()
    await browser.close()
  }

  // 動画ファイル名の確定（UUID → intro.webm）
  const origPath = await video?.path().catch(() => null)
  if (origPath && existsSync(origPath)) {
    const target = resolve(OUT_DIR, 'intro.webm')
    if (existsSync(target)) rmSync(target)
    renameSync(origPath, target)
    console.log(`\n🎬 動画: ${target}`)
  } else {
    console.warn('⚠️  動画パスが取得できませんでした')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
