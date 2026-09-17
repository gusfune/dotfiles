# Brewfile — `brew bundle --file=Brewfile` to restore on a new machine.
# Every entry is intentional. Inline comments describe each package's role.

# ----- Taps -----
tap "anomalyco/tap"                 # → opencode
tap "archivebox/archivebox"         # → archivebox
tap "buo/cask-upgrade"              # `brew cu` — useful
tap "cloudflare/cloudflare"         # → cloudflared
tap "docker/tap"                    # → sbx
tap "hashicorp/tap"                 # → hcp
tap "hookdeck/hookdeck"             # → hookdeck
tap "libsql/sqld"                   # → sqld, turso
tap "mongodb/brew"                  # → mongosh, mongodb tools
tap "oven-sh/bun"                   # → bun
tap "peonping/tap"                  # → peon-ping
tap "pulumi/tap"                    # → esc, pulumi
tap "supabase/tap"                  # → supabase

# ----- CLI tools -----
brew "awscli"                       # AWS CLI
brew "bash"                         # bash 5.x (macOS stock bash is 3.2)
brew "cloudflared"                  # Cloudflare tunnel client
brew "cookiecutter"                 # Project scaffolding from templates
brew "curl"                         # curl with newer TLS / HTTP3
brew "doppler"                      # Secrets manager
brew "duti"                         # Set default apps for file types / URL schemes
brew "gemini-cli"                   # Google Gemini CLI
brew "gh"                           # GitHub CLI
brew "git-filter-repo"              # Rewrite git history
brew "gnupg"                        # GPG
brew "go"                           # Go toolchain
brew "hashicorp/tap/hcp"            # HashiCorp Cloud Platform CLI
brew "hf"                           # HuggingFace CLI
brew "htop"                         # Process viewer
brew "httrack"                      # Website mirroring
brew "kimi-code"                    # Kimi Code CLI; config in kimi-code/
brew "lazygit"                      # TUI for git
brew "llama.cpp"                    # Local LLM inference (GGUF models)
brew "lsd"                          # `ls` replacement; aliased in zshrc
brew "mas"                          # Mac App Store CLI
brew "midnight-commander"           # `mc` — TUI file manager
brew "mise"                         # Tool version manager; shims on PATH via .zshenv
brew "mole"                         # Disk cleanup tool
brew "neovim"                       # `nvim` — the EDITOR fallback in zshenv
brew "platformio"                   # Embedded dev toolchain (Pico / ESP)
brew "pnpm"                         # Node package manager
brew "poetry"                       # Python dependency manager
brew "poppler"                      # PDF utilities (for pdftotext, pdfimages)
brew "python@3.12"                  # Python
brew "rclone"                       # Cloud storage sync
brew "reattach-to-user-namespace"   # Fixes pbcopy inside tmux
brew "ripgrep"                      # `rg` — fast grep
brew "stripe-cli"                   # Stripe CLI
brew "swiftlint"                    # Swift linter (iOS / macOS native)
brew "thefuck"                      # Command corrector; sourced in zshrc
brew "tree"                         # Directory tree view
brew "uv"                           # Fast Python package manager
brew "watchman"                     # File watcher (RN/Metro)
brew "wget"                         # Non-interactive downloader (used by scripts)
brew "xcodegen"                     # Xcode project generator (iOS / macOS native)
brew "zsh"                          # Latest zsh (ahead of macOS stock)
brew "zsh-syntax-highlighting"      # Fish-like syntax highlighting; styled by zsh/dracula-highlight.zsh
brew "anomalyco/tap/opencode"       # OpenCode — open-source coding agent
brew "oven-sh/bun/bun"              # Bun runtime (primary)
brew "peonping/tap/peon-ping"       # Claude Code peon-ping hook
brew "pulumi/tap/esc"               # Pulumi ESC
brew "pulumi/tap/pulumi"            # Pulumi CLI
brew "supabase/tap/supabase"        # Supabase CLI

