# Brewfile — `brew bundle --file=Brewfile` to restore on a new machine.
# Every entry is intentional. Inline comments describe each package's role.

# ----- Taps -----
tap "anomalyco/tap"                 # → opencode
tap "buo/cask-upgrade"              # `brew cu` — useful
tap "hashicorp/tap"                 # → hcp
tap "oven-sh/bun"                   # → bun
tap "peonping/tap"                  # → peon-ping
tap "pulumi/tap"                    # → esc, pulumi
tap "supabase/tap"                  # → supabase

# ----- CLI tools -----
brew "awscli"                       # AWS CLI
brew "bash"                         # bash 5.x (macOS stock bash is 3.2)
brew "cf-terraforming"              # Cloudflare config → Terraform converter
brew "cloudflared"                  # Cloudflare tunnel client
brew "curl"                         # curl with newer TLS / HTTP3
brew "doppler"                      # Secrets manager
brew "duti"                         # Set default apps for file types / URL schemes
brew "gemini-cli"                   # Google Gemini CLI
brew "gh"                           # GitHub CLI
brew "git-filter-repo"              # Rewrite git history
brew "gnupg"                        # GPG
brew "go"                           # Go toolchain
brew "hf"                           # HuggingFace CLI
brew "htop"                         # Process viewer
brew "kimi-cli"                     # MoonshotAI Kimi CLI agent
brew "llama.cpp"                    # Local LLM inference (GGUF models)
brew "lsd"                          # `ls` replacement; aliased in zshrc
brew "mas"                          # Mac App Store CLI
brew "midnight-commander"           # `mc` — TUI file manager
brew "mole"                         # Disk cleanup tool
brew "nvm"                          # Node version manager; sourced in zshrc
brew "pnpm"                         # Node package manager
brew "poppler"                      # PDF utilities (for pdftotext, pdfimages)
brew "python@3.12"                  # Python
brew "rbenv"                        # Ruby version manager; sourced in zprofile
brew "rclone"                       # Cloud storage sync
brew "ripgrep"                      # `rg` — fast grep
brew "sandvault"                    # Run AI agents in sandboxed macOS user account
brew "stripe-cli"                   # Stripe CLI
brew "swiftlint"                    # Swift linter (iOS / macOS native)
brew "tfenv"                        # Terraform version manager
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
cask "autodesk-fusion"              # Fusion 360 — CAD
cask "beekeeper-studio"             # SQL GUI
cask "chatgpt"                      # ChatGPT desktop
cask "claude"                       # Claude desktop
cask "codex"                        # Codex desktop
cask "cyberduck"                    # S3 / SFTP GUI
cask "docker-desktop"               # Docker
cask "elgato-stream-deck"           # Stream Deck companion
cask "figma"                        # Design
cask "firefox"                      # Firefox stable channel
cask "firefox@developer-edition"    # Firefox Developer Edition
cask "font-hack-nerd-font"          # Terminal nerd font (icons / glyphs)
cask "font-jetbrains-mono"          # Terminal/editor font
cask "github"                       # GitHub Desktop (redundant with gh CLI + GitLens?)
cask "google-chrome"                # Chrome
cask "imageoptim"                   # Image compression
cask "insta360-studio"              # Insta360 webcam driver
cask "linear"                       # Linear desktop
cask "little-snitch"                # Network firewall
cask "miro"                         # Whiteboard / diagramming
cask "ngrok"                        # Tunnels (overlaps with tailscale + cloudflared?)
cask "notion"                       # Notion
cask "notion-calendar"              # Cron/Notion calendar
cask "numi"                         # Calculator
cask "obs"                          # Screen recording / streaming
cask "postman"                      # API client
cask "raycast"                      # Launcher
cask "redis-insight"                # Redis GUI
cask "sf-symbols"                   # Apple system icon reference
cask "slack"                        # Slack
cask "spotify"                      # Music
cask "steam"                        # Games
cask "superset"                     # Superset desktop
cask "tailscale-app"                # VPN mesh
cask "the-unarchiver"               # Archives
cask "thonny"                       # MicroPython IDE (Pico / embedded)
cask "transmission"                 # BitTorrent client
cask "transmit"                     # FTP/S3 GUI (overlaps with cyberduck)
cask "tunnelbear"                   # Commercial VPN
cask "visual-studio-code"           # VSCode
cask "vlc"                          # Media player
cask "warp"                         # AI-powered terminal
cask "whatsapp"                     # Messaging
cask "zed"                          # Zed editor
cask "zoom"                         # Video calls

