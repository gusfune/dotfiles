# Omarchy interactive layer for zsh.
#
# Omarchy ships its whole shell layer as bash only ($OMARCHY_PATH/default/bash/*),
# sourced from ~/.bashrc. Switching the login shell to zsh drops all of it, so
# this file re-implements the subset worth having. Sourced from .zshrc, guarded
# on $OMARCHY_PATH — so it is inert on macOS, and on a Linux box that is not
# Omarchy.
#
# ~/.bashrc is deliberately left alone: bash is what the 70-odd #!/bin/bash
# omarchy-* scripts, `bash -lc`, and the uwsm session reach, and it is the
# recovery path if a zsh login shell ever breaks over SSH.
#
# NOT carried over, on purpose:
#   default/bash/fns/*   bash-only and root-owned (tdl, hdl, iso2sd, rsw, the
#                        ssh auto-reconnect wrapper). Upstream rewrites them
#                        every release; porting buys a permanent breakage tax.
#                        `obash` below is one keystroke to a shell that has them.
#   g / gcm / gcam / gcad  omz's git plugin already owns those names with
#                        DIFFERENT meanings — its `gcm` is `git checkout main`,
#                        Omarchy's is `git commit -m`. Silently swapping them is
#                        how you commit to the wrong branch.
#   .. / ... / ....      omz's lib/directories.zsh already defines them.
#   starship             the prompt here is the omz theme plus the timestamp
#                        overlay at the end of .zshrc. Two prompt engines, one
#                        line, is a bug rather than a feature.
#   default/bash/shell   shopt / set +h / bash-completion are bash builtins;
#                        .zshrc has the zsh equivalents.
#   default/bash/inputrc readline, which zsh does not use (zle instead).

# --- env (default/bash/envs) -------------------------------------------------

# gh and friends open URLs through this so the browser detaches from the
# terminal's process tree. Shell-scoped on purpose: exporting BROWSER
# session-wide makes xdg-settings refuse to change the default browser.
command -v omarchy-launch-browser >/dev/null && \
  export BROWSER="${BROWSER:-omarchy-launch-browser}"

# Colour man pages with bat. MANROFFOPT=-c avoids the mangled output bat gets
# from groff's default terminal escapes.
if command -v bat >/dev/null; then
  export BAT_THEME=ansi
  export MANROFFOPT="-c"
  export MANPAGER="sh -c 'col -bx | bat -l man -p'"
fi

# --- init (default/bash/init) ------------------------------------------------
# `mise activate zsh` lives in .zshrc — mise is not Omarchy-specific.

# Supersedes the omz `z` plugin, which .zshrc skips loading when zoxide exists.
command -v zoxide >/dev/null && eval "$(zoxide init zsh)"

if command -v fzf >/dev/null; then
  [ -r /usr/share/fzf/completion.zsh   ] && source /usr/share/fzf/completion.zsh
  [ -r /usr/share/fzf/key-bindings.zsh ] && source /usr/share/fzf/key-bindings.zsh
fi

# --- aliases / functions (default/bash/aliases) ------------------------------

# macOS has a real `open`; Linux does not. Subshell body so the background job
# dies with the subshell instead of printing a job-control line.
open() ( xdg-open "$@" >/dev/null 2>&1 & )

# Wayland has no pbcopy/pbpaste. Keeping the macOS spellings means muscle
# memory and snippets copied from the mac both keep working.
if command -v wl-copy >/dev/null; then
  alias pbcopy='wl-copy'
  alias pbpaste='wl-paste --no-newline'
fi

if command -v fzf >/dev/null && command -v bat >/dev/null; then
  alias ff="fzf --preview 'bat --style=numbers --color=always {}'"
  eff() { ${=EDITOR} "$(ff)"; }
fi

n() { if (( $# == 0 )); then command nvim .; else command nvim "$@"; fi }

# Agent launchers — the same keystrokes as Omarchy's bash layer. `cx` reaches
# `claude` through PATH on purpose: that is the Claude Plus wrapper in bin/.
alias a='omarchy-agent --inline'
alias cx='printf "\033[2J\033[3J\033[H" && claude --permission-mode auto'
alias cy='codex --approve-for-me'
alias t='tmux attach || tmux new -s Work'
alias mup='MISE_MINIMUM_RELEASE_AGE=0 mise up'

# Everything under default/bash/fns is bash-only; this is the door to it.
alias obash='bash -i'
