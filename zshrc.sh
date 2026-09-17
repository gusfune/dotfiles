# .zshrc — interactive shell (prompt, aliases, completions, keybindings).

# Ensure .zprofile env is loaded even in non-login shells (terminal emulators,
# some IDE terminals skip login). The sentinel is set at the end of .zprofile
# itself — it used to be HOMEBREW_PREFIX, which never latches on a machine
# without Homebrew, so .zprofile was re-sourced on every interactive shell.
[ -z "$DOTFILES_PROFILE_LOADED" ] && [ -f "$HOME/.zprofile" ] && \
  source "$HOME/.zprofile"

# Oh My Zsh.
export ZSH="$HOME/.oh-my-zsh"
# dracula-pro is a paid theme, so it is deliberately NOT in this public repo —
# copy dracula-pro.zsh-theme into ~/.oh-my-zsh/custom/themes/ by hand. Falling
# back beats letting omz print "theme not found" on every new machine.
if [ -r "${ZSH_CUSTOM:-$ZSH/custom}/themes/dracula-pro.zsh-theme" ]; then
  ZSH_THEME="dracula-pro"
else
  ZSH_THEME="robbyrussell"
fi
HIST_STAMPS="yyyy-mm-dd"
# The omz `z` plugin and zoxide both define `z`. Omarchy ships zoxide, and
# zsh/omarchy.zsh initialises it — so only load the plugin when it is absent.
plugins=(git)
command -v zoxide >/dev/null || plugins+=(z)
source "$ZSH/oh-my-zsh.sh"

HISTSIZE=32768
SAVEHIST=32768

# Dracula syntax-highlight palette — set styles BEFORE loading the plugin.
[ -f "$HOME/.dotfiles/zsh/dracula-highlight.zsh" ] && \
  source "$HOME/.dotfiles/zsh/dracula-highlight.zsh"

# Omarchy ships its shell integration as bash only; this re-adds the useful
# parts for zsh. Inert when OMARCHY_PATH is unset, i.e. on macOS.
[ -n "$OMARCHY_PATH" ] && [ -f "$HOME/.dotfiles/zsh/omarchy.zsh" ] && \
  source "$HOME/.dotfiles/zsh/omarchy.zsh"

# zsh-syntax-highlighting. Homebrew keeps it under $HOMEBREW_PREFIX/share,
# Arch under /usr/share/zsh/plugins. Hardcoding the Homebrew path made this a
# no-op on Arch, which in turn made dracula-highlight.zsh above dead code.
for _zsh_hl in \
  "${HOMEBREW_PREFIX:-/nonexistent}/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh" \
  /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh; do
  [ -f "$_zsh_hl" ] && source "$_zsh_hl" && break
done
unset _zsh_hl

# Node and Ruby come from mise on both machines. The shims are already on PATH
# by the time this file runs — appended by env-bootstrap on Omarchy, prepended
# by .zshenv everywhere else — so there is nothing to init here.
#
# There is deliberately no `mise activate zsh`. activate re-asserts PATH from a
# precmd hook on every prompt and prepends mise's *install* directories, one of
# which holds a real `claude` — so it would jump in front of ~/.dotfiles/bin on
# the next `cd` and silently stop the Claude Plus system prompt from being
# applied. Re-hoisting once at startup does not survive that.
#
# The shims resolve every mise tool on their own. The cost is per-directory
# version switching: mise/global.toml is global-only, so haus/.nvmrc (22) and
# next.js/.node-version (v20) are ignored. nvm ignored them too without an
# explicit `nvm use`, so nothing regressed.
if command -v mise >/dev/null; then
  # mise swaps binaries under a stable shim path, so a cached command hash goes
  # stale. Omarchy's bash layer does the same thing with `set +h`.
  unsetopt HASH_CMDS HASH_DIRS
fi

# Bun completions.
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# Interactive tools.
command -v thefuck >/dev/null && eval "$(thefuck --alias)"
command -v atuin   >/dev/null && eval "$(atuin init zsh)"

# Peon-ping (Claude hooks). macOS only — it plays Warcraft samples through
# afplay — so the alias is defined only when the script is actually there.
if [ -f ~/.claude/hooks/peon-ping/peon.sh ]; then
  alias peon="bash ~/.claude/hooks/peon-ping/peon.sh"
  [ -f ~/.claude/hooks/peon-ping/completions.bash ] && \
    source ~/.claude/hooks/peon-ping/completions.bash
fi

# Aliases.
# lsd on macOS, eza on Omarchy — eza ships with the distro and is what its own
# bash aliases use, so `ls` looks the same in either shell on either OS.
if command -v lsd >/dev/null; then
  alias ls="lsd"
elif command -v eza >/dev/null; then
  alias ls="eza -lh --group-directories-first --icons=auto"
  alias lsa="ls -a"
fi
alias yi="pnpm install"
alias yui="pnpm dlx npm-check-updates -i -ws"
alias yb="pnpm run build"
alias yt="pnpm run test"
alias py="python3"
alias pip="pip3"
alias tf="terraform"
alias bum="bun"
alias name_gen="project-name-generator"
alias code_gen="openssl rand -base64 64"
command -v lsof >/dev/null && \
  alias find_port="lsof -P | grep ':3000' | awk '{print \$2}'"
alias gcs="git switch staging && git pull"
alias gcls='git branch --merged | grep -v "\*" | xargs git branch -d'
alias gcmt='git add . && git commit -m "chore: ⬆️ upgrade dependencies"'
alias clean_modules='find . -name "node_modules" -type d -exec rm -rf {} +'
alias cplns="sh ~/Developer/cpln.sh"
alias deploy='bun run $HOME/Developer/staging/index.ts deploy'

# Functions.

# Launch a repo sandbox with the repo kit plus my Claude prefs kit
# (claude/sbx-kit). The repo launcher drops its own --kit when one is passed,
# so both are named here. Agent name stays the first positional: sbxme codex.
#
# Everything after -- is forwarded to the agent. A mixin cannot set the
# sandbox entrypoint, so this is the only way to give a sandbox Claude the
# same full-replacement system prompt the host wrapper (bin/claude) applies.
# It is per-invocation, which is fine: this function is the only launcher.
# Requires the sbx CLI (Docker Sandboxes), which is macOS-only today.
sbxme() {
  if ! command -v sbx >/dev/null && [ ! -x .docker/sandbox.sh ]; then
    echo "sbxme: sbx not installed on this machine" >&2
    return 127
  fi
  if [ -x .docker/sandbox.sh ]; then
    .docker/sandbox.sh "$@" --kit ./.docker/sandbox-kit/ --kit "$HOME/.dotfiles/claude/sbx-kit/"
  else
    sbx run claude "$@" --kit "$HOME/.dotfiles/claude/sbx-kit/" \
      -- --system-prompt-file /home/agent/.claude/claude-plus.md
  fi
}

clean_git() {
  for r in $(git for-each-ref refs/heads --format='%(refname:short)'); do
    if [ "x$(git merge-base master "$r")" = "x$(git rev-parse --verify "$r")" ] \
       && [ "$r" != "master" ]; then
      git branch -d "$r"
    fi
  done
}

# Timestamp prompt overlay (prepend to whatever theme set).
PROMPT='%{$fg[yellow]%}[%D{%f/%m/%y} %D{%L:%M:%S}] '$PROMPT
