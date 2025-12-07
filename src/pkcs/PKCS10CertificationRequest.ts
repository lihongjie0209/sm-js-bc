import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { ASN1BitString } from '../asn1/ASN1BitString';
import { X509Name } from '../x509/X509Name';
import { SubjectPublicKeyInfo } from './SubjectPublicKeyInfo';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';
import { PemReader } from '../util/io/pem/PemReader';
import { PemWriter } from '../util/io/pem/PemWriter';
import { PemObject } from '../util/io/pem/PemObject';
import { SM2Signer } from '../crypto/signers/SM2Signer';
import { ECPrivateKeyParameters } from '../crypto/params/ECPrivateKeyParameters';
import { ECPublicKeyParameters } from '../crypto/params/ECPublicKeyParameters';
import { SM2 } from '../crypto/SM2';
import { GMObjectIdentifiers } from '../asn1/GMObjectIdentifiers';
import { ASN1ObjectIdentifier } from '../asn1/ASN1ObjectIdentifier';

/**
 * CertificationRequestInfo
 * 
 * CertificationRequestInfo ::= SEQUENCE {
 *   version       INTEGER { v1(0) },
 *   subject       Name,
 *   subjectPKInfo SubjectPublicKeyInfo,
 *   attributes    [0] Attributes
 * }
 * 
 * Attributes ::= SET OF Attribute
 */
export class CertificationRequestInfo extends ASN1Primitive {
  constructor(
    public readonly version: number,
    public readonly subject: X509Name,
    public readonly subjectPKInfo: SubjectPublicKeyInfo,
    public readonly attributes?: Map<string, Uint8Array>
  ) {
    super();
  }

  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [
      DEREncoder.encodeTLV(ASN1Tags.INTEGER, DEREncoder.encodeInteger(this.version)),
      this.subject.getEncoded(),
      this.subjectPKInfo.getEncoded()
    ];

    // Add attributes if present (tagged with [0])
    if (this.attributes && this.attributes.size > 0) {
      const attrElements: Uint8Array[] = [];
      for (const [oid, value] of this.attributes) {
        const attrSeq = DEREncoder.encodeSequence(
          ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
          [
            new ASN1ObjectIdentifier(oid).getEncoded(),
            DEREncoder.encodeTLV(ASN1Tags.SET | ASN1Tags.CONSTRUCTED, value)
          ]
        );
        attrElements.push(attrSeq);
      }
      
      const attrSet = DEREncoder.encodeSequence(
        ASN1Tags.SET | ASN1Tags.CONSTRUCTED,
        attrElements
      );
      const taggedAttr = DEREncoder.encodeTLV(0xa0, attrSet);
      elements.push(taggedAttr);
    }

    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      elements
    );
  }

  getTag(): number {
    return ASN1Tags.SEQUENCE;
  }

  isConstructed(): boolean {
    return true;
  }

  getEncodedLength(): number {
    return this.getEncoded().length;
  }

  static fromEncoded(encoded: Uint8Array): CertificationRequestInfo {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length < 3) {
      throw new Error('CertificationRequestInfo must have at least version, subject, and subjectPKInfo');
    }

    // Parse version
    const version = Number(DERDecoder.decodeInteger(elements[0].content));

    // Parse subject
    const subjectEncoded = DEREncoder.encodeTLV(elements[1].tag, elements[1].content);
    const subject = X509Name.fromEncoded(subjectEncoded);

    // Parse subjectPKInfo
    const spkiEncoded = DEREncoder.encodeTLV(elements[2].tag, elements[2].content);
    const subjectPKInfo = SubjectPublicKeyInfo.fromEncoded(spkiEncoded);

    // Parse attributes if present
    let attributes: Map<string, Uint8Array> | undefined;
    if (elements.length > 3 && elements[3].tag === 0xa0) {
      attributes = new Map();
      // Parse attributes from [0] tag
      const attrContent = elements[3].content;
      const attrElements = DERDecoder.decodeSequence(attrContent);
      
      for (const attrElement of attrElements) {
        const attrSeq = DERDecoder.decodeSequence(attrElement.content);
        if (attrSeq.length >= 2) {
          const oid = DERDecoder.decodeOID(attrSeq[0].content);
          const value = attrSeq[1].content;
          attributes.set(oid, value);
        }
      }
    }

    return new CertificationRequestInfo(version, subject, subjectPKInfo, attributes);
  }
}

