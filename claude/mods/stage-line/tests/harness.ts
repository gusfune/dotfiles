/**
 * The bottom of every event the mod calls, answered from a mutable `World`,
 * so a test sets the branch or the PR and then drives the session.
 */
import { mock } from "claude-code/testing"
import type { MockClock } from "claude-code/testing"
import type { On } from "claude-code"
import type { Stage } from "../hooks/stage"

interface Run {
  exitCode: number
  stdout: string
  stderr: string
}

interface World {
  sessionId: string
  branch: string
  gh: Run
  /** While set, `gh` waits on it: lets a test act during a pending check. */
  ghGate: Promise<void> | null
  ghCalls: number
  /** Resolved, then cleared, at the next `gh` call. */
  onGh: (() => void) | null
  clock: MockClock
  /** What the next `tool.call` resolves to beneath the mod. */
  toolAnswer: { result: unknown; isError?: boolean }
  /** What the next `agent.spawn` resolves to beneath the mod. */
  spawnAnswer: { model: string; agentId: string } | { deny: string }
}

const NO_PR: Run = {
  exitCode: 1,
  stdout: "",
  stderr: 'no pull requests found for branch "feat/x"',
}
const OFFLINE: Run = {
  exitCode: 1,
  stdout: "",
  stderr: "error connecting to api.github.com",
}
const T0 = 1_000_000

interface PrSpec {
  number?: number
  head: string
  checks?: Array<{ status?: string; state?: string }>
  reviews?: Array<{ login: string; commit: string }>
  state?: string
}

const pr = (spec: PrSpec): Run => ({
  exitCode: 0,
  stderr: "",
  stdout: JSON.stringify({
    number: spec.number ?? 7,
    state: spec.state ?? "OPEN",
    headRefOid: spec.head,
    statusCheckRollup: spec.checks ?? [],
    reviews: (spec.reviews ?? []).map((r) => ({
      author: { login: r.login },
      commit: { oid: r.commit },
    })),
  }),
})

const DONE = [{ status: "COMPLETED" }]
const PENDING = [{ status: "IN_PROGRESS" }]

const boot = (on: On): World => {
  const world: World = {
    sessionId: "sid-1",
    branch: "feat/x",
    gh: NO_PR,
    ghGate: null,
    ghCalls: 0,
    onGh: null,
    clock: mock.clock(on, { now: T0 }),
    toolAnswer: { result: {} },
    spawnAnswer: { model: "m", agentId: "a-1" },
  }
  mock.store(on)
  on("session.start", async (_$, e) => ({ cwd: e.cwd }))
  on("session.id", async () => ({ value: world.sessionId }))
  on("session.cwd", async () => ({ value: "/tmp/repo" }))
  on("session.model", async () => ({ value: "claude-opus-5-5" }))
  on("session.usage", async () => ({
    value: {
      startedAt: T0,
      context: { tokens: 42_500, window: 200_000 },
      rateLimits: [
        {
          kind: "five_hour",
          percentUsed: 12.4,
          resetsAt: "2026-10-05T21:30:00Z",
        },
        { kind: "seven_day", percentUsed: 40 },
      ],
    },
  }))
  on("command.register", async (_$, e) => ({ value: { command: e.name } }))
  on("tool.call", async () => world.toolAnswer as never)
  on("agent.spawn", async () => world.spawnAnswer)
  on("classic.SessionStart", async () => ({}))
  on("classic.UserPromptSubmit", async () => ({}))
  on("turn.complete", async (_$, e) => ({ text: e.answer }))
  on("process.run", async (_$, e) => {
    const base = { isStdoutTruncated: false, isStderrTruncated: false }
    if (e.argv[0] === "git") {
      return {
        value: {
          ...base,
          exitCode: 0,
          stdout: `${world.branch}\n`,
          stderr: "",
        },
      }
    }
    world.ghCalls += 1
    world.onGh?.()
    world.onGh = null
    const gate = world.ghGate
    world.ghGate = null
    const answer = world.gh
    if (gate) {
      await gate
    }
    return { value: { ...base, ...answer } }
  })
  return world
}

/**
 * Holds the next `gh` call until `open`. `entered` resolves once the mod is
 * inside that call, so the test acts while the check is pending.
 */
const gate = (world: World): { entered: Promise<void>; open: () => void } => {
  let open = (): void => undefined
  world.ghGate = new Promise<void>((resolve) => {
    open = resolve
  })
  const entered = new Promise<void>((resolve) => {
    world.onGh = resolve
  })
  return { entered, open }
}

export type { World, Stage }
export { boot, gate, pr, NO_PR, OFFLINE, DONE, PENDING, T0 }
