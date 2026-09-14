# .zshenv — sourced for every shell (interactive, non-interactive, scripts).
# Keep minimal: only env that cron/scripts absolutely need.

# Default editor — in .zshenv so `git commit`, `crontab -e`, and anything
# launched outside a login shell still pick it up.
if [ -n "$SSH_CONNECTION" ]; then
  export EDITOR=nano
else
  export EDITOR=zed
fi

# Rust toolchain (needed by non-interactive cargo scripts).
[ -s "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

# PATH helpers (prepend/append only if dir exists; dedupe). Defined here rather
# than in .zprofile so non-login shells get them too; .zshenv always runs first.
path_prepend() { [ -d "$1" ] || return; PATH=":${PATH//:$1:/:}"; PATH="$1:${PATH#:}"; }
path_append()  { [ -d "$1" ] || return; PATH=":${PATH//:$1:/:}"; PATH="${PATH#:}:$1"; }

# bin/claude shadows the real Claude Code launcher so every session gets the
# Claude Plus system prompt. It lives here, not in .zprofile, because VS Code
# terminals, tmux panes, subshells and scripts are not login shells and would
# otherwise reach the real binary. .zprofile prepends it a second time, after
# it prepends ~/.local/bin, to keep the wrapper in front for login shells too.
path_prepend "$HOME/.dotfiles/bin"
export PATH
