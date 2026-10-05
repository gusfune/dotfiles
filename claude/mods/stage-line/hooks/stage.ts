/**
 * The workflow stage machine and the PR classifier. Pure: no `$`, no I/O, so
 * the tests drive every rule without a session.
 */

const STAGES = [
  "PLAN",
  "BUILD",
  "USER_REVIEW",
  "CODE_REVIEW",
  "STAND_BY",
] as const

type Stage = (typeof STAGES)[number]

/** One state key holds all of it, so one version-checked write moves it. */
interface Workflow {
  sessionId: string
  branch: string
  stage: Stage
  /** Bumped on every stage change, edit, manual set and review start. */
  revision: number
  /** Review subagents still running. */
  reviewAgents: string[]
  /** A review skill ran inside the current main turn. */
  isSkillReviewOpen: boolean
  pr: number | null
  head: string | null
  headSeenAt: number | null
  /** Bot logins that reviewed any commit of the PR. */
  bots: string[]
}

/** The PR as one `gh pr view` saw it, reduced to what the rules read. */
type PrView =
  | {
      kind: "open"
      number: number
      head: string
      isChecksDone: boolean
      hasChecks: boolean
      botReviews: BotReview[]
    }
  | { kind: "none" }
  | { kind: "unknown" }

interface BotReview {
  login: string
  commit: string
}

/** Why a PR check ran; each origin may move the stage differently. */
type PrOrigin = "lifecycle" | "poll" | "push" | "reviewDone"

/** What a check saw when it started; a result is applied only if it still holds. */
interface PrCapture {
  sessionId: string
  branch: string
  revision: number
}

type Signal =
  | { kind: "plan" }
  | { kind: "planApproved" }
  | { kind: "edit" }
  | { kind: "turnDone"; reason: string }
  | { kind: "reviewAgentStart"; agentId: string }
  | { kind: "reviewAgentDone"; agentId: string }
  | { kind: "reviewSkillStart" }
  | { kind: "prCreated" }
  | { kind: "manual"; stage: Stage }
  | {
      kind: "pr"
      origin: PrOrigin
      view: PrView
      capture: PrCapture
      now: number
    }

/** A PR with no checks and no bots counts as finished this long after its head appears. */
const QUIET_PR_MS = 10 * 60 * 1000

const BOT_LOGIN =
  /\[bot\]$|bot$|^(coderabbitai|copilot-pull-request-reviewer|qodo-code-review|sourcery-ai|greptile-apps|gemini-code-assist|chatgpt-codex-connector|cursor)$/i

const isStage = (value: string): value is Stage =>
  (STAGES as readonly string[]).includes(value)

const isLocalReviewDone = (w: Workflow): boolean =>
  w.reviewAgents.length === 0 && !w.isSkillReviewOpen

const freshWorkflow = (sessionId: string, branch: string): Workflow => ({
  sessionId,
  branch,
  stage: "PLAN",
  revision: 0,
  reviewAgents: [],
  isSkillReviewOpen: false,
  pr: null,
  head: null,
  headSeenAt: null,
  bots: [],
})

/** Moves to `stage` and bumps the revision when the stage changes. */
const moveTo = (w: Workflow, stage: Stage): Workflow =>
  w.stage === stage ? w : { ...w, stage, revision: w.revision + 1 }

/** Like `moveTo`, but always bumps the revision, so a pending PR result goes stale. */
const bump = (w: Workflow, stage: Stage): Workflow => ({
  ...w,
  stage,
  revision: w.revision + 1,
})

/**
 * Folds a fresh PR view into the record: a new head resets its first-seen
 * time, and every bot that ever reviewed joins the expected set.
 */
const withPr = (
  w: Workflow,
  view: Extract<PrView, { kind: "open" }>,
  now: number
): Workflow => {
  const isNewHead = view.head !== w.head
  const bots = [
    ...new Set([...w.bots, ...view.botReviews.map((r) => r.login)]),
  ].sort()
  return {
    ...w,
    pr: view.number,
    head: view.head,
    headSeenAt: isNewHead ? now : w.headSeenAt,
    bots,
  }
}

/**
 * True when the PR's current head has every piece of completion evidence:
 * the checks finished, and each expected bot reviewed this exact commit. A
 * head the record has not seen before is never finished. With no checks and
 * no bots, the head must have stood still for `QUIET_PR_MS`.
 */
const isPrFinished = (
  before: Workflow,
  after: Workflow,
  view: Extract<PrView, { kind: "open" }>,
  now: number
): boolean => {
  if (before.head !== view.head) {
    return false
  }
  const hasAllBots = after.bots.every((bot) =>
    view.botReviews.some((r) => r.login === bot && r.commit === view.head)
  )
  if (!hasAllBots) {
    return false
  }
  if (view.hasChecks) {
    return view.isChecksDone
  }
  return after.bots.length > 0 || now - (after.headSeenAt ?? now) >= QUIET_PR_MS
}

