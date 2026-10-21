/**
 * Pure helpers: parse lsof output into the servers of one worktree, keep the
 * pin list, and cut the band to its rows.
 */
import type { Pin, Server } from "../types"

/** The band's title, before the branch name. */
const TITLE = "DEV URLS"

/** Body rows the band shows before it folds the rest into one row. */
const MAX_ROWS = 6

/** How many branches keep a pin list in the store; the oldest goes first. */
const MAX_BRANCHES = 100

/** The longest URL a `Link` takes. */
const MAX_URL = 2048

/**
 * The first port of the IANA dynamic range, which macOS hands out for
 * port 0. Dev servers bind fixed ports below it; what binds above it is a
 * tool's own bridge, such as Claude Code's IDE and MCP listeners, whose
 * binary is named by its version and whose cwd is this worktree too.
 */
const EPHEMERAL_FROM = 49152

/** The store key for one branch of one worktree. */
const pinsKey = (root: string, branch: string): string =>
  `pins:${root}#${branch}`

/** Reads lsof `-F` output into one record per process: its `p` line first. */
const records = (stdout: string): Map<number, string[]> => {
  const byPid = new Map<number, string[]>()
  let fields: string[] = []
  for (const line of stdout.split("\n")) {
    if (line.startsWith("p")) {
      fields = []
      byPid.set(Number(line.slice(1)), fields)
    } else if (line) {
      fields.push(line)
    }
  }
  return byPid
}

/** `*:3000`, `127.0.0.1:3000` and `[::1]:3000` all end in the port. */
const portOf = (name: string): number | undefined => {
  const port = Number(name.slice(name.lastIndexOf(":") + 1))
  return Number.isInteger(port) && port > 0 ? port : undefined
}

/**
 * Parses `lsof -nP -iTCP -sTCP:LISTEN -Fpcn` into each process's name and
 * ports. IPv4 and IPv6 sockets on one port count once.
 */
const parseListeners = (
  stdout: string
): Map<number, { command: string; ports: number[] }> =>
  new Map(
    [...records(stdout)].map(([pid, fields]) => {
      const command = fields.find((f) => f.startsWith("c"))?.slice(1) ?? "?"
      const ports = fields
        .filter((f) => f.startsWith("n"))
        .map((f) => portOf(f.slice(1)))
        .filter((port): port is number => port !== undefined)
      return [
        pid,
        { command, ports: [...new Set(ports)].sort((a, b) => a - b) },
      ]
    })
  )

/** Parses `lsof -a -d cwd -p <pids> -Fpn` into each process's cwd. */
const parseCwds = (stdout: string): Map<number, string> =>
  new Map(
    [...records(stdout)].flatMap(([pid, fields]): [number, string][] => {
      const name = fields.find((f) => f.startsWith("n"))
      return name ? [[pid, name.slice(1)]] : []
    })
  )

/** The path relative to `root`, or undefined when it is outside it. */
const relativeTo = (path: string, root: string): string | undefined => {
  if (path === root) {
    return ""
  }
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : undefined
}

/**
 * The listening processes whose cwd sits inside the worktree, one entry per
 * port below the dynamic range. A server started from another checkout of
 * the same repo stays out: that is what ties the list to the branch.
 */
const serversIn = (input: {
  root: string
  listeners: Map<number, { command: string; ports: number[] }>
  cwds: Map<number, string>
}): Server[] =>
  [...input.listeners]
    .flatMap(([pid, { command, ports }]) => {
      const cwd = input.cwds.get(pid)
      const dir = cwd === undefined ? undefined : relativeTo(cwd, input.root)
      if (dir === undefined) {
        return []
      }
      return ports
        .filter((port) => port < EPHEMERAL_FROM)
        .map((port) => ({
          pid,
          command,
          dir,
          port,
          url: `http://localhost:${port}`,
        }))
    })
    .sort((a, b) => a.port - b.port)

/** An http or https URL a `Link` can carry, or undefined. */
const checkUrl = (raw: string): string | undefined => {
  const url = raw.trim()
  if (url.length > MAX_URL || !/^https?:\/\/[^\s]+$/.test(url)) {
    return undefined
  }
  return url
}

/** The pin list with `pin` added, or moved to the end when already there. */
const addPin = (pins: readonly Pin[], pin: Pin): Pin[] => [
  ...pins.filter((p) => p.url !== pin.url),
  pin,
]

/** The pin list without `url`. */
const removePin = (pins: readonly Pin[], url: string): Pin[] =>
  pins.filter((p) => p.url !== url)

/** One body row: a mark, a short label, and the URL drawn as a link. */
interface Row {
  mark: string
  label: string
  url: string
}

/**
 * The rows the band draws: servers first, then pins. Past `MAX_ROWS` the last
 * row says how many are left out.
 */
const rowsOf = (
  servers: readonly Server[],
  pins: readonly Pin[]
): { rows: Row[]; hidden: number } => {
  const all: Row[] = [
    ...servers.map((s) => ({
      mark: "●",
      label: `${s.dir || s.command} :${s.port}`,
      url: s.url,
    })),
    ...pins.map((p) => ({ mark: "★", label: p.label, url: p.url })),
  ]
  if (all.length <= MAX_ROWS) {
    return { rows: all, hidden: 0 }
  }
  return {
    rows: all.slice(0, MAX_ROWS - 1),
    hidden: all.length - MAX_ROWS + 1,
  }
}

/** The top and bottom border rows, `columns` wide, the title in the top one. */
const borders = (
  branch: string,
  columns: number
): { top: string; bottom: string; inner: number } => {
  const title = branch ? `${TITLE} · ${branch}` : TITLE
  const width = Math.max(title.length + 6, columns)
  return {
    top: `╭─ ${title} ${"─".repeat(width - title.length - 5)}╮`,
    bottom: `╰${"─".repeat(width - 2)}╯`,
    inner: width - 4,
  }
}

export {
  MAX_BRANCHES,
  MAX_ROWS,
  TITLE,
  addPin,
  borders,
  checkUrl,
  parseCwds,
  parseListeners,
  pinsKey,
  relativeTo,
  removePin,
  rowsOf,
  serversIn,
}
export type { Row }
