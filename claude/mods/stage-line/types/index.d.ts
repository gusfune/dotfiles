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
      /** Uncommitted files and commits ahead/behind; null outside a repo. */
      git: { counts: { dirty: number; ahead: number; behind: number } | null }
      /** The session title the classic hooks report. */
      title: string
    }
  }
}
