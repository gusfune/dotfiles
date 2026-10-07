---
description: Clean up local branches marked [gone], including their worktrees
---

Clean up stale local branches that have been deleted from the remote:

1. List branches with `git branch -v` and identify any with `[gone]` status. Branches with a `+` prefix have associated worktrees that must be removed first.
2. Check `git worktree list` for worktrees attached to those branches.
3. For each `[gone]` branch: remove its worktree with `git worktree remove --force <path>` if one exists (never the repo root), then `git branch -D <branch>`.
