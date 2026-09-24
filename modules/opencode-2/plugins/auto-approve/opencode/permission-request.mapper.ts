import type { ConfirmationRequest } from '../domain/types.ts';

// Some environments wrap shell commands through a local proxy to reduce
// token usage (e.g. `rtk ls -la` instead of `ls -la`). Stripped once here so
// the rest of the pipeline judges the underlying command, not the wrapper.
const TRUSTED_PROXY_PREFIX = /^rtk\s+/;

// Tools where the request's resource (when there's no explicit
// `metadata.filePath`/`metadata.path`) is itself the target file path.
// V2 permission actions: read/edit/glob/grep carry the target path.
const FILE_PATH_TOOLS = new Set(['edit', 'glob', 'grep', 'read']);

/**
 * The request's shell command, if this event carries one: an explicit
 * `metadata.command` takes priority; otherwise the shell action's own
 * resource (the scanner-produced command string) IS the command.
 */
function resolveCommand(
  metadataCommand: unknown,
  tool: string,
  resource: string | undefined,
): string | undefined {
  if (typeof metadataCommand === 'string') {
    return metadataCommand;
  }
  return tool === 'bash' || tool === 'shell' ? resource : undefined;
}

/**
 * The request's target file path, if this event carries one: an explicit
 * `metadata.filePath`/`metadata.path` takes priority; otherwise a
 * `FILE_PATH_TOOLS` action's own resource IS the path.
 */
function resolveFilePath(
  metadataFilePath: unknown,
  tool: string,
  resource: string | undefined,
): string | undefined {
  if (typeof metadataFilePath === 'string') {
    return metadataFilePath;
  }
  return FILE_PATH_TOOLS.has(tool) ? resource : undefined;
}

/**
 * Maps an OpenCode 2 permission `evaluate` event onto this plugin's internal
 * `ConfirmationRequest` shape. V2 evaluates one action with a resource list
 * (vs the v1 `permission.asked` event's `permission`/`patterns` fields), so
 * the tool name is `event.action` and the joined resources play the role the
 * singular v1 `pattern` did.
 */
export function toConfirmationRequest(event: {
  readonly action: string;
  readonly resources?: ReadonlyArray<string>;
  readonly metadata?: Record<string, unknown> | undefined;
}): ConfirmationRequest {
  const tool = event.action;
  const resource = (event.resources ?? []).join(' ') || undefined;
  const metadata = event.metadata ?? {};

  const rawCommand = resolveCommand(metadata['command'], tool, resource);
  const command = rawCommand?.replace(TRUSTED_PROXY_PREFIX, '');
  const filePath = resolveFilePath(
    metadata['filePath'] ?? metadata['path'],
    tool,
    resource,
  );

  return {
    args: metadata,
    command,
    context: resource,
    filePath,
    tool,
  };
}