import type { Plugin } from "@opencode/plugin"

import { EvaluateConfirmationUseCase } from './application/use-cases/evaluate-confirmation.use-case.ts'
import type { UseCaseConfig } from './application/use-cases/evaluate-confirmation.use-case.ts'
import { DeterministicPolicyService } from './domain/services/deterministic-policy.service.ts'
import { resolveOpenCodeAuthApiKey } from './infrastructure/opencode/opencode-auth.ts'
import { OpenRouterEvaluatorAdapter } from './infrastructure/openrouter/openrouter-evaluator.adapter.ts'
import { logDecision } from './opencode/decision-logger.ts'
import { toConfirmationRequest } from './opencode/permission-request.mapper.ts'

/**
 * Vendored from datacamp-engineering/opencode-plugins (PR DP-2003,
 * @datacamp/opencode-auto-approve 0.2.0-beta.0) and adapted to the
 * OpenCode 2 plugin API. Upstream still ships the v1 plugin API; re-diff
 * against that repo when DP-2003 (or a v2 port) lands there.
 *
 * OpenCode 2 notes vs the v1 implementation:
 * - The v1 `event` hook filtering `permission.asked` events becomes
 *   `ctx.permission.hook("evaluate")`: the hook receives the live permission
 *   decision and can change `event.effect` directly, so no reply-endpoint
 *   call (the v1 client.postSessionIdPermissionsPermissionId call) is needed.
 * - The hook runs for both `allow` and `ask` outcomes; explicit configured
 *   denies never reach it. This plugin only ever elevates a pending `ask` to
 *   `allow` -- configured rules always stand, and already-allowed actions are
 *   skipped so no model calls are spent on them.
 * - v1's `client.app.log` is gone in v2: decision logging goes to the console,
 *   which lands in OpenCode's own server log.
 * - The project directory comes from the plugin location (v1 passed
 *   `input.directory`).
 */

export type PluginConfig = UseCaseConfig & {
  readonly apiKey?: string;
  readonly model?: string;
  /**
   * Falls back to the OpenRouter key OpenCode itself already stores after
   * `opencode auth login`, so the plugin works zero-config. Set to `false`
   * to require an explicit key instead.
   */
  readonly useOpenCodeAuth?: boolean;
  /**
   * When true (default), every decision is logged under the `dc-auto-approve`
   * service tag. Set to `false` to silence this.
   */
  readonly logDecisions?: boolean;
};

/** Shape of the v2 permission `evaluate` hook event this plugin touches. */
export type PermissionEvaluation = {
  readonly sessionID: string;
  readonly action: string;
  readonly resources?: ReadonlyArray<string>;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly source?: { readonly id?: string } | undefined;
  effect: 'allow' | 'ask' | 'deny';
  message?: string;
};

/**
 * Builds the `evaluate` callback: deterministic policy first, then the
 * Jev/OpenRouter evaluator for ambiguous requests, elevating safe `ask`
 * decisions to `allow`. Testable without a live server.
 */
export function createPermissionEvaluator(
  config: PluginConfig = {},
  project?: string,
): (event: PermissionEvaluation) => Promise<void> {
  const policyService = new DeterministicPolicyService();
  const apiKey =
    config.apiKey ??
    process.env['OPENROUTER_API_KEY'] ??
    (config.useOpenCodeAuth === false
      ? undefined
      : resolveOpenCodeAuthApiKey());
  const evaluator = apiKey
    ? new OpenRouterEvaluatorAdapter(apiKey, config.model, project)
    : undefined;
  const useCase = new EvaluateConfirmationUseCase(
    policyService,
    evaluator,
    config,
  );
  const logDecisions = config.logDecisions !== false;

  return async (event) => {
    // Configured `allow`/`deny` rules stand on their own; this plugin's job
    // is to elevate safe pending asks, never to tighten or re-allow them.
    if (event.effect !== 'ask') {
      return;
    }

    const request = toConfirmationRequest(event);
    const decision = await useCase.execute(request);

    if (logDecisions) {
      logDecision(decision, request.tool, event.source?.id, event.sessionID);
    }

    if (decision.action === 'approve') {
      event.effect = 'allow';
    }
  };
}

export default {
  id: 'dc-auto-approve',
  async setup(ctx) {
    const options = (ctx.options ?? {}) as PluginConfig;
    const evaluate = createPermissionEvaluator(
      options,
      ctx.location?.project?.directory ?? ctx.location?.directory,
    );
    await ctx.permission.hook('evaluate', async (event) => {
      await evaluate(event as PermissionEvaluation);
    });
  },
} satisfies Plugin.Plugin