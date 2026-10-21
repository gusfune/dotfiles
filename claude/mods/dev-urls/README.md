# dev-urls

A Claude Code mod that lists, above the LAST WORDS band, the dev servers this
worktree runs and the test URLs pinned for its branch. Each URL is a link:
cmd-click opens it.

```
╭─ DEV URLS · feat/cart-hotfix ────────────────────────────────────────────╮
│ ● apps/web :3000        http://localhost:3000                            │
│ ● apps/storybook :6006  http://localhost:6006                            │
│ ★ cart page             http://localhost:3000/en/cart                    │
╰──────────────────────────────────────────────────────────────────────────╯
╭─ LAST WORDS ─────────────────────────────────────────────────────────────╮
│ » fix the cart address form…                                             │
╰──────────────────────────────────────────────────────────────────────────╯
❯ █
```

## Rules

- A server (`●`) is a process that listens on a TCP port and has its cwd
  inside the worktree root (`git rev-parse --show-toplevel`). A server that
  runs from another checkout of the same repo stays out, so the list belongs
  to the branch. The label is the cwd relative to the root, or the process
  name at the root.
- Ports from 49152 up are dropped. That is the dynamic range macOS hands out
  for port 0. Claude Code's own IDE and MCP listeners sit there, with the
  worktree as their cwd.
- A server in Docker does not show. Its listener is the Docker proxy, whose
  cwd is not the worktree.
- A pin (`★`) is a URL the model pins with the `pin_test_url` tool, for
  example a page the change touches or a preview deploy. Ask Claude to pin or
  unpin one. Pins are kept in the mod's store per worktree and branch, for
  the newest 100 branches.
- The list is scanned every 5 seconds and after every Bash call. A scan is
  two `lsof` calls: one for every listener, one batch call for their cwds.
- The band shows at most 6 rows; the last row then counts the rest.
- The band hides when there is nothing to list, and while a survey shows.
- The band prepends itself and last-prompt appends LAST WORDS, so DEV URLS
  stays above LAST WORDS whichever mod loads first.

## Checks

```bash
cd ~/Developer/dotfiles/claude/mods/dev-urls
claude plugin validate .
claude plugin test .
npx -y -p typescript@5.9.3 tsc -p tsconfig.json   # needs the generated types
```
