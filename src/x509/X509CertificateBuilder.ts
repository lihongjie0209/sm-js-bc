import { X509Certificate } from './X509Certificate';
import { TBSCertificate } from './TBSCertificate';
import { X509Name } from './X509Name';
import { Validity } from './Validity';
import { X509Extensions, BasicConstraints, KeyUsage } from './X509Extensions';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { SubjectPublicKeyInfo } from '../pkcs/SubjectPublicKeyInfo';
import { GMObjectIdentifiers } from '../asn1/GMObjectIdentifiers';
import { SM2Signer } from '../crypto/signers/SM2Signer';
import { ECPrivateKeyParameters } from '../crypto/params/ECPrivateKeyParameters';
import { SM2 } from '../crypto/SM2';
import { ASN1ObjectIdentifier } from '../asn1/ASN1ObjectIdentifier';
import { ASN1BitString } from '../asn1/ASN1BitString';
import { DEREncoder } from '../asn1/DEREncoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * X.509 Certificate Builder
 * 
 * Builds X.509 v3 certificates with SM2 signature
 * Matches org.bouncycastle.cert.X509v3CertificateBuilder functionality
 */
export class X509CertificateBuilder {
  private version: number = 2; // v3 = 2
  private serialNumber?: bigint;
  private issuer?: X509Name;
  private subject?: X509Name;
  private notBefore?: Date;
  private notAfter?: Date;
  private subjectPublicKeyInfo?: SubjectPublicKeyInfo;
  private extensions: X509Extensions = new X509Extensions();

  /**
   * Set the certificate version (0 = v1, 1 = v2, 2 = v3)
   */
  setVersion(version: number): this {
    this.version = version;
    return this;
  }

  /**
   * Set the serial number
   */
  setSerialNumber(serialNumber: bigint): this {
    this.serialNumber = serialNumber;
    return this;
  }

  /**
   * Set the issuer name
   */
  setIssuer(issuer: X509Name): this {
    this.issuer = issuer;
    return this;
  }

  /**
   * Set the subject name
   */
  setSubject(subject: X509Name): this {
    this.subject = subject;
    return this;
  }

  /**
   * Set the validity period
   */
  setValidity(notBefore: Date, notAfter: Date): this {
    this.notBefore = notBefore;
    this.notAfter = notAfter;
    return this;
  }

  /**
   * Set the subject public key
   */
  setPublicKey(subjectPublicKeyInfo: SubjectPublicKeyInfo): this {
    this.subjectPublicKeyInfo = subjectPublicKeyInfo;
    return this;
  }

  /**
   * Add an extension
   */
  addExtension(oid: ASN1ObjectIdentifier, critical: boolean, value: Uint8Array): this {
    this.extensions.addExtension(oid, critical, value);
    return this;
  }

  /**
   * Add Basic Constraints extension
   */
  addBasicConstraints(isCA: boolean, pathLenConstraint?: number): this {
    const bc = new BasicConstraints(isCA, pathLenConstraint);
    this.addExtension(X509Extensions.BASIC_CONSTRAINTS, true, bc.getEncoded());
    return this;
  }

  /**
   * Add Key Usage extension
   */
  addKeyUsage(usages: number): this {
    // Encode as BIT STRING
    const bytes = new Uint8Array([usages]);
    const bitString = new ASN1BitString(bytes, 0);
    
    // Extract content without the TLV wrapper
    const encoded = bitString.getEncoded();
    const content = encoded.slice(2); // Skip tag and length
    
    this.addExtension(X509Extensions.KEY_USAGE, true, content);
    return this;
  }

