import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { ASN1Integer } from '../asn1/ASN1Integer';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { X509Name } from './X509Name';
import { Validity } from './Validity';
import { SubjectPublicKeyInfo } from '../pkcs/SubjectPublicKeyInfo';
import { X509Extensions } from './X509Extensions';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * TBSCertificate (To Be Signed Certificate)
 * 
 * TBSCertificate ::= SEQUENCE {
 *   version         [0]  Version DEFAULT v1,
 *   serialNumber         CertificateSerialNumber,
 *   signature            AlgorithmIdentifier,
 *   issuer               Name,
 *   validity             Validity,
 *   subject              Name,
 *   subjectPublicKeyInfo SubjectPublicKeyInfo,
 *   issuerUniqueID  [1]  IMPLICIT UniqueIdentifier OPTIONAL,
 *   subjectUniqueID [2]  IMPLICIT UniqueIdentifier OPTIONAL,
 *   extensions      [3]  Extensions OPTIONAL
 * }
 * 
 * Version ::= INTEGER { v1(0), v2(1), v3(2) }
 * 
 * Matches org.bouncycastle.asn1.x509.TBSCertificate
 */
export class TBSCertificate extends ASN1Primitive {
  constructor(
    public readonly version: number,
    public readonly serialNumber: bigint,
    public readonly signature: AlgorithmIdentifier,
    public readonly issuer: X509Name,
    public readonly validity: Validity,
    public readonly subject: X509Name,
    public readonly subjectPublicKeyInfo: SubjectPublicKeyInfo,
    public readonly extensions?: X509Extensions
  ) {
    super();
  }

  /**
   * Get the version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get the serial number
   */
  getSerialNumber(): bigint {
    return this.serialNumber;
  }

  /**
   * Get the signature algorithm
   */
  getSignature(): AlgorithmIdentifier {
    return this.signature;
  }

  /**
   * Get the issuer
   */
  getIssuer(): X509Name {
    return this.issuer;
  }

  /**
   * Get the validity
   */
  getValidity(): Validity {
    return this.validity;
  }

  /**
   * Get the subject
   */
  getSubject(): X509Name {
    return this.subject;
  }

  /**
   * Get the subject public key info
   */
  getSubjectPublicKeyInfo(): SubjectPublicKeyInfo {
    return this.subjectPublicKeyInfo;
  }

  /**
   * Get the extensions
   */
  getExtensions(): X509Extensions | undefined {
    return this.extensions;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [];

    // Add version if not v1 (v1 is default, so omit if version is 0)
    if (this.version !== 0) {
      const versionInteger = new ASN1Integer(this.version).getEncoded();
      // Wrap in [0] EXPLICIT tag
      const versionTagged = DEREncoder.encodeTLV(0xa0, versionInteger);
      elements.push(versionTagged);
    }

    // Add serial number
    elements.push(new ASN1Integer(this.serialNumber).getEncoded());

    // Add signature algorithm
    elements.push(this.signature.getEncoded());

    // Add issuer
    elements.push(this.issuer.getEncoded());

    // Add validity
    elements.push(this.validity.getEncoded());

    // Add subject
    elements.push(this.subject.getEncoded());

    // Add subject public key info
    elements.push(this.subjectPublicKeyInfo.getEncoded());

    // Add extensions if present (wrapped in [3] EXPLICIT tag)
    if (this.extensions && !this.extensions.isEmpty()) {
      const extensionsEncoded = this.extensions.getEncoded();
      const extensionsTagged = DEREncoder.encodeTLV(0xa3, extensionsEncoded);
      elements.push(extensionsTagged);
    }

    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      elements
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
  static fromEncoded(encoded: Uint8Array): TBSCertificate {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    let idx = 0;

    // Parse version (optional, default v1)
    let version = 0;
    if (elements[idx].tag === 0xa0) {
      // Extract version from [0] EXPLICIT tag
      const versionContent = elements[idx].content;
      const versionTLV = DERDecoder.decodeTLV(versionContent, 0);
      version = Number(DERDecoder.decodeInteger(versionTLV.content));
      idx++;
    }

    // Parse serial number
    const serialNumber = DERDecoder.decodeInteger(elements[idx++].content);

    // Parse signature algorithm
    const signatureEncoded = DEREncoder.encodeTLV(elements[idx].tag, elements[idx].content);
    const signature = AlgorithmIdentifier.fromEncoded(signatureEncoded);
    idx++;

    // Parse issuer
    const issuerEncoded = DEREncoder.encodeTLV(elements[idx].tag, elements[idx].content);
    const issuer = X509Name.fromEncoded(issuerEncoded);
    idx++;

    // Parse validity
    const validityEncoded = DEREncoder.encodeTLV(elements[idx].tag, elements[idx].content);
    const validity = Validity.fromEncoded(validityEncoded);
    idx++;

    // Parse subject
    const subjectEncoded = DEREncoder.encodeTLV(elements[idx].tag, elements[idx].content);
    const subject = X509Name.fromEncoded(subjectEncoded);
    idx++;

    // Parse subject public key info
    const spkiEncoded = DEREncoder.encodeTLV(elements[idx].tag, elements[idx].content);
    const subjectPublicKeyInfo = SubjectPublicKeyInfo.fromEncoded(spkiEncoded);
    idx++;

    // Parse extensions (optional, tagged with [3])
    let extensions: X509Extensions | undefined;
    if (idx < elements.length && elements[idx].tag === 0xa3) {
      // Extract extensions from [3] EXPLICIT tag
      const extensionsContent = elements[idx].content;
      const extensionsEncoded = DEREncoder.encodeTLV(
        ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
        extensionsContent
      );
      extensions = X509Extensions.fromEncoded(extensionsEncoded);
    }

    return new TBSCertificate(
      version,
      serialNumber,
      signature,
      issuer,
      validity,
      subject,
      subjectPublicKeyInfo,
      extensions
    );
  }
}
