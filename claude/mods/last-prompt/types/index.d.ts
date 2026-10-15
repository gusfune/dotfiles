/** The last-prompt contract: the state key the hooks module reads and writes. */
declare module "claude-code" {
  interface PluginState {
    "last-prompt": {
      /** The last prompt the person sent, whitespace collapsed; "" for none. */
      text: string
    }
  }
}
