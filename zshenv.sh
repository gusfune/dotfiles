# .zshenv — sourced for every shell (interactive, non-interactive, scripts).
# Keep minimal: only env that cron/scripts absolutely need.

# Default editor — in .zshenv so `git commit`, `crontab -e`, and anything
# launched outside a login shell still pick it up. Omarchy ships neither nano
# nor vi, so the SSH branch picks the first editor that actually exists.
if [ -n "$SSH_CONNECTION" ]; then
  for _ed in nvim nano vi; do
    command -v "$_ed" >/dev/null 2>&1 && { export EDITOR="$_ed"; break; }
  done
  unset _ed
elif command -v zed >/dev/null 2>&1; then
  export EDITOR=zed
else
  export EDITOR=nvim
fi
export SUDO_EDITOR="$EDITOR"

# Rust toolchain (needed by non-interactive cargo scripts).
[ -s "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

# PATH helpers (prepend/append only if dir exists; dedupe). Defined here rather
# than in .zprofile so non-login shells get them too; .zshenv always runs first.
path_prepend() { [ -d "$1" ] || return; PATH=":${PATH//:$1:/:}"; PATH="$1:${PATH#:}"; }
path_append()  { [ -d "$1" ] || return; PATH=":${PATH//:$1:/:}"; PATH="${PATH#:}:$1"; }

# Omarchy environment. Exports OMARCHY_PATH — which 70-odd omarchy-* commands
# read — and appends the mise shims to PATH.
#
# bash gets this from /etc/profile.d/omarchy.sh and again from its rc chain.
# zsh gets neither: Arch ships no /etc/zsh, so zsh never reads /etc/profile.
# It belongs in .zshenv rather than .zprofile because .zshenv is the only file
# that runs for *every* zsh — `zsh -c omarchy-menu` is not a login shell and
# would otherwise start with no OMARCHY_PATH at all.
#
# It must run BEFORE the path_prepend below: env-bootstrap *appends*
# ~/.local/bin and the mise shims, and ~/.dotfiles/bin has to stay in front of
# both. The file is POSIX (case/export only) and guards its own PATH edits, so
# sourcing it twice costs nothing.
[ -r /usr/share/omarchy/default/bash/env-bootstrap ] && \
  . /usr/share/omarchy/default/bash/env-bootstrap

# bin/claude shadows the real Claude Code launcher so every session gets the
# Claude Plus system prompt. It lives here, not in .zprofile, because VS Code
# terminals, tmux panes, subshells and scripts are not login shells and would
# otherwise reach the real binary. .zprofile prepends it a second time, after
# it prepends ~/.local/bin, to keep the wrapper in front for login shells too.
path_prepend "$HOME/.dotfiles/bin"
export PATH
