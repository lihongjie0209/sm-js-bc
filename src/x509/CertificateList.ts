import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { ASN1Integer } from '../asn1/ASN1Integer';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { ASN1BitString } from '../asn1/ASN1BitString';
import { X509Name } from './X509Name';
import { X509Extensions } from './X509Extensions';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';
import { PemReader } from '../util/io/pem/PemReader';
import { PemWriter } from '../util/io/pem/PemWriter';
import { PemObject } from '../util/io/pem/PemObject';
import { SM2Signer } from '../crypto/signers/SM2Signer';
import { ECPrivateKeyParameters } from '../crypto/params/ECPrivateKeyParameters';
import { ECPublicKeyParameters } from '../crypto/params/ECPublicKeyParameters';
import { GMObjectIdentifiers } from '../asn1/GMObjectIdentifiers';
import { SM2 } from '../crypto/SM2';

/**
 * Revoked Certificate
 * 
 * RevokedCertificate ::= SEQUENCE {
 *   userCertificate    CertificateSerialNumber,
 *   revocationDate     Time,
 *   crlEntryExtensions Extensions OPTIONAL
 * }
 */
export class RevokedCertificate {
  constructor(
    public readonly serialNumber: bigint,
    public readonly revocationDate: Date,
    public readonly extensions?: X509Extensions
  ) {}

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [
      new ASN1Integer(this.serialNumber).getEncoded(),
      this.encodeTime(this.revocationDate)
    ];

    if (this.extensions && !this.extensions.isEmpty()) {
      elements.push(this.extensions.getEncoded());
    }

    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      elements
    );
  }

  private encodeTime(date: Date): Uint8Array {
    const year = date.getUTCFullYear();
    
    if (year < 2050) {
      // UTCTime: YYMMDDhhmmssZ
      const yy = (year % 100).toString().padStart(2, '0');
      const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = date.getUTCDate().toString().padStart(2, '0');
      const hh = date.getUTCHours().toString().padStart(2, '0');
      const min = date.getUTCMinutes().toString().padStart(2, '0');
      const ss = date.getUTCSeconds().toString().padStart(2, '0');
      
      const timeStr = `${yy}${mm}${dd}${hh}${min}${ss}Z`;
      const timeBytes = new TextEncoder().encode(timeStr);
      
      return DEREncoder.encodeTLV(ASN1Tags.UTC_TIME, timeBytes);
    } else {
      // GeneralizedTime: YYYYMMDDhhmmssZ
      const yyyy = year.toString();
      const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = date.getUTCDate().toString().padStart(2, '0');
      const hh = date.getUTCHours().toString().padStart(2, '0');
      const min = date.getUTCMinutes().toString().padStart(2, '0');
      const ss = date.getUTCSeconds().toString().padStart(2, '0');
      
      const timeStr = `${yyyy}${mm}${dd}${hh}${min}${ss}Z`;
      const timeBytes = new TextEncoder().encode(timeStr);
      
      return DEREncoder.encodeTLV(ASN1Tags.GENERALIZED_TIME, timeBytes);
    }
  }
}

/**
 * TBSCertList (To Be Signed Certificate List)
 * 
 * TBSCertList ::= SEQUENCE {
 *   version             Version OPTIONAL,
 *   signature           AlgorithmIdentifier,
 *   issuer              Name,
 *   thisUpdate          Time,
 *   nextUpdate          Time OPTIONAL,
 *   revokedCertificates SEQUENCE OF RevokedCertificate OPTIONAL,
 *   crlExtensions       [0] Extensions OPTIONAL
 * }
 */
export class TBSCertList extends ASN1Primitive {
  constructor(
    public readonly version: number,
    public readonly signature: AlgorithmIdentifier,
    public readonly issuer: X509Name,
    public readonly thisUpdate: Date,
    public readonly nextUpdate: Date | undefined,
    public readonly revokedCertificates: RevokedCertificate[],
    public readonly extensions?: X509Extensions
  ) {
    super();
  }