# ----- Mac App Store -----
# Note: duplicate IDs (Keynote/Numbers/Pages) are macOS vs iOS/iPadOS App Store
# entries for the same app — harmless, MAS handles them.
mas "1Password for Safari", id: 1569813296
mas "Amphetamine", id: 937984704
mas "Keynote", id: 409183694
mas "Keynote", id: 361285480
mas "Magnet", id: 441258766         # Window manager
mas "Numbers", id: 409203825
mas "Numbers", id: 361304891
mas "Pages", id: 409201541
mas "Pages", id: 361309726
mas "Parcel", id: 375589283         # Package tracking
mas "Perplexity", id: 6714467650    # Perplexity AI search
mas "PL2303Serial", id: 1624835354  # USB-serial driver (Pico / embedded)
mas "Xcode", id: 497799835          # iOS / macOS native dev

# ----- VSCode extensions -----
# Dupes / dead extensions flagged; prune before reinstall.
vscode "aaron-bond.better-comments"
vscode "alefragnani.bookmarks"
vscode "amazonwebservices.aws-toolkit-vscode"
vscode "ambar.bundle-size"
vscode "antfu.file-nesting"
vscode "antfu.smart-clicks"
vscode "anthropic.claude-code"
vscode "apollographql.vscode-apollo"
vscode "arcanis.vscode-zipfs"
vscode "be5invis.vscode-custom-css"
vscode "bierner.emojisense"
vscode "bradlc.vscode-tailwindcss"
vscode "christopherstyles.html-entities"
vscode "coderabbit.coderabbit-vscode"
vscode "csstools.postcss"
vscode "davidanson.vscode-markdownlint"
vscode "dbaeumer.vscode-eslint"
vscode "docker.docker"                        # NEW official Docker ext
vscode "dracula-theme-pro.theme-dracula-pro"  # Dracula Pro (pick one)
vscode "drknoxy.eslint-disable-snippets"
vscode "dsznajder.es7-react-js-snippets"
vscode "eamodio.gitlens"
vscode "ecmel.vscode-html-css"
vscode "eg2.vscode-npm-script"
vscode "eriklynd.json-tools"
vscode "esbenp.prettier-vscode"
vscode "firefox-devtools.vscode-firefox-debug"
vscode "formulahendry.auto-rename-tag"
vscode "github.codespaces"
vscode "github.copilot-chat"
vscode "github.vscode-github-actions"
vscode "github.vscode-pull-request-github"
vscode "graphql.vscode-graphql"
vscode "graphql.vscode-graphql-execution"
vscode "graphql.vscode-graphql-syntax"
vscode "gruntfuggly.todo-tree"
vscode "hashicorp.terraform"
vscode "heybourn.headwind"                    # Tailwind class sort
vscode "htmlhint.vscode-htmlhint"
vscode "ibm.output-colorizer"
vscode "kamikillerto.vscode-colorize"
vscode "mechatroner.rainbow-csv"
vscode "mikestead.dotenv"
vscode "ms-azuretools.vscode-containers"
vscode "ms-dotnettools.vscode-dotnet-runtime"
vscode "ms-kubernetes-tools.vscode-kubernetes-tools"
vscode "ms-python.debugpy"
vscode "ms-python.isort"
vscode "ms-python.python"
vscode "ms-python.vscode-pylance"
vscode "ms-python.vscode-python-envs"
vscode "ms-toolsai.jupyter"
vscode "ms-toolsai.jupyter-keymap"
vscode "ms-toolsai.jupyter-renderers"
vscode "ms-toolsai.vscode-jupyter-cell-tags"
vscode "ms-toolsai.vscode-jupyter-slideshow"
vscode "ms-vscode-remote.remote-containers"
vscode "ms-vscode-remote.remote-ssh"
vscode "ms-vscode-remote.remote-ssh-edit"
vscode "ms-vscode-remote.vscode-remote-extensionpack"
vscode "ms-vscode.remote-explorer"
vscode "ms-vscode.remote-server"
vscode "nixon.env-cmd-file-syntax"
vscode "openai.chatgpt"
vscode "orta.vscode-jest"
vscode "oven.bun-vscode"
vscode "pnp.polacode"                         # Code screenshot tool
vscode "pulkitgangwar.nextjs-snippets"
vscode "quicktype.quicktype"
vscode "rangav.vscode-thunder-client"
vscode "redhat.vscode-commons"
vscode "redhat.vscode-yaml"
vscode "rust-lang.rust-analyzer"
vscode "seatonjiang.gitmoji-vscode"
vscode "shopify.theme-check-vscode"
vscode "silvenon.mdx"
vscode "sissel.shopify-liquid"
vscode "sleistner.vscode-fileutils"
vscode "statelyai.stately-vscode"
vscode "stkb.rewrap"
vscode "tamasfe.even-better-toml"
vscode "tamj0rd2.ts-quickfixes-extension"
vscode "unifiedjs.vscode-mdx"
vscode "usernamehw.errorlens"
vscode "vivaxy.vscode-conventional-commits"
vscode "vscode-icons-team.vscode-icons"
vscode "wayou.vscode-todo-highlight"
vscode "wmaurer.change-case"
vscode "yzhang.markdown-all-in-one"
