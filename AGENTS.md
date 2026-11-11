# AGENTS.md — maintaining this repo

Repo-level rules for `~/Developer/dotfiles`. The global agent rules live in
`AGENTS-GLOBAL.md`, linked into `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`
and `~/.pi/agent/AGENTS.md`. Do not confuse the two.

## Basics

- Single source of truth for shell, git, editor and AI-tool config, modelled
  on [MikeMcQuaid/dotfiles](https://github.com/MikeMcQuaid/dotfiles).
- **Repo → home.** Edit files here, then run `./script/setup` (idempotent,
  only makes symlinks, backs up real files to `<file>.backup.<ts>`).
- `~/.dotfiles` is a symlink to this directory.
- The checked-out branch is the live config: symlinks, `bin/claude` and the
  mods read this tree. Use `git worktree add` for side work.
- **Public repo.** Run the sanitization scan before every commit.

## File → install-target map

| Repo file                                         | Target                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| `zshenv.sh`, `zprofile.sh`, `zshrc.sh`            | `~/.zshenv`, `~/.zprofile`, `~/.zshrc`                                |
| `zsh/*.zsh`                                       | sourced from `zshrc.sh` (`omarchy.zsh` only when `$OMARCHY_PATH` set) |
| `gitconfig`, `gitignore`, `gitattributes`         | `~/.gitconfig`, `~/.gitignore`, `~/.gitattributes`                    |
| `gitconfig.local.{macos,linux}`                   | `~/.gitconfig.local` (per OS)                                         |
| `vscode-settings.json`, `vscode-keybindings.json` | `~/Library/Application Support/Code/User/`                            |
| `zed-settings.json`, `zed-keymap.json`            | `~/.config/zed/`                                                      |
| `ghostty/config.macos`                            | `~/.config/ghostty/config` (macOS only)                               |
| `omarchy/hypr/*.lua`                              | `~/.config/hypr/` (Linux; five files, **not** `hyprland.lua`)         |
| `omarchy/themes/*/`                               | `~/.config/omarchy/themes/<name>` (Linux, dir link)                   |
| `kimi-code/*.toml`, `kimi-code/statusline.sh`     | `~/.kimi-code/`                                                       |
| `AGENTS-GLOBAL.md`                                | the three global agent files above                                    |
| `pi/extensions/*.ts`, `pi/prompts/*.md`           | `~/.pi/agent/{extensions,prompts}/` (per-file links)                  |
| `claude/statusline.sh`                            | `~/.claude/statusline.sh` (sandbox only)                              |
| `bin/claude`                                      | not linked; on `PATH` via `~/.dotfiles/bin`                           |
| `claude/mods/*/`                                  | not linked; loaded by `bin/claude` with `--plugin-dir`                |
| `claude/sbx-kit/`                                 | not linked; passed to `sbx run --kit`                                 |

**Copy by hand, both ways** (tools rewrite them with per-machine state):
`claude/settings.json`, `codex/config.toml`, `mise/global.toml`,
`pi/settings.json`, `pi/mcp.json`, `omarchy/shell.json`.

**Not installed** (run from the repo): `Brewfile`, `Archfile`,
`vscode-extensions.txt`, `script/arch-bundle`, `script/omarchy-bootstrap`,
`script/sbx-bootstrap`.

## Shell config

- Always-set env and PATH (scripts, GUI tools, VS Code terminals, tmux) →
  `zshenv.sh`. `path_prepend` / `path_append` are defined there.
- Login-only → `zprofile.sh`. It runs after `zshenv.sh` and can bury an
  earlier prepend, so prepend in both files when order matters.
- Interactive only (aliases, prompt, tool init) → `zshrc.sh`.

## Claude Code

### Settings

```bash
cp ~/Developer/dotfiles/claude/settings.json ~/.claude/settings.json  # repo -> home
```

Never copy home → repo wholesale. Merge by key, and leave out:

- `autoMode.environment` and anything that names a `/Users/gus` path.
- Orca hooks (absolute `~/.orca/agent-hooks/` paths; Orca re-injects them).
- `baerskin-*` / `bk` plugins and the `baerskin-config` marketplace (private
  repo). Run `gh repo view <repo> --json visibility` before you add any
  marketplace.
- `statusLine`. The stage-line mod draws it. Delete it from the live file too.

Keep `enabledPlugins` and `extraKnownMarketplaces` sorted by key.

Orca writes its own blank `statusLine` when the live file has none. Lock its
marker once per machine, and never name `agent-hooks/claude-statusline.sh` in
`statusLine`:

```bash
chflags uchg ~/.orca/agent-hooks/claude-statusline.installed   # undo: chflags nouchg
```

### Claude Plus system prompt

`claude/claude-plus.md` replaces the built-in prompt. The real file is
`claude/sbx-kit/files/home/.claude/claude-plus.md`; the `claude/` path is a
symlink to it, because `sbx kit validate` rejects symlinks that leave the kit.

Claude Code has no persistent setting for a replacement prompt, so
`bin/claude` shadows the real launcher on `PATH` and always adds
`--system-prompt-file`. `~/.dotfiles/bin` is prepended in **both**
`zshenv.sh` and `zprofile.sh`, because `~/.local/bin` holds a competing
`claude`. Remove either line and some shells get the stock prompt. Check:

```bash
zsh -lic 'command -v claude'; zsh -ic 'command -v claude'; zsh -c 'command -v claude'
```

Limits: an absolute path to the real binary bypasses the wrapper, bash shells
are not covered, and subagents keep their own prompt. The `caveman` plugin
stays off; it conflicts with Claude Plus.

### Mods

`bin/claude` loads every `claude/mods/*/` that has a
`.claude-plugin/plugin.json`. A new mod needs no wrapper edit. Each mod's
README has its rules:

- `stage-line` draws the status rows and the workflow stage.
- `last-prompt` pins the last prompt in a `LAST WORDS` panel.
- `dev-urls` lists worktree dev servers and pinned test URLs in `DEV URLS`.

dev-urls puts its panel before the hook chain result and last-prompt puts its
panel after it. Keep that order. After a mod edit:

```bash
claude plugin validate . && claude plugin test .
npx -y -p typescript@5.9.3 tsc -p tsconfig.json
```

The sandbox has no mods. Change a status row in `stage-line/hooks/status.ts`
and in `claude/statusline.sh` together.

## Codex

Template only. Strip `notify`, `[projects.*]`, `[hooks.state.*]`,
`[marketplaces.*]`, `[mcp_servers.*]`, `[desktop.*]` and anything with an
absolute path before you copy home → repo.

## Pi

`pi/` ports the Claude setup to pi. `extensions/claude-plus.ts` replaces the
system prompt (`CLAUDE_PLUS_FILE` overrides the path). `extensions/peon-ping.ts`
replaces the Claude hooks. `prompts/` ports the commit commands. Strip
`deviceId` and `lastChangelogVersion` from `pi/settings.json`. Validate with
`pi -p --no-tools "say ok"`.

## mise

```bash
cp ~/Developer/dotfiles/mise/global.toml ~/.config/mise/config.toml  # repo -> home
cp ~/.config/mise/config.toml ~/Developer/dotfiles/mise/global.toml  # home -> repo
mise install
```

- Do not rename it to `mise/config.toml`. mise detects that path as an
  untrusted project config and every shim in this repo fails.
- Not linked because Omarchy wrappers run `mise use -g` on every launch.
  Read the diff before you copy home → repo; `os` filters can get lost.
- One file for both machines through `os` filters. macOS takes only `node`
  and `ruby`; everything else would shadow Homebrew.
- Shims are prepended on macOS and appended on Omarchy (guarded by
  `[ -z "$OMARCHY_PATH" ]`). Do not add `mise activate zsh`: its per-prompt
  hook puts a real `claude` ahead of the wrapper.
- `claude` is `os = ["linux"]`; `bin/claude` resolves it there. `ruby` stays
  pinned to avoid long compiles. Never run `mise self-update`.

## Kimi Code

Linked. Validate, then `/reload`:

```bash
kimi doctor config ~/Developer/dotfiles/kimi-code/config.toml
kimi doctor tui    ~/Developer/dotfiles/kimi-code/tui.toml
```

## Ghostty

macOS only. On Omarchy the distro owns `~/.config/ghostty/config`. Do not
recreate `~/Library/Application Support/com.mitchellh.ghostty/config*`; it
loads a second time. Colours are Dracula Pro Van Helsing. Reload with
`cmd+shift+,` and check with `ghostty +show-config`.

## Sandbox (sbx)

- `./script/sbx-bootstrap [sandbox-name]` seeds or repairs GitHub access. `gh`
  needs no login inside a sandbox; `gh api user` is the only real check.
- `claude/sbx-kit/` carries the prefs (`sbx-prefs.json`), `statusline.sh` and
  the Claude Plus prompt. Hooks and plugins are not carried.
- Launch with `sbxme` from `zshrc.sh`. It forwards `--system-prompt-file`; a
  bare `sbx run claude` gets the stock prompt.
- The global `~/.gitignore` excludes `.claude/`. The repo re-includes the kit
  path, so check `git status --untracked-files=all` after you add a kit file.
- Validate: `sbx kit validate ~/.dotfiles/claude/sbx-kit/`.

## Omarchy (Arch + Hyprland)

```bash
./script/setup                       # symlinks
./script/omarchy-bootstrap           # Archfile packages + Oh My Zsh + theme
./script/omarchy-bootstrap --chsh    # then switch the login shell
```

- **Never `chsh` before `zsh -lic 'true'` runs clean.** A broken login shell
  on an SSH-only box is not recoverable.
- `zshenv.sh` sources Omarchy's `env-bootstrap` (exports `OMARCHY_PATH`,
  appends mise shims) before it prepends `~/.dotfiles/bin`.
