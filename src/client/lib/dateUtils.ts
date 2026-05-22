// "YYYY-MM-DD" 形式の日付ユーティリティ。Date 型は使わない(タイムゾーンずれ防止)。

const MONTH_START = '2026-05-01'
const MONTH_END = '2026-05-31'

export const monthStart = MONTH_START
export const monthEnd = MONTH_END

const CAL_YEAR = Number(MONTH_START.slice(0, 4))
const CAL_MONTH_1 = Number(MONTH_START.slice(5, 7)) // 1-indexed
const CAL_MONTH_0 = CAL_MONTH_1 - 1 // JS の月は 0-indexed

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

export function weekdayOf(day: number): string {
  return WEEKDAYS_JA[new Date(CAL_YEAR, CAL_MONTH_0, day).getDay()]!
}

export function isWeekendDay(day: number): boolean {
  const w = new Date(CAL_YEAR, CAL_MONTH_0, day).getDay()
  return w === 0 || w === 6
}

/**
 * 現在日が表示中の月（monthStart の月）に含まれるなら day を返す。
 * 含まれなければ -1（today マーカーを描画しない）。
 */
export function todayDayInCalendar(): number {
  const now = new Date()
  if (now.getFullYear() === CAL_YEAR && now.getMonth() === CAL_MONTH_0) {
    return now.getDate()
  }
  return -1
}

/** "M/D" を "YYYY-MM-DD" に。表示中カレンダーの年を採用。 */
export function parseDateLabel(label: string): string | null {
  const m = label.trim().match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [, mm, dd] = m
  return `${CAL_YEAR}-${mm!.padStart(2, '0')}-${dd!.padStart(2, '0')}`
}

export function* dateRange(start: string, end: string): Generator<string> {
  const [sy, sm, sd] = start.split('-').map(Number) as [number, number, number]
  const [ey, em, ed] = end.split('-').map(Number) as [number, number, number]
  let y = sy
  let m = sm
  let d = sd
  while (y < ey || (y === ey && m < em) || (y === ey && m === em && d <= ed)) {
    yield `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    d += 1
    const dim = daysInMonth(y, m)
    if (d > dim) {
      d = 1
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
  }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function isWithin(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

export function shortLabel(date: string): string {
  // "2026-06-01" -> "6/1"
  const [, mm, dd] = date.split('-')
  return `${Number(mm)}/${Number(dd)}`
}

export function rangeLabel(start: string, end: string): string {
  return `${shortLabel(start)}〜${shortLabel(end)}`
}

export function parseRangeLabel(label: string): { start: string; end: string } | null {
  // "6/1〜6/3" -> {start:"2026-06-01", end:"2026-06-03"}
  const m = label.trim().match(/^(\d{1,2})\/(\d{1,2})\s*[〜~～]\s*(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [, sm, sd, em, ed] = m
  const year = monthStart.slice(0, 4)
  return {
    start: `${year}-${sm!.padStart(2, '0')}-${sd!.padStart(2, '0')}`,
    end: `${year}-${em!.padStart(2, '0')}-${ed!.padStart(2, '0')}`,
  }
}

export function dayOfMonth(date: string): number {
  return Number(date.split('-')[2])
}

export function dateOfDay(day: number): string {
  return `${monthStart.slice(0, 7)}-${String(day).padStart(2, '0')}`
}

export function diffDays(start: string, end: string): number {
  // start と end の間の日数 (両端含む)
  let count = 0
  for (const _ of dateRange(start, end)) count += 1
  return count
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const base = Date.UTC(y, m - 1, d)
  const out = new Date(base + n * 86400000)
  const yy = out.getUTCFullYear()
  const mm = String(out.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(out.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
