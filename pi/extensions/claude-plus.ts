/**
 * Claude Plus system prompt for pi — the equivalent of bin/claude passing
 * --system-prompt-file to Claude Code on every launch.
 *
 * pi has no persistent system-prompt-file setting either, so this
 * extension replaces the system prompt on every run via the
 * `before_agent_start` override, which the docs guarantee providers
 * receive as the leading system prompt.
 *
 * Source file: the canonical copy inside the dotfiles sbx kit
 * (claude/claude-plus.md symlinks to it), reached through ~/.dotfiles so
 * any checkout location works. Override with CLAUDE_PLUS_FILE.
 * Missing/unreadable file → extension disables itself, pi keeps its
 * built-in prompt. The YAML frontmatter at the top of the file is kept
 * verbatim, same as under --system-prompt-file.
 *
 * Caveat: this is a full replacement, so pi's own tool guidelines and
 * skills hint leave the system prompt — exactly the trade the Claude
 * wrapper already makes.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
	const file =
		process.env.CLAUDE_PLUS_FILE ||
		join(homedir(), ".dotfiles", "claude", "claude-plus.md");

	let prompt: string;
	try {
		prompt = readFileSync(file, "utf8");
	} catch {
		return; // no file → stock pi prompt, silently
	}

	pi.on("before_agent_start", () => ({ systemPrompt: prompt }));
}
