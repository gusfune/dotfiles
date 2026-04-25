# .zshrc — interactive shell (prompt, aliases, completions, keybindings).

# Ensure .zprofile env is loaded even in non-login shells (terminal emulators,
# some IDE terminals skip login). Idempotent: checks HOMEBREW_PREFIX.
[ -z "$HOMEBREW_PREFIX" ] && [ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile"

# Oh My Zsh.
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="dracula-pro"
HIST_STAMPS="yyyy-mm-dd"
plugins=(git z)
source "$ZSH/oh-my-zsh.sh"

# Dracula syntax-highlight palette — set styles BEFORE loading the plugin.
[ -f "$HOME/.dotfiles/zsh/dracula-highlight.zsh" ] && \
  source "$HOME/.dotfiles/zsh/dracula-highlight.zsh"

# zsh-syntax-highlighting plugin (brew install zsh-syntax-highlighting).
ZSH_SYNTAX_HIGHLIGHT="$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
[ -f "$ZSH_SYNTAX_HIGHLIGHT" ] && source "$ZSH_SYNTAX_HIGHLIGHT"

# NVM (slow; keep here so login shells aren't hit when skipping Node).
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \
  . "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"

# Bun completions.
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# Interactive tools.
command -v thefuck >/dev/null && eval "$(thefuck --alias)"
command -v atuin   >/dev/null && eval "$(atuin init zsh)"

# Peon-ping (Claude hooks).
alias peon="bash ~/.claude/hooks/peon-ping/peon.sh"
[ -f ~/.claude/hooks/peon-ping/completions.bash ] && \
  source ~/.claude/hooks/peon-ping/completions.bash

# Aliases.
alias ls="lsd"
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
alias find_port="lsof -P | grep ':3000' | awk '{print \$2}'"
alias gcs="git switch staging && git pull"
alias gcls='git branch --merged | grep -v "\*" | xargs git branch -d'
alias gcmt='git add . && git commit -m "chore: ⬆️ upgrade dependencies"'
alias clean_modules='find . -name "node_modules" -type d -exec rm -rf {} +'
alias cplns="sh ~/Developer/cpln.sh"
alias deploy='bun run $HOME/Developer/staging/index.ts deploy'

# Functions.
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
