/** The dev-urls band: which servers count, and what the band draws. */
import { expect, test } from "claude-code/testing"
import type { On } from "claude-code"
import {
  MAX_ROWS,
  addPin,
  borders,
  checkUrl,
  parseCwds,
  parseListeners,
  removePin,
  rowsOf,
  serversIn,
} from "../hooks/scan"

const ROOT = "/repo"

const LISTEN = [
  "p10",
  "cnode",
  "f20",
  "n*:3000",
  "f21",
  "n[::1]:3000",
  "p11",
  "cbun",
  "f5",
  "n127.0.0.1:6006",
  "p12",
  "cpostgres",
  "f7",
  "n*:5432",
  "p13",
  "c2.1.306",
  "f9",
  "n127.0.0.1:54942",
].join("\n")

const CWDS = [
  "p10",
  "fcwd",
  "n/repo",
  "p11",
  "fcwd",
  "n/repo/apps/web",
  "p12",
  "fcwd",
  "n/repo-other",
  "p13",
  "fcwd",
  "n/repo",
].join("\n")

const BAND = {
  plugin: "dev-urls",
  surface: "terminal",
  component: "AbovePrompt",
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test("only the worktree's listeners count, one row per port", () => {
  const servers = serversIn({
    root: ROOT,
    listeners: parseListeners(LISTEN),
    cwds: parseCwds(CWDS),
  })
  expect(servers.map((s) => [s.dir || s.command, s.url])).toEqual([
    ["node", "http://localhost:3000"],
    ["apps/web", "http://localhost:6006"],
  ])
})

test("a sibling folder with the same prefix is outside the root", () => {
  const servers = serversIn({
    root: ROOT,
    listeners: parseListeners(LISTEN),
    cwds: new Map([[12, "/repo-other"]]),
  })
  expect(servers).toEqual([])
})

test("urls: only http and https, and a pin moves to the end", () => {
  expect(checkUrl(" http://localhost:3000/cart ")).toBe(
    "http://localhost:3000/cart"
  )
  expect(checkUrl("javascript:alert(1)")).toBeUndefined()
  expect(checkUrl("http://a b")).toBeUndefined()
  const a = { url: "http://a", label: "a" }
  const b = { url: "http://b", label: "b" }
  expect(addPin([a, b], a)).toEqual([b, a])
  expect(removePin([a, b], "http://a")).toEqual([b])
})

test("past the row cap the last row counts what is left out", () => {
  const pins = Array.from({ length: MAX_ROWS + 2 }, (_, i) => ({
    url: `http://x/${i}`,
    label: `${i}`,
  }))
  const { rows, hidden } = rowsOf([], pins)
  expect(rows.length).toBe(MAX_ROWS - 1)
  expect(hidden).toBe(3)
})

test("the top border carries the title and branch, full width", () => {
  const { top, bottom } = borders("feat/x", 40)
  expect(top.startsWith("╭─ DEV URLS · feat/x ─")).toBe(true)
  expect([...top].length).toBe(40)
  expect([...bottom].length).toBe(40)
})

/** The engine beneath the mod: git, lsof and the store answered from memory. */
const boot = (on: On, store = new Map<string, unknown>()): void => {
  on("session.start", async (_$, e) => ({ cwd: e.cwd }))
  on("session.cwd", async () => ({ value: ROOT }) as never)
  on(
    "tool.register",
    async (_$, e) => ({ value: { tool: `mcp__dev-urls__${e.name}` } }) as never
  )
  on("clock.every", async () => ({ value: undefined }) as never)
  on("process.run", async (_$, e) => {
    const argv = e.argv.join(" ")
    const stdout = argv.includes("--show-toplevel")
      ? `${ROOT}\n`
      : argv.includes("--show-current")
        ? "feat/x\n"
        : argv.includes("-d cwd")
          ? CWDS
          : LISTEN
    return { value: { exitCode: 0, stdout, stderr: "" } } as never
  })
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
}

test("the band lists servers and pins above what is beneath it", async ($, on) => {
  boot(on)
  on("ui.render", ($, e) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: "LAST WORDS stand-in" })
  })
  await $.session.start({
    cwd: ROOT,
    surface: "terminal",
    isInteractive: true,
  })
  const pinned = await $.tool.call({
    tool: "mcp__dev-urls__pin_test_url",
    url: "http://localhost:3000/cart",
    label: "cart",
  })
  expect(pinned.result).toBe(
    'Pinned http://localhost:3000/cart as "cart" on feat/x.'
  )

  const ui = await $.ui.mount(BAND)
  expect(
    (await ui.find({ type: "Text", text: /DEV URLS · feat\/x/ }))?.text
  ).toBeDefined()
  const links = await ui.findAll({ type: "Link" })
  expect(links.map((l) => l.text)).toEqual([
    "http://localhost:3000",
    "http://localhost:6006",
    "http://localhost:3000/cart",
  ])
  expect(
    await ui.find({ type: "Text", text: /LAST WORDS stand-in/ })
  ).toBeDefined()
  await ui.unmount()
})

test("a bad url is refused", async ($, on) => {
  boot(on)
  await $.session.start({
    cwd: ROOT,
    surface: "terminal",
    isInteractive: true,
  })
  const refused = await $.tool.call({
    tool: "mcp__dev-urls__pin_test_url",
    url: "ftp://x",
  })
  expect(refused.deny).toContain("http or https")
})
