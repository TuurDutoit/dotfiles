import type {
  ModelDecision,
  ModelEvaluatorPort,
} from '../../application/ports/model-evaluator.port.ts';
import type { ConfirmationRequest } from '../../domain/types.ts';

/**
 * Asks TypeSafe's Jev, via OpenRouter's Decisions endpoint, whether an
 * ambiguous request is safe to auto-approve. Jev is not a chat model: it
 * takes a `state` (data) plus typed questions and returns a calibrated
 * probability per question, so there is no prompt to inject into -- the
 * untrusted request only ever travels as `state`, never as instructions.
 * See https://openrouter.ai/docs/cookbook/coding-agents/auto-approve-permission-prompts-with-jev.md
 */
export class OpenRouterEvaluatorAdapter implements ModelEvaluatorPort {
  // Pinned to a reviewed, concrete slug rather than the rolling
  // `~typesafe/jev-latest` alias: an alias can be repointed to a different
  // model, changing auto-approval decisions without a reviewed release.
  // `model` overrides must be Decisions-capable (Jev family); chat models
  // are rejected by this endpoint, which fails safe to "ask".
  private static readonly DEFAULT_MODEL = 'typesafe/jev-1.13';
  private static readonly DEFAULT_URL =
    'https://openrouter.ai/api/alpha/decisions';

  // Two independent yes/no ("noul") questions; Jev answers each with P(yes)
  // in [0, 1]. Both are danger checks on purpose: asking "is this safe?"
  // makes Jev stall on anything it can't fully vouch for (a registry call,
  // a URL fetch), while asking "could this hurt?" only stalls on real risk.
  // Approving requires confident no on both; the combination happens here so
  // the use-case's safetyThreshold keeps meaning "how sure it's safe".
  private static readonly QUESTIONS = {
    irreversible: {
      instructions:
        'Running `request` would cause damage that cannot be undone, nor fixed by reverting with git: deleting or overwriting data outside `project`, pushing or resetting a shared repository, publishing, deploying, changing system settings, or spending money.',
      type: 'noul',
    },
    secrets: {
      instructions:
        'Running `request` would expose secrets or credentials somewhere they should not go: sending tokens, keys, or the contents of credential files such as `.env` to a remote service, printing or logging them, or writing them into the repository. Merely authenticating with credentials that are already stored is not exposure.',
      type: 'noul',
    },
  } as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly project: string | undefined;
  private readonly timeoutMs: number;

  constructor(
    apiKey: string,
    model: string = OpenRouterEvaluatorAdapter.DEFAULT_MODEL,
    project?: string,
    timeoutMs = 15_000,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.project = project;
    this.timeoutMs = timeoutMs;
  }

  public async evaluate(request: ConfirmationRequest): Promise<ModelDecision> {
    const response = await fetch(OpenRouterEvaluatorAdapter.DEFAULT_URL, {
      body: JSON.stringify({
        model: this.model,
        questions: OpenRouterEvaluatorAdapter.QUESTIONS,
        state: {
          project: this.project,
          request: {
            command: request.command,
            filePath: request.filePath,
            question: request.question,
            tool: request.tool,
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      answers?: Record<string, { noul?: unknown }>;
    };
    const answers = data?.answers ?? {};
    const scores = Object.keys(OpenRouterEvaluatorAdapter.QUESTIONS).map(
      (key) => answers[key]?.noul,
    );
    if (
      !scores.every(
        (score) => typeof score === 'number' && score >= 0 && score <= 1,
      )
    ) {
      // The use-case catches this and fails safe to "ask".
      throw new Error(
        `OpenRouter model "${this.model}" returned no valid decision.`,
      );
    }
    const damage = scores[0] as number;
    const secrets = scores[1] as number;

    // Confidence is "how sure Jev is there's nothing dangerous", i.e. the
    // inverse of the worst danger score; the use-case's safetyThreshold decides.
    return {
      action: 'approve',
      confidence: 1 - Math.max(damage, secrets),
      model: this.model,
      reason: `Jev damage=${damage} secrets=${secrets}`,
    };
  }
}
