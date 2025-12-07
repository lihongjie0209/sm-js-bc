import { PKCS10CertificationRequest, CertificationRequestInfo } from './PKCS10CertificationRequest';
import { X509Name } from '../x509/X509Name';
import { SubjectPublicKeyInfo } from './SubjectPublicKeyInfo';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { GMObjectIdentifiers } from '../asn1/GMObjectIdentifiers';
import { SM2Signer } from '../crypto/signers/SM2Signer';
import { ECPrivateKeyParameters } from '../crypto/params/ECPrivateKeyParameters';
import { SM2 } from '../crypto/SM2';
import { ASN1ObjectIdentifier } from '../asn1/ASN1ObjectIdentifier';

/**
 * PKCS#10 Certificate Signing Request Builder
 * 
 * Builds PKCS#10 CSR with SM2 signature
 * Matches org.bouncycastle.pkcs.PKCS10CertificationRequestBuilder functionality
 */
export class PKCS10CertificationRequestBuilder {
  private subject?: X509Name;
  private subjectPublicKeyInfo?: SubjectPublicKeyInfo;
  private attributes: Map<string, Uint8Array> = new Map();

  /**
   * Set the subject name
   */
  setSubject(subject: X509Name): this {
    this.subject = subject;
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
   * Add an attribute to the CSR
   * 
   * @param oid The attribute OID
   * @param value The attribute value (DER encoded)
   */
  addAttribute(oid: ASN1ObjectIdentifier, value: Uint8Array): this {
    this.attributes.set(oid.getId(), value);
    return this;
  }

  /**
   * Build and sign the CSR using SM2
   * 
   * @param privateKey The private key to sign with (ECPrivateKeyParameters or bigint)
   * @returns The signed PKCS#10 CSR
   */
  build(privateKey: ECPrivateKeyParameters | bigint): PKCS10CertificationRequest {
    // Validate required fields
    if (!this.subject) {
      throw new Error('Subject is required');
    }
    if (!this.subjectPublicKeyInfo) {
      throw new Error('Subject public key is required');
    }

    // Convert bigint to ECPrivateKeyParameters if needed
    let privateKeyParams: ECPrivateKeyParameters;
    if (typeof privateKey === 'bigint') {
      const domainParams = SM2.getParameters();
      privateKeyParams = new ECPrivateKeyParameters(privateKey, domainParams);
    } else {
      privateKeyParams = privateKey;
    }

    // Create signature algorithm identifier (SM2 with SM3)
    // TODO: Make signature algorithm configurable via builder pattern
    // to support other algorithms in the future
    const signatureAlgorithm = new AlgorithmIdentifier(GMObjectIdentifiers.sm2_with_sm3);

    // Create CertificationRequestInfo
    const certificationRequestInfo = new CertificationRequestInfo(
      0, // version = v1
      this.subject,
      this.subjectPublicKeyInfo,
      this.attributes.size > 0 ? this.attributes : undefined
    );

    // Get CSR info bytes
    const csrInfoBytes = certificationRequestInfo.getEncoded();

    // Sign the CSR info
    const signer = new SM2Signer();
    signer.init(true, privateKeyParams);
    signer.update(csrInfoBytes, 0, csrInfoBytes.length);
    const signature = signer.generateSignature();

    // Create and return the CSR
    return new PKCS10CertificationRequest(
      certificationRequestInfo,
      signatureAlgorithm,
      signature
    );
  }

  /**
   * Generate a CSR for an SM2 key pair
   * 
   * @param subject The subject name
   * @param keyPair The SM2 key pair {privateKey, publicKey: {x, y}}
   * @returns The signed PKCS#10 CSR
   */
  static generate(
    subject: X509Name,
    keyPair: { privateKey: bigint; publicKey: { x: bigint; y: bigint } }
  ): PKCS10CertificationRequest {
    // Create SubjectPublicKeyInfo
    const algorithm = new AlgorithmIdentifier(GMObjectIdentifiers.sm2);
    const publicKeyBytes = PKCS10CertificationRequestBuilder.encodeUncompressedPoint(
      keyPair.publicKey.x,
      keyPair.publicKey.y
    );
    const subjectPublicKeyInfo = new SubjectPublicKeyInfo(algorithm, publicKeyBytes);

    // Build CSR
    const builder = new PKCS10CertificationRequestBuilder()
      .setSubject(subject)
      .setPublicKey(subjectPublicKeyInfo);

    return builder.build(keyPair.privateKey);
  }

  /**
   * Encode EC point in uncompressed format: 0x04 || X || Y
   */
  private static encodeUncompressedPoint(x: bigint, y: bigint): Uint8Array {
    const bytes = new Uint8Array(65); // 1 + 32 + 32
    bytes[0] = 0x04; // Uncompressed point indicator

    // Encode X coordinate (32 bytes)
    PKCS10CertificationRequestBuilder.writeBigIntToBytes(x, bytes, 1, 32);

    // Encode Y coordinate (32 bytes)
    PKCS10CertificationRequestBuilder.writeBigIntToBytes(y, bytes, 33, 32);

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
