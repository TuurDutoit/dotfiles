import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

type OpenCodeAuthFile = {
  readonly openrouter?: {
    readonly key?: string;
    readonly type?: string;
  };
};

/**
 * Best-effort read of OpenCode's own stored OpenRouter credential. Never
 * throws and never logs the key; returns `undefined` on any failure so
 * callers fall through to the "no evaluator configured" safe default.
 */
export function resolveOpenCodeAuthApiKey(
  authFilePath?: string,
): string | undefined {
  try {
    const dataDir =
      process.env['XDG_DATA_HOME'] ?? join(homedir(), '.local', 'share');
    const path = authFilePath ?? join(dataDir, 'opencode', 'auth.json');
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as OpenCodeAuthFile;
    return parsed.openrouter?.type === 'api'
      ? parsed.openrouter.key
      : undefined;
  } catch {
    return undefined;
  }
}
