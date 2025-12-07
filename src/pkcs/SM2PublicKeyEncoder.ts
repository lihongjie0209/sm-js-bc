import { SubjectPublicKeyInfo } from './SubjectPublicKeyInfo';
import { AlgorithmIdentifier } from '../asn1/AlgorithmIdentifier';
import { GMObjectIdentifiers } from '../asn1/GMObjectIdentifiers';
import { PemReader } from '../util/io/pem/PemReader';
import { PemWriter } from '../util/io/pem/PemWriter';
import { PemObject } from '../util/io/pem/PemObject';

/**
 * SM2 Public Key Encoder
 * 
 * Encodes/decodes SM2 public keys to/from X.509 SubjectPublicKeyInfo format
 * Matches org.bouncycastle.jcajce.provider.asymmetric.ec functionality
 */
export class SM2PublicKeyEncoder {
  /**
   * Encode SM2 public key to X.509 DER format
   * 
   * @param publicKeyX The X coordinate of the public key
   * @param publicKeyY The Y coordinate of the public key
   * @returns DER encoded SubjectPublicKeyInfo
   */
  static encodeToDER(publicKeyX: bigint, publicKeyY: bigint): Uint8Array {
    // Encode public key in uncompressed format: 0x04 || X || Y
    const publicKeyBytes = SM2PublicKeyEncoder.encodeUncompressedPoint(publicKeyX, publicKeyY);

    // Create AlgorithmIdentifier with SM2 OID
    const algorithm = new AlgorithmIdentifier(
      GMObjectIdentifiers.sm2
      // No parameters for SM2
    );

    // Create SubjectPublicKeyInfo
    const subjectPublicKeyInfo = new SubjectPublicKeyInfo(algorithm, publicKeyBytes);

    return subjectPublicKeyInfo.getEncoded();
  }

  /**
   * Encode SM2 public key to X.509 PEM format
   * 
   * @param publicKeyX The X coordinate of the public key
   * @param publicKeyY The Y coordinate of the public key
   * @returns PEM encoded SubjectPublicKeyInfo
   */
  static encodeToPEM(publicKeyX: bigint, publicKeyY: bigint): string {
    const der = SM2PublicKeyEncoder.encodeToDER(publicKeyX, publicKeyY);
    const pemObject = new PemObject('PUBLIC KEY', new Map(), der);
    return PemWriter.writeObject(pemObject);
  }

  /**
   * Decode SM2 public key from X.509 DER format
   * 
   * @param der DER encoded SubjectPublicKeyInfo
   * @returns SM2 public key as {x, y} coordinates
   */
  static decodeFromDER(der: Uint8Array): { x: bigint; y: bigint } {
    // Parse SubjectPublicKeyInfo
    const subjectPublicKeyInfo = SubjectPublicKeyInfo.fromEncoded(der);

    // Verify algorithm is SM2
    const algorithm = subjectPublicKeyInfo.getAlgorithm();
    if (!algorithm.getAlgorithm().equals(GMObjectIdentifiers.sm2)) {
      throw new Error(`Expected SM2 algorithm, got ${algorithm.getAlgorithm().getId()}`);
    }

    // Get the public key bytes
    const publicKeyBytes = subjectPublicKeyInfo.getPublicKey();

    // Decode uncompressed point format
    return SM2PublicKeyEncoder.decodeUncompressedPoint(publicKeyBytes);
  }

  /**
   * Decode SM2 public key from X.509 PEM format
   * 
   * @param pem PEM encoded SubjectPublicKeyInfo
   * @returns SM2 public key as {x, y} coordinates
   */
  static decodeFromPEM(pem: string): { x: bigint; y: bigint } {
    const reader = new PemReader(pem);
    const pemObject = reader.readPemObject();

    if (!pemObject) {
      throw new Error('No PEM object found');
    }

    if (pemObject.getType() !== 'PUBLIC KEY') {
      throw new Error(`Expected PUBLIC KEY, got ${pemObject.getType()}`);
    }

    return SM2PublicKeyEncoder.decodeFromDER(pemObject.getContent());
  }

  /**
   * Encode EC point in uncompressed format: 0x04 || X || Y
   * Each coordinate is 32 bytes (256 bits) for SM2
   */
  private static encodeUncompressedPoint(x: bigint, y: bigint): Uint8Array {
    const bytes = new Uint8Array(65); // 1 + 32 + 32
    bytes[0] = 0x04; // Uncompressed point indicator

    // Encode X coordinate (32 bytes)
    SM2PublicKeyEncoder.writeBigIntToBytes(x, bytes, 1, 32);

    // Encode Y coordinate (32 bytes)
    SM2PublicKeyEncoder.writeBigIntToBytes(y, bytes, 33, 32);

    return bytes;
  }

  /**
   * Decode EC point from uncompressed format
   */
  private static decodeUncompressedPoint(bytes: Uint8Array): { x: bigint; y: bigint } {
    if (bytes.length !== 65) {
      throw new Error(`Invalid public key length: expected 65 bytes, got ${bytes.length}`);
    }

    if (bytes[0] !== 0x04) {
      throw new Error(`Invalid public key format: expected uncompressed (0x04), got 0x${bytes[0].toString(16)}`);
    }

    // Read X coordinate (bytes 1-32)
    const x = SM2PublicKeyEncoder.readBigIntFromBytes(bytes, 1, 32);

    // Read Y coordinate (bytes 33-64)
    const y = SM2PublicKeyEncoder.readBigIntFromBytes(bytes, 33, 32);

    return { x, y };
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

  /**
   * Read bigint from byte array at specified offset
   */
  private static readBigIntFromBytes(bytes: Uint8Array, offset: number, length: number): bigint {
    let result = 0n;
    for (let i = 0; i < length; i++) {
      result = (result << 8n) | BigInt(bytes[offset + i]);
    }
    return result;
  }
}
