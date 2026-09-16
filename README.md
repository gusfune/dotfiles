# dotfiles

My personal configuration, symlinked from this repo into `$HOME`. One branch,
two machines: macOS and [Omarchy](https://omarchy.org/) (Arch Linux +
Hyprland). `script/setup` detects the OS and routes accordingly.

Inspired by [MikeMcQuaid/dotfiles](https://github.com/MikeMcQuaid/dotfiles).

## Install

```bash
git clone https://github.com/<you>/dotfiles.git ~/Developer/dotfiles
cd ~/Developer/dotfiles
./script/setup
```

The installer:

- Symlinks each root-level file into `$HOME` with a leading dot.
  `zshrc.sh` → `~/.zshrc`, `gitconfig` → `~/.gitconfig`, etc.
- Routes editor configs: `vscode-settings.json` → macOS VSCode User dir;
  `zed-settings.json` → `~/.config/zed/settings.json`.
- Routes the per-OS files: `gitconfig.local.{macos,linux}` → `~/.gitconfig.local`,
  `ghostty/config.macos` → `~/.config/ghostty/config` (macOS only).
- On Linux, links the Hyprland override files and the custom Omarchy theme.
- Links `AGENTS-GLOBAL.md` to both `~/.claude/CLAUDE.md` and
  `~/.codex/AGENTS.md` so both agents share the same instructions.
- Backs up any existing real file to `<file>.backup.<timestamp>` before
  replacing with a symlink.

Re-running `./script/setup` is idempotent.

### On Omarchy

`script/setup` only makes symlinks. The imperative half — packages, Oh My Zsh,
the theme, and switching the login shell to zsh — is separate so the installer
never needs `sudo`:

```bash
./script/omarchy-bootstrap           # Archfile packages + Oh My Zsh + theme
zsh -lic 'command -v claude'         # sanity check: ~/.dotfiles/bin/claude
./script/omarchy-bootstrap --chsh    # ...then switch the login shell
```

Never `chsh` before that check passes — a broken `.zprofile` on a box you reach
over SSH is not recoverable from a login prompt.

## Layout

| Path                                              | Purpose                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `zshenv.sh`                                       | `.zshenv` — always sourced (minimal: cargo env)                                          |
| `zprofile.sh`                                     | `.zprofile` — login-once env: PATH, JAVA_HOME, Claude env, editor                        |
| `zshrc.sh`                                        | `.zshrc` — interactive: omz, aliases, functions, prompt                                  |
| `zsh/dracula-highlight.zsh`                       | Dracula palette for zsh-syntax-highlighting (sourced by zshrc)                           |
| `gitconfig`                                       | Portable git config (aliases, core, push/pull)                                           |
| `gitconfig.local.macos`                           | macOS-only extras (Kaleidoscope difftool)                                                |
| `gitconfig.local.linux`                           | Linux-only extras (gh credential helper, meld difftool)                                  |
| `gitignore`, `gitattributes`                      | Global ignore + attributes                                                               |
| `vscode-settings.json`, `vscode-keybindings.json` | VSCode user config                                                                       |
| `vscode-extensions.txt`                           | `code --list-extensions` snapshot (restore manually)                                     |
| `zed-settings.json`                               | Zed user config                                                                          |
| `ghostty/config.macos`                            | Ghostty config, macOS only — Dracula Pro (Van Helsing) palette, font, cursor              |
| `zsh/omarchy.zsh`                                 | Omarchy's bash-only shell layer, re-implemented for zsh                                   |
| `omarchy/`                                        | Hyprland overrides, the Omarchy shell config, and the Dracula Pro theme ([README](./omarchy/README.md)) |
| `mise/config.toml`                                | Global mise tool list — copy-by-hand template (not symlinked)                             |
| `Archfile`                                        | pacman + AUR manifest — the Linux counterpart of `Brewfile`                               |
| `script/arch-bundle`                              | `brew bundle` for pacman + AUR (`install` / `dump` / `check`)                              |
| `script/omarchy-bootstrap`                        | Packages, Oh My Zsh, theme, `chsh` — the parts `setup` won't do                            |
| `claude/settings.json`                            | Claude Code settings (hooks, permissions, plugins)                                       |
| `claude/sbx-kit/`                                 | sbx mixin kit that carries the status line + model prefs into Docker Sandboxes (`sbxme`) |
| `codex/config.toml`                               | Codex template (machine-specific bits excluded)                                          |
| `AGENTS-GLOBAL.md`                                | Shared instructions for Claude + Codex                                                   |
| `Brewfile`                                        | `brew bundle` output — restore with `brew bundle --file=Brewfile`                        |
| `script/setup`                                    | The installer                                                                            |

## Restore packages + VSCode extensions

```bash
# macOS
brew bundle --file=~/Developer/dotfiles/Brewfile
xargs -L1 code --install-extension < ~/Developer/dotfiles/vscode-extensions.txt

# Omarchy
./script/arch-bundle install
```

## Codex config (manual step)

`codex/config.toml` is **not** symlinked. After cloning on a new machine:

```bash
cp ~/Developer/dotfiles/codex/config.toml ~/.codex/config.toml
```

Then add your machine-specific bits (not tracked in the repo):

```toml
notify = ["bash", "/Users/<you>/.claude/hooks/peon-ping/adapters/codex.sh"]  # macOS
notify = ["notify-send", "Codex"]                                            # Omarchy

[projects."/Users/<you>/Developer/<project>"]
trust_level = "trusted"
```

TOML arrays are not shell-expanded, so `~` will not expand — the path has to be
absolute.

## mise tools (manual step)

`mise/config.toml` is **not** symlinked — the Omarchy wrappers in `~/.local/bin`
rewrite the live file on every launch, so a link would put every ad-hoc tool
install in this repo's working tree. On a new machine:

```bash
cp ~/Developer/dotfiles/mise/config.toml ~/.config/mise/config.toml
mise install
```

`./script/omarchy-bootstrap` does both for you, and seeds the config only when
there is nothing there already. To pull a newly added tool back into the repo,
copy the other way:

```bash
cp ~/.config/mise/config.toml ~/Developer/dotfiles/mise/config.toml
```

## Zshrc split — why

Classic problem: one 300-line `.zshrc` mixes PATH exports (needed by every
shell), aliases (interactive only), and tool init. Split:

- `.zshenv` — runs for _every_ shell (including non-interactive scripts).
  Keep minimal or cron/scripts break.
- `.zprofile` — login shell, once. PATH, exported env, `brew shellenv`,
  `rbenv init`, JAVA_HOME, Claude Code env vars.
- `.zshrc` — interactive shells. OMZ, prompt, aliases, `atuin init`,
  `thefuck --alias`, completions.

`.zshrc` sources `.zprofile` at the top, guarded by a `DOTFILES_PROFILE_LOADED`
sentinel `.zprofile` sets itself, to cover terminal emulators that skip login
shells. The guard used to check `$HOMEBREW_PREFIX`, which never latches on a
machine without Homebrew — so on Linux `.zprofile` was re-sourced on every
single interactive shell.

On Omarchy, `.zshenv` also sources Omarchy's `env-bootstrap`. That is what
supplies `OMARCHY_PATH` and the mise shims: Arch ships no `/etc/zsh`, so zsh
never reads `/etc/profile` the way bash does. It has to be `.zshenv` rather than
`.zprofile` because `zsh -c 'omarchy-menu'` is not a login shell.

## Maintenance

See [`AGENTS.md`](./AGENTS.md) (also linked as `CLAUDE.md`) for:

- File → install-target map
- How to add new shell config / editor settings / Claude / Codex bits
- Brewfile drift check
- Sanitization rules before committing (this is a public repo)
- Conventions and what _not_ to do

## Licence

MIT. See `LICENSE`.
