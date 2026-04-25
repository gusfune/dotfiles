# .zprofile — login shell (runs once per login).
# PATH, exported env, one-time tool init. No interactive prompts/aliases.

# Homebrew (sets PATH, MANPATH, HOMEBREW_*).
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

# rbenv.
command -v rbenv >/dev/null && eval "$(rbenv init - --no-rehash zsh)"

# PATH helpers (prepend/append only if dir exists; dedupe).
path_prepend() { [ -d "$1" ] || return; PATH=":${PATH//:$1:/:}"; PATH="$1:${PATH#:}"; }
path_append()  { [ -d "$1" ] || return; PATH=":${PATH//:$1:/:}"; PATH="${PATH#:}:$1"; }

path_prepend "$HOME/.bun/bin"
path_prepend "$HOME/.local/bin"
export PATH

# Atuin (shell history).
[ -s "$HOME/.atuin/bin/env" ] && . "$HOME/.atuin/bin/env"

# Homebrew / shell preferences.
export HOMEBREW_DOWNLOAD_CONCURRENCY=auto
export ZSH_DISABLE_COMPFIX=true

# Claude Code env (MUST be exported to reach child processes).
export USER_TYPE="ant"
export CLAUDE_CODE_DISABLE_1M_CONTEXT=1
export CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1
export CLAUDE_CODE_SUBAGENT_MODEL=sonnet
