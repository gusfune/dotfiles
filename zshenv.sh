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
