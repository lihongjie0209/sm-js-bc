/**
 * DER (Distinguished Encoding Rules) decoder
 * 
 * Provides utilities for decoding ASN.1 objects from DER format
 */
export class DERDecoder {
  /**
   * Decode length from DER format
   * @param data The encoded data
   * @param offset The offset to start reading from
   * @returns Object containing the length and number of bytes consumed
   */
  static decodeLength(data: Uint8Array, offset: number): { length: number; bytesConsumed: number } {
    if (offset >= data.length) {
      throw new Error('Unexpected end of data while reading length');
    }

    const firstByte = data[offset];

    if ((firstByte & 0x80) === 0) {
      // Short form: length is in the first byte
      return { length: firstByte, bytesConsumed: 1 };
    }

    // Long form: first byte indicates number of length bytes
    const numLengthBytes = firstByte & 0x7f;
    
    if (numLengthBytes === 0) {
      throw new Error('Indefinite length encoding not supported in DER');
    }

    if (offset + numLengthBytes >= data.length) {
      throw new Error('Unexpected end of data while reading length bytes');
    }

    let length = 0;
    for (let i = 0; i < numLengthBytes; i++) {
      length = (length << 8) | data[offset + 1 + i];
    }

    return { length, bytesConsumed: 1 + numLengthBytes };
  }

  /**
   * Read a TLV (Tag-Length-Value) structure
   * @param data The encoded data
   * @param offset The offset to start reading from
   * @returns Object containing tag, content, and total bytes consumed
   */
  static decodeTLV(data: Uint8Array, offset: number): {
    tag: number;
    content: Uint8Array;
    bytesConsumed: number;
  } {
    if (offset >= data.length) {
      throw new Error('Unexpected end of data while reading tag');
    }

    const tag = data[offset];
    const { length, bytesConsumed: lengthBytes } = DERDecoder.decodeLength(data, offset + 1);

    const contentStart = offset + 1 + lengthBytes;
    const contentEnd = contentStart + length;

    if (contentEnd > data.length) {
      throw new Error('Unexpected end of data while reading content');
    }

    const content = data.slice(contentStart, contentEnd);

    return {
      tag,
      content,
      bytesConsumed: 1 + lengthBytes + length,
    };
  }

  /**
   * Decode a sequence of ASN.1 objects
   * @param data The encoded sequence data (content only, without tag and length)
   * @returns Array of decoded TLV structures
   */
  static decodeSequence(data: Uint8Array): Array<{ tag: number; content: Uint8Array }> {
    const elements: Array<{ tag: number; content: Uint8Array }> = [];
    let offset = 0;

    while (offset < data.length) {
      const { tag, content, bytesConsumed } = DERDecoder.decodeTLV(data, offset);
      elements.push({ tag, content });
      offset += bytesConsumed;
    }

    return elements;
  }

  /**
   * Decode an integer from DER format
   * @param data The encoded integer bytes (content only)
   * @returns The integer value as bigint
   */
  static decodeInteger(data: Uint8Array): bigint {
    if (data.length === 0) {
      throw new Error('Integer content is empty');
    }

    const isNegative = (data[0] & 0x80) !== 0;
    let result = 0n;

    for (let i = 0; i < data.length; i++) {
      result = (result << 8n) | BigInt(data[i]);
    }

    if (isNegative) {
      // Handle two's complement negative numbers
      const bits = BigInt(data.length * 8);
      const mask = (1n << bits) - 1n;
      result = result - (1n << bits);
    }

    return result;
  }

  /**
   * Decode an object identifier (OID) from DER format
   * @param data The encoded OID bytes (content only)
   * @returns The OID string (e.g., "1.2.840.113549.1.1.1")
   */
  static decodeOID(data: Uint8Array): string {
    if (data.length === 0) {
      throw new Error('OID content is empty');
    }

    const parts: number[] = [];

    // First byte encodes first two components
    const firstByte = data[0];
    parts.push(Math.floor(firstByte / 40));
    parts.push(firstByte % 40);

    // Decode remaining components
    let i = 1;
    while (i < data.length) {
      let value = 0;
      let byte: number;

      do {
        if (i >= data.length) {
          throw new Error('Unexpected end of OID data');
        }
        byte = data[i++];
        value = (value << 7) | (byte & 0x7f);
      } while ((byte & 0x80) !== 0);

      parts.push(value);
    }

    return parts.join('.');
  }

  /**
   * Decode a bit string from DER format
   * @param data The encoded bit string bytes (content only)
   * @returns Object containing the bit string and number of unused bits
   */
  static decodeBitString(data: Uint8Array): { bits: Uint8Array; unusedBits: number } {
    if (data.length === 0) {
      throw new Error('Bit string content is empty');
    }

    const unusedBits = data[0];
    if (unusedBits > 7) {
      throw new Error('Invalid unused bits value in bit string');
    }

    const bits = data.slice(1);
    return { bits, unusedBits };
  }

  /**
   * Decode a UTF-8 string from DER format
   * @param data The encoded string bytes (content only)
   * @returns The decoded string
   */
  static decodeUTF8String(data: Uint8Array): string {
    return new TextDecoder('utf-8').decode(data);
  }

  /**
   * Decode a printable string from DER format
   * @param data The encoded string bytes (content only)
   * @returns The decoded string
   */
  static decodePrintableString(data: Uint8Array): string {
    return new TextDecoder('ascii').decode(data);
  }

  /**
   * Decode an IA5 string from DER format
   * @param data The encoded string bytes (content only)
   * @returns The decoded string
   */
  static decodeIA5String(data: Uint8Array): string {
    return new TextDecoder('ascii').decode(data);
  }
}
