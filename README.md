# dotfiles

My personal configuration, symlinked from this repo into `$HOME`. macOS-first,
Linux-compatible where it matters.

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
- Links `AGENTS-GLOBAL.md` to both `~/.claude/CLAUDE.md` and
  `~/.codex/AGENTS.md` so both agents share the same instructions.
- Backs up any existing real file to `<file>.backup.<timestamp>` before
  replacing with a symlink.

Re-running `./script/setup` is idempotent.

## Layout

| Path | Purpose |
|------|---------|
| `zshenv.sh` | `.zshenv` — always sourced (minimal: cargo env) |
| `zprofile.sh` | `.zprofile` — login-once env: PATH, JAVA_HOME, Claude env, editor |
| `zshrc.sh` | `.zshrc` — interactive: omz, aliases, functions, prompt |
| `zsh/dracula-highlight.zsh` | Dracula palette for zsh-syntax-highlighting (sourced by zshrc) |
| `gitconfig` | Portable git config (aliases, core, push/pull) |
| `gitconfig.local.macos` | macOS-only extras (Kaleidoscope, gh credential helper) |
| `gitignore`, `gitattributes` | Global ignore + attributes |
| `vscode-settings.json`, `vscode-keybindings.json` | VSCode user config |
| `vscode-extensions.txt` | `code --list-extensions` snapshot (restore manually) |
| `zed-settings.json` | Zed user config |
| `claude/settings.json` | Claude Code settings (hooks, permissions, plugins) |
| `codex/config.toml` | Codex template (machine-specific bits excluded) |
| `AGENTS-GLOBAL.md` | Shared instructions for Claude + Codex |
| `Brewfile` | `brew bundle` output — restore with `brew bundle --file=Brewfile` |
| `script/setup` | The installer |

## Restore Homebrew + VSCode extensions

```bash
brew bundle --file=~/Developer/dotfiles/Brewfile
xargs -L1 code --install-extension < ~/Developer/dotfiles/vscode-extensions.txt
```

## Codex config (manual step)

`codex/config.toml` is **not** symlinked. After cloning on a new machine:

```bash
cp ~/Developer/dotfiles/codex/config.toml ~/.codex/config.toml
```

Then add your machine-specific bits (not tracked in the repo):

```toml
notify = ["bash", "/Users/<you>/.claude/hooks/peon-ping/adapters/codex.sh"]

[projects."/Users/<you>/Developer/<project>"]
trust_level = "trusted"
```

## Zshrc split — why

Classic problem: one 300-line `.zshrc` mixes PATH exports (needed by every
shell), aliases (interactive only), and tool init. Split:

- `.zshenv` — runs for *every* shell (including non-interactive scripts).
  Keep minimal or cron/scripts break.
- `.zprofile` — login shell, once. PATH, exported env, `brew shellenv`,
  `rbenv init`, JAVA_HOME, Claude Code env vars.
- `.zshrc` — interactive shells. OMZ, prompt, aliases, `atuin init`,
  `thefuck --alias`, completions.

`.zshrc` sources `.zprofile` at the top (guarded by `$HOMEBREW_PREFIX` check)
to cover terminal emulators that skip login shells.

## Maintenance

See [`AGENTS.md`](./AGENTS.md) (also linked as `CLAUDE.md`) for:

- File → install-target map
- How to add new shell config / editor settings / Claude / Codex bits
- Brewfile drift check
- Sanitization rules before committing (this is a public repo)
- Conventions and what *not* to do

## Licence

MIT. See `LICENSE`.
