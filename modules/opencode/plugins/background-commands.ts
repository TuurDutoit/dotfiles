import type { Plugin } from "@opencode-ai/plugin"
import child_process from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export interface CommandRecord {
  command_id: string
  sessionID: string
  command: string
  workdir: string
  pgid: number
  logPath: string
  mode: "on_completion" | "monitor"
  interval: number
  pattern?: RegExp
  lines: number
  timeout?: number
  status: "running" | "completed" | "failed" | "timed_out" | "stopped"
  exitCode: number | null
  lastReadOffset: number
  timeoutTimer?: NodeJS.Timeout
  monitorTimer?: NodeJS.Timeout
  sigkillTimer?: NodeJS.Timeout
  stoppedByUser: boolean
  childProcess?: child_process.ChildProcess
}

export interface NotificationEvent {
  type: "progress" | "completed" | "failed" | "timed_out"
  command_id: string
  command: string
  status: string
  exitCode: number | null
  logPath: string
  lines: number
  preview: string
  truncated: boolean
  timeoutMs?: number
  totalLines?: number
}

export interface SessionQueue {
  items: NotificationEvent[]
  debounceTimer: NodeJS.Timeout | null
  timerExpired: boolean
  isIdle: boolean
}

function tool<
  T extends {
    description: string
    args: Record<string, any>
    execute: (args: any, context: any) => Promise<any>
  },
>(def: T): T {
  return def
}

const MAX_OUTPUT_CHARS = 10000
const LOG_PRUNE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// In-memory registries (internal to module)
const commandRegistry = new Map<string, CommandRecord>()
const sessionQueues = new Map<string, SessionQueue>()
let commandCounter = 0
let activeClient: any = null

function getLogDir(): string {
  const logDir = path.join(os.homedir(), ".opencode", "logs")
  try {
    fs.mkdirSync(logDir, { recursive: true, mode: 0o700 })
  } catch {
    // ignore if already exists
  }
  return logDir
}

function pruneOldLogs(logDir = getLogDir()): void {
  try {
    if (!fs.existsSync(logDir)) return
    const files = fs.readdirSync(logDir)
    const now = Date.now()
    for (const file of files) {
      if (!file.endsWith(".log")) continue
      const filePath = path.join(logDir, file)
      try {
        const stats = fs.statSync(filePath)
        if (now - stats.mtimeMs > LOG_PRUNE_MAX_AGE_MS) {
          fs.unlinkSync(filePath)
        }
      } catch {
        // ignore errors on individual file access
      }
    }
  } catch {
    // ignore directory scan errors
  }
}

function isInteractiveSession(): boolean {
  if (process.env.OPENCODE_RUN === "1" || process.env.OPENCODE_RUN === "true") {
    return false
  }
  return true
}

// Subagent sessions (spawned by the Task tool) always carry a parentID on their
// session record (verified against opencode's tool/task.ts: sessions.create({
// parentID: ctx.sessionID, ... })). Background jobs rely on async
// notifications waking the owning session, which does not work in subagents —
// they exit while waiting — so background_run must be rejected there. Fails
// open when the session API is unavailable so the main session is never blocked.
async function isSubagentSession(client: any, sessionID: string): Promise<boolean> {
  try {
    const res = await client?.session?.get?.({ path: { id: sessionID } })
    return typeof res?.data?.parentID === "string" && res.data.parentID.length > 0
  } catch (err: any) {
    console.warn(
      `[background-commands] Could not verify whether session ${sessionID} is a subagent:`,
      err?.message ?? err,
    )
    return false
  }
}

function terminateProcessGroup(
  pgid: number,
  graceMs = 2000,
): NodeJS.Timeout | undefined {
  if (typeof pgid !== "number" || pgid <= 0) return undefined

  try {
    process.kill(-pgid, "SIGTERM")
  } catch (err: any) {
    if (err.code !== "ESRCH") {
      // ignore ESRCH (process group already dead)
    }
  }

  const sigkillTimer = setTimeout(() => {
    try {
      process.kill(-pgid, "SIGKILL")
    } catch (err: any) {
      if (err.code !== "ESRCH") {
        // ignore ESRCH
      }
    }
  }, graceMs)

  if (typeof sigkillTimer.unref === "function") {
    sigkillTimer.unref()
  }

  return sigkillTimer
}

