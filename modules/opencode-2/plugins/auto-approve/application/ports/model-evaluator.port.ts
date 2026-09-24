/* v8 ignore file -- type-only module, no runtime code to cover */
import type {
  ConfirmationRequest,
  DecisionAction,
} from '../../domain/types.ts';

export type ModelDecision = {
  readonly action: DecisionAction;
  readonly confidence: number;
  readonly model: string;
  readonly reason: string;
};

export type ModelEvaluatorPort = {
  evaluate(request: ConfirmationRequest): Promise<ModelDecision>;
};
