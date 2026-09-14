#!/usr/bin/env bash
# Claude Code status line for Docker Sandboxes. Same output as the host
# statusLine one-liner in ~/.claude/settings.json, unrolled into a file so a
# kit can ship it. One difference: epoch formatting works on GNU, uutils and
# BSD date. Receives the session JSON on stdin.
#
#   line 1:  🕐 [timestamp] 📂 dir 🌿 (branch) 🤖 [model] {effort} 📊 [ctx: NK]
#   line 2:  📥 in: NK 📤 out: NK ⏳ [5h: N% reset] 📅 [7d: N% reset]
#   line 3:  🔑 session_id 🏷 session_name

input=$(cat)

# GNU and uutils spell an epoch as -d @N, BSD as -r N. Try both; print
# nothing on failure so the caller's [ -n ] guard hides the segment.
fmt_epoch() {
  date -d "@$1" "$2" 2>/dev/null || date -r "$1" "$2" 2>/dev/null
}

cwd=$(echo "$input" | jq -r '.workspace.current_dir')
branch=$(cd "$cwd" 2>/dev/null && git -c gc.auto=0 rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
timestamp=$(date '+%d/%m/%y %l:%M:%S')
model=$(echo "$input" | jq -r '.model.display_name')
effort=$(echo "$input" | jq -r '.effort.level // empty')

cu=$(echo "$input" | jq -r '.context_window.current_usage // empty')
if [ -n "$cu" ] && [ "$cu" != 'null' ]; then
  ctx_tokens=$(echo "$input" | jq -r '[.context_window.current_usage.input_tokens, .context_window.current_usage.cache_creation_input_tokens, .context_window.current_usage.cache_read_input_tokens] | map(. // 0) | add')
  ctx_k=$(echo "scale=0; $ctx_tokens / 1000" | bc)
else
  ctx_k=''
fi

ti=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
to=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
ti_k=$(echo "scale=0; $ti / 1000" | bc)
to_k=$(echo "scale=0; $to / 1000" | bc)

r5=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
r7=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
r5_at=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
r7_at=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')
r5_str=''
r7_str=''
if [ -n "$r5" ]; then
  r5_str=$(printf '%.0f%%' "$r5")
  if [ -n "$r5_at" ]; then
    r5_reset=$(fmt_epoch "${r5_at%%.*}" '+%d/%m %H:%M')
    [ -n "$r5_reset" ] && r5_str="$r5_str $r5_reset"
  fi
fi
if [ -n "$r7" ]; then
  r7_str=$(printf '%.0f%%' "$r7")
  if [ -n "$r7_at" ]; then
    r7_reset=$(fmt_epoch "${r7_at%%.*}" '+%d/%m %H:%M')
    [ -n "$r7_reset" ] && r7_str="$r7_str $r7_reset"
  fi
fi

printf '\xf0\x9f\x95\x90 \033[93m\033[1m[%s]\033[0m \xf0\x9f\x93\x82 \033[95m\033[1m%s\033[0m' "$timestamp" "$(basename "$cwd")"
[ -n "$branch" ] && printf ' \xf0\x9f\x8c\xbf \033[96m\033[1m(%s)\033[0m' "$branch"
printf ' \xf0\x9f\xa4\x96 \033[92m\033[1m[%s]\033[0m' "$model"
[ -n "$effort" ] && printf ' \033[90m\033[1m{%s}\033[0m' "$effort"
[ -n "$ctx_k" ] && printf ' \xf0\x9f\x93\x8a \033[94m\033[1m[ctx: %sK]\033[0m' "$ctx_k"
printf '\n'

printf '\xf0\x9f\x93\xa5 \033[93m\033[1min: %sK\033[0m \xf0\x9f\x93\xa4 \033[96m\033[1mout: %sK\033[0m' "$ti_k" "$to_k"
[ -n "$r5_str" ] && printf ' \xe2\x8f\xb3 \033[92m\033[1m[5h: %s]\033[0m' "$r5_str"
[ -n "$r7_str" ] && printf ' \xf0\x9f\x93\x85 \033[95m\033[1m[7d: %s]\033[0m' "$r7_str"

sid=$(echo "$input" | jq -r '.session_id // empty')
sname=$(echo "$input" | jq -r '.session_name // empty')
if [ -n "$sid" ]; then
  printf '\n'
  printf '\xf0\x9f\x94\x91 \033[93m\033[1m%s\033[0m' "$sid"
  [ -n "$sname" ] && printf ' \xf0\x9f\x8f\xb7 \033[96m\033[1m%s\033[0m' "$sname"
fi
true
