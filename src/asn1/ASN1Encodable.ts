/**
 * Base interface for ASN.1 encodable objects
 * 
 * This matches org.bouncycastle.asn1.ASN1Encodable
 */
export interface ASN1Encodable {
  /**
   * Encode this object to DER format
   * @returns DER encoded bytes
   */
  toASN1Primitive(): ASN1Primitive;
}

/**
 * Base class for ASN.1 primitive objects
 */
export abstract class ASN1Primitive implements ASN1Encodable {
  /**
   * Encode to DER format
   */
  abstract getEncoded(): Uint8Array;

  /**
   * Return this object as an ASN1Primitive
   */
  toASN1Primitive(): ASN1Primitive {
    return this;
  }

  /**
   * Get the tag number for this object
   */
  abstract getTag(): number;

  /**
   * Check if this is a constructed encoding
   */
  abstract isConstructed(): boolean;

  /**
   * Get the length of the encoded content
   */
  abstract getEncodedLength(): number;
}
