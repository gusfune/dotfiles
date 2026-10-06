# last-prompt

A Claude Code mod that pins your last prompt in the band above the prompt
input, so a glance tells you where the session was:

```
╭─ LAST WORDS ─────────────────────────────────────────────────────────────╮
│ » refactor the stage-line rows so the limits get their own line and each │
│   bar shows its percent at the right end, then update the README and the │
│   sandbox script to match…                                               │
╰──────────────────────────────────────────────────────────────────────────╯
❯ █
```

The mod API has no site at the top of the window. `AbovePrompt` is the closest
band that stays on screen, so the pin lives there.

## Rules

- The pin is a panel with a round cyan border and `LAST WORDS` in the top
  border line, so the frame costs two rows. The mod draws the frame as text:
  a Box border takes no title, and an absolute Box does not paint in this
  band.
- Only your own prompts count: typed at the terminal, or sent through Remote
  Control. Prompts from plugins, peers, schedules and task notifications do
  not replace the pin.
- Newlines and runs of spaces become one space. The text is cut to three rows
  of the band's width, word-wrapped, with `…` where it was cut.
- Each prompt is also saved in the mod's store under its session id, so
  `/resume` and `--continue` bring the pin back. The store keeps the newest
  200 sessions. The transcript is never read: compaction summaries, skill
  bodies and command expansions are user messages there too, and nothing
  tells them apart from a typed prompt. So `/branch`, `/clear` and sessions
  from before the mod start empty until you send a prompt.
- A survey takes the band; the pin steps aside until it is gone.
- `ctrl+x ctrl+a` or the `[-]` mark collapses the band; `ctrl+x ctrl+a`
  again brings it back.

## Checks

```bash
cd ~/Developer/dotfiles/claude/mods/last-prompt
claude plugin validate .
claude plugin test .
npx -y -p typescript@5.9.3 tsc -p tsconfig.json   # needs the generated types
```
