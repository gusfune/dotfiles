#!/bin/sh
# Forwards an Antigravity hook event to peon.sh under the Claude Code event
# name in $1. peon.sh picks the sound from hook_event_name, same as the hooks
# in claude/settings.json.
#
# Antigravity has no SessionEnd, Notification, PermissionRequest, PreCompact
# or subagent events, so those sounds do not play. PostToolUse reports no
# exit code, so PostToolUseFailure fires only when the tool itself errors.

event="$1"
peon="$HOME/.claude/hooks/peon-ping/peon.sh"
input=$(cat)

# Stop is the only event that reads a decision; an empty one lets the agent stop.
if [ "$event" = Stop ]; then
  echo '{"decision":""}'
else
  echo '{}'
fi

[ -x "$peon" ] || exit 0

case "$event" in
  # PreInvocation fires before every model call; invocationNum 0 is the first of a turn.
  UserPromptSubmit) filter='.invocationNum == 0' ;;
  PostToolUseFailure) filter='(.error // "") != ""' ;;
  *) filter='true' ;;
esac

payload=$(printf '%s' "$input" | jq -c --arg e "$event" \
  "select($filter) | . + { hook_event_name: \$e, session_id: .conversationId, tool_name: (.toolCall.name // \"\") }" 2>/dev/null)
[ -n "$payload" ] || exit 0

# Hooks block the agent loop, so peon.sh runs detached.
printf '%s' "$payload" | nohup "$peon" >/dev/null 2>&1 &
