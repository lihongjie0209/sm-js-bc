/**
 * SM2 curve and domain parameters.
 * 
 * Based on GM/T 0003-2012 and GMNamedCurves.java
 */

import { ECCurveFp } from '../math/ec/ECCurve';
import { ECDomainParameters } from '../crypto/params/ECDomainParameters';
import { ECPoint } from '../math/ec/ECPoint';
import { SecureRandom } from '../util/SecureRandom';
import { SM2Engine } from './engines/SM2Engine';
import { SM2Signer } from './signers/SM2Signer';
import { ECPublicKeyParameters } from './params/ECPublicKeyParameters';
import { ECPrivateKeyParameters } from './params/ECPrivateKeyParameters';
import { ParametersWithRandom } from './params/ParametersWithRandom';

/**
 * SM2 elliptic curve parameters (SM2P256V1).
 */
export class SM2 {
  // Prime p
  private static readonly p = 0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFFn;

  // Curve coefficient a
  private static readonly a = 0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFCn;

  // Curve coefficient b
  private static readonly b = 0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93n;

  // Base point order n
  private static readonly n = 0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123n;

  // Cofactor h
  private static readonly h = 1n;

  // Base point G coordinates
  private static readonly Gx = 0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7n;
  private static readonly Gy = 0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0n;

  private static domainParams: ECDomainParameters | null = null;

  /**
   * Get SM2 domain parameters.
   */
  static getParameters(): ECDomainParameters {
    if (!SM2.domainParams) {
      // Create curve
      const curve = new ECCurveFp(
        SM2.p,
        SM2.a,
        SM2.b,
        SM2.n,
        SM2.h
      );

      // Create base point G
      const G = curve.createPoint(SM2.Gx, SM2.Gy);

      // Create domain parameters
      SM2.domainParams = new ECDomainParameters(
        curve,
        G,
        SM2.n,
        SM2.h,
        null
      );
    }

    return SM2.domainParams;
  }

  /**
   * Get curve.
   */
  static getCurve(): ECCurveFp {
    return SM2.getParameters().getCurve() as ECCurveFp;
  }

  /**
   * Get base point G.
   */
  static getG(): ECPoint {
    return SM2.getParameters().getG();
  }

  /**
   * Get order n.
   */
  static getN(): bigint {
    return SM2.n;
  }

  /**
   * Get cofactor h.
   */
  static getH(): bigint {
    return SM2.h;
  }

  /**
   * Validate public key point.
   */
  static validatePublicKey(Q: ECPoint): boolean {
    if (Q.isInfinity()) {
      return false;
    }

    if (!Q.isValid()) {
      return false;
    }

    // Check [n]Q = O
    const nQ = Q.multiply(SM2.n);
    if (!nQ.isInfinity()) {
      return false;
    }

    return true;
  }

  /**
   * Validate private key.
   */
  static validatePrivateKey(d: bigint): boolean {
    return d > 0n && d < SM2.n;
  }

  /**
   * Generate SM2 key pair.
   * @returns Object containing private key (BigInt) and public key coordinates {x, y}
   */
  static generateKeyPair(): { privateKey: bigint; publicKey: { x: bigint; y: bigint } } {
    const random = new SecureRandom();
    let d: bigint;

    // Generate random private key d where 1 <= d < n
    do {
      const bytes = random.generateSeed(32); // 256 bits / 8 = 32 bytes
      d = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    } while (d === 0n || d >= SM2.n);

    // Calculate public key Q = [d]G
    const G = SM2.getG();
    const Q = G.multiply(d);

    if (Q.isInfinity() || !SM2.validatePublicKey(Q)) {
      throw new Error('Generated invalid public key');
    }

    const affineQ = Q.normalize();
    
    return {
      privateKey: d,
      publicKey: {
        x: affineQ.getAffineXCoord().toBigInteger(),
        y: affineQ.getAffineYCoord().toBigInteger()
      }
    };
  }

  /**
   * Encrypt plaintext using SM2 public key.
   * @param message - Message to encrypt (string or Uint8Array)
   * @param publicKey - Public key object with x and y coordinates, or separate x, y coordinates
   * @param publicKeyY - Public key Y coordinate (if first parameter is not an object)
   * @returns Encrypted ciphertext as Uint8Array
   */
  static encrypt(
    message: string | Uint8Array, 
    publicKey: { x: bigint; y: bigint } | bigint, 
    publicKeyY?: bigint
  ): Uint8Array {
    // Convert string to bytes if needed
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message)
      : message;

