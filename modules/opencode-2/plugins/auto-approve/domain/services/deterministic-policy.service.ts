import type { ConfirmationRequest, PolicyEvaluation } from '../types.ts';
import { Command } from '../value-objects/command.ts';
import { SensitivePath } from '../value-objects/sensitive-path.ts';

export class DeterministicPolicyService {
  // Tools whose safety depends entirely on the target path having already
  // passed the sensitive-path check above -- if no path was resolved at
  // all, there's nothing to have checked, so these must NOT be blanket
  // approved (that would silently skip the sensitive-path guard whenever
  // `filePath` couldn't be resolved upstream).
  private static readonly PATH_SCOPED_TOOLS = new Set(['read', 'glob', 'grep']);

  public evaluate(req: ConfirmationRequest): PolicyEvaluation | null {
    return (
      this.checkSensitivePath(req) ??
      this.checkCommand(req) ??
      this.checkPathScopedTool(req)
    );
  }

  /** Guard against sensitive paths -- checked first, even for read tools. */
  private checkSensitivePath(
    req: ConfirmationRequest,
  ): PolicyEvaluation | null {
    if (!req.filePath || !new SensitivePath(req.filePath).isSensitive()) {
      return null;
    }
    return {
      action: 'ask',
      confidence: 1.0,
      reason: `Target path touches sensitive directory or secret: "${req.filePath}"`,
    };
  }

  /** Guard against dangerous commands / approve safe dev commands. */
  private checkCommand(req: ConfirmationRequest): PolicyEvaluation | null {
    if (!req.command) {
      return null;
    }
    const cmd = new Command(req.command);
    if (cmd.isDangerous()) {
      return {
        action: 'ask',
        confidence: 1.0,
        reason: `Command matched dangerous pattern: "${req.command}"`,
      };
    }
    if (cmd.isSafeDeveloperCommand()) {
      return {
        action: 'approve',
        confidence: 0.95,
        reason: 'Command is a standard safe developer operation.',
      };
    }
    return null;
  }

  /**
   * Safe read-only tools. Path-scoped tools (read/glob/grep) only qualify
   * once a path was actually resolved and cleared `checkSensitivePath`
   * above -- otherwise fall through to ambiguous (null) rather than
   * blanket-approve a request whose target was never checked.
   */
  private checkPathScopedTool(
    req: ConfirmationRequest,
  ): PolicyEvaluation | null {
    const tool = req.tool.toLowerCase();
    if (
      !DeterministicPolicyService.PATH_SCOPED_TOOLS.has(tool) ||
      !req.filePath
    ) {
      return null;
    }
    return {
      action: 'approve',
      confidence: 1.0,
      reason: `Tool "${req.tool}" is recognized as safe read-only.`,
    };
  }
}
