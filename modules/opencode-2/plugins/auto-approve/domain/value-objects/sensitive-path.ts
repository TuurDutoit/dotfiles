export class SensitivePath {
  private static readonly SENSITIVE_PATTERNS: readonly RegExp[] = [
    /\/etc\//i,
    /\/var\/root/i,
    /\/System\//i,
    /\/Library\//i,
    /\.ssh\//i,
    /\.aws\/(credentials|config)/i,
    /\.gnupg\//i,
    /\.netrc/i,
    /\.npmrc/i,
    /\.git-credentials/i,
    /\.kube\/config/i,
    /\.docker\/config\.json/i,
    /\.htpasswd/i,
    /\.(bash|zsh)_history/i,
    /\.(keychain|kdbx)$/i,
    /\.(pem|key|p12|pfx|cer|crt|gpg|asc)$/i,
    /\b(id_rsa|id_ed25519|id_ecdsa|id_dsa)\b/i,
    /\.env(\.|$)/i,
  ];

  private readonly pathStr: string;

  constructor(pathStr: string) {
    this.pathStr = pathStr;
  }

  public isSensitive(): boolean {
    return SensitivePath.SENSITIVE_PATTERNS.some((pattern) =>
      pattern.test(this.pathStr),
    );
  }

  public toString(): string {
    return this.pathStr;
  }
}
