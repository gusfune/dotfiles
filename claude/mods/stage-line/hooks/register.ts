/**
 * stage-line: the status line under the prompt, plus the workflow stage.
 *
 * Replaces the command `statusLine` (claude/sbx-kit/.../statusline.sh), because
 * a mod cannot draw inside it. Every workflow change goes through one
 * version-checked `update` of the `workflow` state key, so concurrent hooks
 * (a PR poll, an edit, a review agent finishing) never overwrite each other.
 */
import { read, update } from "claude-code"
import type { EngineInterface, Register } from "claude-code"
import {
  classifyPr,
  freshWorkflow,
  isLocalReviewDone,
  isStage,
  next,
  STAGES,
} from "./stage"
import type { PrOrigin, Signal, Workflow } from "./stage"
import { parseGitStatus, statusRows } from "./status"
import type { GitStatus } from "./status"

const WORKFLOW = { plugin: "stage-line", key: "workflow" } as const
const EFFORT = { plugin: "stage-line", key: "effort" } as const
const GIT = { plugin: "stage-line", key: "git" } as const
const TITLE = { plugin: "stage-line", key: "title" } as const

const PR_FIELDS = "number,state,headRefOid,statusCheckRollup,reviews"
const POLL_MS = 60_000
const BRANCH_MS = 10_000

const FILE_TOOLS = new Set(["Edit", "Write", "NotebookEdit"])

/** Timers live in the module's environment; a hot reload cancels them and loads a fresh module. */
let isTicking = false

interface Transition {
  before: Workflow
  after: Workflow
}

const workflowKey = (sessionId: string): string => `workflow:${sessionId}`

/**
 * Runs a process and maps a failed launch (binary missing, timeout) to a
 * non-zero exit, so callers read one shape and the PR check reads "unknown".
 */
const run = async ($: EngineInterface, argv: readonly string[]) => {
  const cwd = await $.session.cwd()
  return $.process
    .run(argv, { cwd, timeoutMs: 20_000 })
    .catch((error: unknown) => ({
      exitCode: -1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    }))
}

/** Branch and counts in one call; null outside a repo or on failure. */
const gitStatus = async ($: EngineInterface): Promise<GitStatus | null> => {
  const result = await run($, ["git", "status", "--porcelain=v2", "--branch"])
  return result.exitCode === 0 ? parseGitStatus(result.stdout) : null
}

/** Applies one signal atomically, then mirrors the record to the store for /resume. */
const apply = async (
  $: EngineInterface,
  signal: Signal
): Promise<Transition> => {
  let before = freshWorkflow("", "")
  const after = await update($, WORKFLOW, (current) => {
    before = current ?? freshWorkflow("", "")
    return next(before, signal)
  })
  if (after !== before && after.sessionId) {
    await $.store.set(workflowKey(after.sessionId), after)
  }
  return { before, after }
}

/**
 * One `gh pr view`. It captures session, branch and revision first; the
 * transition discards the result if any of them moved meanwhile.
 */
const checkPr = async ($: EngineInterface, origin: PrOrigin): Promise<void> => {
  const w = await read($, WORKFLOW)
  if (!w?.sessionId) {
    return
  }
  const capture = {
    sessionId: w.sessionId,
    branch: w.branch,
    revision: w.revision,
  }
  const view = classifyPr(
    await run($, ["gh", "pr", "view", "--json", PR_FIELDS])
  )
  const now = await $.clock.now()
  await apply($, { kind: "pr", origin, view, capture, now })
}

/**
 * The branch goes to the workflow record (the stale-PR guard reads it); the
 * counts go to their own key, so a new file never bumps the workflow revision.
 */
const setGitCounts = async (
  $: EngineInterface,
  status: GitStatus | null
): Promise<void> => {
  await update($, GIT, (g) => {
    const counts = status
      ? { dirty: status.dirty, ahead: status.ahead, behind: status.behind }
      : null
    const isSame =
      g?.counts?.dirty === counts?.dirty &&
      g?.counts?.ahead === counts?.ahead &&
      g?.counts?.behind === counts?.behind
    return g && isSame ? g : { counts }
  })
}

