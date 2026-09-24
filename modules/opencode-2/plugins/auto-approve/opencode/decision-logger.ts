import type { PolicyEvaluation } from '../domain/types.ts';

const LOG_SERVICE = 'dc-auto-approve';

type DecisionOutcome = 'approved' | 'asked' | 'failed';
type LogLevel = 'debug' | 'error' | 'info' | 'warn';

function outcomeOf(decision: PolicyEvaluation): DecisionOutcome {
  if (decision.action === 'approve') {
    return 'approved';
  }
  return decision.error === undefined ? 'asked' : 'failed';
}

// One entry per outcome. A failed model call (bad key, outage, timeout) is a
// `warn` so it can't hide among normal asks; `error` comes from the upstream
// failure, never from request content, so it's safe to log.
const LOG_ENTRIES: Record<
  DecisionOutcome,
  {
    readonly level: LogLevel;
    readonly message: (tool: string, decision: PolicyEvaluation) => string;
  }
> = {
  approved: { level: 'info', message: (tool) => `Auto-approved ${tool}` },
  asked: {
    level: 'debug',
    message: (tool, { action }) => `Left as ask (${action}): ${tool}`,
  },
  failed: {
    level: 'warn',
    message: (tool, { error }) =>
      `Left as ask, model call failed (${error}): ${tool}`,
  },
};

function toLogEntry(
  decision: PolicyEvaluation,
  tool: string,
): { level: LogLevel; message: string } {
  const entry = LOG_ENTRIES[outcomeOf(decision)];
  return { level: entry.level, message: entry.message(tool, decision) };
}

/**
 * Best-effort report of a permission decision. OpenCode 2's plugin context has
 * no structured app.log endpoint (the v1 client did), so this logs to the
 * console, which lands in OpenCode's own server log
 * (~/.local/share/opencode/log/opencode.log). Never throws -- a logging
 * failure must never affect the actual approve/ask outcome.
 */
export function logDecision(
  decision: PolicyEvaluation,
  tool: string,
  permissionId: string | undefined,
  sessionID: string,
): void {
  const { level, message } = toLogEntry(decision, tool);

  // Deliberately excludes the raw command/filePath and model reason: they can
  // carry tokens, credentials, or other untrusted request content that
  // shouldn't land in OpenCode's own logs (CWE-532).
  const extra = {
    confidence: decision.confidence,
    permissionId: permissionId ?? 'unknown',
    sessionID,
    tool,
  };

  try {
    const line = `[${LOG_SERVICE}] ${message} ${JSON.stringify(extra)}`;
    if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  } catch {
    // Logging is best-effort; a broken log sink must never surface as a
    // permission-evaluation failure.
  }
}