export class Command {
  private static readonly DANGEROUS_PATTERNS: readonly RegExp[] = [
    /\brm\s+(?:-\S+\s+)*(?:-[a-z]*[rf][a-z]*|--recursive|--force)\b(?:\s+-\S+)*\s+(\/|~|\$HOME|\$\{HOME\}|\.\.|\*)/i,
    /\bsudo\b/i,
    /\b(mkfs|dd|fdisk|parted)\b/i,
    /\bchmod\s+(?:-\S+\s+)*[0-7]?777\b/i,
    // `\s` (not `\s+`) immediately before `.*` avoids two adjacent
    // unbounded quantifiers over overlapping character classes -- that
    // combination forces quadratic backtracking on non-matching input.
    /\bgit\s+push\s.*(--force|-[a-z]*f[a-z]*|\+[\w/:]+|--delete)\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+clean\s+.*(-[a-z]*f[a-z]*|--force)\b/i,
    /\bgit\s+branch\s+.*(-[a-z]*[dD][a-z]*|--delete)\b/i,
    /\b(curl|wget)\s.*\|\s*(bash|sh|zsh|python3?|perl|ruby|node)\b/i,
    /\b(DROP\s+(DATABASE|TABLE|SCHEMA|USER|INDEX|VIEW)|TRUNCATE(\s+TABLE)?|DELETE\s+FROM)\b/i,
    /\b(terraform|tofu)\s+destroy\b/i,
    /\bkubectl\s+delete\s+(ns|namespace|all|nodes?)\b/i,
    /\b(shutdown|reboot|poweroff)\b/i,
  ];

  // Only literal flags/args are allowed after a safe subcommand, otherwise
  // `(\s+.*)?$` would match arbitrary trailing payloads via `;`, `&&`, `|`,
  // backticks, or `$(...)`.
  private static readonly SAFE_TRAILING_ARGS = /^[\w\s./=@:~-]*$/;

  private static readonly SHELL_METACHARACTERS = /[;&|`$(){}<>\n\r\t]/;

  private static readonly SAFE_PATTERNS: readonly RegExp[] = [
    /^(just|yarn|npm|pnpm|bun)\s+(check|fix|test|lint|typecheck|build)(\s.*)?$/,
    /^git\s+(status|diff|log|show)(\s.*)?$/,
    /^git\s+branch(\s+(-a|-r|-v|-vv|--all|--remotes|--list|--show-current|--merged|--no-merged|--contains|--no-contains))*\s*$/,
    /^(oxlint|oxfmt|tsc|vitest)(\s.*)?$/,
    /^(which|echo|pwd|whoami|ls)(\s.*)?$/,
  ];

  private readonly raw: string;

  constructor(raw: string) {
    this.raw = raw;
  }

  public isDangerous(): boolean {
    return Command.DANGEROUS_PATTERNS.some((pattern) => pattern.test(this.raw));
  }

  public isSafeDeveloperCommand(): boolean {
    const trimmed = this.raw.trim();

    // Reject shell control operators outright, even if the prefix matches
    // a known-safe command (closes `just check && rm -rf ~`-style bypass).
    if (
      Command.SHELL_METACHARACTERS.test(trimmed) ||
      !Command.SAFE_TRAILING_ARGS.test(trimmed)
    ) {
      return false;
    }

    return Command.SAFE_PATTERNS.some((pattern) => pattern.test(trimmed));
  }

  public toString(): string {
    return this.raw;
  }
}
