# .zprofile — login shell (runs once per login).
# PATH, exported env, one-time tool init. No interactive prompts/aliases.

# Homebrew (sets PATH, MANPATH, HOMEBREW_*). Apple Silicon, Intel, Linuxbrew.
for _brew in /opt/homebrew/bin/brew /usr/local/bin/brew \
             /home/linuxbrew/.linuxbrew/bin/brew; do
  if [ -x "$_brew" ]; then
    eval "$("$_brew" shellenv)"
    break
  fi
done
unset _brew

# rbenv.
command -v rbenv >/dev/null && eval "$(rbenv init - --no-rehash zsh)"

# path_prepend / path_append are defined in .zshenv, which always runs first.
# The mise shims are prepended a second time because brew shellenv above would
# otherwise bury what .zshenv put in front — the same reason ~/.dotfiles/bin is
# prepended twice below. Omarchy is excluded: env-bootstrap appends them there.
[ -z "$OMARCHY_PATH" ] && path_prepend "$HOME/.local/share/mise/shims"
path_prepend "$HOME/.bun/bin"
path_prepend "$HOME/.local/bin"
# Re-hoist after .local/bin. .zshenv already put this first, but the prepends
# above would bury it and the real claude binary lives in ~/.local/bin.
path_prepend "$HOME/.dotfiles/bin"
export PATH

# Atuin (shell history).
[ -s "$HOME/.atuin/bin/env" ] && . "$HOME/.atuin/bin/env"

# /etc/profile.d/locale.sh is what puts /etc/locale.conf into the environment,
# and only sh/bash login shells read it. A zsh arriving over SSH lands in the C
# locale, where printf emits \u escapes literally instead of the character.
if [ -z "$LANG" ] && [ -r /etc/locale.conf ]; then
  . /etc/locale.conf
  export LANG="${LANG:-C.UTF-8}"
fi

# Homebrew / shell preferences.
export HOMEBREW_DOWNLOAD_CONCURRENCY=auto
export ZSH_DISABLE_COMPFIX=true

# Claude Code env (MUST be exported to reach child processes).
export USER_TYPE="ant"
export CLAUDE_CODE_DISABLE_1M_CONTEXT=1
export CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1
export CLAUDE_CODE_SUBAGENT_MODEL=sonnet

# Sentinel for .zshrc, which re-sources this file when a terminal skips the
# login shell. HOMEBREW_PREFIX used to play this role and never latched on a
# box without Homebrew, so .zprofile was re-sourced on every interactive shell.
export DOTFILES_PROFILE_LOADED=1
