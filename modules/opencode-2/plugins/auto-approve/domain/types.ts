/* v8 ignore file -- type-only module, no runtime code to cover */
export type DecisionAction = 'approve' | 'ask' | 'deny';

export type ConfirmationRequest = {
  readonly args?: Record<string, unknown>;
  readonly command?: string;
  readonly context?: string;
  readonly filePath?: string;
  readonly question?: string;
  readonly tool: string;
};

export type PolicyEvaluation = {
  readonly action: DecisionAction;
  readonly confidence: number;
  readonly reason: string;
  /** Set only when the model call itself failed (bad key, outage, timeout). */
  readonly error?: string;
};
