import { PemObject } from './PemObject';

/**
 * PEM Reader
 * 
 * Reads PEM formatted data
 * Matches org.bouncycastle.util.io.pem.PemReader
 */
export class PemReader {
  private lines: string[];
  private currentIndex: number = 0;

  constructor(pemString: string) {
    this.lines = pemString.split(/\r?\n/);
  }

  /**
   * Read the next PEM object
   * @returns The PEM object or null if no more objects
   */
  readPemObject(): PemObject | null {
    // Find the next BEGIN marker
    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex].trim();
      if (line.startsWith('-----BEGIN ')) {
        return this.readPemObjectFromBegin();
      }
      this.currentIndex++;
    }

    return null;
  }

  /**
   * Read all PEM objects
   */
  readAllPemObjects(): PemObject[] {
    const objects: PemObject[] = [];
    let obj: PemObject | null;
    
    while ((obj = this.readPemObject()) !== null) {
      objects.push(obj);
    }

    return objects;
  }

  private readPemObjectFromBegin(): PemObject | null {
    const beginLine = this.lines[this.currentIndex].trim();
    
    // Extract type from "-----BEGIN TYPE-----"
    const beginMatch = beginLine.match(/^-----BEGIN (.+)-----$/);
    if (!beginMatch) {
      throw new Error(`Invalid PEM BEGIN line: ${beginLine}`);
    }

    const type = beginMatch[1];
    this.currentIndex++;

    // Read headers (if any)
    const headers = new Map<string, string>();
    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex].trim();
      
      // Check for end of headers (empty line or start of base64 data)
      if (line === '' || !line.includes(':')) {
        break;
      }

      // Parse header "Key: Value"
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        headers.set(key, value);
      }
      
      this.currentIndex++;
    }

    // Read base64 content
    const base64Lines: string[] = [];
    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex].trim();
      
      if (line.startsWith('-----END ')) {
        // Verify END marker matches BEGIN marker
        const endMatch = line.match(/^-----END (.+)-----$/);
        if (!endMatch || endMatch[1] !== type) {
          throw new Error(`Mismatched PEM markers: BEGIN ${type} / END ${endMatch ? endMatch[1] : '(invalid)'}`);
        }
        
        this.currentIndex++;
        break;
      }

      if (line !== '') {
        base64Lines.push(line);
      }
      this.currentIndex++;
    }

    // Decode base64 content
    const base64String = base64Lines.join('');
    const content = this.base64Decode(base64String);

    return new PemObject(type, headers, content);
  }

  private base64Decode(base64: string): Uint8Array {
    // Use built-in base64 decoding
    if (typeof Buffer !== 'undefined') {
      // Node.js - convert Buffer to Uint8Array
      const buffer = Buffer.from(base64, 'base64');
      return new Uint8Array(buffer);
    } else {
      // Browser
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  }
}
