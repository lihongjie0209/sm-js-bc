/**
 * SM2 Digital Signature Algorithm implementation.
 * 
 * This class implements the SM2 digital signature algorithm as specified
 * in GM/T 0003.2-2012. SM2 is an elliptic curve digital signature algorithm
 * based on the SM2 elliptic curve parameters.
 * 
 * The algorithm supports:
 * - Message signing with private key
 * - Signature verification with public key  
 * - User ID-based message preprocessing (Z_A calculation)
 * - SM3 digest algorithm by default
 * 
 * Based on: org.bouncycastle.crypto.signers.SM2Signer
 */

import { Signer } from './Signer';
import { DSAEncoding } from './DSAEncoding';
import { StandardDSAEncoding } from './StandardDSAEncoding';
import { DSAKCalculator } from './DSAKCalculator';
import { RandomDSAKCalculator } from './RandomDSAKCalculator';
import { SM3Digest } from '../digests/SM3Digest';
import { Digest } from '../Digest';
import { CipherParameters } from '../params/CipherParameters';
import { ECKeyParameters } from '../params/ECKeyParameters';
import { ECPrivateKeyParameters } from '../params/ECPrivateKeyParameters';
import { ECPublicKeyParameters } from '../params/ECPublicKeyParameters';
import { ParametersWithRandom } from '../params/ParametersWithRandom';
import { ParametersWithID } from '../params/ParametersWithID';
import { ECDomainParameters } from '../params/ECDomainParameters';
import { ECPoint } from '../../math/ec/ECPoint';
import { ECMultiplier, FixedPointCombMultiplier } from '../../math/ec/ECMultiplier';
import { SecureRandom } from '../../util/SecureRandom';
import { Arrays } from '../../util/Arrays';
import { BigIntegers } from '../../util/BigIntegers';

/**
 * SM2 digital signature algorithm.
 */
export class SM2Signer implements Signer {
  private static readonly DEFAULT_USER_ID = new TextEncoder().encode('1234567812345678');

  private digest: Digest;
  private dsaKCalculator: DSAKCalculator;
  private keyParameters: ECKeyParameters | null = null;
  private publicKey: ECPublicKeyParameters | null = null;
  private ecParams: ECDomainParameters | null = null;
  private kCalculator: DSAKCalculator | null = null;
  private forSigning = false;
  private userID: Uint8Array;
  private z: Uint8Array | null = null;

  /**
   * Create SM2Signer with default SM3 digest and standard DSA encoding.
   */
  constructor(
    digest: Digest = new SM3Digest(),
    dsaKCalculator: DSAKCalculator = new RandomDSAKCalculator()
  ) {
    this.digest = digest;
    this.dsaKCalculator = dsaKCalculator;
    this.userID = SM2Signer.DEFAULT_USER_ID;
  }

  /**
   * Get algorithm name.
   */
  getAlgorithmName(): string {
    return 'SM2';
  }

  /**
   * Initialize the signer.
   */
  init(forSigning: boolean, parameters: CipherParameters): void {
    this.forSigning = forSigning;
    
    let ecKey: ECKeyParameters;
    let providedRandom: SecureRandom | null = null;
    
    // Extract parameters
    if (parameters instanceof ParametersWithID) {
      const withID = parameters as ParametersWithID;
      this.userID = withID.getID();
      const innerParams = withID.getParameters();
      
      if (innerParams instanceof ParametersWithRandom) {
        const withRandom = innerParams as ParametersWithRandom;
        providedRandom = withRandom.getRandom();
        ecKey = withRandom.getParameters() as ECKeyParameters;
      } else {
        ecKey = innerParams as ECKeyParameters;
      }
    } else if (parameters instanceof ParametersWithRandom) {
      const withRandom = parameters as ParametersWithRandom;
      providedRandom = withRandom.getRandom();
      ecKey = withRandom.getParameters() as ECKeyParameters;
      this.userID = SM2Signer.DEFAULT_USER_ID;
    } else {
      ecKey = parameters as ECKeyParameters;
      this.userID = SM2Signer.DEFAULT_USER_ID;
    }

    this.keyParameters = ecKey;
    this.ecParams = ecKey.getParameters();

    if (forSigning) {
      // Signing - need private key
      if (!(ecKey instanceof ECPrivateKeyParameters)) {
        throw new Error('Signing requires ECPrivateKeyParameters');
      }
      
      // Initialize k calculator
      this.kCalculator = this.dsaKCalculator;
      const random = providedRandom || new SecureRandom();
      this.kCalculator.init(this.ecParams.getN(), random);
      
      // Calculate Z_A for private key
      this.publicKey = this.calculatePublicKey(ecKey as ECPrivateKeyParameters);
      
    } else {
      // Verification - need public key
      if (!(ecKey instanceof ECPublicKeyParameters)) {
        throw new Error('Verification requires ECPublicKeyParameters');
      }
      
      this.publicKey = ecKey as ECPublicKeyParameters;
    }

    // Calculate Z_A value
    this.z = this.calculateZ(this.userID, this.publicKey);

    // Reset digest and add Z_A
    this.digest.reset();
    this.digest.updateArray(this.z, 0, this.z.length);
  }

