# stage-line

A Claude Code mod that draws the status rows under the prompt. The third row
starts with the workflow stage:

```
🕐 [05/10/26  7:25:42] 📂 dotfiles 🌿 (feat/x) 🤖 [Opus 5.5] {high} 📊 [ctx: 42K]
📥 in: 5K 📤 out: 2K ⏳ [5h: 14% 05/10 20:10] 📅 [7d: 7% 11/10 23:00]
◆ CODE_REVIEW #12 🔑 0335d342-36f4-4f85-95ec-6b17587ec444 🏷 fix login
```

A row never wraps: a narrow terminal cuts it at the edge. The folder is
dropped when it repeats the branch, as a worktree folder named after its
branch does. Branch and title names longer than 40 characters are clipped.

Tested with Claude Code 2.1.289. Mods need 2.1.287 or later.

## Load

```bash
claude --plugin-dir ~/.dotfiles/claude/mods/stage-line
```

In this repo, `bin/claude` adds the flag. Remove `statusLine` from
`~/.claude/settings.json`, or the old status line draws as well.

## Stages

| Stage         | Meaning                                    |
| :------------ | :----------------------------------------- |
| `PLAN`        | Plan mode, or a new session with no PR.    |
| `BUILD`       | Claude changes files.                      |
| `USER_REVIEW` | The turn ended after changes. You review.  |
| `CODE_REVIEW` | Automated reviews run.                     |
| `STAND_BY`    | All work is done. You wait for PR reviews. |

| Signal                                                                  | Result                                     |
| :---------------------------------------------------------------------- | :----------------------------------------- |
| Plan mode on (prompt in plan mode, or `EnterPlanMode`)                  | `PLAN`                                     |
| `ExitPlanMode` approved for the main agent                              | `BUILD`                                    |
| `Edit`, `Write` or `NotebookEdit` succeeds, in any stage                | `BUILD`                                    |
| Main turn ends with an answer while in `BUILD`                          | `USER_REVIEW`                              |
| `gh pr create` succeeds, `git push` succeeds to a branch with an open PR, a review subagent starts, or a skill with "review" in its name runs | `CODE_REVIEW` |
| Local reviews finish, then `gh` finds no PR                             | `USER_REVIEW`                              |
| Local reviews finish and the PR is finished (below)                     | `STAND_BY`                                 |

An aborted, failed or refused turn keeps `BUILD`. A review subagent is any
subagent type that matches `/review/i`. Local review is done when every
tracked review subagent finished and no review skill turn is open.

## PR checks

The mod runs `gh pr view --json number,state,headRefOid,statusCheckRollup,reviews`
at session start, after `git push`, after `gh pr create`, when local reviews
finish, and every 60 s while the stage is `CODE_REVIEW` or `STAND_BY`.

A PR counts as finished only when all of these hold:

- The mod saw the current head commit on an earlier check. A new push always
  starts over.
- Every bot that reviewed any commit of the PR reviewed the current head.
- Every check in the rollup is complete.
- No local review runs.

A PR with no checks and no bot reviews counts as finished 10 minutes after the
mod first saw its head. Bots are found by login: a `[bot]` or `bot` suffix, or
one of these names: `coderabbitai`, `copilot-pull-request-reviewer`,
`qodo-code-review`, `sourcery-ai`, `greptile-apps`, `gemini-code-assist`,
`chatgpt-codex-connector`, `cursor`. `gh` does not mark bot reviews, so a bot
with another login counts as a person and is not waited for.

A `gh` failure other than "no pull requests found" changes nothing; the next
poll tries again. A result that arrives after an edit, a stage change, a
branch change or `/clear` is discarded.

## `/stage`

The rules are heuristics. `/stage` prints the current stage. `/stage build`,
`/stage user-review` and the other names set it by hand.

## Limits

- Token totals count `input_tokens` and `output_tokens` from every model
  request after the mod loaded, subagents included. Cache tokens are not
  counted. A session started before the mod loaded shows totals since load.
- Effort shows the main agent's last request. A subagent's effort never
  replaces it.
- If a review subagent finishes before its spawn returns, its id can stay
  tracked and hold the stage in `CODE_REVIEW`. `/stage` clears it.
- Docker sandboxes do not load plugins. The sbx kit keeps `statusline.sh`.

## Test

```bash
claude plugin validate .
claude plugin test .
npx -y -p typescript@5.9.3 tsc -p tsconfig.json
```