function readLogSlice(
  logPath: string,
  fromOffset: number,
  maxLines: number,
  maxChars = MAX_OUTPUT_CHARS,
  pattern?: RegExp,
): { text: string; newOffset: number; matchedLines: number; totalNewLines: number } {
  try {
    if (!fs.existsSync(logPath)) {
      return { text: "", newOffset: fromOffset, matchedLines: 0, totalNewLines: 0 }
    }

    const stats = fs.statSync(logPath)
    if (stats.size <= fromOffset) {
      return { text: "", newOffset: fromOffset, matchedLines: 0, totalNewLines: 0 }
    }

    const bytesToRead = stats.size - fromOffset
    const fd = fs.openSync(logPath, "r")
    const buffer = Buffer.alloc(bytesToRead)
    fs.readSync(fd, buffer, 0, bytesToRead, fromOffset)
    fs.closeSync(fd)

    const lastNewlineIdx = buffer.lastIndexOf(0x0a)
    if (lastNewlineIdx === -1) {
      // Incomplete line slice: preserve for next poll
      return { text: "", newOffset: fromOffset, matchedLines: 0, totalNewLines: 0 }
    }

    const validBuffer = buffer.subarray(0, lastNewlineIdx + 1)
    const newOffset = fromOffset + lastNewlineIdx + 1
    const decoded = validBuffer.toString("utf-8")

    const rawLines = decoded.split(/\r?\n/)
    // Drop trailing empty element resulting from ending \n
    if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
      rawLines.pop()
    }

    let filteredLines = rawLines
    if (pattern) {
      filteredLines = rawLines.filter((l) => pattern.test(l))
    }

    if (maxLines === 0 || filteredLines.length === 0) {
      return {
        text: "",
        newOffset,
        matchedLines: filteredLines.length,
        totalNewLines: rawLines.length,
      }
    }

    const previewLines = filteredLines.slice(-maxLines)
    let joined = previewLines.join("\n")
    if (joined.length > maxChars) {
      joined = joined.slice(joined.length - maxChars)
    }

    return {
      text: joined,
      newOffset,
      matchedLines: filteredLines.length,
      totalNewLines: rawLines.length,
    }
  } catch {
    return { text: "", newOffset: fromOffset, matchedLines: 0, totalNewLines: 0 }
  }
}

function readTailPreview(
  logPath: string,
  maxLines: number,
  maxChars = MAX_OUTPUT_CHARS,
): { text: string; totalLines: number; truncated: boolean } {
  if (maxLines === 0) {
    return { text: "", totalLines: 0, truncated: false }
  }

  try {
    if (!fs.existsSync(logPath)) {
      return { text: "", totalLines: 0, truncated: false }
    }

    const content = fs.readFileSync(logPath, "utf-8")
    const rawLines = content.split(/\r?\n/)
    if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
      rawLines.pop()
    }

    const totalLines = rawLines.length
    const cappedLines = Math.min(maxLines, 100)
    let truncated = totalLines > cappedLines

    const slice = rawLines.slice(-cappedLines)
    let joined = slice.join("\n")

    if (joined.length > maxChars) {
      joined = joined.slice(joined.length - maxChars)
      truncated = true
    }

    return { text: joined, totalLines, truncated }
  } catch {
    return { text: "", totalLines: 0, truncated: false }
  }
}

const SYSTEM_NOTICE_BANNER =
  "Notice: This message was generated automatically by the background command watcher, not by human input."

