/**
 * The stage-line contract: the state keys the hooks module reads and writes.
 * `workflow` mirrors `Workflow` in hooks/stage.ts; a contract cannot import.
 */
declare module "claude-code" {
  interface PluginState {
    "stage-line": {
      workflow: {
        sessionId: string
        branch: string
        stage: "PLAN" | "BUILD" | "USER_REVIEW" | "CODE_REVIEW" | "STAND_BY"
        revision: number
        reviewAgents: string[]
        isSkillReviewOpen: boolean
        pr: number | null
        head: string | null
        headSeenAt: number | null
        bots: string[]
      }
      /** The main agent's last reasoning effort. */
      effort: string
      /** Token totals for one session, subagents included. */
      tokens: { sessionId: string; tokensIn: number; tokensOut: number }
      /** The session title the classic hooks report. */
      title: string
    }
  }
}
