import { BackgroundCommandsPlugin } from "../plugins/background-commands.ts"

const pluginPromise = BackgroundCommandsPlugin()

export default {
  description:
    "Inspects the live status ('running', 'completed', 'failed', 'timed_out', 'stopped'), exit code, log file path, and recent output preview for an active or finished background command by command_id.",
  args: {
    command_id: {
      type: "string",
      description: "The handle of the background command to inspect.",
    },
    lines: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      default: 20,
      description:
        "Number of most recent lines to return from the log (default: 20, min: 0, max: 100). Always capped at 10,000 characters, keeping the most recent output. Pass 0 to omit output (returns empty string).",
    },
  },
  async execute(args: any, context: any) {
    const plugin = await pluginPromise
    return plugin.tool.background_status.execute(args, context)
  },
}
