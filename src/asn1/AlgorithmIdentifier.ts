import { ASN1Encodable, ASN1Primitive } from './ASN1Encodable';
import { ASN1ObjectIdentifier } from './ASN1ObjectIdentifier';
import { ASN1Sequence } from './ASN1Sequence';
import { DEREncoder } from './DEREncoder';
import { DERDecoder } from './DERDecoder';
import { ASN1Tags } from './ASN1Tags';

/**
 * AlgorithmIdentifier
 * 
 * AlgorithmIdentifier ::= SEQUENCE {
 *   algorithm   OBJECT IDENTIFIER,
 *   parameters  ANY DEFINED BY algorithm OPTIONAL
 * }
 * 
 * Matches org.bouncycastle.asn1.x509.AlgorithmIdentifier
 */
export class AlgorithmIdentifier extends ASN1Primitive {
  private readonly algorithm: ASN1ObjectIdentifier;
  private readonly parameters?: ASN1Encodable;

  constructor(algorithm: ASN1ObjectIdentifier, parameters?: ASN1Encodable) {
    super();
    this.algorithm = algorithm;
    this.parameters = parameters;
  }

  /**
   * Get the algorithm OID
   */
  getAlgorithm(): ASN1ObjectIdentifier {
    return this.algorithm;
  }

  /**
   * Get the parameters
   */
  getParameters(): ASN1Encodable | undefined {
    return this.parameters;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [
      this.algorithm.getEncoded()
    ];

    if (this.parameters) {
      elements.push(this.parameters.toASN1Primitive().getEncoded());
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
  static fromEncoded(encoded: Uint8Array): AlgorithmIdentifier {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length < 1) {
      throw new Error('AlgorithmIdentifier must have at least algorithm OID');
    }

    const algorithmOid = DERDecoder.decodeOID(elements[0].content);
    const algorithm = new ASN1ObjectIdentifier(algorithmOid);

    let parameters: ASN1Encodable | undefined;
    if (elements.length > 1) {
      // For now, we wrap the parameters as a raw ASN1Primitive
      const paramTag = elements[1].tag;
      const paramContent = elements[1].content;
      parameters = new RawASN1Parameter(paramTag, paramContent);
    }

    return new AlgorithmIdentifier(algorithm, parameters);
  }

  /**
   * Check equality
   */
  equals(other: AlgorithmIdentifier): boolean {
    if (!this.algorithm.equals(other.algorithm)) {
      return false;
    }

    // For simplicity, assume parameters are equal if both undefined or both defined
    return (this.parameters === undefined) === (other.parameters === undefined);
  }
}

/**
 * Simple wrapper for raw ASN.1 parameters during decoding
 */
class RawASN1Parameter extends ASN1Primitive {
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