    // Handle different parameter formats
    let publicKeyX: bigint;
    let publicKeyYValue: bigint;

    if (typeof publicKey === 'object' && publicKey !== null) {
      // publicKey is an object with x and y properties
      publicKeyX = publicKey.x;
      publicKeyYValue = publicKey.y;
    } else if (typeof publicKey === 'bigint' && typeof publicKeyY === 'bigint') {
      // publicKey is x coordinate, publicKeyY is y coordinate
      publicKeyX = publicKey;
      publicKeyYValue = publicKeyY;
    } else {
      throw new Error('Invalid public key format. Expected object with x,y properties or separate x,y BigInt values');
    }

    // Create public key parameters
    const curve = SM2.getCurve();
    const Q = curve.createPoint(publicKeyX, publicKeyYValue);
    const domainParams = SM2.getParameters();
    const pubKey = new ECPublicKeyParameters(Q, domainParams);

    // Create engine and initialize for encryption
    const engine = new SM2Engine();
    engine.init(true, new ParametersWithRandom(pubKey, new SecureRandom()));

    // Encrypt
    return engine.processBlock(messageBytes, 0, messageBytes.length);
  }

  /**
   * Decrypt ciphertext using SM2 private key.
   * @param ciphertext - Ciphertext to decrypt
   * @param privateKey - Private key
   * @returns Decrypted plaintext as Uint8Array
   */
  static decrypt(ciphertext: Uint8Array, privateKey: bigint): Uint8Array {
    // Create private key parameters
    const domainParams = SM2.getParameters();
    const privKey = new ECPrivateKeyParameters(privateKey, domainParams);

    // Create engine and initialize for decryption
    const engine = new SM2Engine();
    engine.init(false, privKey);

    // Decrypt
    return engine.processBlock(ciphertext, 0, ciphertext.length);
  }

  /**
   * Sign a message using SM2 private key.
   * @param message - Message to sign (string or Uint8Array)
   * @param privateKey - Private key for signing
   * @returns Signature as Uint8Array
   */
  static sign(message: string | Uint8Array, privateKey: bigint): Uint8Array {
    // Convert string to bytes if needed
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message)
      : message;

    // Create private key parameters
    const domainParams = SM2.getParameters();
    const privKey = new ECPrivateKeyParameters(privateKey, domainParams);

    // Create signer and initialize for signing
    const signer = new SM2Signer();
    signer.init(true, new ParametersWithRandom(privKey, new SecureRandom()));

    // Update signer with message data
    signer.update(messageBytes, 0, messageBytes.length);

    // Generate signature
    return signer.generateSignature();
  }

  /**
   * Verify a signature using SM2 public key.
   * @param message - Original message (string or Uint8Array)
   * @param signature - Signature to verify
   * @param publicKey - Public key object with x and y coordinates, or separate x, y coordinates
   * @param publicKeyY - Public key Y coordinate (if first parameter is not an object)
   * @returns true if signature is valid, false otherwise
   */
  static verify(
    message: string | Uint8Array,
    signature: Uint8Array,
    publicKey: { x: bigint; y: bigint } | bigint,
    publicKeyY?: bigint
  ): boolean {
    // Convert string to bytes if needed
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message)
      : message;

    // Handle different parameter formats
    let publicKeyX: bigint;
    let publicKeyYValue: bigint;

    if (typeof publicKey === 'object' && publicKey !== null) {
      // publicKey is an object with x and y properties
      publicKeyX = publicKey.x;
      publicKeyYValue = publicKey.y;
    } else if (typeof publicKey === 'bigint' && typeof publicKeyY === 'bigint') {
      // publicKey is x coordinate, publicKeyY is y coordinate
      publicKeyX = publicKey;
      publicKeyYValue = publicKeyY;
    } else {
      throw new Error('Invalid public key format. Expected object with x,y properties or separate x,y BigInt values');
    }

    // Create public key parameters
    const curve = SM2.getCurve();
    const Q = curve.createPoint(publicKeyX, publicKeyYValue);
    const domainParams = SM2.getParameters();
    const pubKey = new ECPublicKeyParameters(Q, domainParams);

    // Create signer and initialize for verification
    const signer = new SM2Signer();
    signer.init(false, pubKey);

    // Update signer with message data
    signer.update(messageBytes, 0, messageBytes.length);

    // Verify the signature
    return signer.verifySignature(signature);
  }
}
