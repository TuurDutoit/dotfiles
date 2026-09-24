import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import plugin, {
  enqueueEvent,
  formatBatchedEvents,
  formatSingleEvent,
  getCommandRegistry,
  getOrCreateSessionQueue,
  getSessionQueues,
  handleEvent,
  isInteractiveSession,
  pruneOldLogs,
  readLogSlice,
  readTailPreview,
  cleanupAllCommands,
  type NotificationEvent,
} from "../modules/opencode-2/plugins/background-commands.ts"

// Instantiate the plugin the way OpenCode 2 does: run setup() against a mock
// plugin context and capture the tools it registers via ctx.tool.transform.
async function loadPlugin(opts: { sessionGet?: any; prompt?: any } = {}): Promise<{
  ctx: any
  registered: Map<string, any>
  dispatchedPrompts: string[]
}> {
  const dispatchedPrompts: string[] = []
  const registered = new Map<string, any>()
  const ctx: any = {
    tool: {
      transform: async (cb: any) =>
        cb({
          add: (t: any) => registered.set(t.name, t),
          list: () => Array.from(registered.values()),
          get: (id: string) => registered.get(id),
        }),
    },
    event: {
      // Tests drive events directly through handleEvent; subscribe yields nothing.
      subscribe: async function* () {},
    },
    session: {
      get:
        opts.sessionGet ??
        (async ({ sessionID }: any) => ({
          id: sessionID,
          location: { directory: process.cwd() },
        })),
      prompt:
        opts.prompt ??
        (async (input: any) => {
          dispatchedPrompts.push(input.text)
        }),
    },
    location: { directory: process.cwd(), project: { id: "test" } },
  }
  await (plugin as any).setup(ctx)
  return { ctx, registered, dispatchedPrompts }
}

