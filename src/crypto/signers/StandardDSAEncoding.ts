/**
 * Standard DSA encoding using ASN.1 DER format.
 * 
 * This implementation encodes DSA-style signatures (r, s) using the
 * standard ASN.1 DER format as defined in various standards including
 * PKCS#1, X9.62, and others.
 * 
 * The format is:
 *   SEQUENCE {
 *     r INTEGER,
 *     s INTEGER
 *   }
 * 
 * Based on: org.bouncycastle.crypto.signers.StandardDSAEncoding
 */

import { DSAEncoding } from './DSAEncoding';

/**
 * Standard ASN.1 DER encoding for DSA signatures.
 */
export class StandardDSAEncoding implements DSAEncoding {
  /**
   * Singleton instance.
   */
  static readonly INSTANCE = new StandardDSAEncoding();

  /**
   * Encode (r, s) signature into ASN.1 DER format.
   */
  encode(n: bigint, r: bigint, s: bigint): Uint8Array {
    // Validate inputs
    if (r <= 0n || r >= n) {
      throw new Error('r component out of range');
    }
    if (s <= 0n || s >= n) {
      throw new Error('s component out of range');
    }

    // Encode r as INTEGER
    const rBytes = this.encodeInteger(r);
    
    // Encode s as INTEGER
    const sBytes = this.encodeInteger(s);

    // Calculate total sequence length
    const sequenceLength = rBytes.length + sBytes.length;
    
    // Build the complete DER encoding: tag (1 byte) + length + content
    const lengthBytes = this.lengthBytesCount(sequenceLength);
    const result = new Uint8Array(1 + lengthBytes + sequenceLength);
    let offset = 0;

    // SEQUENCE tag
    result[offset++] = 0x30;
    
    // Encode sequence length
    offset += this.encodeLength(result, offset, sequenceLength);
    
    // Copy r bytes
    result.set(rBytes, offset);
    offset += rBytes.length;
    
    // Copy s bytes
    result.set(sBytes, offset);
    
    return result;
  }

  /**
   * Decode ASN.1 DER signature into (r, s) components.
   */
  decode(n: bigint, encoding: Uint8Array): [bigint, bigint] {
    let offset = 0;

    // Check SEQUENCE tag
    if (encoding[offset] !== 0x30) {
      throw new Error('Invalid DER encoding: expected SEQUENCE tag');
    }
    offset++;

    // Parse sequence length
    const [sequenceLength, lengthBytes] = this.parseLength(encoding, offset);
    offset += lengthBytes;

    // Check total length
    if (offset + sequenceLength !== encoding.length) {
      throw new Error('Invalid DER encoding: incorrect sequence length');
    }

    // Parse r component
    const [r, rLength] = this.parseInteger(encoding, offset);
    offset += rLength;

    // Parse s component
    const [s, sLength] = this.parseInteger(encoding, offset);
    offset += sLength;

    // Check we consumed all bytes
    if (offset !== encoding.length) {
      throw new Error('Invalid DER encoding: extra bytes');
    }

    // Validate ranges
    if (r <= 0n || r >= n) {
      throw new Error('Invalid signature: r component out of range');
    }
    if (s <= 0n || s >= n) {
      throw new Error('Invalid signature: s component out of range');
    }

    return [r, s];
  }

  /**
   * Encode a positive integer as DER INTEGER.
   */
  private encodeInteger(value: bigint): Uint8Array {
    if (value <= 0n) {
      throw new Error('Integer must be positive');
    }

    // Convert to minimal byte representation
    let bytes = this.bigIntToBytes(value);
    
    // Add leading zero if MSB is set (to ensure positive interpretation)
    if ((bytes[0] & 0x80) !== 0) {
      const paddedBytes = new Uint8Array(bytes.length + 1);
      paddedBytes[0] = 0x00;
      paddedBytes.set(bytes, 1);
      bytes = paddedBytes;
    }

    // Build DER INTEGER: tag (1 byte) + length + value bytes
    const lengthBytes = this.lengthBytesCount(bytes.length);
    const result = new Uint8Array(1 + lengthBytes + bytes.length);
    let offset = 0;

    // INTEGER tag
    result[offset++] = 0x02;
    
    // Encode length
    offset += this.encodeLength(result, offset, bytes.length);
    
    // Copy integer bytes
    result.set(bytes, offset);
    
    return result;
  }

