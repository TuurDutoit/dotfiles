import type { DeterministicPolicyService } from '../../domain/services/deterministic-policy.service.ts';
import type {
  ConfirmationRequest,
  PolicyEvaluation,
} from '../../domain/types.ts';
import type { ModelEvaluatorPort } from '../ports/model-evaluator.port.ts';

export type UseCaseConfig = {
  readonly enabled?: boolean;
  readonly neverApprovePatterns?: readonly RegExp[];
  readonly safetyThreshold?: number;
};

export class EvaluateConfirmationUseCase {
  private readonly policyService: DeterministicPolicyService;
  private readonly modelEvaluator?: ModelEvaluatorPort;
  private readonly config: UseCaseConfig;

  constructor(
    policyService: DeterministicPolicyService,
    modelEvaluator?: ModelEvaluatorPort,
    config: UseCaseConfig = {},
  ) {
    this.policyService = policyService;
    this.modelEvaluator = modelEvaluator;
    this.config = config;
  }

  public async execute(
    request: ConfirmationRequest,
  ): Promise<PolicyEvaluation> {
    if (this.config.enabled === false) {
      return {
        action: 'ask',
        confidence: 1.0,
        reason: 'Auto-approve plugin is disabled.',
      };
    }

    const neverApproveResult = this.checkNeverApprovePatterns(request);
    if (neverApproveResult) {
      return neverApproveResult;
    }

    const policyResult = this.policyService.evaluate(request);
    if (policyResult) {
      return policyResult;
    }

    return this.evaluateWithModel(request);
  }

  /** Guard: custom never-approve patterns. */
  private checkNeverApprovePatterns(
    request: ConfirmationRequest,
  ): PolicyEvaluation | undefined {
    const neverApproveTargets = [
      request.command,
      request.filePath,
      request.context,
    ].filter((value): value is string => typeof value === 'string');
    if (!this.config.neverApprovePatterns || neverApproveTargets.length === 0) {
      return undefined;
    }

    const matched = this.config.neverApprovePatterns.some((pattern) => {
      // A `g`/`y` pattern retains `lastIndex` across calls, so a shared
      // instance would silently stop matching on the second+ evaluation.
      // Test against a stateless copy instead.
      const stateless =
        pattern.global || pattern.sticky
          ? new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''))
          : pattern;
      return neverApproveTargets.some((target) => stateless.test(target));
    });

    return matched
      ? {
          action: 'ask',
          confidence: 1.0,
          reason: 'Command matched custom never-approve pattern.',
        }
      : undefined;
  }

  /** Model fallback for ambiguous operations the deterministic layer skipped. */
  private async evaluateWithModel(
    request: ConfirmationRequest,
  ): Promise<PolicyEvaluation> {
    if (!this.modelEvaluator) {
      return {
        action: 'ask',
        confidence: 0.5,
        reason:
          'No model evaluator configured for ambiguous confirmation request.',
      };
    }

    try {
      const decision = await this.modelEvaluator.evaluate(request);
      // Cookbook starts at 0.9; lowered to 0.8 by preference to stall less.
      const threshold = this.config.safetyThreshold ?? 0.8;
      const approved =
        decision.action === 'approve' && decision.confidence >= threshold;

      return {
        action: approved ? 'approve' : 'ask',
        confidence: decision.confidence,
        reason: decision.reason,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        action: 'ask',
        confidence: 0.0,
        error,
        reason: `Evaluation error: ${error}`,
      };
    }
  }
}
