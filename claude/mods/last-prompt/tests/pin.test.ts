/** The last-prompt band: what it pins, and how it cuts the text. */
import { expect, test } from "claude-code/testing"
import type { On } from "claude-code"
import { MAX_SESSIONS, collapse, frame, keep, wrapRows } from "../hooks/pin"

const BAND = {
  plugin: "last-prompt",
  surface: "terminal",
  component: "AbovePrompt",
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 40,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const SESSION = "s-1"

/**
 * The engine beneath the mod: an empty transcript unless a test sets one, and
 * a store in memory that the test reads back.
 */
const boot = (
  on: On,
  world: { messages?: unknown[]; store?: Map<string, unknown> } = {}
): Map<string, unknown> => {
  const store = world.store ?? new Map<string, unknown>()
  on("session.start", async (_$, e) => ({ cwd: e.cwd }))
  on("session.id", async () => ({ value: SESSION }) as never)
  on("session.messages", async () => ({ value: world.messages ?? [] }) as never)
  on("store.get", async (_$, e) => ({ value: store.get(e.key) }) as never)
  on("store.set", async (_$, e) => {
    store.set(e.key, e.value)
    return { value: undefined } as never
  })
  on("store.delete", async (_$, e) => {
    store.delete(e.key)
    return { value: undefined } as never
  })
  on("store.keys", async () => ({ value: [...store.keys()] }) as never)
  on("classic.SessionStart", async () => ({}))
  on("prompt.submit", async (_$, e) => ({ text: e.text }))
  on("ui.render", async (_$, e) => _$.ui.resolve(e).Text({ children: "below" }))
  return store
}

const start = {
  cwd: "/tmp/repo",
  surface: "terminal",
  isInteractive: true,
} as const

test("pins the person's prompt above the band's own tree", async ($, on) => {
  boot(on)
  await $.session.start(start)
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ key: "last-prompt" })).toBeUndefined()

  await $.prompt.submit({
    text: "fix the\n\n  login   bug",
    origin: { kind: "composer" },
  } as never)
  expect(
    await ui.find({ key: "last-prompt", text: /» fix the login bug/ })
  ).toBeDefined()
  expect(
    await ui.find({ key: "last-prompt-title", text: /^╭─ LAST WORDS ─+╮$/ })
  ).toBeDefined()
  expect(await ui.find({ type: "Text", text: "below" })).toBeDefined()
  await ui.unmount()
})

test("a survey keeps the band to itself", async ($, on) => {
  boot(on)
  await $.session.start(start)
  await $.prompt.submit({
    text: "earlier prompt",
    origin: { kind: "composer" },
  } as never)
  const ui = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, hasSurvey: true },
  })
  expect(await ui.find({ key: "last-prompt" })).toBeUndefined()
  expect(await ui.find({ key: "last-prompt-title" })).toBeUndefined()
  await ui.unmount()
})

test("a resumed session seeds the pin from the store", async ($, on) => {
  boot(on, {
    messages: [
      {
        role: "user",
        text: "This session is being continued from a previous conversation",
        toolUses: [],
      },
    ],
    store: new Map([[`pin:${SESSION}`, "the real ask"]]),
  })
  await $.session.start(start)
  const ui = await $.ui.mount(BAND)
  expect(
    await ui.find({ key: "last-prompt", text: /» the real ask/ })
  ).toBeDefined()
  await ui.unmount()
})

test("the transcript never seeds the pin", async ($, on) => {
  boot(on, {
    messages: [
      { role: "user", text: "# Plan loop: a skill body", toolUses: [] },
    ],
  })
  await $.session.start(start)
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ key: "last-prompt" })).toBeUndefined()
  await ui.unmount()
})

test("the store keeps the newest sessions only", async ($, on) => {
  const store = new Map<string, unknown>(
    Array.from({ length: MAX_SESSIONS }, (_, i) => [`pin:old-${i}`, "x"])
  )
  boot(on, { store })
  await $.session.start(start)
  await $.prompt.submit({
    text: "mine",
    origin: { kind: "composer" },
  } as never)
  const keys = [...store.keys()]
  expect(keys).toHaveLength(MAX_SESSIONS)
  expect(keys).not.toContain("pin:old-0")
  expect(keys.at(-1)).toBe(`pin:${SESSION}`)
  expect(store.get(`pin:${SESSION}`)).toBe("mine")
})

test("the title sits on the top border; every row is one width", () => {
  const { top, body, bottom } = frame("fix the login bug", 30)
  expect(top).toBe("╭─ LAST WORDS ───────────────╮")
  expect(bottom).toBe(`╰${"─".repeat(28)}╯`)
  expect(body).toEqual([`» fix the login bug${" ".repeat(7)}`])
  for (const row of [top, bottom, `│ ${body[0]} │`]) {
    expect([...row]).toHaveLength(30)
  }
})

test("the text is cut to three rows with an ellipsis", () => {
  expect(collapse("  a \n\t b ")).toBe("a b")
  expect([...keep("y".repeat(5000))]).toHaveLength(1000)
  expect(wrapRows("short", 10)).toEqual(["» short"])
  // 8 cells after the prefix; words move down, the rest indents under it.
  expect(wrapRows("aaa bbb ccc ddd", 10)).toEqual(["» aaa bbb", "  ccc ddd"])
  expect(wrapRows("x".repeat(20), 10)).toEqual([
    "» xxxxxxxx",
    "  xxxxxxxx",
    "  xxxx",
  ])
  expect(wrapRows("w ".repeat(40).trim(), 10)).toEqual([
    "» w w w w",
    "  w w w w",
    "  w w w w…",
  ])
})

test("a plugin's prompt does not replace the person's", async ($, on) => {
  boot(on)
  await $.session.start(start)
  const ui = await $.ui.mount(BAND)
  await $.prompt.submit({
    text: "mine",
    origin: { kind: "composer" },
  } as never)
  await $.prompt.submit({
    text: "a plugin's",
    origin: { kind: "plugin", name: "x" },
  } as never)
  expect(await ui.find({ key: "last-prompt", text: /» mine/ })).toBeDefined()
  await ui.unmount()
})
