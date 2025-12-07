import { ASN1Encodable, ASN1Primitive } from '../asn1/ASN1Encodable';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { ASN1OctetString } from '../asn1/ASN1OctetString';
import { ASN1Integer } from '../asn1/ASN1Integer';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * PKCS#8 PrivateKeyInfo
 * 
 * PrivateKeyInfo ::= SEQUENCE {
 *   version         Version,
 *   privateKeyAlgorithm PrivateKeyAlgorithmIdentifier,
 *   privateKey      OCTET STRING,
 *   attributes      [0] IMPLICIT Attributes OPTIONAL
 * }
 * 
 * Version ::= INTEGER { v1(0) }
 * 
 * Matches org.bouncycastle.asn1.pkcs.PrivateKeyInfo
 */
export class PrivateKeyInfo extends ASN1Primitive {
  private readonly version: ASN1Integer;
  private readonly privateKeyAlgorithm: AlgorithmIdentifier;
  private readonly privateKey: ASN1OctetString;
  private readonly attributes?: ASN1Encodable;

  constructor(
    privateKeyAlgorithm: AlgorithmIdentifier,
    privateKey: Uint8Array,
    attributes?: ASN1Encodable
  ) {
    super();
    this.version = new ASN1Integer(0); // v1
    this.privateKeyAlgorithm = privateKeyAlgorithm;
    this.privateKey = new ASN1OctetString(privateKey);
    this.attributes = attributes;
  }

  /**
   * Get the version
   */
  getVersion(): ASN1Integer {
    return this.version;
  }

  /**
   * Get the private key algorithm
   */
  getPrivateKeyAlgorithm(): AlgorithmIdentifier {
    return this.privateKeyAlgorithm;
  }

  /**
   * Get the private key bytes
   */
  getPrivateKey(): ASN1OctetString {
    return this.privateKey;
  }

  /**
   * Parse private key as ASN.1 sequence (for EC keys)
   */
  parsePrivateKey(): ASN1Primitive {
    const keyBytes = this.privateKey.getOctets();
    const { tag, content } = DERDecoder.decodeTLV(keyBytes, 0);
    
    // Return a simple wrapper
    return new RawASN1Object(tag, content);
  }

  /**
   * Get the attributes
   */
  getAttributes(): ASN1Encodable | undefined {
    return this.attributes;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [
      this.version.getEncoded(),
      this.privateKeyAlgorithm.getEncoded(),
      this.privateKey.getEncoded()
    ];

    if (this.attributes) {
      // Attributes are tagged with [0] IMPLICIT
      const attrEncoded = this.attributes.toASN1Primitive().getEncoded();
      // For [0] IMPLICIT, we use context-specific tag 0
      const taggedAttr = DEREncoder.encodeTLV(0x80, attrEncoded);
      elements.push(taggedAttr);
    }

    return DEREncoder.encodeSequence(ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED, elements);
  }

  /**
   * Get the tag
   */
  getTag(): number {
    return ASN1Tags.SEQUENCE;
  }

  /**
   * Check if this is constructed
   */
  isConstructed(): boolean {
    return true;
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
  static fromEncoded(encoded: Uint8Array): PrivateKeyInfo {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length < 3) {
      throw new Error('PrivateKeyInfo must have at least version, algorithm, and privateKey');
    }

    // Parse version
    const version = DERDecoder.decodeInteger(elements[0].content);
    if (version !== 0n) {
      throw new Error(`Unsupported PrivateKeyInfo version: ${version}`);
    }

    // Parse algorithm identifier
    const algorithmEncoded = DEREncoder.encodeTLV(elements[1].tag, elements[1].content);
    const algorithm = AlgorithmIdentifier.fromEncoded(algorithmEncoded);

    // Parse private key
    const privateKeyBytes = elements[2].content;

    // Parse attributes if present
    let attributes: ASN1Encodable | undefined;
    if (elements.length > 3) {
      attributes = new RawASN1Object(elements[3].tag, elements[3].content);
    }

    return new PrivateKeyInfo(algorithm, privateKeyBytes, attributes);
  }
}

/**
 * Simple wrapper for raw ASN.1 objects during decoding
 */
class RawASN1Object extends ASN1Primitive {
  constructor(private readonly tag: number, private readonly content: Uint8Array) {
    super();
  }

  getEncoded(): Uint8Array {
    return DEREncoder.encodeTLV(this.tag, this.content);
  }

  getTag(): number {
    return this.tag;
  }

  isConstructed(): boolean {
    return (this.tag & ASN1Tags.CONSTRUCTED) !== 0;
  }

  getEncodedLength(): number {
    return this.getEncoded().length;
  }

  getContent(): Uint8Array {
    return this.content;
  }
}
