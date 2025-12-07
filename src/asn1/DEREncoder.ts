/**
 * DER (Distinguished Encoding Rules) encoder
 * 
 * Provides utilities for encoding ASN.1 objects to DER format
 */
export class DEREncoder {
  /**
   * Encode length in DER format
   * @param length The length to encode
   * @returns Encoded length bytes
   */
  static encodeLength(length: number): Uint8Array {
    if (length < 128) {
      // Short form: single byte
      return new Uint8Array([length]);
    }

    // Long form: first byte has high bit set and indicates number of length bytes
    const lengthBytes: number[] = [];
    let temp = length;
    while (temp > 0) {
      lengthBytes.unshift(temp & 0xff);
      temp >>= 8;
    }

    return new Uint8Array([0x80 | lengthBytes.length, ...lengthBytes]);
  }

  /**
   * Encode tag and length, then append content
   * @param tag The ASN.1 tag
   * @param content The content bytes
   * @returns Complete TLV (Tag-Length-Value) encoded bytes
   */
  static encodeTLV(tag: number, content: Uint8Array): Uint8Array {
    const lengthBytes = DEREncoder.encodeLength(content.length);
    const result = new Uint8Array(1 + lengthBytes.length + content.length);
    
    result[0] = tag;
    result.set(lengthBytes, 1);
    result.set(content, 1 + lengthBytes.length);
    
    return result;
  }

  /**
   * Encode a sequence of ASN.1 objects
   * @param tag The tag for the sequence (usually SEQUENCE or SET)
   * @param elements The encoded elements
   * @returns Encoded sequence
   */
  static encodeSequence(tag: number, elements: Uint8Array[]): Uint8Array {
    // Calculate total content length
    const contentLength = elements.reduce((sum, el) => sum + el.length, 0);
    const content = new Uint8Array(contentLength);
    
    let offset = 0;
    for (const element of elements) {
      content.set(element, offset);
      offset += element.length;
    }
    
    return DEREncoder.encodeTLV(tag, content);
  }

  /**
   * Encode an integer in DER format
   * @param value The integer value (bigint or number)
   * @returns Encoded integer
   */
  static encodeInteger(value: bigint | number): Uint8Array {
    const bigIntValue = typeof value === 'bigint' ? value : BigInt(value);
    
    if (bigIntValue === 0n) {
      return new Uint8Array([0]);
    }

    // Convert to bytes (big-endian, two's complement)
    let bytes: number[] = [];
    let temp = bigIntValue < 0n ? -bigIntValue : bigIntValue;
    
    while (temp > 0n) {
      bytes.unshift(Number(temp & 0xffn));
      temp >>= 8n;
    }

    if (bigIntValue < 0n) {
      // Two's complement for negative numbers
      let carry = 1;
      for (let i = bytes.length - 1; i >= 0; i--) {
        bytes[i] = ~bytes[i] & 0xff;
        if (carry) {
          bytes[i] = (bytes[i] + 1) & 0xff;
          if (bytes[i] !== 0) carry = 0;
        }
      }
      // Ensure high bit is set
      if ((bytes[0] & 0x80) === 0) {
        bytes.unshift(0xff);
      }
    } else {
      // Ensure high bit is clear for positive numbers
      if ((bytes[0] & 0x80) !== 0) {
        bytes.unshift(0);
      }
    }

    return new Uint8Array(bytes);
  }

  /**
   * Encode an object identifier (OID) in DER format
   * @param oid The OID string (e.g., "1.2.840.113549.1.1.1")
   * @returns Encoded OID
   */
  static encodeOID(oid: string): Uint8Array {
    const parts = oid.split('.').map(Number);
    
    if (parts.length < 2) {
      throw new Error('OID must have at least 2 components');
    }

    // First byte encodes first two components: 40*first + second
    const bytes: number[] = [40 * parts[0] + parts[1]];

    // Encode remaining components
    for (let i = 2; i < parts.length; i++) {
      const value = parts[i];
      if (value === 0) {
        bytes.push(0);
      } else {
        const encoded: number[] = [];
        let temp = value;
        encoded.unshift(temp & 0x7f);
        temp >>= 7;
        
        while (temp > 0) {
          encoded.unshift((temp & 0x7f) | 0x80);
          temp >>= 7;
        }
        
        bytes.push(...encoded);
      }
    }

    return new Uint8Array(bytes);
  }

  /**
   * Encode a bit string in DER format
   * @param bits The bit string as Uint8Array
   * @param unusedBits Number of unused bits in the last byte (0-7)
   * @returns Encoded bit string
   */
  static encodeBitString(bits: Uint8Array, unusedBits: number = 0): Uint8Array {
    const content = new Uint8Array(bits.length + 1);
    content[0] = unusedBits;
    content.set(bits, 1);
    return content;
  }
}
