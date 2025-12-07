import { ASN1Primitive } from './ASN1Encodable';
import { ASN1Tags } from './ASN1Tags';
import { DEREncoder } from './DEREncoder';
import { DERDecoder } from './DERDecoder';

/**
 * ASN.1 Bit String
 * 
 * Matches org.bouncycastle.asn1.DERBitString
 */
export class ASN1BitString extends ASN1Primitive {
  private readonly bits: Uint8Array;
  private readonly unusedBits: number;

  constructor(bits: Uint8Array, unusedBits: number = 0) {
    super();
    this.bits = bits;
    this.unusedBits = unusedBits;

    if (unusedBits < 0 || unusedBits > 7) {
      throw new Error('Unused bits must be between 0 and 7');
    }
  }

  /**
   * Get the bit string bytes
   */
  getBytes(): Uint8Array {
    return this.bits;
  }

  /**
   * Get the number of unused bits in the last byte
   */
  getPadBits(): number {
    return this.unusedBits;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const content = DEREncoder.encodeBitString(this.bits, this.unusedBits);
    return DEREncoder.encodeTLV(ASN1Tags.BIT_STRING, content);
  }

  /**
   * Get the tag
   */
  getTag(): number {
    return ASN1Tags.BIT_STRING;
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
  static fromEncoded(encoded: Uint8Array): ASN1BitString {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    if (tag !== ASN1Tags.BIT_STRING) {
      throw new Error(`Expected BIT_STRING tag, got ${tag}`);
    }

    const { bits, unusedBits } = DERDecoder.decodeBitString(content);
    return new ASN1BitString(bits, unusedBits);
  }

  /**
   * Get octets from bit string (ignoring unused bits)
   */
  getOctets(): Uint8Array {
    return this.bits;
  }
}