  /**
   * Parse a DER INTEGER from the encoding.
   */
  private parseInteger(encoding: Uint8Array, offset: number): [bigint, number] {
    if (offset >= encoding.length) {
      throw new Error('Unexpected end of DER encoding');
    }

    // Check INTEGER tag
    if (encoding[offset] !== 0x02) {
      throw new Error('Invalid DER encoding: expected INTEGER tag');
    }
    offset++;

    // Parse length
    const [length, lengthBytes] = this.parseLength(encoding, offset);
    offset += lengthBytes;

    if (offset + length > encoding.length) {
      throw new Error('Invalid DER encoding: integer extends beyond available data');
    }

    // Check for minimal encoding (no unnecessary leading zeros)
    if (length > 1 && encoding[offset] === 0x00 && (encoding[offset + 1] & 0x80) === 0) {
      throw new Error('Invalid DER encoding: non-minimal integer');
    }

    // Extract integer bytes
    const integerBytes = encoding.slice(offset, offset + length);
    const value = this.bytesToBigInt(integerBytes);

    if (value <= 0n) {
      throw new Error('Invalid DER encoding: non-positive integer');
    }

    return [value, 1 + lengthBytes + length];
  }

  /**
   * Calculate number of bytes needed to encode a length.
   */
  private lengthBytesCount(length: number): number {
    if (length < 0x80) {
      return 1;
    } else {
      let count = 1;
      let temp = length;
      while (temp > 0) {
        count++;
        temp = temp >>> 8;
      }
      return count;
    }
  }

  /**
   * Encode length in DER format.
   */
  private encodeLength(buffer: Uint8Array, offset: number, length: number): number {
    if (length < 0x80) {
      // Short form
      buffer[offset] = length;
      return 1;
    } else {
      // Long form
      let lengthBytes = 0;
      let temp = length;
      while (temp > 0) {
        lengthBytes++;
        temp = temp >>> 8;
      }

      buffer[offset] = 0x80 | lengthBytes;
      let writeOffset = offset + 1;

      for (let i = lengthBytes - 1; i >= 0; i--) {
        buffer[writeOffset++] = (length >>> (i * 8)) & 0xFF;
      }

      return 1 + lengthBytes;
    }
  }

  /**
   * Parse DER length encoding.
   */
  private parseLength(encoding: Uint8Array, offset: number): [number, number] {
    if (offset >= encoding.length) {
      throw new Error('Unexpected end of DER encoding');
    }

    const firstByte = encoding[offset];
    
    if ((firstByte & 0x80) === 0) {
      // Short form
      return [firstByte, 1];
    } else {
      // Long form
      const lengthBytes = firstByte & 0x7F;
      
      if (lengthBytes === 0) {
        throw new Error('Invalid DER encoding: indefinite length not allowed');
      }
      if (lengthBytes > 4) {
        throw new Error('Invalid DER encoding: length too large');
      }
      if (offset + 1 + lengthBytes > encoding.length) {
        throw new Error('Invalid DER encoding: length extends beyond available data');
      }

      let length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = (length << 8) | encoding[offset + 1 + i];
      }

      // Check for minimal encoding
      if (length < 0x80) {
        throw new Error('Invalid DER encoding: non-minimal length');
      }

      return [length, 1 + lengthBytes];
    }
  }

  /**
   * Convert bigint to minimal byte array (big-endian).
   */
  private bigIntToBytes(value: bigint): Uint8Array {
    if (value === 0n) {
      return new Uint8Array([0]);
    }

    const bytes: number[] = [];
    while (value > 0n) {
      bytes.unshift(Number(value & 0xFFn));
      value = value >> 8n;
    }

    return new Uint8Array(bytes);
  }

  /**
   * Convert byte array to bigint (big-endian).
   */
  private bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
  }
}