# ----- GUI apps (casks) -----
cask "1password"                    # Password manager
cask "1password-cli"                # `op` CLI
cask "antigravity-cli"              # Antigravity CLI
cask "arduino-ide"                  # Arduino IDE
cask "autodesk-fusion"              # Fusion 360 — CAD
cask "beekeeper-studio"             # SQL GUI
cask "blender"                      # 3D modelling
cask "brave-browser"                # Browser
cask "chatgpt"                      # ChatGPT desktop
cask "claude"                       # Claude desktop
cask "claude-code"                  # Claude Code desktop app
cask "codex"                        # Codex desktop
cask "codex-app"                    # Codex desktop app
cask "docker-desktop"               # Docker
cask "docker/tap/sbx"               # `sbx` — Docker Sandboxes for AI agents
cask "figma"                        # Design
cask "firefox"                      # Firefox stable channel
cask "firefox@developer-edition"    # Firefox Developer Edition
cask "font-jetbrains-mono"          # Terminal/editor font
cask "font-montserrat"              # Font
cask "font-roboto"                  # Font
cask "font-source-code-pro"         # Font
cask "font-ubuntu"                  # Font
cask "freecad"                      # Parametric CAD
cask "gcloud-cli"                   # Google Cloud CLI
cask "ghostty"                      # Terminal emulator
cask "github"                       # GitHub Desktop (redundant with gh CLI + GitLens?)
cask "google-chrome"                # Chrome
cask "granola"                      # Meeting notes
cask "imageoptim"                   # Image compression
cask "insta360-studio"              # Insta360 webcam driver
cask "kaleidoscope"                 # Diff tool; wired up in gitconfig.local.macos
cask "linear"                       # Linear desktop
cask "little-snitch"                # Network firewall
cask "ngrok"                        # Tunnels (overlaps with tailscale + cloudflared?)
cask "notion"                       # Notion
cask "notion-calendar"              # Cron/Notion calendar
cask "numi"                         # Calculator
cask "obs"                          # Screen recording / streaming
cask "obsidian"                     # Notes
cask "postman"                      # API client
cask "raycast"                      # Launcher
cask "redis-insight"                # Redis GUI
cask "sf-symbols"                   # Apple system icon reference
cask "slack"                        # Slack
cask "spotify"                      # Music
cask "steam"                        # Games
cask "tailscale-app"                # VPN mesh
cask "the-unarchiver"               # Archives
cask "thonny"                       # MicroPython IDE (Pico / embedded)
cask "tower"                        # Git GUI
cask "transmission"                 # BitTorrent client
cask "transmit"                     # FTP/S3 GUI (overlaps with cyberduck)
cask "tunnelbear"                   # Commercial VPN
cask "visual-studio-code"           # VSCode
cask "vlc"                          # Media player
cask "whatsapp"                     # Messaging
cask "zed"                          # Zed editor
cask "zoom"                         # Video calls

# ----- Mac App Store -----
# Note: duplicate IDs (Keynote/Numbers/Pages) are macOS vs iOS/iPadOS App Store
# entries for the same app — harmless, MAS handles them.
mas "1Password for Safari", id: 1569813296
mas "Amphetamine", id: 937984704
mas "GarageBand", id: 682658836     # Apple preinstall
mas "iMovie", id: 408981434         # Apple preinstall
mas "Keynote", id: 409183694
mas "Keynote", id: 361285480
mas "Magnet", id: 441258766         # Window manager
mas "Numbers", id: 409203825
mas "Numbers", id: 361304891
mas "Pages", id: 409201541
mas "Pages", id: 361309726
mas "Parcel", id: 375589283         # Package tracking
mas "Perplexity", id: 6714467650    # Perplexity AI search
mas "Xcode", id: 497799835          # iOS / macOS native dev

# ----- VSCode extensions -----
# Deliberately empty. `vscode-extensions.txt` owns the list — it is a straight
# `code --list-extensions` snapshot, so it cannot drift the way a hand-curated
# second copy here did (it was 89 entries against 113 installed). Restore with:
#
#   xargs -L1 code --install-extension < vscode-extensions.txt
#
# Keeping them here would also make the drift check lie: `brew bundle dump`
# silently omits the whole vscode section when `code` is not on PATH, so every
# entry then reads as uninstalled.
