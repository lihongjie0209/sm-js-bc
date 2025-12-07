import { ASN1Encodable, ASN1Primitive } from './ASN1Encodable';
import { ASN1Tags } from './ASN1Tags';
import { DEREncoder } from './DEREncoder';
import { DERDecoder } from './DERDecoder';

/**
 * ASN.1 Sequence
 * 
 * Matches org.bouncycastle.asn1.ASN1Sequence / DERSequence
 */
export class ASN1Sequence extends ASN1Primitive {
  private readonly elements: ASN1Encodable[];

  constructor(elements: ASN1Encodable[]) {
    super();
    this.elements = elements;
  }

  /**
   * Get the number of elements
   */
  size(): number {
    return this.elements.length;
  }

  /**
   * Get an element at the specified index
   */
  getObjectAt(index: number): ASN1Encodable {
    if (index < 0 || index >= this.elements.length) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    return this.elements[index];
  }

  /**
   * Get all elements
   */
  getObjects(): ASN1Encodable[] {
    return this.elements;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const encodedElements = this.elements.map(el => 
      el.toASN1Primitive().getEncoded()
    );
    return DEREncoder.encodeSequence(ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED, encodedElements);
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
  static fromEncoded(encoded: Uint8Array): ASN1Sequence {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    // For now, return a sequence with raw content
    // In a full implementation, we would recursively decode elements
    const elements = DERDecoder.decodeSequence(content).map(({ tag, content }) => {
      // Create a simple wrapper for raw ASN1 data
      return new RawASN1Object(tag, content);
    });

    return new ASN1Sequence(elements);
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
