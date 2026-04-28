# AGENTS.md — maintaining this repo

Notes for me + any AI agent working on `~/Developer/dotfiles`.

This is the **repo-level** AGENTS file. The **global** agent rules live in
`AGENTS-GLOBAL.md` (linked into `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`
by the installer). Don't confuse the two.

## Repo purpose

Single source of truth for my shell, git, editor, and AI-tool config. Symlinked
into `$HOME` by `script/setup`. Modeled on
[MikeMcQuaid/dotfiles](https://github.com/MikeMcQuaid/dotfiles).

## Source-of-truth direction

**Repo → home, not home → repo.**

- Edit files **here**, in `~/Developer/dotfiles/`.
- Run `./script/setup` to refresh symlinks (idempotent; backs up real files).
- Never edit through the symlink target if you're unsure — go to the repo file.
- `~/.dotfiles` is a symlink pointing at this directory; scripts use it.

## File → install-target map

| Repo file | Symlinked to |
|-----------|--------------|
| `zshenv.sh` | `~/.zshenv` |
| `zprofile.sh` | `~/.zprofile` |
| `zshrc.sh` | `~/.zshrc` |
| `zsh/dracula-highlight.zsh` | sourced from `zshrc.sh` via `~/.dotfiles/zsh/...` |
| `gitconfig` | `~/.gitconfig` |
| `gitconfig.local.macos` | `~/.gitconfig.local` (macOS only) |
| `gitignore` | `~/.gitignore` |
| `gitattributes` | `~/.gitattributes` |
| `vscode-settings.json` | `~/Library/Application Support/Code/User/settings.json` |
| `vscode-keybindings.json` | `~/Library/Application Support/Code/User/keybindings.json` |
| `zed-settings.json` | `~/.config/zed/settings.json` |
| `zed-keymap.json` | `~/.config/zed/keymap.json` |
| `claude/settings.json` | `~/.claude/settings.json` |
| `AGENTS-GLOBAL.md` | both `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` |
| `codex/config.toml` | **NOT** symlinked — copy manually (template) |
| `Brewfile` | not symlinked (run `brew bundle` against repo path) |
| `vscode-extensions.txt` | not symlinked (snapshot for restore via `xargs -L1 code --install-extension <`) |

## Routine maintenance

### Adding new shell config

- Login-once env / PATH → `zprofile.sh`
- Always-set env (read by scripts, cron, GUI tools) → `zshenv.sh`
- Interactive only (aliases, prompt, tool init like `atuin init zsh`) → `zshrc.sh`

### Adding new VSCode setting

Edit it in VSCode UI normally. Then sync to repo:

```bash
cp "$HOME/Library/Application Support/Code/User/settings.json" \
   ~/Developer/dotfiles/vscode-settings.json
```

If you ran `./script/setup`, `~/Library/.../settings.json` is already a symlink
to the repo file — the cp is a no-op and you can edit the repo file directly.

### Adding new Claude / Codex config

`claude/settings.json` is symlinked, so edits flow back automatically.
`codex/config.toml` is **not** symlinked (per-machine `notify` + `[projects.*]`
trust blocks live in real `~/.codex/config.toml`). To update the template:

```bash
# strip machine bits, keep general config
cp ~/.codex/config.toml ~/Developer/dotfiles/codex/config.toml
# then manually remove [projects."/Users/gus/..."] blocks + notify line
```

### Refreshing Brewfile

```bash
brew bundle dump --file=~/Developer/dotfiles/Brewfile --force
```

This blows away the annotated comments. Re-add them by hand for any new
entries — the inline comment style is "what the package does", not "why kept"
(see existing entries).

### Refreshing VSCode extensions list

```bash
code --list-extensions > ~/Developer/dotfiles/vscode-extensions.txt
```

### Drift check

```bash
# fresh dump to /tmp + diff against repo
brew bundle dump --file=/tmp/Brewfile.current --force
diff <(sort ~/Developer/dotfiles/Brewfile | sed 's/ *#.*//' | grep -vE '^(#|$)') \
     <(sort /tmp/Brewfile.current)
```

`<` = in repo only (uninstalled locally). `>` = installed only (missing from repo).

## Sanitization (PUBLIC repo)

Before committing, scan for:

| Risk | Where to check | What to do |
|------|----------------|------------|
| API tokens / keys | `vscode-settings.json`, `claude/settings.json` | grep for `token`, `apiKey`, `apiToken`, `secret` — strip |
| `/Users/gus/` paths | `claude/settings.json`, `vscode-settings.json` | replace with `~/` or `$HOME` if portable |
| Machine IDs | `gitconfig` (`[coderabbit] machineId`), VSCode `sync.gist` | omit; they regen per machine |
| Per-project trust blocks | `codex/config.toml` | strip `[projects."/Users/gus/..."]` |
| Personal email / noreply | `gitconfig` | noreply email is fine; real email up to you |

Quick scan:

```bash
grep -rEn "token|apiKey|apiToken|secret|/Users/gus|machineId" \
  ~/Developer/dotfiles/{vscode-*,claude,codex,gitconfig*}
```

## Adding a new dotfile to the system

1. Drop the file in repo root (or appropriate subdir).
2. Choose its install path:
   - Plain `.<name>` in `$HOME` → use `<name>.sh` (installer strips `.sh`)
     or `<name>` directly.
   - Special location → add a `case` branch in `script/setup`.
3. Run `./script/setup` and verify with `readlink ~/.<name>`.

## Conventions

- File naming: lowercase, no `.` prefix (installer adds it).
- Shell files end in `.sh` so the installer strips the extension when symlinking.
- Comments in shell files explain *why*, not *what* (see global rule in `AGENTS-GLOBAL.md`).
- Brewfile inline comments: short purpose description, no "REVIEW:" or "kept because" prose. Aspire to one line that reads like a tooltip.
- Commits: Conventional Commits + Gitmoji (e.g. `chore: ⬆️ refresh Brewfile`, `feat: ✨ add tmux config`).

## What NOT to do

- Don't symlink `codex/config.toml` from the installer — it would clobber the per-machine `notify` path and `[projects.*]` trust blocks.
- Don't commit `.DS_Store`, `tmp/`, `*.backup.*` — `.gitignore` covers these but double-check `git status` before commit.
- Don't run `./script/setup` blindly on a machine where you've manually customized `~/.zshrc` etc. — the installer backs up real files to `<file>.backup.<ts>`, but you'll lose the active config until you merge by hand.
- Don't add Claude/Codex hooks paths with absolute `/Users/gus/...` — use `~/` so the file works on any machine.
