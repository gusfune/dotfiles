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

| Repo file                   | Symlinked to                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `zshenv.sh`                 | `~/.zshenv`                                                                                                               |
| `zprofile.sh`               | `~/.zprofile`                                                                                                             |
| `zshrc.sh`                  | `~/.zshrc`                                                                                                                |
| `zsh/dracula-highlight.zsh` | sourced from `zshrc.sh` via `~/.dotfiles/zsh/...`                                                                         |
| `gitconfig`                 | `~/.gitconfig`                                                                                                            |
| `gitconfig.local.macos`     | `~/.gitconfig.local` (macOS only)                                                                                         |
| `gitignore`                 | `~/.gitignore`                                                                                                            |
| `gitattributes`             | `~/.gitattributes`                                                                                                        |
| `vscode-settings.json`      | `~/Library/Application Support/Code/User/settings.json`                                                                   |
| `vscode-keybindings.json`   | `~/Library/Application Support/Code/User/keybindings.json`                                                                |
| `zed-settings.json`         | `~/.config/zed/settings.json`                                                                                             |
| `zed-keymap.json`           | `~/.config/zed/keymap.json`                                                                                               |
| `bin/claude`                | **NOT** symlinked — reached as `~/.dotfiles/bin` on `PATH` (see `zshenv.sh` + `zprofile.sh`); shadows the real Claude Code launcher |
| `claude/claude-plus.md`     | **NOT** symlinked — a repo-internal symlink into `claude/sbx-kit/files/home/.claude/`; read by absolute path            |
| `claude/settings.json`      | **NOT** symlinked — copy manually (both ways)                                                                             |
| `claude/sbx-kit/`           | not symlinked — an sbx mixin kit, passed to `sbx run --kit` (see [Sandbox (sbx) Claude prefs](#sandbox-sbx-claude-prefs)) |
| `kimi-code/config.toml`     | `~/.kimi-code/config.toml`                                                                                                |
| `kimi-code/tui.toml`        | `~/.kimi-code/tui.toml`                                                                                                   |
| `kimi-code/statusline.sh`   | `~/.kimi-code/statusline.sh` (referenced by `tui.toml` `[status_line]`)                                                   |
| `AGENTS-GLOBAL.md`          | both `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`                                                                       |
| `codex/config.toml`         | **NOT** symlinked — copy manually (template)                                                                              |
| `script/sbx-bootstrap`      | not symlinked (run from repo or `~/.dotfiles/script/`)                                                                    |
| `Brewfile`                  | not symlinked (run `brew bundle` against repo path)                                                                       |
| `vscode-extensions.txt`     | not symlinked (snapshot for restore via `xargs -L1 code --install-extension <`)                                           |

## Routine maintenance

### Adding new shell config

- Login-once env / PATH → `zprofile.sh`
- Always-set env (read by scripts, cron, GUI tools) → `zshenv.sh`
- Interactive only (aliases, prompt, tool init like `atuin init zsh`) → `zshrc.sh`

`path_prepend` and `path_append` are defined in `zshenv.sh`, not `zprofile.sh`.
zsh sources `.zshenv` for every shell and `.zprofile` for login shells only, so
a PATH entry that must also reach VS Code terminals, tmux panes, subshells and
scripts belongs in `zshenv.sh`. `.zshenv` always runs first, which means a
later `path_prepend` in `zprofile.sh` can bury an entry `zshenv.sh` put in
front. When order matters, prepend in both files.

### Adding new VSCode setting

Edit it in VSCode UI normally. Then sync to repo:

```bash
cp "$HOME/Library/Application Support/Code/User/settings.json" \
   ~/Developer/dotfiles/vscode-settings.json
```

If you ran `./script/setup`, `~/Library/.../settings.json` is already a symlink
to the repo file — the cp is a no-op and you can edit the repo file directly.

### Adding new Claude / Codex config

Neither is symlinked — both are copied by hand, in both directions.

`claude/settings.json`: Claude rewrites the live file with per-machine state
(`autoMode.environment` names real repos and worktree paths, `modelSettings`
churn), none of which belongs in a public repo.

```bash
cp ~/Developer/dotfiles/claude/settings.json ~/.claude/settings.json  # repo -> home
cp ~/.claude/settings.json ~/Developer/dotfiles/claude/settings.json  # home -> repo
# then drop autoMode.environment + anything naming a private repo or /Users/gus path
```

`codex/config.toml` is **not** symlinked either (per-machine `notify` +
`[projects.*]` trust blocks live in real `~/.codex/config.toml`). To update the
template:

```bash
# strip machine bits, keep general config
cp ~/.codex/config.toml ~/Developer/dotfiles/codex/config.toml
# then manually remove [projects."/Users/gus/..."] blocks + notify line
```

### Claude Plus system prompt

`claude/claude-plus.md` is the system prompt every Claude Code session runs
with. It **replaces** the built-in prompt; it is not appended to it. Source
version: `claude-plus-1.0.md`.

The canonical file lives at
`claude/sbx-kit/files/home/.claude/claude-plus.md` and `claude/claude-plus.md`
is a symlink to it. That looks backwards, and it is deliberate: `sbx kit
validate` rejects a symlink that escapes the kit directory, so the real bytes
have to sit inside the kit. One file, no drift, no hand-sync. Edit it through
either path.

**Why a PATH wrapper.** Claude Code has no persistent setting for a custom
system prompt. Verified against the 2.1.269 binary, not from memory:

- no `systemPrompt` / `systemPromptFile` key in `settings.json` (the
  `"systemPrompt"` strings in the binary belong to cloud-session config)
- no environment variable that takes a file
- an **output style** is persistent but only swaps the role and tone block —
  it appends around the harness sections, so it is not a replacement
- `CLAUDE.md` appends as a user message

`--system-prompt-file` is the only full replacement and it is per-invocation.
So `bin/claude` shadows the real launcher on `PATH` and adds the flag every
time.

The prepend is in **two** files on purpose. `zshenv.sh` runs for every shell,
which is what gets the wrapper into VS Code terminals, tmux panes, subshells
and scripts — none of those are login shells. `zprofile.sh` then prepends
`~/.local/bin`, which holds the real binary and would win, so it re-prepends
`~/.dotfiles/bin` straight after. Remove either line and `claude` silently
falls back to the stock prompt in some shells. Check all three:

```bash
zsh -lic 'command -v claude'   # login interactive
zsh -ic  'command -v claude'   # non-login interactive
zsh -c   'command -v claude'   # non-login non-interactive
```

The flag is harmless on subcommands (`mcp`, `plugin`, `--version` were all
tested), so the wrapper does no argument sniffing.

```bash
command -v claude                # ~/.dotfiles/bin/claude, not ~/.local/bin
~/.local/bin/claude              # stock prompt, if you ever need to compare
```

The wrapper had a `CLAUDE_PLUS=0` escape hatch for the A/B against the stock
prompt. The A/B is settled, so the switch is gone: one code path, no env var
that can silently turn the prompt off. The real binary by absolute path still
gives you the stock prompt.

Caveats worth knowing:

- Anything invoking `/Users/gus/.local/bin/claude` by absolute path bypasses
  the wrapper and gets the stock prompt, silently. `command -v claude` is the
  check.
- The fix is zsh-only. A `bash` shell reads neither `.zshenv` nor `.zprofile`,
  so `bash -lc claude` reaches the real binary. This repo ships no bash config
  and zsh is the login shell, so the gap is accepted, not fixed.
- Subagents keep their own prompt; the flag sets the main agent's.
- The YAML frontmatter at the top of the file is output-style schema. Under
  `--system-prompt-file` it is inert — four lines of literal text. It is kept
  for fidelity with the upstream file.
- The `caveman` plugin is off (`"caveman@caveman": false` in
  `claude/settings.json`). Its `SessionStart` hook told Claude to drop
  articles, which fights the Claude Plus rule to keep them — and Claude Plus
  already does the compression the plugin was there for. Two cavemen, one
  cave. Plugin state also lives in the live `~/.claude/settings.json`, which
  is copied by hand, so flip it in both.

### Adding new Kimi Code config

`kimi-code/config.toml` and `kimi-code/tui.toml` are symlinked, so edits flow
back automatically. Validate TOML edits before reloading:

```bash
kimi doctor config ~/Developer/dotfiles/kimi-code/config.toml
kimi doctor tui    ~/Developer/dotfiles/kimi-code/tui.toml
# then /reload in the TUI (covers both files)
```

Kimi rewrites the managed `[providers.*]` / `[models.*]` sections on refresh —
expect occasional churn in the repo file. Unlike `claude/settings.json`, these
are symlinked, so that churn lands in the repo on its own.

### Sandbox (sbx) GitHub setup

`script/sbx-bootstrap` is dual-mode and safe to re-run:

```bash
./script/sbx-bootstrap                  # on the host: seed the global github secret
./script/sbx-bootstrap <sandbox-name>   # ...and patch a running sandbox too
./script/sbx-bootstrap                  # inside a sandbox: verify / repair
```

`gh` needs **no login inside a sandbox** — the proxy injects credentials, so
`GH_TOKEN` is a `gho_sbxproxymanaged…` sentinel and only `gh api user` proves
it works. The global secret applies to sandboxes created after it's set; pass a
sandbox name to fix an existing one immediately.

### Sandbox (sbx) Claude prefs

Docker Sandboxes never import `~/.claude`: the VM gets a settings.json seeded
by the built-in claude kit, and only `~/.claude/skills` is mounted. So the
status line, model and effort level differ inside a sandbox unless a kit
carries them. `claude/sbx-kit/` is that kit (modelled on
`docker/sbx-kits-contrib/claude-sbx-statusline`):

| File                                | Role                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec.yaml`                         | mixin, `requires.agent: claude`; the `install` step jq-merges the prefs into `~/.claude/settings.json` as root and `chmod +x` the status line |
| `files/home/.claude/sbx-prefs.json` | the subset of `claude/settings.json` to carry: `statusLine`, `model`, `effortLevel`, thinking flags, `theme`, `tui`, `env`                    |
| `files/home/.claude/statusline.sh`  | the host statusLine one-liner as a script, with epoch formatting that works on GNU, uutils and BSD `date`                                     |
| `files/home/.claude/claude-plus.md` | the Claude Plus system prompt. This is the **canonical copy**; `claude/claude-plus.md` is a symlink to it. Shipped, but only applied when the launcher passes `--system-prompt-file` |

Launch with the `sbxme` function from `zshrc.sh`. It names both the repo kit
and this one, because the repo launcher drops its own `--kit` when one is
passed:

```bash
sbxme            # repo dir with .docker/sandbox.sh: repo kit + prefs kit
sbxme codex      # any agent name, flags pass through
```

If `sbx` rejects the kit path (`kit.allowedSources` is a prefix list), allow
the dotfiles checkout once:

```bash
sbx settings set kit.allowedSources '["docker.io/","./","/Users/<you>/Developer/dotfiles/"]'
```

The Claude Plus prompt needs a launcher flag, not just the file. A `kind:
mixin` kit is forbidden from setting `sandbox.entrypoint`, so `sbxme` forwards
`--system-prompt-file /home/agent/.claude/claude-plus.md` after the `--`
separator that `sbx run` reserves for agent arguments. That is per-invocation,
which is fine because `sbxme` is the only launcher — but a bare `sbx run
claude` gets the stock prompt. The supported alternative, if that ever
matters, is a second kit with `kind: sandbox` and `extends: claude` that owns
the entrypoint outright.

The `.docker/sandbox.sh` branch of `sbxme` is a per-repo launcher this repo
does not own, so it is left alone; whether it forwards `--` is up to that
script.

The kit payload lives under a `.claude/` path, which the global `~/.gitignore`
excludes everywhere. That silently kept `sbx-prefs.json` and `statusline.sh`
out of every commit until it was caught — the repo's own `.gitignore` now
re-includes the directory and its contents. If you add a file to the kit,
check `git status --untracked-files=all` before you trust it.

Hooks are **not** carried on purpose: peon-ping needs macOS audio, the Superset
and Orca hooks check for host-only paths and no-op in the VM. Plugins are not
carried either (they need a marketplace install inside the VM). Keep
`sbx-prefs.json` in step with `claude/settings.json` by hand, same as the
settings file itself. Validate after any edit:

```bash
sbx kit validate ~/.dotfiles/claude/sbx-kit/
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

| Risk                      | Where to check                                             | What to do                                                                                 |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| API tokens / keys         | `vscode-settings.json`, `claude/settings.json`             | grep for `token`, `apiKey`, `apiToken`, `secret` — strip                                   |
| `/Users/gus/` paths       | `claude/settings.json`, `vscode-settings.json`             | replace with `~/` or `$HOME` if portable                                                   |
| Per-machine auto-mode env | `claude/settings.json`                                     | strip `permissions`-adjacent `autoMode.environment` — it names real repos + worktree paths |
| Machine IDs               | `gitconfig` (`[coderabbit] machineId`), VSCode `sync.gist` | omit; they regen per machine                                                               |
| Per-project trust blocks  | `codex/config.toml`                                        | strip `[projects."/Users/gus/..."]`                                                        |
| Personal email / noreply  | `gitconfig`                                                | noreply email is fine; real email up to you                                                |

Quick scan:

```bash
grep -rEn "token|apiKey|apiToken|secret|/Users/gus|machineId" \
  ~/Developer/dotfiles/{vscode-*,claude,codex,kimi-code,gitconfig*}
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
- Comments in shell files explain _why_, not _what_ (see global rule in `AGENTS-GLOBAL.md`).
- Brewfile inline comments: short purpose description, no "REVIEW:" or "kept because" prose. Aspire to one line that reads like a tooltip.
- Commits: Conventional Commits + Gitmoji (e.g. `chore: ⬆️ refresh Brewfile`, `feat: ✨ add tmux config`).

## What NOT to do

- Don't symlink `claude/settings.json` or `codex/config.toml` from the installer — it would clobber the per-machine `notify` path and `[projects.*]` trust blocks.
- Don't commit `.DS_Store`, `tmp/`, `*.backup.*` — `.gitignore` covers these but double-check `git status` before commit.
- Don't run `./script/setup` blindly on a machine where you've manually customized `~/.zshrc` etc. — the installer backs up real files to `<file>.backup.<ts>`, but you'll lose the active config until you merge by hand.
- Don't add Claude/Codex hooks paths with absolute `/Users/gus/...` — use `~/` so the file works on any machine.