  /**
   * Update with single byte.
   */
  update(b: number): void;
  /**
   * Update with byte array.
   */
  update(input: Uint8Array, offset: number, length: number): void;
  update(input: number | Uint8Array, offset?: number, length?: number): void {
    if (typeof input === 'number') {
      this.digest.update(input);
    } else {
      this.digest.updateArray(input, offset!, length!);
    }
  }

  /**
   * Generate signature.
   */
  generateSignature(): Uint8Array {
    if (!this.forSigning) {
      throw new Error('Signer not initialized for signing');
    }
    
    if (!this.kCalculator || !this.ecParams || !this.keyParameters) {
      throw new Error('Signer not properly initialized');
    }

    const privateKey = this.keyParameters as ECPrivateKeyParameters;
    const n = this.ecParams.getN();
    const G = this.ecParams.getG();
    const d = privateKey.getD();

    // Calculate message hash e = H(Z_A || M)
    const eBytes = new Uint8Array(this.digest.getDigestSize());
    this.digest.doFinal(eBytes, 0);
    const e = this.hashToInteger(eBytes, n);

    let r: bigint = 0n, s: bigint = 0n;
    
    do {
      // Generate random k
      const k = this.kCalculator.nextK();
      
      // Calculate point (x1, y1) = [k]G
      const kG = G.multiply(k).normalize();
      
      // Calculate r = (e + x1) mod n
      const x1 = kG.getAffineXCoord().toBigInteger();
      r = (e + x1) % n;
      
      // Check r ≠ 0 and r + k ≠ n
      if (r === 0n || (r + k) % n === 0n) {
        continue;
      }

      // Calculate s = (1 + d)^(-1) * (k - r*d) mod n
      const dInv = this.modInverse(1n + d, n);
      s = (dInv * (k - (r * d) % n)) % n;
      if (s < 0n) {
        s += n;
      }
      
    } while (s === 0n);

    // Reset for next signature
    this.digest.reset();
    if (this.z) {
      this.digest.updateArray(this.z, 0, this.z.length);
    }

    // Encode signature
    return StandardDSAEncoding.INSTANCE.encode(n, r, s);
  }

  /**
   * Verify signature.
   */
  verifySignature(signature: Uint8Array): boolean {
    if (this.forSigning) {
      throw new Error('Signer not initialized for verification');
    }
    
    if (!this.ecParams || !this.publicKey) {
      throw new Error('Signer not properly initialized');
    }

    try {
      const n = this.ecParams.getN();
      const G = this.ecParams.getG();
      const P_A = this.publicKey.getQ();

      // Decode signature
      const [r, s] = StandardDSAEncoding.INSTANCE.decode(n, signature);

      // Verify 1 ≤ r < n and 1 ≤ s < n
      if (r <= 0n || r >= n || s <= 0n || s >= n) {
        return false;
      }

      // Calculate message hash e = H(Z_A || M)
      const eBytes = new Uint8Array(this.digest.getDigestSize());
      this.digest.doFinal(eBytes, 0);
      const e = this.hashToInteger(eBytes, n);

      // Calculate t = (r + s) mod n
      const t = (r + s) % n;
      if (t === 0n) {
        return false;
      }

      // Calculate point (x1, y1) = [s]G + [t]P_A
      const sG = G.multiply(s);
      const tP = P_A.multiply(t);
      const point = sG.add(tP).normalize();

      // Calculate R = (e + x1) mod n
      const x1 = point.getAffineXCoord().toBigInteger();
      const R = (e + x1) % n;

      // Verification passes if R = r
      const result = (R === r);

      // Reset for next verification
      this.digest.reset();
      if (this.z) {
        this.digest.updateArray(this.z, 0, this.z.length);
      }

      return result;

    } catch (error) {
      // Reset on error
      this.digest.reset();
      if (this.z) {
        this.digest.updateArray(this.z, 0, this.z.length);
      }
      return false;
    }
  }

