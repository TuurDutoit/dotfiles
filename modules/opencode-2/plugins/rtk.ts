import type { Plugin } from "@opencode/plugin"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

// RTK OpenCode plugin — rewrites commands to use rtk for token savings.
// Requires: rtk >= 0.23.0 in PATH.
//
// This is a thin delegating plugin: all rewrite logic lives in `rtk rewrite`,
// which is the single source of truth (src/discover/registry.rs).
// To add or change rewrite rules, edit the Rust registry — not this file.
//
// OpenCode 2 note: the default export is the plain { id, setup } definition
// (identical to what Plugin.define returns) with a type-only SDK import, so
// `node --test` can load this file without the SDK package installed.
// This file is hand-ported because `rtk init -g --opencode` (rtk 0.49.0)
// still generates the V1 API; setup.zsh only bootstraps it when missing.
// Once rtk ships a V2-native template, delete this file and re-run
// `rtk init -g --opencode`.

const execFileAsync = promisify(execFile)

export default {
  id: "rtk",
  async setup(ctx) {
    try {
      await execFileAsync("rtk", ["--version"])
    } catch {
      console.warn("[rtk] rtk binary not found in PATH — plugin disabled")
      return
    }

    await ctx.tool.hook("execute.before", async (event) => {
      const tool = String(event.tool ?? "").toLowerCase()
      if (tool !== "bash" && tool !== "shell") return
      const args = event.input
      if (!args || typeof args !== "object") return

      const command = (args as Record<string, unknown>).command
      if (typeof command !== "string" || !command) return

      try {
        const result = await execFileAsync("rtk", ["rewrite", command])
        const rewritten = String(result.stdout).trim()
        if (rewritten && rewritten !== command) {
          ;(args as Record<string, unknown>).command = rewritten
        }
      } catch {
        // rtk rewrite failed — pass through unchanged
      }
    })
  },
} satisfies Plugin.Plugin