function formatSingleEvent(event: NotificationEvent): string {
  const { type, command_id, command, status, exitCode, logPath, lines, preview, truncated, timeoutMs, totalLines } = event

  let statusText = status
  if (type === "completed") {
    statusText = `completed (exit code ${exitCode ?? 0})`
  } else if (type === "failed") {
    statusText = `failed (exit code ${exitCode ?? 1})`
  } else if (type === "timed_out") {
    statusText = `timed_out (exceeded timeout of ${timeoutMs ?? 0}ms)`
  } else if (type === "progress") {
    statusText = "running"
  }

  const notificationTitle = type === "progress"
    ? `[System Notification: Background Command ${command_id} (Progress)]`
    : `[System Notification: Background Command ${command_id}]`

  if (lines === 0 || !preview) {
    return `${notificationTitle}
${SYSTEM_NOTICE_BANNER}

Command: \`${command}\`
Status: ${statusText}
Log file: ${logPath}`.trim()
  }

  const linesHeader = type === "progress"
    ? `New output (last ${lines} lines):`
    : (truncated && typeof totalLines === "number" && totalLines > lines)
      ? `Output preview [Truncated - showing last ${lines} lines of ${totalLines} lines. Full logs at file path above]:`
      : `Output preview (last ${lines} lines):`

  return `${notificationTitle}
${SYSTEM_NOTICE_BANNER}

Command: \`${command}\`
Status: ${statusText}
Log file: ${logPath}

${linesHeader}
${preview}`.trim()
}

function formatBatchedEvents(events: NotificationEvent[]): string {
  if (events.length === 1) {
    return formatSingleEvent(events[0])
  }

  const sections = events.map((event) => {
    const { type, command_id, command, status, exitCode, logPath, lines, preview, timeoutMs } = event
    let statusText = status
    if (type === "completed") {
      statusText = `completed (exit code ${exitCode ?? 0})`
    } else if (type === "failed") {
      statusText = `failed (exit code ${exitCode ?? 1})`
    } else if (type === "timed_out") {
      statusText = `timed_out (exceeded timeout of ${timeoutMs ?? 0}ms)`
    } else if (type === "progress") {
      statusText = "running (Progress update)"
    }

    const previewLabel = type === "progress" ? "New matching output:" : `Output preview (last ${lines} lines):`

    if (lines === 0 || !preview) {
      return `### Command \`${command_id}\` (\`${command}\`):
Status: ${statusText}
Log file: ${logPath}`.trim()
    }

    return `### Command \`${command_id}\` (\`${command}\`):
Status: ${statusText}
Log file: ${logPath}
${previewLabel}
${preview}`.trim()
  })

  return `[System Notification: Background Commands Update]
${SYSTEM_NOTICE_BANNER}

${sections.join("\n\n---\n\n")}`.trim()
}

function getOrCreateSessionQueue(sessionID: string): SessionQueue {
  let queue = sessionQueues.get(sessionID)
  if (!queue) {
    queue = {
      items: [],
      debounceTimer: null,
      timerExpired: false,
      isIdle: false,
    }
    sessionQueues.set(sessionID, queue)
  }
  return queue
}

// Discard all queued notifications for one command so the session is not
// re-woken with information it already has (e.g. after background_status).
function discardQueuedEvents(sessionID: string, command_id: string): void {
  const queue = sessionQueues.get(sessionID)
  if (!queue) return
  queue.items = queue.items.filter((item) => item.command_id !== command_id)
  if (queue.items.length === 0 && queue.debounceTimer) {
    clearTimeout(queue.debounceTimer)
    queue.debounceTimer = null
    queue.timerExpired = false
  }
}

function clearRecordTimers(record: CommandRecord): void {
  if (record.timeoutTimer) {
    clearTimeout(record.timeoutTimer)
    record.timeoutTimer = undefined
  }
  if (record.monitorTimer) {
    clearInterval(record.monitorTimer)
    record.monitorTimer = undefined
  }
  if (record.sigkillTimer) {
    clearTimeout(record.sigkillTimer)
    record.sigkillTimer = undefined
  }
}

async function flushSessionQueue(
  sessionID: string,
  client?: any,
): Promise<void> {
  const c = client ?? activeClient
  const queue = sessionQueues.get(sessionID)
  if (!queue || queue.items.length === 0) return

  if (queue.debounceTimer) {
    clearTimeout(queue.debounceTimer)
    queue.debounceTimer = null
  }
  queue.timerExpired = false

  const rawEvents = [...queue.items]
  queue.items = []

  // Coalesce events per command_id: terminal events supersede progress events
  const coalescedMap = new Map<string, NotificationEvent>()
  for (const ev of rawEvents) {
    const existing = coalescedMap.get(ev.command_id)
    if (!existing) {
      coalescedMap.set(ev.command_id, ev)
    } else if (ev.type !== "progress") {
      // Terminal event overrides previous progress or terminal event
      coalescedMap.set(ev.command_id, ev)
    } else if (existing.type === "progress") {
      // Newer progress event overrides older progress event
      coalescedMap.set(ev.command_id, ev)
    }
  }

  const finalEvents = Array.from(coalescedMap.values())
  if (finalEvents.length === 0) return

  const messageText = formatBatchedEvents(finalEvents)

  if (c?.session?.promptAsync) {
    try {
      await c.session.promptAsync({
        path: { id: sessionID },
        body: { parts: [{ type: "text", text: messageText }] },
      })
    } catch (err: any) {
      console.warn(`[background-commands] Failed to dispatch prompt to session ${sessionID}:`, err?.message ?? err)
      // Do not kill running process groups on transient prompt dispatch errors.
      // Deterministic teardown of session processes is handled by the session.deleted event hook.
    }
  }
}

