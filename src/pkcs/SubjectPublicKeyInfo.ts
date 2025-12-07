import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { ASN1BitString } from '../asn1/ASN1BitString';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * SubjectPublicKeyInfo
 * 
 * SubjectPublicKeyInfo ::= SEQUENCE {
 *   algorithm         AlgorithmIdentifier,
 *   subjectPublicKey  BIT STRING
 * }
 * 
 * Matches org.bouncycastle.asn1.x509.SubjectPublicKeyInfo
 */
export class SubjectPublicKeyInfo extends ASN1Primitive {
  private readonly algorithm: AlgorithmIdentifier;
  private readonly publicKey: ASN1BitString;

  constructor(algorithm: AlgorithmIdentifier, publicKey: Uint8Array) {
    super();
    this.algorithm = algorithm;
    // Public keys in SubjectPublicKeyInfo have no unused bits
    this.publicKey = new ASN1BitString(publicKey, 0);
  }

  /**
   * Get the algorithm identifier
   */
  getAlgorithm(): AlgorithmIdentifier {
    return this.algorithm;
  }

  /**
   * Get the public key bytes
   */
  getPublicKeyData(): ASN1BitString {
    return this.publicKey;
  }

  /**
   * Get the public key as bytes
   */
  getPublicKey(): Uint8Array {
    return this.publicKey.getBytes();
  }

  /**
   * Parse public key data (for EC keys)
   */
  parsePublicKey(): Uint8Array {
    return this.publicKey.getOctets();
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [
      this.algorithm.getEncoded(),
      this.publicKey.getEncoded()
    ];

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
  static fromEncoded(encoded: Uint8Array): SubjectPublicKeyInfo {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length !== 2) {
      throw new Error('SubjectPublicKeyInfo must have exactly 2 elements');
    }

    // Parse algorithm identifier
    const algorithmEncoded = DEREncoder.encodeTLV(elements[0].tag, elements[0].content);
    const algorithm = AlgorithmIdentifier.fromEncoded(algorithmEncoded);

    // Parse public key bit string
    const { bits } = DERDecoder.decodeBitString(elements[1].content);

    return new SubjectPublicKeyInfo(algorithm, bits);
  }
}