/**
 * PKCS#10 Certificate Signing Request
 * 
 * CertificationRequest ::= SEQUENCE {
 *   certificationRequestInfo  CertificationRequestInfo,
 *   signatureAlgorithm        AlgorithmIdentifier,
 *   signature                 BIT STRING
 * }
 * 
 * Matches org.bouncycastle.pkcs.PKCS10CertificationRequest
 */
export class PKCS10CertificationRequest extends ASN1Primitive {
  constructor(
    public readonly certificationRequestInfo: CertificationRequestInfo,
    public readonly signatureAlgorithm: AlgorithmIdentifier,
    public readonly signature: Uint8Array
  ) {
    super();
  }

  /**
   * Get the subject name
   */
  getSubject(): X509Name {
    return this.certificationRequestInfo.subject;
  }

  /**
   * Get the subject public key info
   */
  getSubjectPublicKeyInfo(): SubjectPublicKeyInfo {
    return this.certificationRequestInfo.subjectPKInfo;
  }

  /**
   * Get the signature algorithm
   */
  getSignatureAlgorithm(): AlgorithmIdentifier {
    return this.signatureAlgorithm;
  }

  /**
   * Verify the CSR signature
   */
  verify(): boolean {
    try {
      // Get the public key from the CSR
      const publicKeyBytes = this.certificationRequestInfo.subjectPKInfo.getPublicKey();
      
      // Decode the uncompressed point (0x04 || X || Y)
      if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
        throw new Error('Invalid public key format');
      }

      // Extract X and Y coordinates
      const x = this.bytesToBigInt(publicKeyBytes.slice(1, 33));
      const y = this.bytesToBigInt(publicKeyBytes.slice(33, 65));

      // Create public key parameters
      const domainParams = SM2.getParameters();
      const curve = domainParams.getCurve();
      const Q = curve.createPoint(x, y);
      const publicKeyParams = new ECPublicKeyParameters(Q, domainParams);

      // Get the CSR info bytes
      const csrInfoBytes = this.certificationRequestInfo.getEncoded();

      // Create signer and verify
      const signer = new SM2Signer();
      signer.init(false, publicKeyParams);
      signer.update(csrInfoBytes, 0, csrInfoBytes.length);

      return signer.verifySignature(this.signature);
    } catch (error) {
      return false;
    }
  }

  private bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [
      this.certificationRequestInfo.getEncoded(),
      this.signatureAlgorithm.getEncoded(),
      new ASN1BitString(this.signature, 0).getEncoded()
    ];

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
   * Decode from DER encoded bytes
   */
  static fromEncoded(encoded: Uint8Array): PKCS10CertificationRequest {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length !== 3) {
      throw new Error('CertificationRequest must have exactly 3 elements');
    }

    // Parse CertificationRequestInfo
    const csrInfoEncoded = DEREncoder.encodeTLV(elements[0].tag, elements[0].content);
    const certificationRequestInfo = CertificationRequestInfo.fromEncoded(csrInfoEncoded);

    // Parse signature algorithm
    const sigAlgEncoded = DEREncoder.encodeTLV(elements[1].tag, elements[1].content);
    const signatureAlgorithm = AlgorithmIdentifier.fromEncoded(sigAlgEncoded);

    // Parse signature
    const { bits: signature } = DERDecoder.decodeBitString(elements[2].content);

    return new PKCS10CertificationRequest(
      certificationRequestInfo,
      signatureAlgorithm,
      signature
    );
  }

  /**
   * Decode from PEM encoded string
   */
  static fromPEM(pem: string): PKCS10CertificationRequest {
    const reader = new PemReader(pem);
    const pemObject = reader.readPemObject();

    if (!pemObject) {
      throw new Error('No PEM object found');
    }

    const type = pemObject.getType();
    if (type !== 'CERTIFICATE REQUEST' && type !== 'NEW CERTIFICATE REQUEST') {
      throw new Error(`Expected CERTIFICATE REQUEST, got ${type}`);
    }

    return PKCS10CertificationRequest.fromEncoded(pemObject.getContent());
  }

  /**
   * Encode to PEM format
   */
  toPEM(): string {
    const der = this.getEncoded();
    const pemObject = new PemObject('CERTIFICATE REQUEST', new Map(), der);
    return PemWriter.writeObject(pemObject);
  }
}
