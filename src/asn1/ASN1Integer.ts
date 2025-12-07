import { ASN1Primitive } from './ASN1Encodable';
import { ASN1Tags } from './ASN1Tags';
import { DEREncoder } from './DEREncoder';
import { DERDecoder } from './DERDecoder';

/**
 * ASN.1 Integer
 * 
 * Matches org.bouncycastle.asn1.ASN1Integer
 */
export class ASN1Integer extends ASN1Primitive {
  private readonly value: bigint;

  constructor(value: bigint | number) {
    super();
    this.value = typeof value === 'bigint' ? value : BigInt(value);
  }

  /**
   * Get the integer value
   */
  getValue(): bigint {
    return this.value;
  }

  /**
   * Get the positive value (useful for serial numbers)
   */
  getPositiveValue(): bigint {
    return this.value < 0n ? -this.value : this.value;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const content = DEREncoder.encodeInteger(this.value);
    return DEREncoder.encodeTLV(ASN1Tags.INTEGER, content);
  }

  /**
   * Get the tag
   */
  getTag(): number {
    return ASN1Tags.INTEGER;
  }

  /**
   * Check if this is constructed
   */
  isConstructed(): boolean {
    return false;
  }

  /**
   * Get encoded length
   */
  getEncodedLength(): number {
    return this.getEncoded().length;
  }

  /**
   * Decode from encoded bytes
   */
  static fromEncoded(encoded: Uint8Array): ASN1Integer {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    if (tag !== ASN1Tags.INTEGER) {
      throw new Error(`Expected INTEGER tag, got ${tag}`);
    }

    const value = DERDecoder.decodeInteger(content);
    return new ASN1Integer(value);
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this.value.toString();
  }
}
