/** The stage machine through the real runtime: every signal arrives as the session would send it. */
import { describe, expect, test } from "claude-code/testing"
import type { Engine } from "claude-code/testing"
import { boot, DONE, gate, NO_PR, OFFLINE, PENDING, pr } from "./harness"
import type { World } from "./harness"

const MINUTE = 60_000
const AT_PROMPT = {
  origin: { kind: "composer" },
  presentation: { isFullscreen: false, columns: 120 },
} as const

/**
 * Session actions. The `as never` casts hand the engine loosely built inputs
 * (a spread tool name, an optional agentId); the engine validates them at run time.
 */
const drive = ($: Engine, world: World) => ({
  start: () =>
    $.session.start({
      cwd: "/tmp/repo",
      surface: "terminal",
      isInteractive: true,
    }),
  stage: async () =>
    (await $.command.run({ command: "stage", args: "", ...AT_PROMPT })).text,
  set: (stage: string) =>
    $.command.run({ command: "stage", args: stage, ...AT_PROMPT }),
  tool: (
    input: Record<string, unknown>,
    opts: { isError?: boolean; agentId?: string; result?: unknown } = {}
  ) => {
    world.toolAnswer = { result: opts.result ?? {}, isError: opts.isError }
    return $.tool.call({
      tool_use_id: `tu-${Math.random()}`,
      ...input,
      ...(opts.agentId ? { agentId: opts.agentId } : {}),
    } as never)
  },
  turnEnd: (reason: string, agentId?: string) =>
    $.turn.complete({
      answer: "",
      durationMs: 1,
      isAborted: reason === "aborted",
      turnId: "t",
      reason,
      ...(agentId ? { agentId } : {}),
    } as never),
  spawn: (subagentType: string, agentId: string, deny?: string) => {
    world.spawnAnswer = deny ? { deny } : { model: "m", agentId }
    return $.agent.spawn({
      tool_use_id: `tu-${agentId}`,
      prompt: "p",
      description: "d",
      subagentType,
    } as never)
  },
})

const edit = {
  tool: "Edit",
  file_path: "/tmp/repo/a.ts",
  old_string: "a",
  new_string: "b",
}

describe("transitions", () => {
  test("plan mode, approval, edit, turn end", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    expect(await s.stage()).toBe("stage: PLAN")
    await s.set("build")
    await $.classic.UserPromptSubmit({ prompt: "x", permission_mode: "plan" })
    expect(await s.stage()).toBe("stage: PLAN")
    await s.tool(
      { tool: "ExitPlanMode" },
      { result: { plan: "p", isAgent: false } }
    )
    expect(await s.stage()).toBe("stage: BUILD")
    await s.tool({ tool: "EnterPlanMode" })
    expect(await s.stage()).toBe("stage: PLAN")
    await s.tool(edit)
    expect(await s.stage()).toBe("stage: BUILD")
    await s.turnEnd("answer")
    expect(await s.stage()).toBe("stage: USER_REVIEW")
  })

  test("aborted, error and refusal keep BUILD", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.tool(edit)
    for (const reason of ["aborted", "error", "refusal"]) {
      await s.turnEnd(reason)
      expect(await s.stage()).toBe("stage: BUILD")
    }
  })

  test("a failed edit changes nothing", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.tool(edit, { isError: true })
    expect(await s.stage()).toBe("stage: PLAN")
  })

  test("a rejected plan and a teammate's pending plan keep the stage", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.tool({ tool: "ExitPlanMode" }, { isError: true })
    expect(await s.stage()).toBe("stage: PLAN")
    await s.tool(
      { tool: "ExitPlanMode" },
      { result: { plan: "p", isAgent: true, awaitingLeaderApproval: true } }
    )
    expect(await s.stage()).toBe("stage: PLAN")
    await s.tool(
      { tool: "ExitPlanMode" },
      { agentId: "teammate", result: { plan: "p", isAgent: true } }
    )
    expect(await s.stage()).toBe("stage: PLAN")
  })

  test("manual stage, and an unknown name", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.set("stand-by")
    expect(await s.stage()).toBe("stage: STAND_BY")
    expect((await s.set("lunch")).text).toMatch(/Unknown stage/)
  })
})

describe("local review", () => {
  test("a denied spawn adds nothing; a non-review agent is ignored", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.tool(edit)
    await s.spawn("code-reviewer", "a1", "denied")
    await s.spawn("Explore", "a2")
    expect(await s.stage()).toBe("stage: BUILD")
  })

  test("two concurrent agents: done only after the last; no PR goes to USER_REVIEW", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.spawn("coderabbit:code-reviewer", "a1")
    await s.spawn("code-reviewer", "a2")
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    await s.turnEnd("answer", "a1")
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    await s.turnEnd("error", "a2")
    expect(await s.stage()).toBe("stage: USER_REVIEW")
  })

  test("a manual stage drops a stuck review agent", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.spawn("code-reviewer", "stuck")
    world.gh = pr({ head: "h1", checks: DONE })
    await s.set("code_review")
    await world.clock.advance(MINUTE)
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: STAND_BY")
  })

  test("a skill review ends with the main turn; a finished PR goes to STAND_BY", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: DONE })
    await s.start()
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    await s.tool({ tool: "Skill", skill: "review" })
    world.ghCalls = 0
    await s.turnEnd("answer")
    expect(world.ghCalls).toBe(1)
    expect(await s.stage()).toBe("stage: STAND_BY")
  })
})

