import { BackgroundCommandsPlugin } from "../plugins/background-commands.ts"

const pluginPromise = BackgroundCommandsPlugin()

export default {
  description:
    "Spawns a shell command in the background within an isolated process group and streams logs to ~/.opencode/logs/<command_id>.log. Use 'on_completion' mode (default) for CI checks (e.g. gh pr checks --watch), builds, or migrations to be notified once upon exit. Use 'monitor' mode to stream batched updates of new matching output at periodic intervals (e.g. for dev servers, watch runners). Automatic system notifications delivered to the conversation are marked with [System Notification: Background Command ...] and reflect machine output.",
  args: {
    command: {
      type: "string",
      description: "Shell command to execute in the background.",
    },
    mode: {
      type: "string",
      enum: ["on_completion", "monitor"],
      default: "on_completion",
      description:
        "Notification delivery mode: 'on_completion' notifies once on exit; 'monitor' streams periodic progress updates of new output plus exit notice.",
    },
    interval: {
      type: "integer",
      minimum: 10,
      default: 20,
      description: "In 'monitor' mode, seconds between periodic progress notifications (default: 20s, min: 10s).",
    },
    pattern: {
      type: "string",
      description:
        "Optional regex pattern or substring filter for 'monitor' mode. When set, only newly produced log lines matching the pattern trigger progress notifications and appear in preview updates. (The log file still records all output).",
    },
    lines: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      default: 20,
      description:
        "Maximum number of recent output lines to include in progress update previews and completion notices (default: 20, min: 0, max: 100). Output is capped at 10,000 characters, keeping the most recent output. Pass 0 to omit output previews.",
    },
    workdir: {
      type: "string",
      description: "Optional working directory. Defaults to the session directory.",
    },
    timeout: {
      type: "integer",
      minimum: 1,
      description: "Optional maximum execution duration in milliseconds before automatic SIGTERM/SIGKILL termination.",
    },
  },
  async execute(args: any, context: any) {
    const plugin = await pluginPromise
    return plugin.tool.background_run.execute(args, context)
  },
}
