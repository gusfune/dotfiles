/**
 * Pure text helpers: which prompt counts as the person's, where it is kept,
 * and how it is cut to fit the band.
 */
import type { PromptOrigin } from "claude-code"

const MAX_ROWS = 3
const PREFIX = "» "
/** The band's title row, above the prompt text. */
const TITLE = "LAST WORDS"

/** The person typed it: at the terminal, or through Remote Control. */
const isPersonal = (origin: PromptOrigin): boolean =>
  origin.kind === "composer" || origin.kind === "bridge"

/** One line: newlines and runs of spaces become one space. */
const collapse = (text: string): string => text.replace(/\s+/g, " ").trim()

/** Longest prompt kept, in code points; three rows never need more. */
const MAX_KEPT = 1000

/** How many sessions keep a pin in the store; the oldest goes first. */
const MAX_SESSIONS = 200

/** The store key for one session's pin. */
const pinKey = (sessionId: string): string => `pin:${sessionId}`

/** The prompt as the band keeps it: one line, at most `MAX_KEPT` long. */
const keep = (text: string): string =>
  [...collapse(text)].slice(0, MAX_KEPT).join("")

/**
 * Word-wraps the prompt into at most `MAX_ROWS` rows of `width` cells, the
 * prefix on the first row and an indent of the same width on the rest. A word
 * longer than a row is split; text past the last row ends in an ellipsis.
 * Counts code points, so a wide character can push its row one cell over.
 */
const wrapRows = (text: string, width: number): string[] => {
  const room = Math.max(1, width - PREFIX.length)
  const rows: string[][] = [[]]
  for (const word of text.split(" ")) {
    let rest = [...word]
    while (rest.length > 0) {
      const row = rows[rows.length - 1] ?? []
      const gap = row.length > 0 ? 1 : 0
      const free = room - row.length - gap
      if (rest.length <= free) {
        row.push(...(gap ? [" "] : []), ...rest)
        rest = []
      } else if (row.length > 0 && rest.length <= room) {
        rows.push([])
      } else {
        row.push(...(gap ? [" "] : []), ...rest.slice(0, free))
        rest = rest.slice(free)
        rows.push([])
      }
    }
  }
  const filled = rows.filter((row) => row.length > 0)
  const shown = filled.slice(0, MAX_ROWS)
  const last = shown[shown.length - 1]
  if (filled.length > MAX_ROWS && last) {
    last.splice(Math.min(last.length, room - 1), Infinity, "…")
  }
  return shown.map(
    (row, i) => `${i === 0 ? PREFIX : " ".repeat(PREFIX.length)}${row.join("")}`
  )
}

/**
 * The panel as text rows, `columns` wide: the top border carries the title,
 * so the frame costs two rows. Body rows come padded, without their side
 * borders, so the caller can colour the text apart from the frame. Drawn by hand because a Box border has no
 * title, and an absolute Box does not paint in this band.
 */
const frame = (
  text: string,
  columns: number
): { top: string; body: string[]; bottom: string } => {
  const width = Math.max(TITLE.length + 6, columns)
  const inner = width - 4
  return {
    top: `╭─ ${TITLE} ${"─".repeat(width - TITLE.length - 5)}╮`,
    body: wrapRows(text, inner).map(
      (row) => `${row}${" ".repeat(Math.max(0, inner - [...row].length))}`
    ),
    bottom: `╰${"─".repeat(width - 2)}╯`,
  }
}

export {
  MAX_ROWS,
  MAX_SESSIONS,
  PREFIX,
  TITLE,
  collapse,
  frame,
  isPersonal,
  keep,
  wrapRows,
  pinKey,
}