// Helper to wait for a condition
async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 50,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`)
}

function parseResult(res: any): any {
  if (res?.metadata) return res.metadata
  if (typeof res === "string") {
    try {
      return JSON.parse(res)
    } catch {
      return res
    }
  }
  if (res?.output) {
    try {
      return JSON.parse(res.output)
    } catch {
      return res.output
    }
  }
  return res
}

test.beforeEach(() => {
  cleanupAllCommands()
  delete process.env.OPENCODE_RUN
})

test.afterEach(() => {
  cleanupAllCommands()
  delete process.env.OPENCODE_RUN
})

test("Schema and Argument Validation", async (t) => {
  const { registered } = await loadPlugin()
  const background_run = registered.get("background_run")

  await t.test("Rejects non-interactive session (OPENCODE_RUN=1)", async () => {
    process.env.OPENCODE_RUN = "1"
    assert.equal(isInteractiveSession(), false)

    await assert.rejects(
      async () => {
        await background_run.execute(
          { command: "echo test", mode: "on_completion", interval: 20, lines: 20 },
          { sessionID: "s1" } as any,
        )
      },
      {
        message: "Background commands are only supported in interactive sessions.",
      },
    )
  })

  await t.test("Rejects non-existent working directory", async () => {
    const invalidDir = path.join(os.tmpdir(), "non-existent-dir-" + Date.now())
    await assert.rejects(
      async () => {
        await background_run.execute(
          { command: "echo test", mode: "on_completion", interval: 20, lines: 20, workdir: invalidDir },
          { sessionID: "s1" } as any,
        )
      },
      (err: any) => {
        return err.message.includes("Working directory does not exist or is not a directory")
      },
    )
  })

  await t.test("Rejects malformed regex pattern", async () => {
    await assert.rejects(
      async () => {
        await background_run.execute(
          { command: "echo test", mode: "monitor", interval: 20, lines: 20, pattern: "[unclosed-bracket" },
          { sessionID: "s1" } as any,
        )
      },
      (err: any) => {
        return err.message.includes("Invalid regular expression pattern: [unclosed-bracket")
      },
    )
  })

  await t.test("Validates JSON schema bounds on args", () => {
    const { input } = background_run
    const { properties: args } = input
    assert.equal(args.command.type, "string")
    assert.equal(args.mode.type, "string")
    assert.deepEqual(args.mode.enum, ["on_completion", "monitor"])
    assert.equal(args.interval.type, "integer")
    assert.equal(args.interval.minimum, 10)
    assert.equal(args.lines.type, "integer")
    assert.equal(args.lines.minimum, 0)
    assert.equal(args.lines.maximum, 100)
  })
})

// V1 -> V2: the v1 tool context exposed an ask() hook that routed background
// commands through the bash permission flow. The v2 tool context has no such
// hook; approval for these tools is configured via permission rules instead
// (see modules/opencode-2/opencode.jsonc), so the permission hook test no
// longer applies.

test("Process Lifecycle & Log Isolation", async () => {
  const { ctx, registered, dispatchedPrompts } = await loadPlugin()

  // background_status destructuring removed while the tool is disabled
  const background_run = registered.get("background_run")

  // 1. Success lifecycle (exit 0)
  const sessionID = "session-lifecycle"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true // enable immediate flush on exit

  const runRes = parseResult(
    await background_run.execute(
      { command: 'echo "hello background" && echo "second line"', mode: "on_completion", interval: 20, lines: 20 },
      { sessionID } as any,
    ),
  )

  assert.ok(runRes.command_id.startsWith("bg-"))
  assert.equal(runRes.status, "running")
  assert.ok(fs.existsSync(runRes.log_path))

  // Verify file permissions (0600)
  const stat = fs.statSync(runRes.log_path)
  assert.equal((stat.mode & 0o777), 0o600)

  // Wait for process to complete
  await waitFor(() => {
    const record = getCommandRegistry().get(runRes.command_id)
    return record?.status === "completed"
  })

  const record = getCommandRegistry().get(runRes.command_id)!
  assert.equal(record.status, "completed")
  assert.equal(record.exitCode, 0)

  // Verify notification delivery
  await waitFor(() => dispatchedPrompts.length > 0)
  assert.ok(dispatchedPrompts[0].includes("[System Notification: Background Command " + runRes.command_id + "]"))
  assert.ok(dispatchedPrompts[0].includes("Status: completed (exit code 0)"))
  assert.ok(dispatchedPrompts[0].includes("hello background"))
  assert.ok(dispatchedPrompts[0].includes("Notice: This message was generated automatically"))

  // 2. Failure lifecycle (non-zero exit)
  const failRes = parseResult(
    await background_run.execute(
      { command: 'echo "failing now" >&2 && exit 42', mode: "on_completion", interval: 20, lines: 20 },
      { sessionID } as any,
    ),
  )

  await waitFor(() => {
    const rec = getCommandRegistry().get(failRes.command_id)
    return rec?.status === "failed"
  })

  const failRecord = getCommandRegistry().get(failRes.command_id)!
  assert.equal(failRecord.status, "failed")
  assert.equal(failRecord.exitCode, 42)

  await waitFor(() => dispatchedPrompts.length >= 2)
  assert.ok(dispatchedPrompts[1].includes("Status: failed (exit code 42)"))
  assert.ok(dispatchedPrompts[1].includes("failing now"))
})

test("Timeout Handling", async () => {
  const { registered, dispatchedPrompts } = await loadPlugin()

  const background_run = registered.get("background_run")
  const sessionID = "session-timeout"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true

  const runRes = parseResult(
    await background_run.execute(
      { command: "sleep 10", mode: "on_completion", interval: 20, lines: 20, timeout: 200 },
      { sessionID } as any,
    ),
  )

  await waitFor(() => {
    const record = getCommandRegistry().get(runRes.command_id)
    return record?.status === "timed_out"
  }, 3000)

  const record = getCommandRegistry().get(runRes.command_id)!
  assert.equal(record.status, "timed_out")
  assert.equal(record.exitCode, null)

  await waitFor(() => dispatchedPrompts.length > 0)
  assert.ok(dispatchedPrompts[0].includes("Status: timed_out (exceeded timeout of 200ms)"))
})

test("Incremental Log Reader & Pattern Filtering", () => {
  const tmpFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`)

  fs.writeFileSync(tmpFile, "line 1\nline 2\npartial line", "utf-8")

  // Read slice from 0: should read only up to 'line 2\n' (preserving 'partial line')
  const slice1 = readLogSlice(tmpFile, 0, 20, 10000)
  assert.equal(slice1.text, "line 1\nline 2")
  assert.equal(slice1.matchedLines, 2)
  assert.equal(slice1.totalNewLines, 2)

  // Append complete line
  fs.appendFileSync(tmpFile, " completed\nline 3 [MATCH]\nline 4\n", "utf-8")

  // Read slice from slice1.newOffset:
  const slice2 = readLogSlice(tmpFile, slice1.newOffset, 20, 10000)
  assert.equal(slice2.text, "partial line completed\nline 3 [MATCH]\nline 4")

  // Pattern filter test
  const patternSlice = readLogSlice(tmpFile, 0, 20, 10000, /\[MATCH\]/)
  assert.equal(patternSlice.text, "line 3 [MATCH]")
  assert.equal(patternSlice.matchedLines, 1)

  fs.unlinkSync(tmpFile)
})

