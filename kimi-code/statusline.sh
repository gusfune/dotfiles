#!/bin/bash
# Status line for Kimi Code (referenced by tui.toml [status_line].command).
# Port of the Claude statusLine command in claude/settings.json; the rate
# limit segments are dropped because Kimi's snapshot has no rate-limit data.
# Kimi pipes a JSON snapshot on stdin and the first stdout line replaces the
# first footer line; runs are capped at 300ms, so keep this cheap.

input=$(cat)

jqget() { echo "$input" | jq -r "$1 // empty" 2>/dev/null; }

cwd=$(jqget '.cwd // .workspace.current_dir')
[ -z "$cwd" ] && cwd="$PWD"
branch=$(cd "$cwd" 2>/dev/null && git -c gc.auto=0 rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
timestamp=$(date '+%d/%m/%y %l:%M:%S')
model=$(jqget '.model.display_name // .model')
effort=$(jqget '.effort.level // .effort')
plan=$(jqget '.plan_mode')

# Context usage: accept a ready-made percentage, else compute from used/total.
ctx=$(jqget '.context_usage.used_percentage // .context_window.used_percentage // .context.used_percentage')
if [ -z "$ctx" ]; then
  used=$(jqget '.context_usage.used_tokens // .context_window.used_tokens // .context.used_tokens')
  total=$(jqget '.context_usage.total_tokens // .context_window.total_tokens // .context_window.max_tokens // .context.total_tokens')
  if [ -n "$used" ] && [ -n "$total" ] && [ "$total" != "0" ]; then
    ctx=$(echo "scale=0; $used * 100 / $total" | bc)
  fi
fi

printf '\xf0\x9f\x95\x90 \033[93m\033[1m[%s]\033[0m \xf0\x9f\x93\x82 \033[95m\033[1m%s\033[0m' "$timestamp" "$(basename "$cwd")"
[ -n "$branch" ] && printf ' \xf0\x9f\x8c\xbf \033[96m\033[1m(%s)\033[0m' "$branch"
[ -n "$model" ] && printf ' \xf0\x9f\xa4\x96 \033[92m\033[1m[%s]\033[0m' "$model"
[ -n "$effort" ] && printf ' \033[92m%s\033[0m' "$effort"
[ -n "$ctx" ] && printf ' \xf0\x9f\xa7\xa0 \033[91m\033[1m%s%%\033[0m' "${ctx%.*}"
[ "$plan" = "true" ] && printf ' \xf0\x9f\x93\x8b plan'
printf '\n'
