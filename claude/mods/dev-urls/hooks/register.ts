/**
 * dev-urls: a band above LAST WORDS that lists the dev servers this worktree
 * runs and the test URLs the model pinned for its branch, as links.
 *
 * A server counts when a process listens on a TCP port and its cwd sits in
 * the worktree, so a server from another checkout stays out. The list is
 * polled, and refreshed after every Bash call, which is where servers start.
 */
import { atom, read, update } from "claude-code"
import type { EngineInterface, Register, RenderNode } from "claude-code"
import type { Pin, View } from "../types"
import {
  MAX_BRANCHES,
  addPin,
  borders,
  checkUrl,
  parseCwds,
  parseListeners,
  pinsKey,
  removePin,
  rowsOf,
  serversIn,
} from "./scan"

const EMPTY: View = { branch: "", servers: [], pins: [] }
const VIEW = atom({ plugin: "dev-urls", key: "view" } as const, EMPTY)

const TOOL = "pin_test_url"
const POLL_MS = 5000
/** The widest label column; a longer label is cut. */
const MAX_LABEL = 24

/** The worktree root and branch of the session's cwd; none outside git. */
const locate = async (
  $: EngineInterface
): Promise<{ root: string; branch: string } | undefined> => {
  const cwd = await $.session.cwd()
  const top = await $.process.run(["git", "rev-parse", "--show-toplevel"], {
    cwd,
    timeoutMs: 5000,
  })
  if (top.exitCode !== 0) {
    return undefined
  }
  const head = await $.process.run(["git", "branch", "--show-current"], {
    cwd,
    timeoutMs: 5000,
  })
  return {
    root: top.stdout.trim(),
    branch: head.stdout.trim() || "detached",
  }
}

/** The pins kept for one branch; anything malformed in the store reads as none. */
const loadPins = async ($: EngineInterface, key: string): Promise<Pin[]> => {
  const kept = await $.store.get(key)
  if (!Array.isArray(kept)) {
    return []
  }
  return kept.filter(
    (p): p is Pin =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as Pin).url === "string" &&
      typeof (p as Pin).label === "string"
  )
}

/**
 * Saves one branch's pins, newest last, and drops the oldest branches past
 * `MAX_BRANCHES` so the store stays small. An empty list deletes the key.
 */
const savePins = async (
  $: EngineInterface,
  key: string,
  pins: Pin[]
): Promise<void> => {
  await $.store.delete(key)
  if (pins.length > 0) {
    await $.store.set(key, pins)
  }
  const keys = (await $.store.keys()).filter((k) => k.startsWith("pins:"))
  await Promise.all(keys.slice(0, -MAX_BRANCHES).map((k) => $.store.delete(k)))
}

/**
 * The listening servers whose cwd is in `root`. Two lsof calls in all: one
 * for every listener, one batch call for their cwds. `-w` drops the warnings
 * lsof prints for mounts it cannot stat; it exits 1 then, with good output.
 */
const scanServers = async ($: EngineInterface, root: string) => {
  const listening = await $.process.run(
    ["lsof", "-w", "-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcn"],
    { timeoutMs: 10000 }
  )
  const listeners = parseListeners(listening.stdout)
  if (listeners.size === 0) {
    return []
  }
  const where = await $.process.run(
    [
      "lsof",
      "-w",
      "-a",
      "-d",
      "cwd",
      "-p",
      [...listeners.keys()].join(","),
      "-Fpn",
    ],
    { timeoutMs: 10000 }
  )
  return serversIn({ root, listeners, cwds: parseCwds(where.stdout) })
}

/** Rebuilds the view; the write redraws the band only when it changed. */
const scan = async ($: EngineInterface): Promise<void> => {
  const place = await locate($)
  const view: View = place
    ? {
        branch: place.branch,
        servers: await scanServers($, place.root),
        pins: await loadPins($, pinsKey(place.root, place.branch)),
      }
    : EMPTY
  const before = JSON.stringify(await read($, VIEW))
  if (JSON.stringify(view) !== before) {
    await update($, VIEW, () => view)
  }
}

