import { ASN1Primitive } from './ASN1Encodable';
import { ASN1Tags } from './ASN1Tags';
import { DEREncoder } from './DEREncoder';
import { DERDecoder } from './DERDecoder';

/**
 * ASN.1 Object Identifier
 * 
 * Matches org.bouncycastle.asn1.ASN1ObjectIdentifier
 */
export class ASN1ObjectIdentifier extends ASN1Primitive {
  private readonly oid: string;

  constructor(oid: string) {
    super();
    this.oid = oid;
  }

  /**
   * Get the OID string
   */
  getId(): string {
    return this.oid;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const content = DEREncoder.encodeOID(this.oid);
    return DEREncoder.encodeTLV(ASN1Tags.OBJECT_IDENTIFIER, content);
  }

  /**
   * Get the tag
   */
  getTag(): number {
    return ASN1Tags.OBJECT_IDENTIFIER;
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
  static fromEncoded(encoded: Uint8Array): ASN1ObjectIdentifier {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    if (tag !== ASN1Tags.OBJECT_IDENTIFIER) {
      throw new Error(`Expected OBJECT_IDENTIFIER tag, got ${tag}`);
    }

    const oid = DERDecoder.decodeOID(content);
    return new ASN1ObjectIdentifier(oid);
  }

  /**
   * Check equality
   */
  equals(other: ASN1ObjectIdentifier): boolean {
    return this.oid === other.oid;
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this.oid;
  }
}
