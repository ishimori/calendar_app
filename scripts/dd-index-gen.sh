#!/usr/bin/env bash
# dd-index-gen.sh
# doc/DD/ と doc/archived/DD/ をスキャンして doc/DD/DD-INDEX.md を再生成する。
#
# 仕様:
# - DD本体ファイル名規約: DD-{番号}_{タイトル}.md  (例: DD-001_xxx.md, DD-001-1_yyy.md)
# - DD本体内の "| 作成日 | 更新日 | ステータス |" の直後の行からステータスを取得
# - ステータスは「進行中 / 未着手 / 保留 / 見送り / 完了」を想定
# - 進行中・未着手 -> 進行中セクション
# - 保留・見送り -> 保留・見送りセクション (理由は空欄)
# - 完了 -> 完了済みセクション (アーカイブ済み含む)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DD_DIR="$REPO_ROOT/doc/DD"
ARCHIVE_DIR="$REPO_ROOT/doc/archived/DD"
INDEX_FILE="$DD_DIR/DD-INDEX.md"

if [[ ! -d "$DD_DIR" ]]; then
  echo "ERROR: $DD_DIR が存在しません" >&2
  exit 1
fi

# 一時ファイル
TMP_IN_PROGRESS="$(mktemp)"
TMP_ON_HOLD="$(mktemp)"
TMP_DONE="$(mktemp)"
trap 'rm -f "$TMP_IN_PROGRESS" "$TMP_ON_HOLD" "$TMP_DONE"' EXIT

# DDファイルを1件処理: $1=ファイルパス, $2=archived(true/false)
process_dd() {
  local file="$1"
  local archived="$2"
  local basename
  basename="$(basename "$file")"

  # DD-001_xxx.md / DD-001-1_xxx.md からDD番号とタイトルを抽出
  if [[ ! "$basename" =~ ^(DD-[0-9]+(-[0-9]+)?)_(.+)\.md$ ]]; then
    return
  fi
  local dd_no="${BASH_REMATCH[1]}"
  local title="${BASH_REMATCH[3]}"

  # ステータス抽出: メタテーブル直後の行の3列目を取る
  # | 作成日 | 更新日 | ステータス |
  # |--------|--------|------------|
  # | xxx    | yyy    | 進行中     |
  local status
  status="$(awk '
    /^\| 作成日 \| 更新日 \| ステータス \|/ { found=1; next }
    found && /^\|[-| ]+\|$/ { next }
    found && /^\|/ {
      # 3列目を抽出
      n = split($0, a, "|")
      gsub(/^[ \t]+|[ \t]+$/, "", a[4])
      print a[4]
      exit
    }
  ' "$file")"

  status="${status:-不明}"

  # アーカイブ済みなら完了扱い
  if [[ "$archived" == "true" ]]; then
    status="完了"
  fi

  # リンクパス
  local link
  if [[ "$archived" == "true" ]]; then
    link="../archived/DD/${basename}"
  else
    link="${basename}"
  fi

  local row="| [${dd_no}](${link}) | ${title} | ${status} |"
  local done_row="| [${dd_no}](${link}) | ${title} |  |"

  case "$status" in
    進行中|未着手)
      echo "$row" >> "$TMP_IN_PROGRESS"
      ;;
    保留|見送り)
      echo "| [${dd_no}](${link}) | ${title} |  |" >> "$TMP_ON_HOLD"
      ;;
    完了)
      echo "$done_row" >> "$TMP_DONE"
      ;;
    *)
      # 不明なステータスは進行中セクションに入れる(警告付き)
      echo "WARN: ${basename} のステータスが不明 ($status)" >&2
      echo "$row" >> "$TMP_IN_PROGRESS"
      ;;
  esac
}

# doc/DD/ 配下のDDファイルをスキャン (DD-INDEX.md は除外)
shopt -s nullglob
for f in "$DD_DIR"/DD-*.md; do
  [[ "$(basename "$f")" == "DD-INDEX.md" ]] && continue
  process_dd "$f" "false"
done

# doc/archived/DD/ 配下もスキャン
if [[ -d "$ARCHIVE_DIR" ]]; then
  for f in "$ARCHIVE_DIR"/DD-*.md; do
    process_dd "$f" "true"
  done
fi
shopt -u nullglob

# DD番号でソート (自然順)
sort_by_dd_no() {
  # 行頭の [DD-XXX-Y](...) からXXX-Yを取り出してソートキーに
  awk -F'[][]' '{
    # $2 = "DD-001-1" のような値
    n = split($2, parts, "-")
    pad_main = sprintf("%05d", parts[2])
    pad_sub = (n >= 3 ? sprintf("%05d", parts[3]) : "00000")
    printf "%s-%s\t%s\n", pad_main, pad_sub, $0
  }' | sort | cut -f2-
}

# インデックスファイル書き出し
{
  echo "# DD 索引"
  echo ""
  echo "DDを作成・完了・アーカイブする都度、このファイルを更新すること。"
  echo "このファイルは scripts/dd-index-gen.sh で自動生成される。"
  echo ""
  echo "## 進行中"
  echo ""
  echo "| DD | 件名 | ステータス |"
  echo "|----|------|-----------|"
  if [[ -s "$TMP_IN_PROGRESS" ]]; then
    sort_by_dd_no < "$TMP_IN_PROGRESS"
  fi
  echo ""
  echo "## 保留・見送り"
  echo ""
  echo "| DD | 件名 | 理由 |"
  echo "|----|------|------|"
  if [[ -s "$TMP_ON_HOLD" ]]; then
    sort_by_dd_no < "$TMP_ON_HOLD"
  fi
  echo ""
  echo "## 完了済み"
  echo ""
  echo "| DD | 件名 | 主な成果 |"
  echo "|----|------|---------|"
  if [[ -s "$TMP_DONE" ]]; then
    sort_by_dd_no < "$TMP_DONE"
  fi
  echo ""
} > "$INDEX_FILE"

echo "Generated: $INDEX_FILE"
