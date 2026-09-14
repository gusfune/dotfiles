# Dracula Pro syntax-highlight palette for zsh-syntax-highlighting.
# https://spec.draculatheme.com
ZSH_HIGHLIGHT_HIGHLIGHTERS=(main)
typeset -gA ZSH_HIGHLIGHT_STYLES

# Comments
ZSH_HIGHLIGHT_STYLES[comment]='fg=#708CA9'

# Functions / commands
ZSH_HIGHLIGHT_STYLES[alias]='fg=#8AFF80'
ZSH_HIGHLIGHT_STYLES[suffix-alias]='fg=#8AFF80'
ZSH_HIGHLIGHT_STYLES[global-alias]='fg=#8AFF80'
ZSH_HIGHLIGHT_STYLES[function]='fg=#8AFF80'
ZSH_HIGHLIGHT_STYLES[command]='fg=#8AFF80'
ZSH_HIGHLIGHT_STYLES[precommand]='fg=#8AFF80,italic'
ZSH_HIGHLIGHT_STYLES[autodirectory]='fg=#FFCA80,italic'
ZSH_HIGHLIGHT_STYLES[single-hyphen-option]='fg=#FFCA80'
ZSH_HIGHLIGHT_STYLES[double-hyphen-option]='fg=#FFCA80'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument]='fg=#9580FF'

# Built-ins / keywords
ZSH_HIGHLIGHT_STYLES[builtin]='fg=#80FFEA'
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=#80FFEA'
ZSH_HIGHLIGHT_STYLES[hashed-command]='fg=#80FFEA'

# Punctuation
ZSH_HIGHLIGHT_STYLES[commandseparator]='fg=#FF80BF'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter-unquoted]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[process-substitution-delimiter]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument-delimiter]='fg=#FF80BF'
ZSH_HIGHLIGHT_STYLES[back-double-quoted-argument]='fg=#FF80BF'
ZSH_HIGHLIGHT_STYLES[back-dollar-quoted-argument]='fg=#FF80BF'

# Strings
ZSH_HIGHLIGHT_STYLES[command-substitution-quoted]='fg=#FFFF80'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter-quoted]='fg=#FFFF80'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='fg=#FFFF80'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument-unclosed]='fg=#FF9580'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='fg=#FFFF80'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument-unclosed]='fg=#FF9580'
ZSH_HIGHLIGHT_STYLES[rc-quote]='fg=#FFFF80'

# Variables
ZSH_HIGHLIGHT_STYLES[dollar-quoted-argument]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[dollar-quoted-argument-unclosed]='fg=#FF9580'
ZSH_HIGHLIGHT_STYLES[dollar-double-quoted-argument]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[assign]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[named-fd]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[numeric-fd]='fg=#F8F8F2'

# Misc
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=#FF9580'
ZSH_HIGHLIGHT_STYLES[path]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[path_pathseparator]='fg=#FF80BF'
ZSH_HIGHLIGHT_STYLES[path_prefix]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[path_prefix_pathseparator]='fg=#FF80BF'
ZSH_HIGHLIGHT_STYLES[globbing]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[history-expansion]='fg=#9580FF'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument-unclosed]='fg=#FF9580'
ZSH_HIGHLIGHT_STYLES[redirection]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[arg0]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[default]='fg=#F8F8F2'
ZSH_HIGHLIGHT_STYLES[cursor]='standout'
