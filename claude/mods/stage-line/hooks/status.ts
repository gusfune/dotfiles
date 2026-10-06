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

/** Uncommitted files, and commits ahead and behind the upstream (0 without one). */
interface GitCounts {
  dirty: number
  ahead: number
  behind: number
}

interface GitStatus extends GitCounts {
  branch: string
}

interface StatusInput {
  cwd: string
  branch: string
  git: GitCounts | null
  model: string
  effort: string | null
  contextTokens: number | null
  contextPercent: number | null
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

/**
 * Reads `git status --porcelain=v2 --branch`. A detached HEAD reads as
 * `HEAD`, as `git rev-parse --abbrev-ref HEAD` printed it. Every entry line
 * (changed, renamed, unmerged, untracked) counts as one dirty file.
 */
const parseGitStatus = (stdout: string): GitStatus => {
  const status: GitStatus = { branch: "", dirty: 0, ahead: 0, behind: 0 }
  for (const line of stdout.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      const head = line.slice("# branch.head ".length).trim()
      status.branch = head === "(detached)" ? "HEAD" : head
    } else if (line.startsWith("# branch.ab ")) {
      const match = /\+(\d+) -(\d+)/.exec(line)
      status.ahead = Number(match?.[1] ?? 0)
      status.behind = Number(match?.[2] ?? 0)
    } else if (/^[12u?] /.test(line)) {
      status.dirty += 1
    }
  }
  return status
}

/** ` ±3 ↑2 ↓1`, each part only when non-zero. */
const gitSuffix = (git: GitCounts | null): string => {
  if (!git) {
    return ""
  }
  const parts = [
    git.dirty > 0 ? `±${git.dirty}` : "",
    git.ahead > 0 ? `↑${git.ahead}` : "",
    git.behind > 0 ? `↓${git.behind}` : "",
  ].filter(Boolean)
  return parts.length > 0 ? ` ${parts.join(" ")}` : ""
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
 * The two rows: the work (folder, branch, model, context), then the stage
 * with limits and the session. The stage leads its row, so a narrow terminal
 * cuts the session id and title first.
 */
const statusRows = (s: StatusInput): Segment[][] => {
  const dir = basename(s.cwd)
  const identity: Segment[] = [
    ...(isDirInBranch(dir, s.branch)
      ? []
      : [plain("📂 "), bold(clip(dir, 24), "magentaBright"), plain(" ")]),
    ...(s.branch
      ? [
          plain("🌿 "),
          bold(`(${clip(s.branch, 40)}${gitSuffix(s.git)})`, "cyanBright"),
          plain(" "),
        ]
      : []),
    plain("🤖 "),
    bold(`[${shortModel(s.model)}]`, "greenBright"),
    ...(s.effort ? [plain(" "), bold(`{${s.effort}}`, "gray")] : []),
    ...(s.contextTokens !== null
      ? [
          plain(" 📊 "),
          bold(
            `[ctx: ${thousands(s.contextTokens)}${s.contextPercent !== null ? ` ${Math.round(s.contextPercent)}%` : ""}]`,
            "blueBright"
          ),
        ]
      : []),
  ]
  const stage: Segment[] = [
    bold(`◆ ${s.stage}`, STAGE_COLOR[s.stage]),
    ...(s.pr !== null ? [plain(" "), bold(`#${s.pr}`, "gray")] : []),
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
    plain(" 🔑 "),
    bold(s.sessionId, "yellowBright"),
    ...(s.title ? [plain(" 🏷 "), bold(clip(s.title, 40), "cyanBright")] : []),
  ]
  return [identity, stage]
}

export type { GitCounts, GitStatus, Segment, StatusInput, RateLimit }
export { statusRows, formatReset, parseGitStatus }
