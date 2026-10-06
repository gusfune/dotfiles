/** The status rows as the terminal draws them under the kept prompt hint. */
import { expect, test } from "claude-code/testing"
import type { Engine } from "claude-code/testing"
import { formatReset, meter, parseGitStatus, statusRows } from "../hooks/status"
import type { StatusInput } from "../hooks/status"
import { boot } from "./harness"

const HINT = {
  plugin: "stage-line",
  surface: "terminal",
  component: "PromptHint",
  props: { isDraft: false, isWorking: false, hint: "? for shortcuts" },
} as const

/** Drains one model request; the stream's chunks do not matter here. */
const step = async (
  $: Engine,
  opts: { effort: "low" | "high"; agentId?: string }
) => {
  const stream = $.turn.step({
    turnId: "t",
    index: 0,
    model: "m",
    effort: opts.effort,
    messageCount: 1,
    ...(opts.agentId ? { agentId: opts.agentId } : {}),
  } as never)
  for await (const _chunk of stream) {
    // drain
  }
}

test("three rows under the hint; git counts; main effort only", async ($, on) => {
  const world = boot(on)
  world.gitLines = [
    "# branch.upstream origin/feat/x",
    "# branch.ab +2 -0",
    "1 .M N... 100644 100644 100644 a b hooks/x.ts",
    "? notes.txt",
  ]
  on("turn.step", async function* (_$, e) {
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "",
      toolUses: [],
      stopReason: "end_turn",
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        model: "m",
      },
    } as never
  })
  on("ui.render", async (_$, e) => {
    const { Text } = _$.ui.resolve(e)
    return Text({ children: "? for shortcuts" })
  })
  await $.session.start({
    cwd: "/tmp/repo",
    surface: "terminal",
    isInteractive: true,
  })

  await step($, { effort: "high" })
  await step($, { effort: "low", agentId: "sub-1" })

  const ui = await $.ui.mount(HINT)
  expect(await ui.find({ type: "Text", text: "? for shortcuts" })).toBeDefined()
  expect(
    await ui.find({
      key: "row-0",
      text: "📂 repo 🌿 (feat/x ±2 ↑2) 🤖 [Opus 5.5] {high} 📊 [ctx: 42K] [██········ 21%]",
    })
  ).toBeDefined()
  expect(
    await ui.find({
      key: "row-1",
      text: new RegExp(
        "^⏳ \\[5h: \\d\\d/\\d\\d \\d\\d:\\d\\d\\] \\[█········· 12%\\] 📅 \\[7d\\] \\[████······ 40%\\]$"
      ),
    })
  ).toBeDefined()
  expect(
    await ui.find({ key: "row-2", text: `◆ PLAN 🔑 ${world.sessionId}` })
  ).toBeDefined()
  expect(await ui.find({ key: "row-3" })).toBeUndefined()
  await ui.unmount()
})

test("the stage row shows the PR number", async ($, on) => {
  const world = boot(on)
  world.gh = {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({
      number: 12,
      state: "OPEN",
      headRefOid: "h1",
      statusCheckRollup: [],
      reviews: [],
    }),
  }
  on("ui.render", async (_$, e) => _$.ui.resolve(e).Text({ children: "" }))
  await $.session.start({
    cwd: "/tmp/repo",
    surface: "terminal",
    isInteractive: true,
  })
  const ui = await $.ui.mount(HINT)
  expect(
    await ui.find({ key: "row-2", text: /^◆ CODE_REVIEW #12 🔑 / })
  ).toBeDefined()
  await ui.unmount()
})

test("the meter fills a cell per 10% and colours by load", () => {
  expect(meter(0)).toEqual({
    text: "[·········· 0%]",
    color: "greenBright",
    isBold: true,
  })
  expect(meter(57).text).toBe("[██████···· 57%]")
  expect(meter(57).color).toBe("yellowBright")
  expect(meter(80).color).toBe("redBright")
  expect(meter(140).text).toBe("[██████████ 140%]")
  expect(meter(-5).text).toBe("[·········· -5%]")
})

test("no known rate limit: the limits row is left out", () => {
  const rows = statusRows(BASE)
  expect(rows).toHaveLength(2)
  expect(text(rows[1])).toBe("◆ PLAN 🔑 sid")
})

test("reset format matches statusline.sh", () => {
  expect(formatReset("2026-10-05T21:30:00")).toBe("05/10 21:30")
  expect(formatReset("garbage")).toBeNull()
})

test("git status: clean, dirty, ahead/behind, no upstream, detached", () => {
  const head = "# branch.oid abc\n# branch.head main\n"
  expect(parseGitStatus(head)).toEqual({
    branch: "main",
    dirty: 0,
    ahead: 0,
    behind: 0,
  })
  expect(
    parseGitStatus(
      `${head}# branch.upstream origin/main\n# branch.ab +3 -1\n1 M. N... 1 1 1 a b f\n2 R. N... 1 1 1 a b R100 g\tf\nu UU N... 1 1 1 1 a b c h\n? new\n`
    )
  ).toEqual({ branch: "main", dirty: 4, ahead: 3, behind: 1 })
  expect(parseGitStatus(`${head}? only-untracked\n`).dirty).toBe(1)
  expect(
    parseGitStatus("# branch.oid abc\n# branch.head (detached)\n").branch
  ).toBe("HEAD")
})

test("the branch shows only non-zero git counts", () => {
  const row = (git: StatusInput["git"]) =>
    text(statusRows({ ...BASE, cwd: "/w/x", branch: "main", git })[0])
  expect(row(null)).toContain("🌿 (main) ")
  expect(row({ dirty: 0, ahead: 0, behind: 0 })).toContain("🌿 (main) ")
  expect(row({ dirty: 0, ahead: 0, behind: 4 })).toContain("🌿 (main ↓4) ")
  expect(row({ dirty: 3, ahead: 1, behind: 0 })).toContain("🌿 (main ±3 ↑1) ")
})

const BASE: StatusInput = {
  cwd: "/w/dev-11389-price-card-upsells-on-the-server-and-c",
  branch: "dev-11389-price-card-upsells-on-the-server-and-check-free-order",
  git: null,
  model: "claude-opus-5-5",
  effort: null,
  contextTokens: 163_000,
  contextPercent: 81.5,
  rateLimits: [],
  sessionId: "sid",
  title: null,
  stage: "PLAN",
  pr: null,
}

const text = (row: { text: string }[] = []): string =>
  row.map((s) => s.text).join("")

test("a worktree folder that repeats the branch is dropped; long names clip", () => {
  const [identity] = statusRows(BASE)
  expect(text(identity)).toBe(
    "🌿 (dev-11389-price-card-upsells-on-the-ser…) 🤖 [Opus 5.5] 📊 [ctx: 163K] [████████·· 82%]"
  )
  const [other] = statusRows({ ...BASE, cwd: "/w/dotfiles", branch: "main" })
  expect(text(other)).toContain("📂 dotfiles 🌿 (main)")
})