/** Answers the pin tool: adds, moves or removes one pin of this branch. */
const pin = async (
  $: EngineInterface,
  input: Readonly<Record<string, unknown>>
): Promise<string> => {
  const url = typeof input.url === "string" ? checkUrl(input.url) : undefined
  if (!url) {
    throw new Error(
      "url must be one http or https URL, at most 2048 characters"
    )
  }
  const place = await locate($)
  if (!place) {
    throw new Error("the session's cwd is not in a git worktree")
  }
  const key = pinsKey(place.root, place.branch)
  const pins = await loadPins($, key)
  const label =
    typeof input.label === "string" && input.label.trim()
      ? input.label.trim()
      : new URL(url).pathname
  const next =
    input.remove === true ? removePin(pins, url) : addPin(pins, { url, label })
  await savePins($, key, next)
  await scan($)
  return input.remove === true
    ? `Unpinned ${url} from ${place.branch}.`
    : `Pinned ${url} as "${label}" on ${place.branch}.`
}

/** One scan at a time: a slow lsof must not stack up behind the timer. */
let isScanning = false

/** Scans unless a scan is running; a failure goes to the debug log. */
const refresh = async ($: EngineInterface): Promise<void> => {
  if (isScanning) {
    return
  }
  isScanning = true
  try {
    await scan($)
  } catch (error) {
    $.ui.log(`dev-urls: scan failed: ${String(error)}`, { to: "debug" })
  } finally {
    isScanning = false
  }
}

const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    const result = await next(e)
    await $.tool.register({
      name: TOOL,
      description:
        "Pin a URL for testing the current branch to the DEV URLS band above " +
        "the prompt, so the person can open it in one click: a page the " +
        "change touches on the local dev server, a preview deploy, a Storybook " +
        "story. Running local servers are listed without a pin. Pins are kept " +
        "per worktree and branch. Set remove: true to unpin a URL.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The http or https URL" },
          label: {
            type: "string",
            description: "A short name, such as 'cart page'; default the path",
          },
          remove: { type: "boolean", description: "Unpin the URL" },
        },
        required: ["url"],
      },
      isDeferred: false,
    })
    await refresh($)
    $.clock.every(POLL_MS, () => {
      void refresh($)
    })
    return result
  })

  on("tool.call", { tool: `mcp__dev-urls__${TOOL}` }, async ($, e) => {
    try {
      return { result: await pin($, e) }
    } catch (error) {
      return {
        deny: `dev-urls: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  })

  // Servers start from Bash, so look again as soon as a call returns.
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const result = await next(e)
    void refresh($)
    return result
  })

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const kept = await next(e)
    const view = await read($, VIEW)
    const { rows, hidden } = rowsOf(view.servers, view.pins)
    if (e.props.hasSurvey || rows.length === 0) {
      return kept
    }
    const { Box, Link, Text } = $.ui.resolve(e)
    const { top, bottom, inner } = borders(view.branch, e.props.bodyColumns)
    const labelWidth = Math.min(
      MAX_LABEL,
      Math.max(...rows.map((r) => [...r.label].length))
    )
    const edge = (children: string) =>
      Text({ color: "greenBright", wrap: "truncate-end", children })
    const line = (children: RenderNode[], used: number) =>
      Text({
        wrap: "truncate-end",
        children: [
          Text({ color: "greenBright", children: "│ " }),
          ...children,
          " ".repeat(Math.max(0, inner - used)),
          Text({ color: "greenBright", children: " │" }),
        ],
      })
    const body = rows.map((row) => {
      const label = [...row.label]
        .slice(0, labelWidth)
        .join("")
        .padEnd(labelWidth)
      return line(
        [
          Text({
            color: row.mark === "●" ? "green" : "yellow",
            children: `${row.mark} `,
          }),
          Text({ dimColor: true, children: `${label}  ` }),
          Link({ href: row.url }),
        ],
        2 + labelWidth + 2 + row.url.length
      )
    })
    const more =
      hidden > 0
        ? [
            line(
              [Text({ dimColor: true, children: `… ${hidden} more` })],
              2 + `${hidden}`.length + 5
            ),
          ]
        : []
    const panel = Box({
      key: "dev-urls-panel",
      marginTop: 1,
      flexDirection: "column",
      children: [edge(top), ...body, ...more, edge(bottom)],
    })
    return Box({ flexDirection: "column", children: [panel, kept] })
  })
}

export { register }