test("Tail Preview & Truncation", () => {
  const tmpFile = path.join(os.tmpdir(), `test-tail-${Date.now()}.log`)

  const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`)
  fs.writeFileSync(tmpFile, lines.join("\n") + "\n", "utf-8")

  const preview = readTailPreview(tmpFile, 10, 10000)
  assert.equal(preview.totalLines, 50)
  assert.equal(preview.truncated, true)
  assert.equal(preview.text.split("\n").length, 10)
  assert.equal(preview.text.split("\n")[0], "Line 41")
  assert.equal(preview.text.split("\n")[9], "Line 50")

  // lines: 0 returns empty
  const previewZero = readTailPreview(tmpFile, 0, 10000)
  assert.equal(previewZero.text, "")
  assert.equal(previewZero.truncated, false)

  fs.unlinkSync(tmpFile)
})

// DISABLED (temporary experiment): background_status tool is unregistered, so
// these tests are commented out until it is re-enabled.
/*
test("Status Inspection & Session Isolation", async () => {
  const { registered } = await loadPlugin()
  const background_run = registered.get("background_run")
  const background_status = registered.get("background_status")

  const res = parseResult(
    await background_run.execute(
      { command: 'echo "status test line 1" && echo "status test line 2"', mode: "on_completion", interval: 20, lines: 20 },
      { sessionID: "session-alpha" } as any,
    ),
  )

  await waitFor(() => {
    const rec = getCommandRegistry().get(res.command_id)
    return rec?.status === "completed"
  })

  // Same session status inspection
  const statusRes = parseResult(
    await background_status.execute(
      { command_id: res.command_id, lines: 10 },
      { sessionID: "session-alpha" } as any,
    ),
  )

  assert.equal(statusRes.command_id, res.command_id)
  assert.equal(statusRes.status, "completed")
  assert.equal(statusRes.exit_code, 0)
  assert.ok(statusRes.recent_output.includes("status test line 1"))

  // lines: 0 inspection
  const statusZero = parseResult(
    await background_status.execute(
      { command_id: res.command_id, lines: 0 },
      { sessionID: "session-alpha" } as any,
    ),
  )
  assert.equal(statusZero.recent_output, "")

  // Foreign session inspection rejection (session isolation)
  await assert.rejects(
    async () => {
      await background_status.execute(
        { command_id: res.command_id, lines: 10 },
        { sessionID: "session-beta" } as any,
      )
    },
    (err: any) => err.message.includes("command_id_not_found"),
  )

  // Non-existent command_id rejection
  await assert.rejects(
    async () => {
      await background_status.execute(
        { command_id: "bg-non-existent", lines: 10 },
        { sessionID: "session-alpha" } as any,
      )
    },
    (err: any) => err.message.includes("command_id_not_found"),
  )
})
*/

test("Subagent Session Rejection", async () => {
  const { registered, dispatchedPrompts } = await loadPlugin({
    sessionGet: async ({ sessionID }: any) => {
      if (sessionID === "session-subagent") {
        return { id: sessionID, parentID: "session-parent", location: { directory: process.cwd() } }
      }
      if (sessionID === "session-main") {
        return { id: sessionID, location: { directory: process.cwd() } }
      }
      throw new Error("Session lookup failed")
    },
  })

  const background_run = registered.get("background_run")

  // Mark the main session idle so completion notifications flush immediately
  getOrCreateSessionQueue("session-main").isIdle = true

  // 1. Subagent session (parentID set) is rejected before spawning anything
  await assert.rejects(
    async () => {
      await background_run.execute(
        { command: "echo test", mode: "on_completion", interval: 20, lines: 20 },
        { sessionID: "session-subagent" } as any,
      )
    },
    (err: any) => err.message.includes("not supported in subagent sessions"),
  )
  assert.equal(getCommandRegistry().size, 0)

  // 2. Main session (no parentID) proceeds normally
  const runRes = parseResult(
    await background_run.execute(
      { command: "echo subagent-guard-ok", mode: "on_completion", interval: 20, lines: 20 },
      { sessionID: "session-main" } as any,
    ),
  )
  assert.ok(runRes.command_id.startsWith("bg-"))
  await waitFor(() => getCommandRegistry().get(runRes.command_id)?.status === "completed")
  await waitFor(() => dispatchedPrompts.some((p) => p.includes("subagent-guard-ok")))

  // 3. Session API failure fails open (never blocks the main session)
  const failOpenRes = parseResult(
    await background_run.execute(
      { command: "echo fail-open", mode: "on_completion", interval: 20, lines: 20 },
      { sessionID: "session-broken-api" } as any,
    ),
  )
  assert.ok(failOpenRes.command_id.startsWith("bg-"))
})

// DISABLED (temporary experiment): background_status tool is unregistered, so
// this test is commented out until it is re-enabled.
/*
test("background_status discards queued notifications for the queried job", async () => {
  const { ctx, registered, dispatchedPrompts } = await loadPlugin()
  const background_run = registered.get("background_run")
  const background_status = registered.get("background_status")

  const sessionID = "session-status-purge"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = false // simulate busy session: terminal events stay queued

  // Queue an unrelated job's notification first; it must survive the purge
  enqueueEvent(
    sessionID,
    {
      type: "progress",
      command_id: "bg-unrelated-1",
      command: "npm test",
      status: "running",
      exitCode: null,
      logPath: "/path/log",
      lines: 20,
      preview: "Unrelated job output",
      truncated: false,
    },
    ctx,
  )

  const runRes = parseResult(
    await background_run.execute(
      { command: 'echo "status purge test"', mode: "on_completion", interval: 20, lines: 20 },
      { sessionID } as any,
    ),
  )

  await waitFor(() => {
    const rec = getCommandRegistry().get(runRes.command_id)
    return rec?.status === "completed"
  })

  // Terminal event is queued for later delivery
  assert.equal(queue.items.some((item) => item.command_id === runRes.command_id), true)
  assert.equal(dispatchedPrompts.length, 0)

  // Agent checks the job's status directly
  const statusRes = parseResult(
    await background_status.execute(
      { command_id: runRes.command_id, lines: 5 },
      { sessionID } as any,
    ),
  )
  assert.equal(statusRes.status, "completed")

  // Queued notification for this job was discarded; the unrelated item survives
  assert.equal(queue.items.some((item) => item.command_id === runRes.command_id), false)
  assert.equal(queue.items.some((item) => item.command_id === "bg-unrelated-1"), true)

  // Going idle still flushes other jobs, but delivers nothing about the queried one
  await handleEvent(ctx, {
    type: "session.status",
    data: { sessionID, status: { type: "idle" } },
  })
  assert.equal(dispatchedPrompts.length, 1)
  assert.ok(dispatchedPrompts[0].includes("Unrelated job output"))
  assert.ok(!dispatchedPrompts[0].includes(runRes.command_id))
})
*/

test("Manual Stop & Idempotency", async () => {
  const { registered, dispatchedPrompts } = await loadPlugin()

  // background_status destructuring removed while the tool is disabled
  const background_run = registered.get("background_run")
  const background_stop = registered.get("background_stop")

  const sessionID = "session-stop"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true

  const runRes = parseResult(
    await background_run.execute(
      { command: "sleep 60", mode: "on_completion", interval: 20, lines: 20 },
      { sessionID } as any,
    ),
  )

  // Terminate running command
  const stopRes = parseResult(
    await background_stop.execute(
      { command_id: runRes.command_id },
      { sessionID } as any,
    ),
  )

  assert.equal(stopRes.command_id, runRes.command_id)
  assert.equal(stopRes.status, "stopped")

  const record = getCommandRegistry().get(runRes.command_id)!
  assert.equal(record.status, "stopped")
  assert.equal(record.stoppedByUser, true)

  // Verify subsequent stop is idempotent
  const secondStop = parseResult(
    await background_stop.execute(
      { command_id: runRes.command_id },
      { sessionID } as any,
    ),
  )
  assert.equal(secondStop.status, "stopped")

  // Wait a bit and verify no asynchronous completion notification was sent
  await new Promise((r) => setTimeout(r, 200))
  assert.equal(dispatchedPrompts.length, 0)

  // Foreign session stop rejection
  await assert.rejects(
    async () => {
      await background_stop.execute(
        { command_id: runRes.command_id },
        { sessionID: "other-session" } as any,
      )
    },
    (err: any) => err.message.includes("command_id_not_found"),
  )
})

test("Session Queue & Batched Notification Formatting", async () => {
  const event1: NotificationEvent = {
    type: "completed",
    command_id: "bg-100-1",
    command: "gh pr checks --watch",
    status: "completed",
    exitCode: 0,
    logPath: "/logs/bg-100-1.log",
    lines: 20,
    preview: "✓ All checks passed",
    truncated: false,
  }

  const event2: NotificationEvent = {
    type: "progress",
    command_id: "bg-100-2",
    command: "yarn test",
    status: "running",
    exitCode: null,
    logPath: "/logs/bg-100-2.log",
    lines: 20,
    preview: "PASS tests/unit/auth.test.ts",
    truncated: false,
  }

  // Single event formatting
  const singleFormatted = formatSingleEvent(event1)
  assert.ok(singleFormatted.includes("[System Notification: Background Command bg-100-1]"))
  assert.ok(singleFormatted.includes("Status: completed (exit code 0)"))
  assert.ok(singleFormatted.includes("✓ All checks passed"))

  // Progress formatting with lines: 0 omits output preview header
  const progressZero = formatSingleEvent({ ...event2, lines: 0, preview: "" })
  assert.ok(progressZero.includes("[System Notification: Background Command bg-100-2 (Progress)]"))
  assert.ok(!progressZero.includes("New output"))
  assert.ok(!progressZero.includes("preview"))

  // Multi-event batch formatting with --- separator
  const batchFormatted = formatBatchedEvents([event1, event2])
  assert.ok(batchFormatted.includes("[System Notification: Background Commands Update]"))
  assert.ok(batchFormatted.includes("### Command `bg-100-1` (`gh pr checks --watch`):"))
  assert.ok(batchFormatted.includes("---"))
  assert.ok(batchFormatted.includes("### Command `bg-100-2` (`yarn test`):"))
  assert.ok(batchFormatted.includes("Status: running (Progress update)"))
})

test("Session Lifecycle Events Handling", async () => {
  const { ctx, registered, dispatchedPrompts } = await loadPlugin()

  const sessionID = "session-events"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = false // simulate busy session

  // Enqueue a progress event while busy
  enqueueEvent(
    sessionID,
    {
      type: "progress",
      command_id: "bg-prog-1",
      command: "npm test",
      status: "running",
      exitCode: null,
      logPath: "/path/log",
      lines: 20,
      preview: "Test running...",
      truncated: false,
    },
    ctx,
  )

  // Nothing dispatched yet while busy
  assert.equal(dispatchedPrompts.length, 0)

  // Emit session.status (busy) -> still nothing
  await handleEvent(ctx, {
    type: "session.status",
    data: { sessionID, status: { type: "busy" } },
  })
  assert.equal(dispatchedPrompts.length, 0)

  // Emit session.status (idle) -> triggers queue flush
  await handleEvent(ctx, {
    type: "session.status",
    data: { sessionID, status: { type: "idle" } },
  })
  assert.equal(dispatchedPrompts.length, 1)
  assert.ok(dispatchedPrompts[0].includes("Test running..."))

  // Test session.deleted cleanup
  const background_run = registered.get("background_run")
  const runRes = parseResult(
    await background_run.execute(
      { command: "sleep 30", mode: "on_completion", interval: 20, lines: 20 },
      { sessionID } as any,
    ),
  )

  assert.equal(getCommandRegistry().has(runRes.command_id), true)

  await handleEvent(ctx, {
    type: "session.deleted",
    data: { sessionID },
  })

  assert.equal(getCommandRegistry().has(runRes.command_id), false)
  assert.equal(getSessionQueues().has(sessionID), false)
})

test("Resilience to transient session prompt dispatch errors", async () => {
  const { ctx, registered } = await loadPlugin({
    prompt: async () => {
      throw new Error("Transient network error")
    },
  })

  const background_run = registered.get("background_run")
  const sessionID = "session-transient-err"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true

  const runRes = parseResult(
    await background_run.execute(
      { command: "sleep 5", mode: "on_completion", interval: 20, lines: 20 },
      { sessionID } as any,
    ),
  )

  // Enqueue a progress event which triggers flush
  enqueueEvent(
    sessionID,
    {
      type: "progress",
      command_id: runRes.command_id,
      command: "sleep 5",
      status: "running",
      exitCode: null,
      logPath: runRes.log_path,
      lines: 20,
      preview: "progress",
      truncated: false,
    },
    ctx,
  )

  await new Promise((r) => setTimeout(r, 50))

  // Process should still be registered and running, not terminated
  const record = getCommandRegistry().get(runRes.command_id)
  assert.ok(record)
  assert.equal(record?.status, "running")
})

test("Old Logs Pruning (> 7 days)", () => {
  const tmpLogDir = path.join(os.tmpdir(), `test-prune-logs-${Date.now()}`)
  fs.mkdirSync(tmpLogDir, { recursive: true })

  const recentLog = path.join(tmpLogDir, "recent.log")
  const oldLog = path.join(tmpLogDir, "old.log")

  fs.writeFileSync(recentLog, "recent logs", "utf-8")
  fs.writeFileSync(oldLog, "old logs", "utf-8")

  // Backdate oldLog by 8 days
  const eightDaysAgo = (Date.now() - 8 * 24 * 60 * 60 * 1000) / 1000
  fs.utimesSync(oldLog, eightDaysAgo, eightDaysAgo)

  pruneOldLogs(tmpLogDir)

  assert.equal(fs.existsSync(recentLog), true)
  assert.equal(fs.existsSync(oldLog), false)

  fs.rmSync(tmpLogDir, { recursive: true, force: true })
})