/** Applies a PR check result; stale results (other session, branch or revision) change nothing. */
const applyPr = (
  w: Workflow,
  signal: Extract<Signal, { kind: "pr" }>
): Workflow => {
  const { capture, view, origin, now } = signal
  const isStale =
    capture.sessionId !== w.sessionId ||
    capture.branch !== w.branch ||
    capture.revision !== w.revision
  if (isStale || view.kind === "unknown") {
    return w
  }
  if (view.kind === "none") {
    const cleared = { ...w, pr: null, head: null, headSeenAt: null, bots: [] }
    const isReviewOver =
      origin === "reviewDone" &&
      w.stage === "CODE_REVIEW" &&
      isLocalReviewDone(w)
    return isReviewOver ? moveTo(cleared, "USER_REVIEW") : cleared
  }

  const next = withPr(w, view, now)
  const isFinished = isPrFinished(w, next, view, now) && isLocalReviewDone(w)
  const settled: Stage = isFinished ? "STAND_BY" : "CODE_REVIEW"

  if (origin === "push") {
    return moveTo(next, "CODE_REVIEW")
  }
  if (origin === "lifecycle" && w.stage === "PLAN") {
    return moveTo(next, settled)
  }
  if (w.stage === "CODE_REVIEW" && isFinished) {
    return moveTo(next, "STAND_BY")
  }
  return next
}

/** The whole machine: the next record for one signal. */
const next = (w: Workflow, signal: Signal): Workflow => {
  switch (signal.kind) {
    case "plan": {
      return moveTo(w, "PLAN")
    }
    case "planApproved":
    case "edit": {
      return bump(w, "BUILD")
    }
    case "turnDone": {
      const closed = { ...w, isSkillReviewOpen: false }
      return w.stage === "BUILD" && signal.reason === "answer"
        ? moveTo(closed, "USER_REVIEW")
        : closed
    }
    case "reviewAgentStart": {
      const reviewAgents = [...new Set([...w.reviewAgents, signal.agentId])]
      return bump({ ...w, reviewAgents }, "CODE_REVIEW")
    }
    case "reviewAgentDone": {
      return {
        ...w,
        reviewAgents: w.reviewAgents.filter((id) => id !== signal.agentId),
      }
    }
    case "reviewSkillStart": {
      return bump({ ...w, isSkillReviewOpen: true }, "CODE_REVIEW")
    }
    case "prCreated": {
      return bump(w, "CODE_REVIEW")
    }
    case "manual": {
      // A hand-set stage overrides the heuristics, so stuck review tracking goes too.
      return bump(
        { ...w, reviewAgents: [], isSkillReviewOpen: false },
        signal.stage
      )
    }
    case "pr": {
      return applyPr(w, signal)
    }
  }
}

/** One `statusCheckRollup` entry: a CheckRun has `status`, a StatusContext has `state`. */
interface RollupEntry {
  status?: string | null
  state?: string | null
}

interface GhReview {
  author?: { login?: string } | null
  commit?: { oid?: string } | null
}

interface GhPr {
  number: number
  state: string
  headRefOid: string
  statusCheckRollup?: RollupEntry[] | null
  reviews?: GhReview[] | null
}

const isEntryDone = (entry: RollupEntry): boolean => {
  if (entry.status) {
    return entry.status === "COMPLETED"
  }
  return entry.state !== "PENDING" && entry.state !== "EXPECTED"
}

const isGhPr = (value: unknown): value is GhPr => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const pr = value as Record<string, unknown>
  return (
    typeof pr.number === "number" &&
    typeof pr.state === "string" &&
    typeof pr.headRefOid === "string"
  )
}

/**
 * Classifies one `gh pr view --json number,state,headRefOid,statusCheckRollup,reviews` run.
 * A non-zero exit is "none" only when gh says so; anything else is unknown.
 */
const classifyPr = (run: {
  exitCode: number
  stdout: string
  stderr: string
}): PrView => {
  if (run.exitCode !== 0) {
    return /no pull requests found/i.test(run.stderr)
      ? { kind: "none" }
      : { kind: "unknown" }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(run.stdout)
  } catch {
    return { kind: "unknown" }
  }
  if (!isGhPr(parsed)) {
    return { kind: "unknown" }
  }
  if (parsed.state !== "OPEN") {
    return { kind: "none" }
  }
  const rollup = parsed.statusCheckRollup ?? []
  const botReviews = (parsed.reviews ?? []).flatMap((r): BotReview[] => {
    const login = r.author?.login
    const commit = r.commit?.oid
    return login && commit && BOT_LOGIN.test(login) ? [{ login, commit }] : []
  })
  return {
    kind: "open",
    number: parsed.number,
    head: parsed.headRefOid,
    hasChecks: rollup.length > 0,
    isChecksDone: rollup.every(isEntryDone),
    botReviews,
  }
}

export type { Stage, Workflow, PrView, PrOrigin, PrCapture, Signal }
export {
  STAGES,
  QUIET_PR_MS,
  isStage,
  isLocalReviewDone,
  freshWorkflow,
  next,
  classifyPr,
}