- `zsh/omarchy.zsh` ports the useful interactive parts. `obash` opens bash for
  the rest. Leave `~/.bashrc` alone.
- Do not port Omarchy's `gcm` (it is `git commit -m`; omz's is
  `git checkout main`). omz's `z` loads only when zoxide is absent.
- Leave `~/.config/git/config` alone. `gitconfig.local.linux` overrides its
  `gh` credential helper.
- Desktop details: [`omarchy/README.md`](./omarchy/README.md). Do not run
  `omarchy refresh hyprland|shell` casually; check `git status` after.

Drift check after every `omarchy update`:

```bash
for f in bindings looknfeel input autostart monitors; do
  printf '%-12s %s\n' "$f" "$(readlink -f ~/.config/hypr/$f.lua)"
done
diff ~/.config/omarchy/shell.json omarchy/shell.json && echo "shell.json in sync"
readlink ~/.config/omarchy/themes/dracula-pro-van-helsing
```

### Archfile

```bash
./script/arch-bundle check | install | dump   # dump wipes inline comments
```

`install` installs only the missing set, so it never does a partial upgrade.
Run `omarchy update` first if `checkupdates` is not empty.

## Brewfile and VS Code extensions

```bash
brew bundle dump --file=~/Developer/dotfiles/Brewfile --force   # re-add comments after
code --list-extensions > ~/Developer/dotfiles/vscode-extensions.txt
```

