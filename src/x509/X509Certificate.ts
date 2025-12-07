import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { ASN1BitString } from '../asn1/ASN1BitString';
import { TBSCertificate } from './TBSCertificate';
import { X509Name } from './X509Name';
import { X509Extensions } from './X509Extensions';
import { SubjectPublicKeyInfo } from '../pkcs/SubjectPublicKeyInfo';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';
import { PemReader } from '../util/io/pem/PemReader';
import { PemWriter } from '../util/io/pem/PemWriter';
import { PemObject } from '../util/io/pem/PemObject';
import { SM2Signer } from '../crypto/signers/SM2Signer';
import { ECPrivateKeyParameters } from '../crypto/params/ECPrivateKeyParameters';
import { ECPublicKeyParameters } from '../crypto/params/ECPublicKeyParameters';
import { ECDomainParameters } from '../crypto/params/ECDomainParameters';
import { SM2 } from '../crypto/SM2';
import { GMObjectIdentifiers } from '../asn1/GMObjectIdentifiers';

/**
 * X.509 Certificate
 * 
 * Certificate ::= SEQUENCE {
 *   tbsCertificate       TBSCertificate,
 *   signatureAlgorithm   AlgorithmIdentifier,
 *   signatureValue       BIT STRING
 * }
 * 
 * Matches org.bouncycastle.asn1.x509.Certificate / X509CertificateHolder
 */
export class X509Certificate extends ASN1Primitive {
  constructor(
    public readonly tbsCertificate: TBSCertificate,
    public readonly signatureAlgorithm: AlgorithmIdentifier,
    public readonly signatureValue: Uint8Array
  ) {
    super();
  }

  /**
   * Get the version
   */
  getVersion(): number {
    return this.tbsCertificate.getVersion();
  }

  /**
   * Get the serial number
   */
  getSerialNumber(): bigint {
    return this.tbsCertificate.getSerialNumber();
  }

  /**
   * Get the issuer
   */
  getIssuer(): X509Name {
    return this.tbsCertificate.getIssuer();
  }

  /**
   * Get the subject
   */
  getSubject(): X509Name {
    return this.tbsCertificate.getSubject();
  }

  /**
   * Get the public key info
   */
  getSubjectPublicKeyInfo(): SubjectPublicKeyInfo {
    return this.tbsCertificate.getSubjectPublicKeyInfo();
  }

  /**
   * Get the not before date
   */
  getNotBefore(): Date {
    return this.tbsCertificate.getValidity().notBefore;
  }

  /**
   * Get the not after date
   */
  getNotAfter(): Date {
    return this.tbsCertificate.getValidity().notAfter;
  }

  /**
   * Get the extensions
   */
  getExtensions(): X509Extensions | undefined {
    return this.tbsCertificate.getExtensions();
  }

  /**
   * Get the signature algorithm
   */
  getSignatureAlgorithm(): AlgorithmIdentifier {
    return this.signatureAlgorithm;
  }

  /**
   * Get the signature value
   */
  getSignature(): Uint8Array {
    return this.signatureValue;
  }

  /**
   * Verify the certificate signature using the issuer's public key
   * 
   * @param issuerPublicKey The issuer's public key parameters
   * @returns true if the signature is valid
   */
  verify(issuerPublicKey: ECPublicKeyParameters): boolean {
    try {
      // Check if algorithm is SM2
      if (!this.signatureAlgorithm.getAlgorithm().equals(GMObjectIdentifiers.sm2_with_sm3)) {
        throw new Error('Only SM2-with-SM3 signature algorithm is supported');
      }

      // Get TBS certificate bytes
      const tbsBytes = this.tbsCertificate.getEncoded();

      // Create signer
      const signer = new SM2Signer();
      signer.init(false, issuerPublicKey);

      // Update with TBS certificate data
      signer.update(tbsBytes, 0, tbsBytes.length);

      // Verify signature
      return signer.verifySignature(this.signatureValue);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [
      this.tbsCertificate.getEncoded(),
      this.signatureAlgorithm.getEncoded(),
      new ASN1BitString(this.signatureValue, 0).getEncoded()
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
  static fromEncoded(encoded: Uint8Array): X509Certificate {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length !== 3) {
      throw new Error('Certificate must have exactly 3 elements');
    }

    // Parse TBS certificate
    const tbsEncoded = DEREncoder.encodeTLV(elements[0].tag, elements[0].content);
    const tbsCertificate = TBSCertificate.fromEncoded(tbsEncoded);

    // Parse signature algorithm
    const sigAlgEncoded = DEREncoder.encodeTLV(elements[1].tag, elements[1].content);
    const signatureAlgorithm = AlgorithmIdentifier.fromEncoded(sigAlgEncoded);

    // Parse signature value
    const { bits: signatureValue } = DERDecoder.decodeBitString(elements[2].content);

    return new X509Certificate(tbsCertificate, signatureAlgorithm, signatureValue);
  }

  /**
   * Decode from PEM encoded string
   */
  static fromPEM(pem: string): X509Certificate {
    const reader = new PemReader(pem);
    const pemObject = reader.readPemObject();

    if (!pemObject) {
      throw new Error('No PEM object found');
    }

    if (pemObject.getType() !== 'CERTIFICATE') {
      throw new Error(`Expected CERTIFICATE, got ${pemObject.getType()}`);
    }

    return X509Certificate.fromEncoded(pemObject.getContent());
  }

  /**
   * Encode to PEM format
   */
  toPEM(): string {
    const der = this.getEncoded();
    const pemObject = new PemObject('CERTIFICATE', new Map(), der);
    return PemWriter.writeObject(pemObject);
  }
}
