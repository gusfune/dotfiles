/** The status rows as the terminal draws them under the kept prompt hint. */
import { expect, test } from "claude-code/testing"
import type { Engine } from "claude-code/testing"
import { formatClock, formatReset, statusRows } from "../hooks/status"
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

test("three rows under the hint; main effort only; totals include subagents", async ($, on) => {
  const world = boot(on)
  let usage = { input_tokens: 0, output_tokens: 0 }
  on("turn.step", async function* (_$, e) {
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "",
      toolUses: [],
      stopReason: "end_turn",
      usage: {
        ...usage,
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

  usage = { input_tokens: 3_000, output_tokens: 1_000 }
  await step($, { effort: "high" })
  usage = { input_tokens: 2_500, output_tokens: 1_500 }
  await step($, { effort: "low", agentId: "sub-1" })

  const ui = await $.ui.mount(HINT)
  expect(await ui.find({ type: "Text", text: "? for shortcuts" })).toBeDefined()
  expect(
    await ui.find({
      key: "row-0",
      text: /📂 repo 🌿 \(feat\/x\) 🤖 \[Opus 5\.5\] \{high\} 📊 \[ctx: 42K\]/,
    })
  ).toBeDefined()
  expect(
    await ui.find({
      key: "row-1",
      text: /in: 5K 📤 out: 2K ⏳ \[5h: 12% \d\d\/\d\d \d\d:\d\d\] 📅 \[7d: 40%\]/,
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

test("clock and reset formats match statusline.sh", () => {
  expect(formatClock(new Date(2026, 9, 5, 19, 7, 3))).toBe("05/10/26  7:07:03")
  expect(formatClock(new Date(2026, 9, 5, 0, 30, 0))).toBe("05/10/26 12:30:00")
  expect(formatReset("2026-10-05T21:30:00")).toBe("05/10 21:30")
  expect(formatReset("garbage")).toBeNull()
})

const BASE: StatusInput = {
  now: new Date(2026, 9, 5, 21, 58, 34),
  cwd: "/w/dev-11389-price-card-upsells-on-the-server-and-c",
  branch: "dev-11389-price-card-upsells-on-the-server-and-check-free-order",
  model: "claude-opus-5-5",
  effort: null,
  contextTokens: 163_000,
  tokensIn: 0,
  tokensOut: 0,
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
    "🕐 [05/10/26  9:58:34] 🌿 (dev-11389-price-card-upsells-on-the-ser…) 🤖 [Opus 5.5] 📊 [ctx: 163K]"
  )
  const [other] = statusRows({ ...BASE, cwd: "/w/dotfiles", branch: "main" })
  expect(text(other)).toContain("📂 dotfiles 🌿 (main)")
})
