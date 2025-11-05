/**
 * SM2 public key encryption engine.
 * 
 * Based on: https://tools.ietf.org/html/draft-shen-sm2-ecdsa-02
 *           org.bouncycastle.crypto.engines.SM2Engine
 * 
 * Implements SM2 encryption/decryption with two modes:
 * - C1C2C3: Ciphertext format is C1||C2||C3 (default)
 * - C1C3C2: Ciphertext format is C1||C3||C2
 * 
 * Where:
 * - C1: Elliptic curve point (ephemeral public key)
 * - C2: Encrypted message
 * - C3: Hash value for integrity check
 */

import { SM3Digest } from '../digests/SM3Digest';
import { InvalidCipherTextException } from '../../exceptions/InvalidCipherTextException';
import { DataLengthException } from '../../exceptions/DataLengthException';
import { CipherParameters } from '../params/CipherParameters';
import { ECKeyParameters } from '../params/ECKeyParameters';
import { ECPublicKeyParameters } from '../params/ECPublicKeyParameters';
import { ECPrivateKeyParameters } from '../params/ECPrivateKeyParameters';
import { ParametersWithRandom } from '../params/ParametersWithRandom';
import { ECDomainParameters } from '../params/ECDomainParameters';
import { ECPoint } from '../../math/ec/ECPoint';
import { ECMultiplier, FixedPointCombMultiplier } from '../../math/ec/ECMultiplier';
import { BigIntegers } from '../../util/BigIntegers';
import { Arrays } from '../../util/Arrays';
import { Bytes } from '../../util/Bytes';
import { SecureRandom } from '../../util/SecureRandom';
import { Memoable } from '../Memoable';

export enum SM2Mode {
  C1C2C3 = 'C1C2C3',
  C1C3C2 = 'C1C3C2'
}

export class SM2Engine {
  // Alias for compatibility with Bouncy Castle Java API
  static Mode = SM2Mode;

  private readonly digest: SM3Digest;
  private readonly mode: SM2Mode;

  private forEncryption: boolean = false;
  private ecKey: ECKeyParameters | null = null;
  private ecParams: ECDomainParameters | null = null;
  private curveLength: number = 0;
  private random: SecureRandom | null = null;

  constructor();
  constructor(mode: SM2Mode);
  constructor(digest: SM3Digest);
  constructor(digest: SM3Digest, mode: SM2Mode);
  constructor(arg1?: SM2Mode | SM3Digest, arg2?: SM2Mode) {
    if (arg1 instanceof SM3Digest) {
      this.digest = arg1;
      this.mode = arg2 ?? SM2Mode.C1C2C3;
    } else {
      this.digest = new SM3Digest();
      this.mode = arg1 ?? SM2Mode.C1C2C3;
    }
  }

  /**
   * Initialize engine for encryption or decryption.
   * 
   * @param forEncryption - true for encryption, false for decryption
   * @param param - For encryption: ParametersWithRandom containing ECPublicKeyParameters
   *                For decryption: ECPrivateKeyParameters
   */
  init(forEncryption: boolean, param: CipherParameters): void {
    this.forEncryption = forEncryption;

    if (forEncryption) {
      const rParam = param as ParametersWithRandom;
      this.ecKey = rParam.getParameters() as ECKeyParameters;
      this.ecParams = this.ecKey.getParameters();

      // Verify [h]Q is not at infinity
      const ecPubKey = this.ecKey as ECPublicKeyParameters;
      const s = ecPubKey.getQ().multiply(this.ecParams.getH());
      if (s.isInfinity()) {
        throw new Error('invalid key: [h]Q at infinity');
      }

      this.random = rParam.getRandom();
    } else {
      this.ecKey = param as ECKeyParameters;
      this.ecParams = this.ecKey.getParameters();
    }

    this.curveLength = Math.floor((this.ecParams.getCurve().getFieldSize() + 7) / 8);
  }

  /**
   * Process a block of data (encrypt or decrypt).
   * 
   * @param input - Input data
   * @param inOff - Offset in input
   * @param inLen - Length of data to process
   * @returns Processed data
   */
  processBlock(input: Uint8Array, inOff: number, inLen: number): Uint8Array {
    if (inOff + inLen > input.length || inLen === 0) {
      throw new DataLengthException('input buffer too short');
    }

    if (this.forEncryption) {
      return this.encrypt(input, inOff, inLen);
    } else {
      return this.decrypt(input, inOff, inLen);
    }
  }

  /**
   * Get output size for given input length.
   */
  getOutputSize(inputLen: number): number {
    return (1 + 2 * this.curveLength) + inputLen + this.digest.getDigestSize();
  }

  /**
   * Create multiplier for base point operations.
   */
  protected createBasePointMultiplier(): ECMultiplier {
    return new FixedPointCombMultiplier();
  }

  /**
   * Encrypt plaintext.
   */
  private encrypt(input: Uint8Array, inOff: number, inLen: number): Uint8Array {
    const c2 = new Uint8Array(inLen);
    c2.set(input.subarray(inOff, inOff + inLen));

    const multiplier = this.createBasePointMultiplier();

    let c1: Uint8Array;
    let kPB: ECPoint;

    do {
      // Generate random k
      const k = this.nextK();

      // C1 = [k]G
      const c1P = multiplier.multiply(this.ecParams!.getG(), k).normalize();
      c1 = c1P.getEncoded(false);

      // [k]PB
      kPB = (this.ecKey as ECPublicKeyParameters).getQ().multiply(k).normalize();

      // C2 = M ⊕ KDF(x2||y2, klen)
      this.kdf(this.digest, kPB, c2);
    } while (this.notEncrypted(c2, input, inOff));

    // C3 = Hash(x2||M||y2)
    const c3 = new Uint8Array(this.digest.getDigestSize());
    this.addFieldElement(this.digest, kPB.getAffineXCoord());
    this.digest.updateArray(input, inOff, inLen);
    this.addFieldElement(this.digest, kPB.getAffineYCoord());
    this.digest.doFinal(c3, 0);

    // Return C1||C2||C3 or C1||C3||C2
    switch (this.mode) {
      case SM2Mode.C1C3C2:
        return Arrays.concatenate(c1, c3, c2);
      default:
        return Arrays.concatenate(c1, c2, c3);
    }
  }

