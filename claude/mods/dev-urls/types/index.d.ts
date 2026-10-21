/** The dev-urls contract: the state key the hooks module reads and writes. */

/** A process of this worktree that listens on a TCP port. */
export interface Server {
  pid: number
  /** The process name, as lsof reports it (`node`, `bun`). */
  command: string
  /** The process cwd relative to the worktree root; "" at the root. */
  dir: string
  port: number
  url: string
}

/** A test URL the model pinned for one branch. */
export interface Pin {
  url: string
  label: string
}

/** What the band draws. */
export interface View {
  branch: string
  servers: Server[]
  pins: Pin[]
}

declare module "claude-code" {
  interface PluginState {
    "dev-urls": {
      /** The servers and pins of the session's worktree and branch. */
      view: View
    }
  }
}
