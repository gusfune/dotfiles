/**
 * peon-ping extension for pi — Warcraft III Peon voice lines on lifecycle
 * events, matching the Claude Code hook setup in
 * ~/Developer/dotfiles/claude/settings.json.
 *
 * pi event → Claude hook event (peon.sh decides the sound from
 * `hook_event_name` on stdin, same contract as Claude Code):
 *
 *   pi `session_start`          → SessionStart
 *   pi `session_shutdown`       → SessionEnd
 *   pi `before_agent_start`     → UserPromptSubmit
 *   pi `agent_end`              → Stop
 *   pi `tool_execution_end` err → PostToolUseFailure (bash only, as in Claude)
 *   pi `session_before_compact` → PreCompact
 *
 * Claude-only events with no pi equivalent are dropped: SubagentStart/Stop
 * (pi has no subagent lifecycle events), Notification and PermissionRequest
 * (pi does not prompt for permissions). The /peon-ping-use and
 * /peon-ping-rename sound-pack commands are Claude slash-command
 * interceptors and are not ported; run the scripts by hand if needed.
 *
 * Fire-and-forget: spawn failures never reach the agent loop. peon.sh
 * handles headphones/meeting/Focus detection itself. No-op when peon.sh is
 * not installed.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
	const peon = join(homedir(), ".claude", "hooks", "peon-ping", "peon.sh");
	if (!existsSync(peon)) return;

	const fire = (eventName: string) => {
		try {
			const child = spawn(peon, [], {
				stdio: ["pipe", "ignore", "ignore"],
				detached: true,
			});
			child.on("error", () => {});
			child.stdin?.on("error", () => {});
			child.stdin?.end(JSON.stringify({ hook_event_name: eventName }));
			child.unref();
		} catch {
			// stay silent — sounds are never worth breaking a session
		}
	};

	// Same gate as superset-hooks: print/JSON modes (subagents, helpers)
	// must not play sounds.
	const skip = (ctx: { hasUI?: boolean }) => ctx.hasUI === false;

	pi.on("session_start", (_event, ctx) => {
		if (!skip(ctx)) fire("SessionStart");
	});
	pi.on("session_shutdown", (_event, ctx) => {
		if (!skip(ctx)) fire("SessionEnd");
	});
	pi.on("before_agent_start", (_event, ctx) => {
		if (!skip(ctx)) fire("UserPromptSubmit");
	});
	pi.on("agent_end", (_event, ctx) => {
		if (!skip(ctx)) fire("Stop");
	});
	pi.on("tool_execution_end", (event, ctx) => {
		if (!skip(ctx) && event.isError && event.toolName === "bash") fire("PostToolUseFailure");
	});
	pi.on("session_before_compact", (_event, ctx) => {
		if (!skip(ctx)) fire("PreCompact");
	});
}