  /**
   * Decrypt ciphertext.
   */
  private decrypt(input: Uint8Array, inOff: number, inLen: number): Uint8Array {
    // Extract C1
    const c1 = new Uint8Array(this.curveLength * 2 + 1);
    c1.set(input.subarray(inOff, inOff + c1.length));

    const c1P_initial = this.ecParams!.getCurve().decodePoint(c1);

    // Verify [h]C1 is not at infinity
    const s = c1P_initial.multiply(this.ecParams!.getH());
    if (s.isInfinity()) {
      throw new InvalidCipherTextException('[h]C1 at infinity');
    }

    // Compute [d]C1
    const c1P = c1P_initial.multiply((this.ecKey as ECPrivateKeyParameters).getD()).normalize();

    const digestSize = this.digest.getDigestSize();
    const c2 = new Uint8Array(inLen - c1.length - digestSize);

    // Extract C2 based on mode
    if (this.mode === SM2Mode.C1C3C2) {
      c2.set(input.subarray(inOff + c1.length + digestSize, inOff + inLen));
    } else {
      c2.set(input.subarray(inOff + c1.length, inOff + c1.length + c2.length));
    }

    // M = C2 ⊕ KDF(x2||y2, klen)
    this.kdf(this.digest, c1P, c2);

    // Compute C3' = Hash(x2||M||y2)
    const c3 = new Uint8Array(digestSize);
    this.addFieldElement(this.digest, c1P.getAffineXCoord());
    this.digest.updateArray(c2, 0, c2.length);
    this.addFieldElement(this.digest, c1P.getAffineYCoord());
    this.digest.doFinal(c3, 0);

    // Verify C3' === C3 (constant-time comparison)
    let check = 0;
    if (this.mode === SM2Mode.C1C3C2) {
      for (let i = 0; i < c3.length; i++) {
        check |= c3[i] ^ input[inOff + c1.length + i];
      }
    } else {
      for (let i = 0; i < c3.length; i++) {
        check |= c3[i] ^ input[inOff + c1.length + c2.length + i];
      }
    }

    // Clear sensitive data
    Arrays.fill(c1, 0);
    Arrays.fill(c3, 0);

    if (check !== 0) {
      Arrays.fill(c2, 0);
      throw new InvalidCipherTextException('invalid cipher text');
    }

    return c2;
  }

  /**
   * Check if encryption failed (KDF returned all zeros).
   */
  private notEncrypted(encData: Uint8Array, input: Uint8Array, inOff: number): boolean {
    for (let i = 0; i < encData.length; i++) {
      if (encData[i] !== input[inOff + i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Key Derivation Function using SM3.
   * 
   * Derives key material and XORs it with encData in place.
   */
  private kdf(digest: SM3Digest, c1: ECPoint, encData: Uint8Array): void {
    const digestSize = digest.getDigestSize();
    const buf = new Uint8Array(Math.max(4, digestSize));
    let off = 0;

    // Optimize with Memoable if available
    let memo: Memoable | null = null;
    let copy: Memoable | null = null;

    if (digest && typeof (digest as any).copy === 'function') {
      this.addFieldElement(digest, c1.getAffineXCoord());
      this.addFieldElement(digest, c1.getAffineYCoord());
      memo = digest as unknown as Memoable;
      copy = memo.copy();
    }

    let ct = 0;

    while (off < encData.length) {
      if (memo && copy) {
        memo.resetFromMemoable(copy);
      } else {
        this.addFieldElement(digest, c1.getAffineXCoord());
        this.addFieldElement(digest, c1.getAffineYCoord());
      }

      // Add counter (big-endian)
      ct++;
      buf[0] = (ct >>> 24) & 0xff;
      buf[1] = (ct >>> 16) & 0xff;
      buf[2] = (ct >>> 8) & 0xff;
      buf[3] = ct & 0xff;

      digest.updateArray(buf, 0, 4);
      digest.doFinal(buf, 0);

      const xorLen = Math.min(digestSize, encData.length - off);
      Bytes.xorTo(xorLen, buf, 0, encData, off);
      off += xorLen;
    }
  }

  /**
   * Generate random k in range [1, n-1].
   */
  private nextK(): bigint {
    const n = this.ecParams!.getN();
    const bitLength = this.getBitLength(n);

    let k: bigint;
    do {
      k = BigIntegers.createRandomBigInteger(bitLength, this.random!);
    } while (k === 0n || k >= n);

    return k;
  }

  /**
   * Get bit length of BigInt.
   */
  private getBitLength(value: bigint): number {
    return BigIntegers.bitLength(value);
  }

  /**
   * Add field element to digest.
   */
  private addFieldElement(digest: SM3Digest, v: any): void {
    const p = BigIntegers.asUnsignedByteArray(this.curveLength, v.toBigInteger());
    digest.updateArray(p, 0, p.length);
  }
}
