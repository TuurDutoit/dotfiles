import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import {
  BackgroundCommandsPlugin,
  commandRegistry,
  sessionQueues,
  cleanupAllCommands,
  readLogSlice,
  readTailPreview,
  formatSingleEvent,
  formatBatchedEvents,
  pruneOldLogs,
  terminateProcessGroup,
  isInteractiveSession,
  getOrCreateSessionQueue,
  enqueueEvent,
  flushSessionQueue,
  type NotificationEvent,
} from "../modules/opencode/plugins/background-commands.ts"

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

test.beforeEach(() => {
  cleanupAllCommands()
  delete process.env.OPENCODE_RUN
})

test.afterEach(() => {
  cleanupAllCommands()
  delete process.env.OPENCODE_RUN
})

test("Schema and Argument Validation", async (t) => {
  const mockClient = {
    session: {
      promptAsync: async () => {},
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: mockClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const { background_run } = plugin.tool!

  await t.test("Rejects non-interactive session (OPENCODE_RUN=1)", async () => {
    process.env.OPENCODE_RUN = "1"
    assert.equal(isInteractiveSession(), false)

    await assert.rejects(
      async () => {
        await background_run.execute(
          { command: "echo test", mode: "on_completion", interval: 20, lines: 20 },
          { sessionID: "s1", directory: process.cwd(), ask: async () => {} } as any,
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
          { sessionID: "s1", directory: process.cwd(), ask: async () => {} } as any,
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
          { sessionID: "s1", directory: process.cwd(), ask: async () => {} } as any,
        )
      },
      (err: any) => {
        return err.message.includes("Invalid regular expression pattern: [unclosed-bracket")
      },
    )
  })

  await t.test("Validates JSON schema bounds on args", () => {
    const { args } = background_run
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

test("Permission Check Hook Integration", async () => {
  let askCalled = false
  let askedPermission = ""
  let askedCommand = ""

  const mockClient = {
    session: {
      promptAsync: async () => {},
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: mockClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const { background_run } = plugin.tool!

  const mockContext = {
    sessionID: "session-perm-1",
    directory: process.cwd(),
    ask: async (req: any) => {
      askCalled = true
      askedPermission = req.permission
      askedCommand = req.metadata.command
    },
  }

  const res = await background_run.execute(
    { command: "echo perm-test", mode: "on_completion", interval: 20, lines: 20 },
    mockContext as any,
  )

  assert.equal(askCalled, true)
  assert.equal(askedPermission, "bash")
  assert.equal(askedCommand, "echo perm-test")
  assert.ok(res.command_id.startsWith("bg-"))
  assert.equal(res.status, "running")

  // Test permission rejection
  const denyingContext = {
    sessionID: "session-perm-2",
    directory: process.cwd(),
    ask: async () => {
      throw new Error("Permission denied by user")
    },
  }

  await assert.rejects(
    async () => {
      await background_run.execute(
        { command: "echo should-not-run", mode: "on_completion", interval: 20, lines: 20 },
        denyingContext as any,
      )
    },
    { message: "Permission denied by user" },
  )
})

test("Process Lifecycle & Log Isolation", async () => {
  const dispatchedPrompts: string[] = []
  const mockClient = {
    session: {
      promptAsync: async (req: any) => {
        dispatchedPrompts.push(req.body.parts[0].text)
      },
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: mockClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const { background_run, background_status } = plugin.tool!

  // 1. Success lifecycle (exit 0)
  const sessionID = "session-lifecycle"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true // enable immediate flush on exit

  const runRes = await background_run.execute(
    { command: 'echo "hello background" && echo "second line"', mode: "on_completion", interval: 20, lines: 20 },
    { sessionID, directory: process.cwd(), ask: async () => {} } as any,
  )

  assert.ok(runRes.command_id.startsWith("bg-"))
  assert.equal(runRes.status, "running")
  assert.ok(fs.existsSync(runRes.log_path))

  // Verify file permissions (0600)
  const stat = fs.statSync(runRes.log_path)
  assert.equal((stat.mode & 0o777), 0o600)

  // Wait for process to complete
  await waitFor(() => {
    const record = commandRegistry.get(runRes.command_id)
    return record?.status === "completed"
  })

  const record = commandRegistry.get(runRes.command_id)!
  assert.equal(record.status, "completed")
  assert.equal(record.exitCode, 0)

  // Verify notification delivery
  await waitFor(() => dispatchedPrompts.length > 0)
  assert.ok(dispatchedPrompts[0].includes("[System Notification: Background Command " + runRes.command_id + "]"))
  assert.ok(dispatchedPrompts[0].includes("Status: completed (exit code 0)"))
  assert.ok(dispatchedPrompts[0].includes("hello background"))
  assert.ok(dispatchedPrompts[0].includes("Notice: This message was generated automatically"))

  // 2. Failure lifecycle (non-zero exit)
  const failRes = await background_run.execute(
    { command: 'echo "failing now" >&2 && exit 42', mode: "on_completion", interval: 20, lines: 20 },
    { sessionID, directory: process.cwd(), ask: async () => {} } as any,
  )

  await waitFor(() => {
    const rec = commandRegistry.get(failRes.command_id)
    return rec?.status === "failed"
  })

  const failRecord = commandRegistry.get(failRes.command_id)!
  assert.equal(failRecord.status, "failed")
  assert.equal(failRecord.exitCode, 42)

  await waitFor(() => dispatchedPrompts.length >= 2)
  assert.ok(dispatchedPrompts[1].includes("Status: failed (exit code 42)"))
  assert.ok(dispatchedPrompts[1].includes("failing now"))
})

test("Timeout Handling", async () => {
  const dispatchedPrompts: string[] = []
  const mockClient = {
    session: {
      promptAsync: async (req: any) => {
        dispatchedPrompts.push(req.body.parts[0].text)
      },
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: mockClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const { background_run } = plugin.tool!
  const sessionID = "session-timeout"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true

  const runRes = await background_run.execute(
    { command: "sleep 10", mode: "on_completion", interval: 20, lines: 20, timeout: 200 },
    { sessionID, directory: process.cwd(), ask: async () => {} } as any,
  )

  await waitFor(() => {
    const record = commandRegistry.get(runRes.command_id)
    return record?.status === "timed_out"
  }, 3000)

  const record = commandRegistry.get(runRes.command_id)!
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

test("Status Inspection & Session Isolation", async () => {
  const mockClient = {
    session: {
      promptAsync: async () => {},
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: mockClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const { background_run, background_status } = plugin.tool!

  const res = await background_run.execute(
    { command: 'echo "status test line 1" && echo "status test line 2"', mode: "on_completion", interval: 20, lines: 20 },
    { sessionID: "session-alpha", directory: process.cwd(), ask: async () => {} } as any,
  )

  await waitFor(() => {
    const rec = commandRegistry.get(res.command_id)
    return rec?.status === "completed"
  })

  // Same session status inspection
  const statusRes = await background_status.execute(
    { command_id: res.command_id, lines: 10 },
    { sessionID: "session-alpha" } as any,
  )

  assert.equal(statusRes.command_id, res.command_id)
  assert.equal(statusRes.status, "completed")
  assert.equal(statusRes.exit_code, 0)
  assert.ok(statusRes.recent_output.includes("status test line 1"))

  // lines: 0 inspection
  const statusZero = await background_status.execute(
    { command_id: res.command_id, lines: 0 },
    { sessionID: "session-alpha" } as any,
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

test("Manual Stop & Idempotency", async () => {
  const dispatchedPrompts: string[] = []
  const mockClient = {
    session: {
      promptAsync: async (req: any) => {
        dispatchedPrompts.push(req.body.parts[0].text)
      },
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: mockClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const { background_run, background_stop, background_status } = plugin.tool!

  const sessionID = "session-stop"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true

  const runRes = await background_run.execute(
    { command: "sleep 60", mode: "on_completion", interval: 20, lines: 20 },
    { sessionID, directory: process.cwd(), ask: async () => {} } as any,
  )

  // Terminate running command
  const stopRes = await background_stop.execute(
    { command_id: runRes.command_id },
    { sessionID } as any,
  )

  assert.equal(stopRes.command_id, runRes.command_id)
  assert.equal(stopRes.status, "stopped")

  const record = commandRegistry.get(runRes.command_id)!
  assert.equal(record.status, "stopped")
  assert.equal(record.stoppedByUser, true)

  // Verify subsequent stop is idempotent
  const secondStop = await background_stop.execute(
    { command_id: runRes.command_id },
    { sessionID } as any,
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
  const dispatchedPrompts: string[] = []
  const mockClient = {
    session: {
      promptAsync: async (req: any) => {
        dispatchedPrompts.push(req.body.parts[0].text)
      },
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: mockClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

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
    mockClient,
  )

  // Nothing dispatched yet while busy
  assert.equal(dispatchedPrompts.length, 0)

  // Emit session.status (busy) -> still nothing
  await plugin.event!({
    event: { type: "session.status", properties: { sessionID, status: { type: "busy" } } } as any,
  })
  assert.equal(dispatchedPrompts.length, 0)

  // Emit session.status (idle) -> triggers queue flush
  await plugin.event!({
    event: { type: "session.status", properties: { sessionID, status: { type: "idle" } } } as any,
  })
  assert.equal(dispatchedPrompts.length, 1)
  assert.ok(dispatchedPrompts[0].includes("Test running..."))

  // Test session.deleted cleanup
  const { background_run } = plugin.tool!
  const runRes = await background_run.execute(
    { command: "sleep 30", mode: "on_completion", interval: 20, lines: 20 },
    { sessionID, directory: process.cwd(), ask: async () => {} } as any,
  )

  assert.equal(commandRegistry.has(runRes.command_id), true)

  await plugin.event!({
    event: { type: "session.deleted", properties: { info: { id: sessionID } } } as any,
  })

  assert.equal(commandRegistry.has(runRes.command_id), false)
  assert.equal(sessionQueues.has(sessionID), false)
})

test("Resilience to promptAsync transient dispatch errors", async () => {
  const failingClient = {
    session: {
      promptAsync: async () => {
        throw new Error("Transient network error")
      },
    },
  }

  const plugin = await BackgroundCommandsPlugin({
    client: failingClient as any,
    directory: process.cwd(),
    project: {} as any,
    worktree: process.cwd(),
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const { background_run } = plugin.tool!
  const sessionID = "session-transient-err"
  const queue = getOrCreateSessionQueue(sessionID)
  queue.isIdle = true

  const runRes = await background_run.execute(
    { command: "sleep 5", mode: "on_completion", interval: 20, lines: 20 },
    { sessionID, directory: process.cwd(), ask: async () => {} } as any,
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
    failingClient,
  )

  await new Promise((r) => setTimeout(r, 50))

  // Process should still be registered and running, not terminated
  const record = commandRegistry.get(runRes.command_id)
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