const refreshBranch = async ($: EngineInterface): Promise<void> => {
  const status = await gitStatus($)
  const branch = status?.branch ?? ""
  await setGitCounts($, status)
  await update($, WORKFLOW, (w) =>
    w && w.branch !== branch
      ? { ...w, branch }
      : (w ?? freshWorkflow("", branch))
  )
}

/** Restores a stored record for this session, or starts at PLAN. Running review work never carries over. */
const restore = (
  stored: unknown,
  sessionId: string,
  branch: string
): Workflow => {
  if (typeof stored !== "object" || stored === null) {
    return freshWorkflow(sessionId, branch)
  }
  const record = stored as Partial<Workflow>
  if (
    record.sessionId !== sessionId ||
    typeof record.stage !== "string" ||
    !isStage(record.stage)
  ) {
    return freshWorkflow(sessionId, branch)
  }
  return {
    ...freshWorkflow(sessionId, branch),
    ...record,
    branch,
    reviewAgents: [],
    isSkillReviewOpen: false,
  }
}

/**
 * Binds the record to `sessionId`. On `start` (load or hot reload) a record
 * already held for the same session wins, so a reload never resets the stage.
 */
const adopt = async (
  $: EngineInterface,
  sessionId: string,
  source: "start" | "clear" | "resume" | "fork"
): Promise<void> => {
  const status = await gitStatus($)
  await setGitCounts($, status)
  const branch = status?.branch ?? ""
  const isClear = source === "clear"
  const storedWorkflow = isClear
    ? undefined
    : await $.store.get(workflowKey(sessionId))
  const loaded = restore(storedWorkflow, sessionId, branch)
  await update($, WORKFLOW, (w) =>
    source === "start" && w?.sessionId === sessionId ? w : loaded
  )
}

/**
 * Starts the git refresh and the PR poll once per environment. No redraw
 * clock: a write to state the render read draws the rows again.
 */
const startTimers = ($: EngineInterface): void => {
  if (isTicking) {
    return
  }
  isTicking = true
  // refreshBranch and checkPr never reject: run() maps a failed launch to an exit code.
  $.clock.every(BRANCH_MS, () => {
    void refreshBranch($)
  })
  $.clock.every(POLL_MS, () => {
    void read($, WORKFLOW).then((w) => {
      if (w?.stage === "CODE_REVIEW" || w?.stage === "STAND_BY") {
        return checkPr($, "poll")
      }
      return undefined
    })
  })
}

const setTitle = async (
  $: EngineInterface,
  title: string | undefined
): Promise<void> => {
  if (title) {
    await $.state.set(TITLE, title)
  }
}