describe("PR head evidence", () => {
  test("an empty rollup right after gh pr create stays CODE_REVIEW", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.tool(edit)
    world.gh = pr({ head: "h1" })
    await s.tool({ tool: "Bash", command: "gh pr create --fill" })
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
  })

  test("no checks and no bots: STAND_BY after the quiet fallback", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1" })
    await s.start()
    await world.clock.advance(9 * MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: STAND_BY")
  })

  test("a bot that registers late keeps CODE_REVIEW until it reviews the head", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: DONE })
    await s.start()
    world.gh = pr({
      head: "h1",
      checks: DONE,
      reviews: [{ login: "coderabbitai", commit: "h0" }],
    })
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    world.gh = pr({
      head: "h1",
      checks: DONE,
      reviews: [{ login: "coderabbitai", commit: "h1" }],
    })
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: STAND_BY")
  })

  test("an old CodeRabbit review then a new push waits for a review of the new head", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    const old = [{ login: "coderabbitai", commit: "h1" }]
    world.gh = pr({ head: "h1", checks: DONE, reviews: old })
    await s.start()
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: STAND_BY")
    await s.tool(edit)
    world.gh = pr({ head: "h2", checks: DONE, reviews: old })
    await s.tool({ tool: "Bash", command: "git push" })
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    world.gh = pr({
      head: "h2",
      checks: DONE,
      reviews: [...old, { login: "coderabbitai", commit: "h2" }],
    })
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: STAND_BY")
  })
})

describe("PR check", () => {
  test("pending, green, offline, absent", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: PENDING })
    await s.start()
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    world.gh = OFFLINE
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    world.gh = pr({ head: "h1", checks: DONE })
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: STAND_BY")
    world.gh = NO_PR
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: STAND_BY")
  })

  test("a result from an old session id is discarded", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: DONE })
    await s.start()
    const pending = gate(world)
    const tick = world.clock.advance(MINUTE)
    await pending.entered
    world.gh = NO_PR
    world.sessionId = "sid-2"
    await $.classic.SessionStart({ source: "clear", session_id: "sid-2" })
    pending.open()
    await tick
    expect(await s.stage()).toBe("stage: PLAN")
  })
})

describe("races", () => {
  test("a finished PR while a review agent runs stays CODE_REVIEW", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: DONE })
    await s.start()
    await s.spawn("code-reviewer", "a1")
    await world.clock.advance(2 * MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
    await s.turnEnd("answer", "a1")
    expect(await s.stage()).toBe("stage: STAND_BY")
  })

  test("an edit or a manual stage during a pending check discards its result", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: PENDING })
    await s.start()
    world.gh = pr({ head: "h1", checks: DONE })
    for (const act of [() => s.tool(edit), () => s.set("code_review")]) {
      await s.set("code_review")
      const pending = gate(world)
      const tick = world.clock.advance(MINUTE)
      await pending.entered
      await act()
      pending.open()
      await tick
      expect(await s.stage()).not.toBe("stage: STAND_BY")
    }
  })

  test("an edit in CODE_REVIEW, then the review agent finishes: stays BUILD", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: DONE })
    await s.start()
    await s.spawn("code-reviewer", "a1")
    await s.tool(edit)
    await s.turnEnd("answer", "a1")
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: BUILD")
  })

  test("a review agent registers while a passing result is pending: stays CODE_REVIEW", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: DONE })
    await s.start()
    const pending = gate(world)
    const tick = world.clock.advance(MINUTE)
    await pending.entered
    await s.spawn("code-reviewer", "a1")
    pending.open()
    await tick
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
  })
})

test("feedback loop: review, fix, push, wait, done", async ($, on) => {
  const world = boot(on)
  const s = drive($, world)
  world.gh = pr({ head: "h1", checks: DONE })
  await s.start()
  expect(await s.stage()).toBe("stage: CODE_REVIEW")
  await s.tool(edit)
  expect(await s.stage()).toBe("stage: BUILD")
  await s.turnEnd("answer")
  expect(await s.stage()).toBe("stage: USER_REVIEW")
  world.gh = pr({ head: "h2", checks: PENDING })
  await s.tool({ tool: "Bash", command: "git push origin HEAD" })
  expect(await s.stage()).toBe("stage: CODE_REVIEW")
  await world.clock.advance(MINUTE)
  expect(await s.stage()).toBe("stage: CODE_REVIEW")
  world.gh = pr({ head: "h2", checks: DONE })
  await world.clock.advance(MINUTE)
  expect(await s.stage()).toBe("stage: STAND_BY")
})

describe("lifecycle", () => {
  test("a reload keeps the stage and the review agents", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    world.gh = pr({ head: "h1", checks: DONE })
    await s.start()
    await s.spawn("code-reviewer", "a1")
    await s.start()
    await world.clock.advance(MINUTE)
    expect(await s.stage()).toBe("stage: CODE_REVIEW")
  })

  test("/clear resets to PLAN; /resume restores the stored stage", async ($, on) => {
    const world = boot(on)
    const s = drive($, world)
    await s.start()
    await s.tool(edit)
    world.sessionId = "sid-2"
    await $.classic.SessionStart({ source: "clear", session_id: "sid-2" })
    expect(await s.stage()).toBe("stage: PLAN")
    world.sessionId = "sid-1"
    await $.classic.SessionStart({ source: "resume", session_id: "sid-1" })
    expect(await s.stage()).toBe("stage: BUILD")
  })
})
