/**
 * last-prompt: pins the person's last prompt above the prompt input, so a
 * glance says where the session was. The mod API has no site at the top of
 * the window; `AbovePrompt` is the closest band that stays on screen.
 */
import { read } from "claude-code"
import type { EngineInterface, Register } from "claude-code"
import { MAX_SESSIONS, frame, isPersonal, keep, pinKey } from "./pin"

const TEXT = { plugin: "last-prompt", key: "text" } as const

/**
 * Seeds the pin from the store; a prompt already caught here wins.
 *
 * The transcript is no source: a compaction summary, a skill body or a
 * command expansion is a user message there too, with nothing in
 * `$.session.messages()` to tell it from a typed prompt.
 */
const seed = async ($: EngineInterface): Promise<void> => {
  if (await read($, TEXT)) {
    return
  }
  const kept = await $.store.get(pinKey(await $.session.id()))
  if (typeof kept === "string" && kept) {
    await $.state.set(TEXT, kept)
  }
}

/**
 * Saves the pin under the session, newest last, and drops the oldest past
 * `MAX_SESSIONS` so the store stays far under its 4 MiB cap.
 */
const remember = async ($: EngineInterface, text: string): Promise<void> => {
  const key = pinKey(await $.session.id())
  await $.store.delete(key)
  await $.store.set(key, text)
  const pins = (await $.store.keys()).filter((k) => k.startsWith("pin:"))
  await Promise.all(pins.slice(0, -MAX_SESSIONS).map((k) => $.store.delete(k)))
}

const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    const result = await next(e)
    await seed($)
    return result
  })

  // session.start does not fire after /clear, /resume or /branch.
  on("classic.SessionStart", async ($, e, next) => {
    const result = await next(e)
    if (e.source === "clear" || e.source === "resume" || e.source === "fork") {
      await $.state.set(TEXT, "")
      await seed($)
    }
    return result
  })

  on("prompt.submit", async ($, e, next) => {
    const result = await next(e)
    const text = keep(e.text)
    if ("drop" in result || !isPersonal(e.origin) || !text) {
      return result
    }
    await $.state.set(TEXT, text)
    await remember($, text)
    return result
  })

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const kept = await next(e)
    const text = await read($, TEXT)
    if (e.props.hasSurvey || !text) {
      return kept
    }
    const { Box, Text } = $.ui.resolve(e)
    const { top, body, bottom } = frame(text, e.props.bodyColumns)
    const edge = (children: string) =>
      Text({ color: "cyanBright", wrap: "truncate-end", children })
    const panel = Box({
      key: "last-prompt-panel",
      flexDirection: "column",
      children: [
        Box({ key: "last-prompt-title", children: edge(top) }),
        Box({
          key: "last-prompt",
          flexDirection: "column",
          children: body.map((row) =>
            Text({
              wrap: "truncate-end",
              children: [
                Text({ color: "cyanBright", children: "│ " }),
                Text({ dimColor: true, children: row }),
                Text({ color: "cyanBright", children: " │" }),
              ],
            })
          ),
        }),
        edge(bottom),
      ],
    })
    return Box({ flexDirection: "column", children: [panel, kept] })
  })
}

export { register }
