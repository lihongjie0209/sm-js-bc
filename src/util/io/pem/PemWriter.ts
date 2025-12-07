import { PemObject } from './PemObject';

/**
 * PEM Writer
 * 
 * Writes data in PEM format
 * Matches org.bouncycastle.util.io.pem.PemWriter
 */
export class PemWriter {
  private static readonly LINE_LENGTH = 64;

  /**
   * Write a PEM object to string
   */
  static writeObject(obj: PemObject): string {
    const lines: string[] = [];

    // Write BEGIN marker
    lines.push(`-----BEGIN ${obj.getType()}-----`);

    // Write headers (if any)
    const headers = obj.getHeaders();
    if (headers.size > 0) {
      for (const [key, value] of headers) {
        lines.push(`${key}: ${value}`);
      }
      lines.push(''); // Empty line after headers
    }

    // Write base64 encoded content
    const base64 = this.base64Encode(obj.getContent());
    const contentLines = this.splitIntoLines(base64, PemWriter.LINE_LENGTH);
    lines.push(...contentLines);

    // Write END marker
    lines.push(`-----END ${obj.getType()}-----`);

    return lines.join('\n') + '\n';
  }

  private static base64Encode(data: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
      // Node.js
      return Buffer.from(data).toString('base64');
    } else {
      // Browser
      let binary = '';
      for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
      }
      return btoa(binary);
    }
  }

  private static splitIntoLines(str: string, lineLength: number): string[] {
    const lines: string[] = [];
    for (let i = 0; i < str.length; i += lineLength) {
      lines.push(str.substring(i, Math.min(i + lineLength, str.length)));
    }
    return lines;
  }
}