Brewfile comments say what the package does, in one line. Drift check:

```bash
brew bundle dump --file=/tmp/Brewfile.current --force
norm() { awk '/^(tap|brew|cask|mas|npm) /{ if (match($0, /"[^"]+"/)) print $1, substr($0, RSTART, RLENGTH) }' "$1" | LC_ALL=C sort -u; }
LC_ALL=C comm -3 <(norm Brewfile) <(norm /tmp/Brewfile.current)
diff <(sort vscode-extensions.txt) <(code --list-extensions | sort)
```

Use `awk`, not `grep -o` (BSD grep drops matches). `font-hack-nerd-font`
always shows as drift; that is expected.

## Sanitization

```bash
grep -rEn "token|apiKey|apiToken|secret|/Users/gus|machineId|baerskin|orca" \
  ~/Developer/dotfiles/{vscode-*,claude,codex,kimi-code,mise,pi,gitconfig*}
```

Strip tokens, `/Users/gus` paths (VS Code takes `${userHome}`), machine IDs
(`[coderabbit] machineId`, `sync.gist`), private repo names and Orca hooks.

## Adding a dotfile

1. Put the file in the repo, lowercase, no leading dot. `<name>.sh` installs
   as `~/.<name>`.
2. For any other location, add a `case` branch in `script/setup`.
3. Run `./script/setup` and check with `readlink`.

## Do not

- Symlink `claude/settings.json`, `codex/config.toml`, `shell.json` or
  `hyprland.lua`.
- Link `ghostty/config.macos` on Linux.
- Run the Oh My Zsh installer without `KEEP_ZSHRC=yes CHSH=no RUNZSH=no`.
- Commit `dracula-pro.zsh-theme` (paid asset), `.DS_Store`, `tmp/` or
  `*.backup.*`.
- Use absolute `/Users/gus/...` paths in hooks; use `~/`.

Commits: Conventional Commits + Gitmoji, e.g. `chore: ⬆️ refresh Brewfile`.
