#!/bin/sh
# Antigravity port of bin/claude --system-prompt-file. The prompt goes in as a
# SessionStart system message because Antigravity truncates rule files at
# 24 KB and claude-plus.md is bigger. The message stays in the conversation,
# so resumed sessions keep it. Override the path with CLAUDE_PLUS_FILE.

file="${CLAUDE_PLUS_FILE:-$HOME/.dotfiles/claude/claude-plus.md}"
cat >/dev/null

if [ ! -r "$file" ]; then
  echo '{}'
  exit 0
fi

# Drop the YAML frontmatter: it is Claude Code output-style metadata.
awk 'NR == 1 && /^---$/ { fm = 1; next } fm && /^---$/ { fm = 0; next } !fm' "$file" |
  jq -Rs '{ injectSteps: [{ systemMessage: { systemMessage: . } }] }'
