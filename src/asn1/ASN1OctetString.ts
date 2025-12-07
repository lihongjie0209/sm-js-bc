import { ASN1Primitive } from './ASN1Encodable';
import { ASN1Tags } from './ASN1Tags';
import { DEREncoder } from './DEREncoder';
import { DERDecoder } from './DERDecoder';

/**
 * ASN.1 Octet String
 * 
 * Matches org.bouncycastle.asn1.ASN1OctetString / DEROctetString
 */
export class ASN1OctetString extends ASN1Primitive {
  private readonly octets: Uint8Array;

  constructor(octets: Uint8Array) {
    super();
    this.octets = octets;
  }

  /**
   * Get the octet string content
   */
  getOctets(): Uint8Array {
    return this.octets;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    return DEREncoder.encodeTLV(ASN1Tags.OCTET_STRING, this.octets);
  }

  /**
   * Get the tag
   */
  getTag(): number {
    return ASN1Tags.OCTET_STRING;
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
  static fromEncoded(encoded: Uint8Array): ASN1OctetString {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    if (tag !== ASN1Tags.OCTET_STRING) {
      throw new Error(`Expected OCTET_STRING tag, got ${tag}`);
    }

    return new ASN1OctetString(content);
  }
}
