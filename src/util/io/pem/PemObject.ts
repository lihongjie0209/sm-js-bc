/**
 * PEM Object representation
 * 
 * Matches org.bouncycastle.util.io.pem.PemObject
 */
export class PemObject {
  constructor(
    private readonly type: string,
    private readonly headers: Map<string, string>,
    private readonly content: Uint8Array
  ) {}

  /**
   * Get the PEM type (e.g., "PRIVATE KEY", "CERTIFICATE")
   */
  getType(): string {
    return this.type;
  }

  /**
   * Get the headers
   */
  getHeaders(): Map<string, string> {
    return new Map(this.headers);
  }

  /**
   * Get the content bytes
   */
  getContent(): Uint8Array {
    return this.content;
  }
}
