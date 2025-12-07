import { PrivateKeyInfo } from './PrivateKeyInfo';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { GMObjectIdentifiers } from '../asn1/GMObjectIdentifiers';
import { ASN1Integer } from '../asn1/ASN1Integer';
import { ASN1OctetString } from '../asn1/ASN1OctetString';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';
import { PemReader } from '../util/io/pem/PemReader';
import { PemWriter } from '../util/io/pem/PemWriter';
import { PemObject } from '../util/io/pem/PemObject';

/**
 * SM2 Private Key Encoder
 * 
 * Encodes/decodes SM2 private keys to/from PKCS#8 format
 * Matches org.bouncycastle.jcajce.provider.asymmetric.ec functionality
 */
export class SM2PrivateKeyEncoder {
  /**
   * Encode SM2 private key to PKCS#8 DER format
   * 
   * @param privateKey The SM2 private key as bigint
   * @returns DER encoded PKCS#8 private key
   */
  static encodeToDER(privateKey: bigint): Uint8Array {
    // Create ECPrivateKey structure
    // ECPrivateKey ::= SEQUENCE {
    //   version        INTEGER { ecPrivkeyVer1(1) },
    //   privateKey     OCTET STRING,
    //   parameters [0] EXPLICIT ECParameters OPTIONAL,
    //   publicKey  [1] EXPLICIT BIT STRING OPTIONAL
    // }

    // Encode private key as 32-byte octet string
    const privateKeyBytes = SM2PrivateKeyEncoder.bigIntToBytes(privateKey, 32);

    // Build ECPrivateKey SEQUENCE
    const ecPrivateKeyElements: Uint8Array[] = [
      new ASN1Integer(1).getEncoded(), // version = 1
      new ASN1OctetString(privateKeyBytes).getEncoded()
      // We omit parameters and publicKey for simplicity
    ];

    const ecPrivateKeyEncoded = DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      ecPrivateKeyElements
    );

    // Create AlgorithmIdentifier with SM2 OID
    const algorithm = new AlgorithmIdentifier(
      GMObjectIdentifiers.sm2
      // No parameters for SM2
    );

    // Create PrivateKeyInfo
    const privateKeyInfo = new PrivateKeyInfo(algorithm, ecPrivateKeyEncoded);

    return privateKeyInfo.getEncoded();
  }

  /**
   * Encode SM2 private key to PKCS#8 PEM format
   * 
   * @param privateKey The SM2 private key as bigint
   * @returns PEM encoded PKCS#8 private key
   */
  static encodeToPEM(privateKey: bigint): string {
    const der = SM2PrivateKeyEncoder.encodeToDER(privateKey);
    const pemObject = new PemObject('PRIVATE KEY', new Map(), der);
    return PemWriter.writeObject(pemObject);
  }

  /**
   * Decode SM2 private key from PKCS#8 DER format
   * 
   * @param der DER encoded PKCS#8 private key
   * @returns SM2 private key as bigint
   */
  static decodeFromDER(der: Uint8Array): bigint {
    // Parse PrivateKeyInfo
    const privateKeyInfo = PrivateKeyInfo.fromEncoded(der);

    // Verify algorithm is SM2
    const algorithm = privateKeyInfo.getPrivateKeyAlgorithm();
    if (!algorithm.getAlgorithm().equals(GMObjectIdentifiers.sm2)) {
      throw new Error(`Expected SM2 algorithm, got ${algorithm.getAlgorithm().getId()}`);
    }

    // Get the private key bytes (which should be an ECPrivateKey SEQUENCE)
    const ecPrivateKeyBytes = privateKeyInfo.getPrivateKey().getOctets();

    // Parse ECPrivateKey SEQUENCE
    const { tag, content } = DERDecoder.decodeTLV(ecPrivateKeyBytes, 0);
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected ECPrivateKey SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    if (elements.length < 2) {
      throw new Error('ECPrivateKey must have at least version and privateKey');
    }

    // Parse version
    const version = DERDecoder.decodeInteger(elements[0].content);
    if (version !== 1n) {
      throw new Error(`Unsupported ECPrivateKey version: ${version}`);
    }

    // Parse private key bytes
    const privateKeyBytes = elements[1].content;

    // Convert bytes to bigint
    return SM2PrivateKeyEncoder.bytesToBigInt(privateKeyBytes);
  }

  /**
   * Decode SM2 private key from PKCS#8 PEM format
   * 
   * @param pem PEM encoded PKCS#8 private key
   * @returns SM2 private key as bigint
   */
  static decodeFromPEM(pem: string): bigint {
    const reader = new PemReader(pem);
    const pemObject = reader.readPemObject();

    if (!pemObject) {
      throw new Error('No PEM object found');
    }

    if (pemObject.getType() !== 'PRIVATE KEY') {
      throw new Error(`Expected PRIVATE KEY, got ${pemObject.getType()}`);
    }

    return SM2PrivateKeyEncoder.decodeFromDER(pemObject.getContent());
  }

  /**
   * Convert bigint to fixed-length byte array
   */
  private static bigIntToBytes(value: bigint, length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    let temp = value;

    for (let i = length - 1; i >= 0; i--) {
      bytes[i] = Number(temp & 0xffn);
      temp >>= 8n;
    }

    return bytes;
  }

  /**
   * Convert byte array to bigint
   */
  private static bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
  }
}