  getEncoded(): Uint8Array {
    const elements: Uint8Array[] = [];

    // Add version if not v1
    if (this.version !== 0) {
      elements.push(new ASN1Integer(this.version).getEncoded());
    }

    // Add signature algorithm
    elements.push(this.signature.getEncoded());

    // Add issuer
    elements.push(this.issuer.getEncoded());

    // Add thisUpdate
    elements.push(this.encodeTime(this.thisUpdate));

    // Add nextUpdate if present
    if (this.nextUpdate) {
      elements.push(this.encodeTime(this.nextUpdate));
    }

    // Add revoked certificates if present
    if (this.revokedCertificates.length > 0) {
      const revokedEncoded = this.revokedCertificates.map(rc => rc.getEncoded());
      const revokedSeq = DEREncoder.encodeSequence(
        ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
        revokedEncoded
      );
      elements.push(revokedSeq);
    }

    // Add extensions if present
    if (this.extensions && !this.extensions.isEmpty()) {
      const extensionsEncoded = this.extensions.getEncoded();
      const extensionsTagged = DEREncoder.encodeTLV(0xa0, extensionsEncoded);
      elements.push(extensionsTagged);
    }

    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      elements
    );
  }

  private encodeTime(date: Date): Uint8Array {
    const year = date.getUTCFullYear();
    
    if (year < 2050) {
      const yy = (year % 100).toString().padStart(2, '0');
      const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = date.getUTCDate().toString().padStart(2, '0');
      const hh = date.getUTCHours().toString().padStart(2, '0');
      const min = date.getUTCMinutes().toString().padStart(2, '0');
      const ss = date.getUTCSeconds().toString().padStart(2, '0');
      
      const timeStr = `${yy}${mm}${dd}${hh}${min}${ss}Z`;
      const timeBytes = new TextEncoder().encode(timeStr);
      
      return DEREncoder.encodeTLV(ASN1Tags.UTC_TIME, timeBytes);
    } else {
      const yyyy = year.toString();
      const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = date.getUTCDate().toString().padStart(2, '0');
      const hh = date.getUTCHours().toString().padStart(2, '0');
      const min = date.getUTCMinutes().toString().padStart(2, '0');
      const ss = date.getUTCSeconds().toString().padStart(2, '0');
      
      const timeStr = `${yyyy}${mm}${dd}${hh}${min}${ss}Z`;
      const timeBytes = new TextEncoder().encode(timeStr);
      
      return DEREncoder.encodeTLV(ASN1Tags.GENERALIZED_TIME, timeBytes);
    }
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
}

/**
 * Certificate Revocation List (CRL)
 * 
 * CertificateList ::= SEQUENCE {
 *   tbsCertList        TBSCertList,
 *   signatureAlgorithm AlgorithmIdentifier,
 *   signatureValue     BIT STRING
 * }
 * 
 * Matches org.bouncycastle.asn1.x509.CertificateList
 */
export class CertificateList extends ASN1Primitive {
  constructor(
    public readonly tbsCertList: TBSCertList,
    public readonly signatureAlgorithm: AlgorithmIdentifier,
    public readonly signatureValue: Uint8Array
  ) {
    super();
  }

  /**
   * Get the issuer
   */
  getIssuer(): X509Name {
    return this.tbsCertList.issuer;
  }

  /**
   * Get this update date
   */
  getThisUpdate(): Date {
    return this.tbsCertList.thisUpdate;
  }

  /**
   * Get next update date
   */
  getNextUpdate(): Date | undefined {
    return this.tbsCertList.nextUpdate;
  }

  /**
   * Get revoked certificates
   */
  getRevokedCertificates(): RevokedCertificate[] {
    return this.tbsCertList.revokedCertificates;
  }

  /**
   * Check if a certificate is revoked
   */
  isRevoked(serialNumber: bigint): boolean {
    return this.tbsCertList.revokedCertificates.some(
      rc => rc.serialNumber === serialNumber
    );
  }