  /**
   * Build and sign the certificate using SM2
   * 
   * @param signerKey The private key to sign with (ECPrivateKeyParameters or bigint)
   * @returns The signed X.509 certificate
   */
  build(signerKey: ECPrivateKeyParameters | bigint): X509Certificate {
    // Validate required fields
    if (!this.serialNumber) {
      throw new Error('Serial number is required');
    }
    if (!this.issuer) {
      throw new Error('Issuer is required');
    }
    if (!this.subject) {
      throw new Error('Subject is required');
    }
    if (!this.notBefore || !this.notAfter) {
      throw new Error('Validity period is required');
    }
    if (!this.subjectPublicKeyInfo) {
      throw new Error('Subject public key is required');
    }

    // Convert bigint to ECPrivateKeyParameters if needed
    let privateKeyParams: ECPrivateKeyParameters;
    if (typeof signerKey === 'bigint') {
      const domainParams = SM2.getParameters();
      privateKeyParams = new ECPrivateKeyParameters(signerKey, domainParams);
    } else {
      privateKeyParams = signerKey;
    }

    // Create signature algorithm identifier (SM2 with SM3)
    const signatureAlgorithm = new AlgorithmIdentifier(GMObjectIdentifiers.sm2_with_sm3);

    // Create validity
    const validity = new Validity(this.notBefore, this.notAfter);

    // Create TBS certificate
    const tbsCertificate = new TBSCertificate(
      this.version,
      this.serialNumber,
      signatureAlgorithm,
      this.issuer,
      validity,
      this.subject,
      this.subjectPublicKeyInfo,
      this.extensions.isEmpty() ? undefined : this.extensions
    );

    // Get TBS bytes
    const tbsBytes = tbsCertificate.getEncoded();

    // Sign the TBS certificate
    const signer = new SM2Signer();
    signer.init(true, privateKeyParams);
    signer.update(tbsBytes, 0, tbsBytes.length);
    const signatureValue = signer.generateSignature();

    // Create and return the certificate
    return new X509Certificate(tbsCertificate, signatureAlgorithm, signatureValue);
  }

  /**
   * Generate a self-signed SM2 certificate
   * 
   * @param subject The subject/issuer name
   * @param keyPair The SM2 key pair {privateKey, publicKey: {x, y}}
   * @param validity Validity period {notBefore, notAfter}
   * @param serialNumber Optional serial number (generated if not provided)
   * @param isCA Whether this is a CA certificate
   * @returns The self-signed X.509 certificate
   */
  static generateSelfSigned(
    subject: X509Name,
    keyPair: { privateKey: bigint; publicKey: { x: bigint; y: bigint } },
    validity: { notBefore: Date; notAfter: Date },
    serialNumber?: bigint,
    isCA: boolean = false
  ): X509Certificate {
    // Generate serial number if not provided
    if (!serialNumber) {
      serialNumber = BigInt(Date.now());
    }

    // Create SubjectPublicKeyInfo
    const algorithm = new AlgorithmIdentifier(GMObjectIdentifiers.sm2);
    const publicKeyBytes = X509CertificateBuilder.encodeUncompressedPoint(
      keyPair.publicKey.x,
      keyPair.publicKey.y
    );
    const subjectPublicKeyInfo = new SubjectPublicKeyInfo(algorithm, publicKeyBytes);

    // Build certificate
    const builder = new X509CertificateBuilder()
      .setVersion(2) // v3
      .setSerialNumber(serialNumber)
      .setIssuer(subject) // Self-signed: issuer = subject
      .setSubject(subject)
      .setValidity(validity.notBefore, validity.notAfter)
      .setPublicKey(subjectPublicKeyInfo);

    // Add extensions
    if (isCA) {
      builder.addBasicConstraints(true);
      builder.addKeyUsage(KeyUsage.keyCertSign | KeyUsage.cRLSign);
    } else {
      builder.addKeyUsage(KeyUsage.digitalSignature | KeyUsage.keyEncipherment);
    }

    return builder.build(keyPair.privateKey);
  }

  /**
   * Encode EC point in uncompressed format: 0x04 || X || Y
   */
  private static encodeUncompressedPoint(x: bigint, y: bigint): Uint8Array {
    const bytes = new Uint8Array(65); // 1 + 32 + 32
    bytes[0] = 0x04; // Uncompressed point indicator

    // Encode X coordinate (32 bytes)
    X509CertificateBuilder.writeBigIntToBytes(x, bytes, 1, 32);

    // Encode Y coordinate (32 bytes)
    X509CertificateBuilder.writeBigIntToBytes(y, bytes, 33, 32);

    return bytes;
  }

  /**
   * Write bigint to byte array at specified offset
   */
  private static writeBigIntToBytes(value: bigint, bytes: Uint8Array, offset: number, length: number): void {
    let temp = value;
    for (let i = offset + length - 1; i >= offset; i--) {
      bytes[i] = Number(temp & 0xffn);
      temp >>= 8n;
    }
  }
}
