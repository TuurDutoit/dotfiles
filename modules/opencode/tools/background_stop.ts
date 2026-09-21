import { BackgroundCommandsPlugin } from "../plugins/background-commands.ts"

const pluginPromise = BackgroundCommandsPlugin()

export default {
  description:
    "Terminates a running background command and its spawned process group (SIGTERM escalating to SIGKILL) and suppresses asynchronous completion notices. Calling on an already finished command is idempotent and returns its recorded terminal status.",
  args: {
    command_id: {
      type: "string",
      description: "The handle of the command to terminate.",
    },
  },
  async execute(args: any, context: any) {
    const plugin = await pluginPromise
    return plugin.tool.background_stop.execute(args, context)
  },
}
