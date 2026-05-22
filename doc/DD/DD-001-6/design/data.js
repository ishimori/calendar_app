// Sample data for photoresist manufacturing line.
// Process names are intentionally generic (the user redacted specifics).
window.GANTT_DATA = (function () {
  const STATUS = {
    done:     { ja: '完了',   color: '#22a06b' },
    running:  { ja: '進行中', color: '#f5a623' },
    planned:  { ja: '計画',   color: '#3b82f6' },
    overdue:  { ja: '遅延',   color: '#e5484d' },
    blocked:  { ja: '保留',   color: '#8b8d98' },
  };

  // Each row: { id, kubun, lot, owner, processes: [{ name, status, start, end, subTasks: [...] }] }
  // Day numbers are 1-indexed columns in the timeline.
  const rows = [
    {
      id: 'L-2401', tank: 'T-01', kubun: '区分1', lot: 'PR-A12-Lot041', owner: '田中', priority: '高',
      overall: { events: [
        { start: 1,  end: 1,  label: '着手',     kind: 'milestone' },
        { start: 7,  end: 7,  label: '材料着荷', kind: 'milestone' },
        { start: 14, end: 14, label: '顧客レビュー', kind: 'milestone' },
        { start: 21, end: 21, label: '出荷予定', kind: 'milestone' },
      ]},
      processes: [
        { code: 'A', label: '前処理',    status: 'done',    start: 1,  end: 5,  subTasks: [
          { day: 1, label: '洗浄' }, { day: 2, label: '洗浄' }, { day: 3, label: '乾燥' }, { day: 4, label: '計量' }, { day: 5, label: '受入検査' } ] },
        { code: 'B', label: '塗布',      status: 'running', start: 6,  end: 13, subTasks: [
          { day: 6, label: 'プライム' }, { day: 7, label: '塗布' }, { day: 8, label: '塗布' }, { day: 9, label: '塗布' }, { day: 10, label: 'ベーク' }, { day: 11, label: 'ベーク' }, { day: 12, label: '中間検査' }, { day: 13, label: '出庫' } ] },
        { code: 'C', label: '露光',      status: 'planned', start: 10, end: 14, subTasks: [
          { day: 10, label: 'マスク準備' }, { day: 11, label: '位置合わせ' }, { day: 12, label: '露光' }, { day: 13, label: '露光' }, { day: 14, label: '現像準備' } ] },
        { code: 'D', label: '現像',      status: 'planned', start: 13, end: 17, subTasks: [
          { day: 13, label: '現像' }, { day: 14, label: '現像' }, { day: 15, label: 'リンス' }, { day: 16, label: '乾燥' }, { day: 17, label: '中間検査' } ] },
        { code: 'E', label: '検査出荷',  status: 'planned', start: 19, end: 21, subTasks: [
          { day: 19, label: '外観検査' }, { day: 20, label: '寸法検査' }, { day: 21, label: '出荷' } ] },
      ],
    },
    {
      id: 'L-2402', tank: 'T-01', kubun: '区分1', lot: 'PR-A12-Lot042', owner: '田中', priority: '中',
      overall: { events: [
        { start: 3,  end: 3,  label: '着手', kind: 'milestone' },
        { start: 10, end: 12, label: '社内監査', kind: 'event' },
        { start: 23, end: 23, label: '出荷予定', kind: 'milestone' },
      ]},
      processes: [
        { code: 'A', label: '前処理',    status: 'done',    start: 3,  end: 7,  subTasks: [
          { day: 3, label: '洗浄' }, { day: 4, label: '洗浄' }, { day: 5, label: '乾燥' }, { day: 6, label: '計量' }, { day: 7, label: '受入検査' } ] },
        { code: 'B', label: '塗布',      status: 'running', start: 8,  end: 14, subTasks: [
          { day: 8, label: 'プライム' }, { day: 9, label: '塗布' }, { day: 10, label: '塗布' }, { day: 11, label: 'ベーク' }, { day: 12, label: 'ベーク' }, { day: 13, label: '中間検査' }, { day: 14, label: '出庫' } ] },
        { code: 'C', label: '露光',      status: 'planned', start: 12, end: 16, subTasks: [
          { day: 12, label: 'マスク準備' }, { day: 13, label: '位置合わせ' }, { day: 14, label: '露光' }, { day: 15, label: '露光' }, { day: 16, label: '現像準備' } ] },
        { code: 'D', label: '現像',      status: 'planned', start: 15, end: 19, subTasks: [
          { day: 15, label: '現像' }, { day: 16, label: '現像' }, { day: 17, label: 'リンス' }, { day: 18, label: '乾燥' }, { day: 19, label: '中間検査' } ] },
        { code: 'E', label: '検査出荷',  status: 'planned', start: 21, end: 23, subTasks: [
          { day: 21, label: '外観検査' }, { day: 22, label: '寸法検査' }, { day: 23, label: '出荷' } ] },
      ],
    },
    {
      id: 'L-2403', tank: 'T-02', kubun: '区分2', lot: 'PR-B07-Lot019', owner: '佐藤', priority: '高',
      overall: { events: [
        { start: 5,  end: 5,  label: '着手', kind: 'milestone' },
        { start: 13, end: 13, label: '工程切替', kind: 'event' },
        { start: 25, end: 25, label: '出荷予定', kind: 'milestone' },
      ]},
      processes: [
        { code: 'A', label: '前処理',    status: 'running', start: 5,  end: 9,  subTasks: [
          { day: 5, label: '洗浄' }, { day: 6, label: '洗浄' }, { day: 7, label: '乾燥' }, { day: 8, label: '計量' }, { day: 9, label: '受入検査' } ] },
        { code: 'B', label: '塗布',      status: 'planned', start: 10, end: 16, subTasks: [
          { day: 10, label: 'プライム' }, { day: 11, label: '塗布' }, { day: 12, label: '塗布' }, { day: 13, label: 'ベーク' }, { day: 14, label: 'ベーク' }, { day: 15, label: '中間検査' }, { day: 16, label: '出庫' } ] },
        { code: 'C', label: '露光',      status: 'planned', start: 14, end: 18, subTasks: [
          { day: 14, label: 'マスク準備' }, { day: 15, label: '位置合わせ' }, { day: 16, label: '露光' }, { day: 17, label: '露光' }, { day: 18, label: '現像準備' } ] },
        { code: 'D', label: '現像',      status: 'overdue', start: 17, end: 21, subTasks: [
          { day: 17, label: '現像' }, { day: 18, label: '現像' }, { day: 19, label: 'リンス' }, { day: 20, label: '乾燥' }, { day: 21, label: '中間検査' } ] },
        { code: 'E', label: '検査出荷',  status: 'planned', start: 23, end: 25, subTasks: [
          { day: 23, label: '外観検査' }, { day: 24, label: '寸法検査' }, { day: 25, label: '出荷' } ] },
      ],
    },
    {
      id: 'L-2404', tank: 'T-02', kubun: '区分2', lot: 'PR-B07-Lot020', owner: '佐藤', priority: '中',
      overall: { events: [
        { start: 8,  end: 8,  label: '着手', kind: 'milestone' },
        { start: 28, end: 28, label: '出荷予定', kind: 'milestone' },
      ]},
      processes: [
        { code: 'A', label: '前処理',    status: 'planned', start: 8,  end: 12, subTasks: [
          { day: 8, label: '洗浄' }, { day: 9, label: '洗浄' }, { day: 10, label: '乾燥' }, { day: 11, label: '計量' }, { day: 12, label: '受入検査' } ] },
        { code: 'B', label: '塗布',      status: 'planned', start: 13, end: 19, subTasks: [
          { day: 13, label: 'プライム' }, { day: 14, label: '塗布' }, { day: 15, label: '塗布' }, { day: 16, label: 'ベーク' }, { day: 17, label: 'ベーク' }, { day: 18, label: '中間検査' }, { day: 19, label: '出庫' } ] },
        { code: 'C', label: '露光',      status: 'planned', start: 17, end: 21, subTasks: [
          { day: 17, label: 'マスク準備' }, { day: 18, label: '位置合わせ' }, { day: 19, label: '露光' }, { day: 20, label: '露光' }, { day: 21, label: '現像準備' } ] },
        { code: 'D', label: '現像',      status: 'planned', start: 20, end: 24, subTasks: [
          { day: 20, label: '現像' }, { day: 21, label: '現像' }, { day: 22, label: 'リンス' }, { day: 23, label: '乾燥' }, { day: 24, label: '中間検査' } ] },
        { code: 'E', label: '検査出荷',  status: 'planned', start: 26, end: 28, subTasks: [
          { day: 26, label: '外観検査' }, { day: 27, label: '寸法検査' }, { day: 28, label: '出荷' } ] },
      ],
    },
    {
      id: 'L-2405', tank: 'T-03', kubun: '区分3', lot: 'PR-C03-Lot008', owner: '鈴木', priority: '低',
      overall: { events: [
        { start: 11, end: 11, label: '着手', kind: 'milestone' },
        { start: 18, end: 20, label: '装置メンテ', kind: 'event' },
        { start: 30, end: 30, label: '出荷予定', kind: 'milestone' },
      ]},
      processes: [
        { code: 'A', label: '前処理',    status: 'planned', start: 11, end: 15, subTasks: [
          { day: 11, label: '洗浄' }, { day: 12, label: '洗浄' }, { day: 13, label: '乾燥' }, { day: 14, label: '計量' }, { day: 15, label: '受入検査' } ] },
        { code: 'B', label: '塗布',      status: 'planned', start: 16, end: 22, subTasks: [
          { day: 16, label: 'プライム' }, { day: 17, label: '塗布' }, { day: 18, label: '塗布' }, { day: 19, label: 'ベーク' }, { day: 20, label: 'ベーク' }, { day: 21, label: '中間検査' }, { day: 22, label: '出庫' } ] },
        { code: 'C', label: '露光',      status: 'planned', start: 20, end: 24, subTasks: [
          { day: 20, label: 'マスク準備' }, { day: 21, label: '位置合わせ' }, { day: 22, label: '露光' }, { day: 23, label: '露光' }, { day: 24, label: '現像準備' } ] },
        { code: 'D', label: '現像',      status: 'planned', start: 23, end: 27, subTasks: [
          { day: 23, label: '現像' }, { day: 24, label: '現像' }, { day: 25, label: 'リンス' }, { day: 26, label: '乾燥' }, { day: 27, label: '中間検査' } ] },
        { code: 'E', label: '検査出荷',  status: 'planned', start: 29, end: 30, subTasks: [
          { day: 29, label: '外観検査' }, { day: 30, label: '出荷' } ] },
      ],
    },
  ];

  // Day 1 is May 1; today is day 11 (May 11) for indicator purposes.
  return {
    rows,
    STATUS,
    TODAY: 11,
    DAYS: 30, // visible in mock; real app supports 2 months
    START_DATE: new Date(2026, 4, 1), // May 2026
    // Helper: weekday letter for day index (1-based)
    weekday(day) {
      const d = new Date(2026, 4, day);
      return ['日','月','火','水','木','金','土'][d.getDay()];
    },
    isWeekend(day) {
      const d = new Date(2026, 4, day);
      return d.getDay() === 0 || d.getDay() === 6;
    },
  };
})();