const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: "stage",
      description: "Show the workflow stage, or set it by hand",
      argumentHint: STAGES.join("|").toLowerCase(),
    })
    await adopt($, await $.session.id(), "start")
    startTimers($)
    await checkPr($, "lifecycle")
    return result
  })

  // session.start does not fire after /clear, /resume or /branch.
  on("classic.SessionStart", async ($, e, next) => {
    const result = await next(e)
    if (e.source === "clear" || e.source === "resume" || e.source === "fork") {
      await adopt($, e.session_id, e.source)
      await checkPr($, "lifecycle")
    }
    await setTitle($, e.session_title)
    return result
  })

  on("classic.UserPromptSubmit", async ($, e, next) => {
    if (e.permission_mode === "plan") {
      await apply($, { kind: "plan" })
    }
    await setTitle($, e.session_title)
    return next(e)
  })

  on(
    "tool.call",
    {
      tool: [
        "Edit",
        "Write",
        "NotebookEdit",
        "EnterPlanMode",
        "ExitPlanMode",
        "Bash",
        "Skill",
      ],
    },
    async ($, e, next) => {
      const result = await next(e)
      if (result.deny !== undefined || result.isError) {
        return result
      }
      if (FILE_TOOLS.has(e.tool)) {
        await apply($, { kind: "edit" })
        return result
      }
      if (e.tool === "EnterPlanMode" && !e.agentId) {
        await apply($, { kind: "plan" })
        return result
      }
      if (e.tool === "ExitPlanMode" && !e.agentId) {
        const output: unknown = result.result
        const isAwaitingLeader =
          typeof output === "object" &&
          output !== null &&
          "awaitingLeaderApproval" in output &&
          output.awaitingLeaderApproval === true
        if (!isAwaitingLeader) {
          await apply($, { kind: "planApproved" })
        }
        return result
      }
      if (e.tool === "Skill" && /review/i.test(e.skill)) {
        await apply($, { kind: "reviewSkillStart" })
        return result
      }
      if (e.tool === "Bash") {
        if (/\bgh\s+pr\s+create\b/.test(e.command)) {
          await apply($, { kind: "prCreated" })
          await checkPr($, "poll")
        } else if (/\bgit\s+push\b/.test(e.command)) {
          await checkPr($, "push")
        }
      }
      return result
    }
  )

  on("agent.spawn", async ($, e, next) => {
    const result = await next(e)
    if (
      result.deny === undefined &&
      result.agentId &&
      /review/i.test(e.subagentType)
    ) {
      await apply($, { kind: "reviewAgentStart", agentId: result.agentId })
    }
    return result
  })

  on("turn.step", async function* ($, e, next) {
    const result = yield* next(e)
    if (!e.agentId && e.effort !== undefined) {
      const effort = String(e.effort)
      if ((await read($, EFFORT)) !== effort) {
        await $.state.set(EFFORT, effort)
      }
    }
    return result
  })

  on("turn.complete", async ($, e, next) => {
    const result = await next(e)
    if (e.agentId) {
      const { before, after } = await apply($, {
        kind: "reviewAgentDone",
        agentId: e.agentId,
      })
      const isLastReview =
        before.reviewAgents.includes(e.agentId) && isLocalReviewDone(after)
      if (isLastReview && after.stage === "CODE_REVIEW") {
        await checkPr($, "reviewDone")
      }
      return result
    }
    const { before, after } = await apply($, {
      kind: "turnDone",
      reason: e.reason,
    })
    if (
      before.isSkillReviewOpen &&
      isLocalReviewDone(after) &&
      after.stage === "CODE_REVIEW"
    ) {
      await checkPr($, "reviewDone")
    }
    await refreshBranch($)
    return result
  })

  on("command.run", { command: "stage" }, async ($, e) => {
    const wanted = e.args.trim()
    if (!wanted) {
      const w = await read($, WORKFLOW)
      return { text: `stage: ${w?.stage ?? "PLAN"}` }
    }
    const stage = wanted.toUpperCase().replace(/-/g, "_")
    if (!isStage(stage)) {
      return {
        text: `Unknown stage "${wanted}". Use one of: ${STAGES.join(", ")}`,
      }
    }
    await apply($, { kind: "manual", stage })
    return { text: `stage: ${stage}` }
  })

  on("ui.render", { component: "PromptHint" }, async ($, e, next) => {
    const kept = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const [w, effort, git, title] = await Promise.all([
      read($, WORKFLOW),
      read($, EFFORT),
      read($, GIT),
      read($, TITLE),
    ])
    const [cwd, model, sessionId, usage] = await Promise.all([
      $.session.cwd(),
      $.session.model(),
      $.session.id(),
      $.session.usage(),
    ])
    const { tokens, window, percent } = usage.context
    const rows = statusRows({
      cwd,
      branch: w?.branch ?? "",
      git: git?.counts ?? null,
      model,
      effort: effort ?? null,
      contextTokens: tokens ?? null,
      contextPercent:
        percent ??
        (tokens !== undefined && window > 0 ? (tokens / window) * 100 : null),
      rateLimits: usage.rateLimits,
      sessionId,
      title: title ?? null,
      stage: w?.sessionId === sessionId ? w.stage : "PLAN",
      pr: w?.sessionId === sessionId ? w.pr : null,
    })
    return Box({
      flexDirection: "column",
      children: [
        kept,
        ...rows.map((row, i) =>
          Box({
            key: `row-${i}`,
            children: Text({
              wrap: "truncate-end",
              children: row.map((s) =>
                Text({ color: s.color, bold: s.isBold, children: s.text })
              ),
            }),
          })
        ),
      ],
    })
  })
}

export { register }