function enqueueEvent(
  sessionID: string,
  event: NotificationEvent,
  client?: any,
): void {
  const c = client ?? activeClient
  const queue = getOrCreateSessionQueue(sessionID)

  // Coalesce within queue: if terminal event, replace any existing progress for this command
  if (event.type !== "progress") {
    queue.items = queue.items.filter((item) => item.command_id !== event.command_id)
  }
  queue.items.push(event)

  // Immediate flush if session is currently idle
  if (queue.isIdle) {
    flushSessionQueue(sessionID, c)
    return
  }

  // If session is busy, debounce until next idle or short batching debounce
  if (!queue.debounceTimer && !queue.timerExpired) {
    queue.debounceTimer = setTimeout(() => {
      queue.timerExpired = true
      queue.debounceTimer = null
      if (queue.isIdle) {
        flushSessionQueue(sessionID, c)
      }
    }, 500)

    if (typeof queue.debounceTimer.unref === "function") {
      queue.debounceTimer.unref()
    }
  }
}

function cleanupAllCommands(): void {
  for (const record of commandRegistry.values()) {
    clearRecordTimers(record)
    if (record.status === "running" && record.pgid > 0) {
      terminateProcessGroup(record.pgid, 500)
      record.status = "stopped"
    }
  }
  commandRegistry.clear()

  for (const queue of sessionQueues.values()) {
    if (queue.debounceTimer) {
      clearTimeout(queue.debounceTimer)
      queue.debounceTimer = null
    }
    queue.items = []
  }
  sessionQueues.clear()
}

// Clean up on process exit / signals
process.on("SIGINT", cleanupAllCommands)
process.on("SIGTERM", cleanupAllCommands)
process.on("exit", cleanupAllCommands)