  /**
   * Verify the CRL signature
   */
  verify(issuerPublicKey: ECPublicKeyParameters): boolean {
    try {
      if (!this.signatureAlgorithm.getAlgorithm().equals(GMObjectIdentifiers.sm2_with_sm3)) {
        throw new Error('Only SM2-with-SM3 signature algorithm is supported');
      }

      const tbsBytes = this.tbsCertList.getEncoded();

      const signer = new SM2Signer();
      signer.init(false, issuerPublicKey);
      signer.update(tbsBytes, 0, tbsBytes.length);

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
      this.tbsCertList.getEncoded(),
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
   * Decode from PEM encoded string
   */
  static fromPEM(pem: string): CertificateList {
    const reader = new PemReader(pem);
    const pemObject = reader.readPemObject();

    if (!pemObject) {
      throw new Error('No PEM object found');
    }

    if (pemObject.getType() !== 'X509 CRL') {
      throw new Error(`Expected X509 CRL, got ${pemObject.getType()}`);
    }

    return CertificateList.fromEncoded(pemObject.getContent());
  }

  /**
   * Decode from DER encoded bytes
   */
  static fromEncoded(encoded: Uint8Array): CertificateList {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length !== 3) {
      throw new Error('CertificateList must have exactly 3 elements');
    }

    // For simplicity, we'll provide basic parsing
    // Full implementation would require complete TBSCertList parsing
    throw new Error('CRL decoding not fully implemented - use CRLBuilder to create CRLs');
  }

  /**
   * Encode to PEM format
   */
  toPEM(): string {
    const der = this.getEncoded();
    const pemObject = new PemObject('X509 CRL', new Map(), der);
    return PemWriter.writeObject(pemObject);
  }
}

/**
 * CRL Builder
 */
export class CRLBuilder {
  private issuer?: X509Name;
  private thisUpdate?: Date;
  private nextUpdate?: Date;
  private revokedCertificates: RevokedCertificate[] = [];
  private extensions?: X509Extensions;

  setIssuer(issuer: X509Name): this {
    this.issuer = issuer;
    return this;
  }

  setThisUpdate(date: Date): this {
    this.thisUpdate = date;
    return this;
  }

  setNextUpdate(date: Date): this {
    this.nextUpdate = date;
    return this;
  }

  addRevokedCertificate(serialNumber: bigint, revocationDate: Date): this {
    this.revokedCertificates.push(new RevokedCertificate(serialNumber, revocationDate));
    return this;
  }

  setExtensions(extensions: X509Extensions): this {
    this.extensions = extensions;
    return this;
  }

  build(signerKey: ECPrivateKeyParameters | bigint): CertificateList {
    if (!this.issuer) {
      throw new Error('Issuer is required');
    }
    if (!this.thisUpdate) {
      throw new Error('ThisUpdate is required');
    }

    const signatureAlgorithm = new AlgorithmIdentifier(GMObjectIdentifiers.sm2_with_sm3);

    const tbsCertList = new TBSCertList(
      1, // version v2
      signatureAlgorithm,
      this.issuer,
      this.thisUpdate,
      this.nextUpdate,
      this.revokedCertificates,
      this.extensions
    );

    const tbsBytes = tbsCertList.getEncoded();

    // Sign
    let privateKeyParams: ECPrivateKeyParameters;
    if (typeof signerKey === 'bigint') {
      const domainParams = SM2.getParameters();
      privateKeyParams = new ECPrivateKeyParameters(signerKey, domainParams);
    } else {
      privateKeyParams = signerKey;
    }

    const signer = new SM2Signer();
    signer.init(true, privateKeyParams);
    signer.update(tbsBytes, 0, tbsBytes.length);
    const signature = signer.generateSignature();

    return new CertificateList(tbsCertList, signatureAlgorithm, signature);
  }
}