  /**
   * Reset the signer.
   */
  reset(): void {
    this.digest.reset();
    if (this.z) {
      this.digest.updateArray(this.z, 0, this.z.length);
    }
  }

  /**
   * Create base point multiplier (for compatibility with Bouncy Castle Java API).
   * Can be overridden in subclasses to use different multipliers.
   * 
   * @returns ECMultiplier instance
   */
  protected createBasePointMultiplier(): ECMultiplier {
    return new FixedPointCombMultiplier();
  }

  /**
   * Calculate public key from private key.
   */
  private calculatePublicKey(privateKey: ECPrivateKeyParameters): ECPublicKeyParameters {
    const d = privateKey.getD();
    const params = privateKey.getParameters();
    const Q = params.getG().multiply(d);
    
    return new ECPublicKeyParameters(Q, params);
  }

  /**
   * Calculate Z_A value for user ID and public key.
   */
  private calculateZ(userID: Uint8Array, publicKey: ECPublicKeyParameters): Uint8Array {
    const digest = new SM3Digest();
    
    // ENTL_A: two-byte length of user ID in bits
    const userIDBitLength = userID.length * 8;
    digest.update((userIDBitLength >>> 8) & 0xFF);
    digest.update(userIDBitLength & 0xFF);
    
    // ID_A: user ID
    digest.updateArray(userID, 0, userID.length);
    
    const curve = this.ecParams!.getCurve();
    const fieldSize = curve.getFieldSize();
    const fieldBytes = Math.ceil(fieldSize / 8);
    
    // a, b: curve parameters
    const a = curve.getA().toBigInteger();
    const b = curve.getB().toBigInteger();
    
    const aBytes = BigIntegers.asUnsignedByteArray(fieldBytes, a);
    const bBytes = BigIntegers.asUnsignedByteArray(fieldBytes, b);
    
    digest.updateArray(aBytes, 0, aBytes.length);
    digest.updateArray(bBytes, 0, bBytes.length);
    
    // x_G, y_G: base point coordinates
    const G = this.ecParams!.getG().normalize();
    const xGBytes = BigIntegers.asUnsignedByteArray(fieldBytes, G.getAffineXCoord().toBigInteger());
    const yGBytes = BigIntegers.asUnsignedByteArray(fieldBytes, G.getAffineYCoord().toBigInteger());
    
    digest.updateArray(xGBytes, 0, xGBytes.length);
    digest.updateArray(yGBytes, 0, yGBytes.length);
    
    // x_A, y_A: public key coordinates
    const P_A = publicKey.getQ().normalize();
    const xABytes = BigIntegers.asUnsignedByteArray(fieldBytes, P_A.getAffineXCoord().toBigInteger());
    const yABytes = BigIntegers.asUnsignedByteArray(fieldBytes, P_A.getAffineYCoord().toBigInteger());
    
    digest.updateArray(xABytes, 0, xABytes.length);
    digest.updateArray(yABytes, 0, yABytes.length);
    
    // Calculate final hash
    const z = new Uint8Array(digest.getDigestSize());
    digest.doFinal(z, 0);
    
    return z;
  }

  /**
   * Calculate E value from message hash (for compatibility with Bouncy Castle Java API).
   * 
   * @param n - The order of the curve
   * @param message - The message hash bytes
   * @returns The E value as bigint
   */
  protected calculateE(n: bigint, message: Uint8Array): bigint {
    let e = 0n;
    for (let i = 0; i < message.length; i++) {
      e = (e << 8n) | BigInt(message[i]);
    }
    return e % n;
  }

  /**
   * Convert hash bytes to integer in range [1, n-1].
   * @deprecated Use calculateE instead for compatibility with Bouncy Castle Java API
   */
  private hashToInteger(hash: Uint8Array, n: bigint): bigint {
    return this.calculateE(n, hash);
  }

  /**
   * Calculate modular inverse using extended Euclidean algorithm.
   */
  private modInverse(a: bigint, m: bigint): bigint {
    if (a < 0n) {
      a = ((a % m) + m) % m;
    }
    
    let [oldR, r] = [a, m];
    let [oldS, s] = [1n, 0n];
    
    while (r !== 0n) {
      const quotient = oldR / r;
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
    }
    
    if (oldR > 1n) {
      throw new Error('Modular inverse does not exist');
    }
    
    if (oldS < 0n) {
      oldS += m;
    }
    
    return oldS;
  }
}