export const BackgroundCommandsPlugin: Plugin & {
  getCommandRegistry: () => Map<string, CommandRecord>
  getSessionQueues: () => Map<string, SessionQueue>
  pruneOldLogs: typeof pruneOldLogs
  isInteractiveSession: typeof isInteractiveSession
  isSubagentSession: typeof isSubagentSession
  terminateProcessGroup: typeof terminateProcessGroup
  readLogSlice: typeof readLogSlice
  readTailPreview: typeof readTailPreview
  formatSingleEvent: typeof formatSingleEvent
  formatBatchedEvents: typeof formatBatchedEvents
  getOrCreateSessionQueue: typeof getOrCreateSessionQueue
  flushSessionQueue: typeof flushSessionQueue
  enqueueEvent: typeof enqueueEvent
  cleanupAllCommands: typeof cleanupAllCommands
} = Object.assign(
  async (input?: any) => {
    const client = input?.client ?? activeClient
    if (input?.client) {
      activeClient = input.client
    }
    const directory = input?.directory
    const logDir = getLogDir()
    pruneOldLogs(logDir)

    return {
      tool: {
        background_run: tool({
          description:
            // Agent-facing background_status reference removed while that tool is
            // temporarily disabled: "background_status is not for polling: use it
            // only to check up on the job after doing other work; if the job is
            // still running and you have no other work, END YOUR TURN and wait for
            // the notification."
            "Spawns a shell command in the background within an isolated process group and streams logs to ~/.opencode/logs/<command_id>.log. Use this tool ONLY fire-and-forget: after the call returns, END YOUR TURN (or continue unrelated work) — never wait on the command with a synchronous shell command, and never spawn a second shell to cat/tail/poll the log file. If you need to block until a command finishes or poll it repeatedly, use the bash tool instead — do NOT use background_run for that. The plugin wakes you up automatically: notifications are pushed into the conversation as [System Notification: Background Command ...] messages and reflect machine output. In 'on_completion' mode (default) you are woken once when the command exits — use for CI checks (e.g. gh pr checks --watch), builds, or migrations. In 'monitor' mode you are additionally woken with batched progress updates of new matching output every `interval` seconds — use for dev servers, watch runners, or long logs where you want to steer early. If you have nothing else to do, simply stop; the notification resumes you. If the job is still running and you have no other work, END YOUR TURN and wait for the notification.",
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
            if (!isInteractiveSession()) {
              throw new Error("Background commands are only supported in interactive sessions.")
            }

            if (typeof args?.command !== "string" || !args.command.trim()) {
              throw new Error("Parameter 'command' is required and must be a non-empty string.")
            }

            const sessionID = context?.sessionID ?? "default"

            if (await isSubagentSession(client, sessionID)) {
              throw new Error(
                "Background commands are not supported in subagent sessions: a subagent exits while waiting and never receives the completion notification, so it would report the job as exited while it is still running. Run this command in the main session, or use the bash tool.",
              )
            }

            const mode = args.mode ?? "on_completion"
            const interval = typeof args.interval === "number" ? Math.max(10, args.interval) : 20
            const lines = typeof args.lines === "number" ? Math.max(0, Math.min(100, args.lines)) : 20
            const timeout = typeof args.timeout === "number" && args.timeout > 0 ? args.timeout : undefined

            const resolvedWorkdir = args.workdir
              ? path.resolve(context?.directory ?? directory ?? process.cwd(), args.workdir)
              : (context?.directory ?? directory ?? process.cwd())

            try {
              const stat = fs.statSync(resolvedWorkdir)
              if (!stat.isDirectory()) {
                throw new Error(`Working directory does not exist or is not a directory: ${resolvedWorkdir}`)
              }
            } catch (err: any) {
              throw new Error(`Working directory does not exist or is not a directory: ${resolvedWorkdir}`)
            }

            let regexPattern: RegExp | undefined
            if (args.pattern) {
              try {
                regexPattern = new RegExp(args.pattern)
              } catch (err: any) {
                throw new Error(`Invalid regular expression pattern: ${args.pattern} (${err.message})`)
              }
            }

            if (typeof context?.ask === "function") {
              await context.ask({
                permission: "bash",
                patterns: [args.command],
                always: [args.command],
                metadata: { command: args.command },
              })
            }

            getOrCreateSessionQueue(sessionID)

            const timestamp = Math.floor(Date.now() / 1000)
            const command_id = `bg-${timestamp}-${++commandCounter}`
            const logPath = path.join(logDir, `${command_id}.log`)

            const logFd = fs.openSync(logPath, "w", 0o600)

            const child = child_process.spawn(args.command, {
              shell: true,
              detached: true,
              cwd: resolvedWorkdir,
              stdio: ["ignore", logFd, logFd],
            })

            fs.closeSync(logFd)

            const pgid = child.pid ?? 0
            if (typeof child.unref === "function") {
              child.unref()
            }

            const record: CommandRecord = {
              command_id,
              sessionID,
              command: args.command,
              workdir: resolvedWorkdir,
              pgid,
              logPath,
              mode,
              interval,
              pattern: regexPattern,
              lines,
              timeout,
              status: "running",
              exitCode: null,
              lastReadOffset: 0,
              stoppedByUser: false,
              childProcess: child,
            }

            commandRegistry.set(command_id, record)

            child.on("error", (err) => {
              if (record.stoppedByUser) return
              record.status = "failed"
              record.exitCode = 1
              clearRecordTimers(record)
              enqueueEvent(
                sessionID,
                {
                  type: "failed",
                  command_id,
                  command: args.command,
                  status: "failed",
                  exitCode: 1,
                  logPath,
                  lines,
                  preview: `Spawn error: ${err.message}`,
                  truncated: false,
                },
                client,
              )
            })

            child.on("close", (code, signal) => {
              if (record.stoppedByUser) return
              if (record.status !== "running") return
              if (record.sigkillTimer) {
                clearTimeout(record.sigkillTimer)
                record.sigkillTimer = undefined
              }

              clearRecordTimers(record)
              const isSuccess = code === 0
              const finalStatus = isSuccess ? "completed" : "failed"
              record.status = finalStatus
              record.exitCode = code !== null ? code : signal ? 128 : 1

              const previewData = readTailPreview(logPath, lines, MAX_OUTPUT_CHARS)
              enqueueEvent(
                sessionID,
                {
                  type: finalStatus,
                  command_id,
                  command: args.command,
                  status: finalStatus,
                  exitCode: record.exitCode,
                  logPath,
                  lines,
                  preview: previewData.text,
                  truncated: previewData.truncated,
                  totalLines: previewData.totalLines,
                },
                client,
              )
            })

            if (timeout && timeout > 0) {
              record.timeoutTimer = setTimeout(() => {
                if (record.status !== "running") return
                record.status = "timed_out"
                record.exitCode = null
                clearRecordTimers(record)
                record.sigkillTimer = terminateProcessGroup(pgid, 2000)

                const previewData = readTailPreview(logPath, lines, MAX_OUTPUT_CHARS)
                enqueueEvent(
                  sessionID,
                  {
                    type: "timed_out",
                    command_id,
                    command: args.command,
                    status: "timed_out",
                    exitCode: null,
                    logPath,
                    lines,
                    preview: previewData.text,
                    truncated: previewData.truncated,
                    timeoutMs: timeout,
                    totalLines: previewData.totalLines,
                  },
                  client,
                )
              }, timeout)

              if (typeof record.timeoutTimer.unref === "function") {
                record.timeoutTimer.unref()
              }
            }

            if (mode === "monitor") {
              record.monitorTimer = setInterval(() => {
                if (record.status !== "running") return
                const slice = readLogSlice(logPath, record.lastReadOffset, lines, MAX_OUTPUT_CHARS, regexPattern)
                record.lastReadOffset = slice.newOffset
                if (slice.text && (slice.matchedLines > 0 || !regexPattern)) {
                  enqueueEvent(
                    sessionID,
                    {
                      type: "progress",
                      command_id,
                      command: args.command,
                      status: "running",
                      exitCode: null,
                      logPath,
                      lines,
                      preview: slice.text,
                      truncated: false,
                    },
                    client,
                  )
                }
              }, interval * 1000)

              if (typeof record.monitorTimer.unref === "function") {
                record.monitorTimer.unref()
              }
            }

            const payload = {
              command_id,
              status: "running",
              workdir: resolvedWorkdir,
              log_path: logPath,
              initial_output: "",
            }
            return {
              output: JSON.stringify(payload, null, 2),
              metadata: payload,
            }
          },
        }),

        // DISABLED (temporary experiment): background_status was removed from the
        // tool list because agents over-used it against its own instructions.
        // Code kept here so it can be re-enabled by un-commenting.
        // background_status: tool({
        //   description:
        //     "Inspects the live status ('running', 'completed', 'failed', 'timed_out', 'stopped'), exit code, log file path, and recent output preview for an active or finished background command by command_id. This is a check-up tool, NOT a polling tool: call it only when you have done other work and want a quick look at the job; each call discards the job's queued notifications so you will not be re-woken with information you already have. If the job is still running and you have no more other work, END YOUR TURN and wait for the [System Notification: Background Command ...] update — do NOT call this repeatedly to wait for completion (to block or poll, use the bash tool), and never read the log file with shell commands.",
        //   args: {
        //     command_id: {
        //       type: "string",
        //       description: "The handle of the background command to inspect.",
        //     },
        //     lines: {
        //       type: "integer",
        //       minimum: 0,
        //       maximum: 100,
        //       default: 20,
        //       description:
        //         "Number of most recent lines to return from the log (default: 20, min: 0, max: 100). Always capped at 10,000 characters, keeping the most recent output. Pass 0 to omit output (returns empty string).",
        //     },
        //   },
        //   async execute(args: any, context: any) {
        //     const sessionID = context?.sessionID ?? "default"
        //     const lines = typeof args?.lines === "number" ? Math.max(0, Math.min(100, args.lines)) : 20
        //     const record = commandRegistry.get(args.command_id)
        //
        //     if (!record || record.sessionID !== sessionID) {
        //       throw new Error(`command_id_not_found: Handle '${args.command_id}' does not exist or belongs to another session.`)
        //     }
        //
        //     // The agent now has first-hand status/output for this job; drop any
        //     // queued notifications for it so it is not re-woken with duplicates.
        //     discardQueuedEvents(sessionID, record.command_id)
        //
        //     const preview = readTailPreview(record.logPath, lines, MAX_OUTPUT_CHARS)
        //
        //     const payload = {
        //       command_id: record.command_id,
        //       status: record.status,
        //       exit_code: record.exitCode,
        //       log_path: record.logPath,
        //       recent_output: preview.text,
        //       truncated: preview.truncated,
        //     }
        //     return {
        //       output: JSON.stringify(payload, null, 2),
        //       metadata: payload,
        //     }
        //   },
        // }),

        background_stop: tool({
          description:
            "Terminates a running background command and its spawned process group (SIGTERM escalating to SIGKILL) and suppresses asynchronous completion notices — after stopping, you will not be woken again for this command. Calling on an already finished command is idempotent and returns its recorded terminal status.",
          args: {
            command_id: {
              type: "string",
              description: "The handle of the command to terminate.",
            },
          },
          async execute(args: any, context: any) {
            const sessionID = context?.sessionID ?? "default"
            const record = commandRegistry.get(args.command_id)

            if (!record || record.sessionID !== sessionID) {
              throw new Error(`command_id_not_found: Handle '${args.command_id}' does not exist or belongs to another session.`)
            }

            if (record.status !== "running") {
              const payload = {
                command_id: record.command_id,
                status: record.status,
                message: "Process is already terminated.",
              }
              return {
                output: JSON.stringify(payload, null, 2),
                metadata: payload,
              }
            }

            record.stoppedByUser = true
            record.status = "stopped"
            clearRecordTimers(record)

            // Purge any pending notifications for this command
            discardQueuedEvents(sessionID, args.command_id)

            terminateProcessGroup(record.pgid, 2000)

            const payload = {
              command_id: record.command_id,
              status: "stopped",
              message: "Process group terminated successfully.",
            }
            return {
              output: JSON.stringify(payload, null, 2),
              metadata: payload,
            }
          },
        }),
      },

      event: async (input: any) => {
        const eventType = input?.event?.type
        const props = input?.event?.properties

        if (eventType === "session.idle") {
          const sessionID = props?.sessionID
          if (sessionID) {
            const queue = getOrCreateSessionQueue(sessionID)
            queue.isIdle = true
            await flushSessionQueue(sessionID, client)
          }
        } else if (eventType === "session.status") {
          const sessionID = props?.sessionID
          const statusType = props?.status?.type
          if (sessionID) {
            const queue = getOrCreateSessionQueue(sessionID)
            if (statusType === "idle") {
              queue.isIdle = true
              await flushSessionQueue(sessionID, client)
            } else if (statusType === "busy") {
              queue.isIdle = false
            }
          }
        } else if (eventType === "session.deleted") {
          const sessionID = props?.info?.id ?? props?.sessionID
          if (sessionID) {
            for (const [cmdId, rec] of commandRegistry.entries()) {
              if (rec.sessionID === sessionID) {
                clearRecordTimers(rec)
                if (rec.status === "running") {
                  terminateProcessGroup(rec.pgid, 2000)
                  rec.status = "stopped"
                }
                commandRegistry.delete(cmdId)
              }
            }
            const queue = sessionQueues.get(sessionID)
            if (queue?.debounceTimer) {
              clearTimeout(queue.debounceTimer)
            }
            sessionQueues.delete(sessionID)
          }
        }
      },

      dispose: async () => {
        cleanupAllCommands()
      },
    }
  },
  {
    getCommandRegistry: () => commandRegistry,
    getSessionQueues: () => sessionQueues,
    pruneOldLogs,
    isInteractiveSession,
    isSubagentSession,
    terminateProcessGroup,
    readLogSlice,
    readTailPreview,
    formatSingleEvent,
    formatBatchedEvents,
    getOrCreateSessionQueue,
    flushSessionQueue,
    enqueueEvent,
    cleanupAllCommands,
  },
)

export default BackgroundCommandsPlugin
