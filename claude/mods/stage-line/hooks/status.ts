/**
 * The status rows as plain segments: a port of
 * claude/sbx-kit/files/home/.claude/statusline.sh. Pure, so the render hook
 * only maps segments to elements and the tests read text directly.
 */
import type { Stage } from "./stage"

interface Segment {
  text: string
  color?: string
  isBold?: boolean
}

interface RateLimit {
  kind: string
  percentUsed: number
  resetsAt?: string
}

interface StatusInput {
  now: Date
  cwd: string
  branch: string
  model: string
  effort: string | null
  contextTokens: number | null
  tokensIn: number
  tokensOut: number
  rateLimits: readonly RateLimit[]
  sessionId: string
  title: string | null
  stage: Stage
  pr: number | null
}

/** One colour per stage; the bash ANSI codes map to Ink's chalk names. */
const STAGE_COLOR: Record<Stage, string> = {
  PLAN: "blueBright",
  BUILD: "yellowBright",
  USER_REVIEW: "magentaBright",
  CODE_REVIEW: "cyanBright",
  STAND_BY: "greenBright",
}

const pad = (n: number): string => String(n).padStart(2, "0")

const thousands = (n: number): string => `${Math.floor(n / 1000)}K`

/** `date '+%d/%m/%y %l:%M:%S'`: a space-padded 12-hour clock, no meridiem. */
const formatClock = (d: Date): string => {
  const hour = String(d.getHours() % 12 || 12).padStart(2, " ")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${pad(d.getFullYear() % 100)} ${hour}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * `dd/MM HH:mm` in local time. Formatting only, so no date library: a mod
 * cannot import one (no install step, bare imports other than claude-code
 * fail validation).
 */
const formatReset = (iso: string): string | null => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const basename = (path: string): string =>
  path.split("/").filter(Boolean).pop() ?? path

const bold = (text: string, color: string): Segment => ({
  text,
  color,
  isBold: true,
})

const plain = (text: string): Segment => ({ text })

/** Cuts `text` to `max` characters, the last one an ellipsis. */
const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

/** `claude-opus-5-5` to `Opus 5.5`; any other id passes through. */
const shortModel = (id: string): string => {
  const match = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(id)
  if (!match) {
    return id
  }
  const [, family = "", major, minor] = match
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`
}

/**
 * Worktree folders are often the branch name as a slug, cut short. The folder
 * then repeats the branch, so it is dropped.
 */
const isDirInBranch = (dir: string, branch: string): boolean =>
  branch !== "" && branch.replaceAll("/", "-").startsWith(dir)

const rateSegment = (
  limits: readonly RateLimit[],
  spec: { kind: string; label: string; icon: string; color: string }
): Segment[] => {
  const limit = limits.find((l) => l.kind === spec.kind)
  if (!limit) {
    return []
  }
  const reset = limit.resetsAt ? formatReset(limit.resetsAt) : null
  const body = `${Math.round(limit.percentUsed)}%${reset ? ` ${reset}` : ""}`
  return [plain(` ${spec.icon} `), bold(`[${spec.label}: ${body}]`, spec.color)]
}

/**
 * The three rows: identity, usage, and stage with the session. The stage leads
 * its row, so a narrow terminal cuts the session id first.
 */
const statusRows = (s: StatusInput): Segment[][] => {
  const dir = basename(s.cwd)
  const identity: Segment[] = [
    plain("🕐 "),
    bold(`[${formatClock(s.now)}]`, "yellowBright"),
    ...(isDirInBranch(dir, s.branch)
      ? []
      : [plain(" 📂 "), bold(clip(dir, 24), "magentaBright")]),
    ...(s.branch
      ? [plain(" 🌿 "), bold(`(${clip(s.branch, 40)})`, "cyanBright")]
      : []),
    plain(" 🤖 "),
    bold(`[${shortModel(s.model)}]`, "greenBright"),
    ...(s.effort ? [plain(" "), bold(`{${s.effort}}`, "gray")] : []),
    ...(s.contextTokens !== null
      ? [
          plain(" 📊 "),
          bold(`[ctx: ${thousands(s.contextTokens)}]`, "blueBright"),
        ]
      : []),
  ]
  const usage: Segment[] = [
    plain("📥 "),
    bold(`in: ${thousands(s.tokensIn)}`, "yellowBright"),
    plain(" 📤 "),
    bold(`out: ${thousands(s.tokensOut)}`, "cyanBright"),
    ...rateSegment(s.rateLimits, {
      kind: "five_hour",
      label: "5h",
      icon: "⏳",
      color: "greenBright",
    }),
    ...rateSegment(s.rateLimits, {
      kind: "seven_day",
      label: "7d",
      icon: "📅",
      color: "magentaBright",
    }),
  ]
  const stage: Segment[] = [
    bold(`◆ ${s.stage}`, STAGE_COLOR[s.stage]),
    ...(s.pr !== null ? [plain(" "), bold(`#${s.pr}`, "gray")] : []),
    plain(" 🔑 "),
    bold(s.sessionId, "yellowBright"),
    ...(s.title ? [plain(" 🏷 "), bold(clip(s.title, 40), "cyanBright")] : []),
  ]
  return [identity, usage, stage]
}

export type { Segment, StatusInput, RateLimit }
export { statusRows, formatClock, formatReset }
