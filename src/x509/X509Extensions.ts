import { ASN1Primitive, ASN1Encodable } from '../asn1/ASN1Encodable';
import { ASN1ObjectIdentifier } from '../asn1/ASN1ObjectIdentifier';
import { ASN1OctetString } from '../asn1/ASN1OctetString';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * X.509 Extension
 * 
 * Extension ::= SEQUENCE {
 *   extnID      OBJECT IDENTIFIER,
 *   critical    BOOLEAN DEFAULT FALSE,
 *   extnValue   OCTET STRING
 * }
 */
export class X509Extension {
  constructor(
    public readonly oid: ASN1ObjectIdentifier,
    public readonly critical: boolean,
    public readonly value: Uint8Array
  ) {}

  /**
   * Get the extension OID
   */
  getOID(): ASN1ObjectIdentifier {
    return this.oid;
  }

  /**
   * Check if extension is critical
   */
  isCritical(): boolean {
    return this.critical;
  }

  /**
   * Get extension value
   */
  getValue(): Uint8Array {
    return this.value;
  }
}

/**
 * X.509 Extensions
 * 
 * Extensions ::= SEQUENCE SIZE (1..MAX) OF Extension
 * 
 * Matches org.bouncycastle.asn1.x509.Extensions
 */
export class X509Extensions extends ASN1Primitive {
  private readonly extensions: Map<string, X509Extension>;

  // Standard extension OIDs
  static readonly KEY_USAGE = new ASN1ObjectIdentifier('2.5.29.15');
  static readonly BASIC_CONSTRAINTS = new ASN1ObjectIdentifier('2.5.29.19');
  static readonly SUBJECT_ALT_NAME = new ASN1ObjectIdentifier('2.5.29.17');
  static readonly ISSUER_ALT_NAME = new ASN1ObjectIdentifier('2.5.29.18');
  static readonly SUBJECT_KEY_IDENTIFIER = new ASN1ObjectIdentifier('2.5.29.14');
  static readonly AUTHORITY_KEY_IDENTIFIER = new ASN1ObjectIdentifier('2.5.29.35');
  static readonly EXTENDED_KEY_USAGE = new ASN1ObjectIdentifier('2.5.29.37');

  constructor() {
    super();
    this.extensions = new Map();
  }

  /**
   * Add an extension
   */
  addExtension(oid: ASN1ObjectIdentifier, critical: boolean, value: Uint8Array): void {
    const extension = new X509Extension(oid, critical, value);
    this.extensions.set(oid.getId(), extension);
  }

  /**
   * Get an extension by OID
   */
  getExtension(oid: ASN1ObjectIdentifier): X509Extension | null {
    return this.extensions.get(oid.getId()) || null;
  }

  /**
   * Get all extensions
   */
  getAllExtensions(): X509Extension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Check if extensions is empty
   */
  isEmpty(): boolean {
    return this.extensions.size === 0;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const extElements: Uint8Array[] = [];

    for (const extension of this.extensions.values()) {
      const elements: Uint8Array[] = [
        extension.oid.getEncoded()
      ];

      // Add critical flag if true (omit if false, as that's the default)
      if (extension.critical) {
        const criticalEncoded = DEREncoder.encodeTLV(
          ASN1Tags.BOOLEAN,
          new Uint8Array([0xff])
        );
        elements.push(criticalEncoded);
      }

      // Add extension value as OCTET STRING
      const valueEncoded = new ASN1OctetString(extension.value).getEncoded();
      elements.push(valueEncoded);

      // Build Extension SEQUENCE
      const extSeq = DEREncoder.encodeSequence(
        ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
        elements
      );

      extElements.push(extSeq);
    }

    // Build Extensions SEQUENCE
    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      extElements
    );
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
  static fromEncoded(encoded: Uint8Array): X509Extensions {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const extensions = new X509Extensions();
    const extElements = DERDecoder.decodeSequence(content);

    for (const extElement of extElements) {
      // Decode Extension SEQUENCE
      const extContent = extElement.content;
      const extParts = DERDecoder.decodeSequence(extContent);

      if (extParts.length >= 2) {
        // Parse OID
        const oid = DERDecoder.decodeOID(extParts[0].content);
        
        // Parse critical flag and value
        let critical = false;
        let valueIndex = 1;

        if (extParts[valueIndex].tag === ASN1Tags.BOOLEAN) {
          critical = extParts[valueIndex].content[0] !== 0;
          valueIndex++;
        }

        // Parse value
        if (valueIndex < extParts.length) {
          const value = extParts[valueIndex].content;
          extensions.addExtension(new ASN1ObjectIdentifier(oid), critical, value);
        }
      }
    }

    return extensions;
  }
}

/**
 * Key Usage extension
 * 
 * KeyUsage ::= BIT STRING {
 *   digitalSignature  (0),
 *   nonRepudiation    (1),
 *   keyEncipherment   (2),
 *   dataEncipherment  (3),
 *   keyAgreement      (4),
 *   keyCertSign       (5),
 *   cRLSign           (6),
 *   encipherOnly      (7),
 *   decipherOnly      (8)
 * }
 */
export enum KeyUsage {
  digitalSignature = 0x80,
  nonRepudiation = 0x40,
  keyEncipherment = 0x20,
  dataEncipherment = 0x10,
  keyAgreement = 0x08,
  keyCertSign = 0x04,
  cRLSign = 0x02,
  encipherOnly = 0x01,
  decipherOnly = 0x8000
}

/**
 * Basic Constraints extension
 * 
 * BasicConstraints ::= SEQUENCE {
 *   cA                 BOOLEAN DEFAULT FALSE,
 *   pathLenConstraint  INTEGER (0..MAX) OPTIONAL
 * }
 */
export class BasicConstraints {
  constructor(
    public readonly isCA: boolean,
    public readonly pathLenConstraint?: number
  ) {}

  /**
   * Encode to DER
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [];

    // Add cA flag if true
    if (this.isCA) {
      const caEncoded = DEREncoder.encodeTLV(
        ASN1Tags.BOOLEAN,
        new Uint8Array([0xff])
      );
      elements.push(caEncoded);
    }

    // Add pathLenConstraint if present
    if (this.pathLenConstraint !== undefined) {
      const pathLenEncoded = DEREncoder.encodeTLV(
        ASN1Tags.INTEGER,
        DEREncoder.encodeInteger(this.pathLenConstraint)
      );
      elements.push(pathLenEncoded);
    }

    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      elements
    );
  }

  /**
   * Decode from DER
   */
  static fromEncoded(encoded: Uint8Array): BasicConstraints {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    let isCA = false;
    let pathLenConstraint: number | undefined;

    for (const element of elements) {
      if (element.tag === ASN1Tags.BOOLEAN) {
        isCA = element.content[0] !== 0;
      } else if (element.tag === ASN1Tags.INTEGER) {
        pathLenConstraint = Number(DERDecoder.decodeInteger(element.content));
      }
    }

    return new BasicConstraints(isCA, pathLenConstraint);
  }
}
