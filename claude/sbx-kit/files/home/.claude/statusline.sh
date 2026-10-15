#!/usr/bin/env bash
# Claude Code status line for Docker sandboxes only. On the host, the
# stage-line mod (claude/mods/stage-line) draws these rows under the prompt and
# settings.json has no statusLine. The sbx kit does not carry plugins, so the
# sandbox keeps this script. claude/statusline.sh is a symlink to this file.
# Change a row here and in claude/mods/stage-line/hooks/status.ts together.
#
# It lives inside the kit rather than at claude/statusline.sh because `sbx kit
# validate` rejects a symlink that escapes the kit directory, so the real bytes
# have to sit in here. Same inversion as claude-plus.md, same reason.
#
# It used to be a one-liner in settings.json that formatted epochs with BSD
# `date -r N`. On GNU coreutils that means "reference file", so it errored into
# 2>/dev/null and the rate-limit reset times silently vanished on Linux.
# fmt_epoch below handles GNU, uutils and BSD. Receives session JSON on stdin.
#
#   line 1:  📂 dir 🌿 (branch ±dirty ↑ahead ↓behind) 🤖 [model] {effort} 📊 [ctx: NK] [███······· N%]
#   line 2:  ⏳ [5h: reset] [█········· N%] 📅 [7d: reset] [█········· N%]
#   line 3:  🔑 session_id 🏷 session_name
#
# The mod's line 3 starts with the workflow stage. The sandbox has no stage
# source, so its line 3 is the session only.

input=$(cat)

# A 10-cell bar with the percent at its right end, one cell per 10% rounded: green under 50, yellow under 80,
# red from 80. Same rule as meter() in the mod's hooks/status.ts.
meter() {
  awk -v p="$1" 'BEGIN {
    pct = sprintf("%.0f", p)
    if (p < 0) p = 0; if (p > 100) p = 100
    n = int(p / 10 + 0.5)
    c = p >= 80 ? 91 : (p >= 50 ? 93 : 92)
    bar = ""; for (i = 0; i < 10; i++) bar = bar (i < n ? "█" : "·")
    printf "\033[%dm\033[1m[%s %s%%]\033[0m", c, bar, pct
  }'
}

# GNU and uutils spell an epoch as -d @N, BSD as -r N. Try both; print
# nothing on failure so the caller's [ -n ] guard hides the segment.
fmt_epoch() {
  date -d "@$1" "$2" 2>/dev/null || date -r "$1" "$2" 2>/dev/null
}

cwd=$(echo "$input" | jq -r '.workspace.current_dir')
# One git call for branch, dirty count and ahead/behind, as the mod does.
# A detached HEAD reads as HEAD, as rev-parse --abbrev-ref printed it.
git_status=$(cd "$cwd" 2>/dev/null && git -c gc.auto=0 status --porcelain=v2 --branch 2>/dev/null)
branch=$(printf '%s\n' "$git_status" | sed -n 's/^# branch.head //p')
[ "$branch" = '(detached)' ] && branch='HEAD'
dirty=$(printf '%s\n' "$git_status" | grep -c '^[12u?] ')
ahead=$(printf '%s\n' "$git_status" | sed -n 's/^# branch.ab +\([0-9]*\) -.*/\1/p')
behind=$(printf '%s\n' "$git_status" | sed -n 's/^# branch.ab +[0-9]* -\([0-9]*\)/\1/p')
git_counts=''
[ "${dirty:-0}" -gt 0 ] && git_counts="$git_counts ±$dirty"
[ "${ahead:-0}" -gt 0 ] && git_counts="$git_counts ↑$ahead"
[ "${behind:-0}" -gt 0 ] && git_counts="$git_counts ↓$behind"
model=$(echo "$input" | jq -r '.model.display_name')
effort=$(echo "$input" | jq -r '.effort.level // empty')

cu=$(echo "$input" | jq -r '.context_window.current_usage // empty')
if [ -n "$cu" ] && [ "$cu" != 'null' ]; then
  ctx_tokens=$(echo "$input" | jq -r '[.context_window.current_usage.input_tokens, .context_window.current_usage.cache_creation_input_tokens, .context_window.current_usage.cache_read_input_tokens] | map(. // 0) | add')
  ctx_k=$(echo "scale=0; $ctx_tokens / 1000" | bc)
  ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
  ctx_k="${ctx_k}K"
else
  ctx_k=''
fi

r5=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
r7=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
r5_at=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
r7_at=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')
r5_str=''
r7_str=''
if [ -n "$r5" ]; then
  if [ -n "$r5_at" ]; then
    r5_reset=$(fmt_epoch "${r5_at%%.*}" '+%d/%m %H:%M')
    [ -n "$r5_reset" ] && r5_str=": $r5_reset"
  fi
fi
if [ -n "$r7" ]; then
  if [ -n "$r7_at" ]; then
    r7_reset=$(fmt_epoch "${r7_at%%.*}" '+%d/%m %H:%M')
    [ -n "$r7_reset" ] && r7_str=": $r7_reset"
  fi
fi

printf '\xf0\x9f\x93\x82 \033[95m\033[1m%s\033[0m' "$(basename "$cwd")"
[ -n "$branch" ] && printf ' \xf0\x9f\x8c\xbf \033[96m\033[1m(%s%s)\033[0m' "$branch" "$git_counts"
printf ' \xf0\x9f\xa4\x96 \033[92m\033[1m[%s]\033[0m' "$model"
[ -n "$effort" ] && printf ' \033[90m\033[1m{%s}\033[0m' "$effort"
[ -n "$ctx_k" ] && printf ' \xf0\x9f\x93\x8a \033[94m\033[1m[ctx: %s]\033[0m' "$ctx_k"
[ -n "$ctx_k" ] && [ -n "$ctx_pct" ] && printf ' %s' "$(meter "$ctx_pct")"

sid=$(echo "$input" | jq -r '.session_id // empty')
sname=$(echo "$input" | jq -r '.session_name // empty')
limits=''
[ -n "$r5" ] && limits="$limits $(printf '\xe2\x8f\xb3 \033[92m\033[1m[5h%s]\033[0m' "$r5_str") $(meter "$r5")"
[ -n "$r7" ] && limits="$limits $(printf '\xf0\x9f\x93\x85 \033[95m\033[1m[7d%s]\033[0m' "$r7_str") $(meter "$r7")"
[ -n "$limits" ] && printf '\n%s' "${limits# }"
if [ -n "$sid" ]; then
  printf '\n\xf0\x9f\x94\x91 \033[93m\033[1m%s\033[0m' "$sid"
  [ -n "$sname" ] && printf ' \xf0\x9f\x8f\xb7 \033[96m\033[1m%s\033[0m' "$sname"
fi
true
