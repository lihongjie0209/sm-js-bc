/**
 * SM2 Key Exchange protocol implementation.
 * Based on https://tools.ietf.org/html/draft-shen-sm2-ecdsa-02
 * 
 * Implements the SM2 key agreement protocol allowing two parties to establish
 * a shared secret key over an insecure communication channel.
 */

import type { CipherParameters } from '../params/CipherParameters';
import type { Digest } from '../Digest';
import type { Memoable } from '../Memoable';
import { SM3Digest } from '../digests/SM3Digest';
import { ECPrivateKeyParameters } from '../params/ECPrivateKeyParameters';
import { ECDomainParameters } from '../params/ECDomainParameters';
import { ParametersWithID } from '../params/ParametersWithID';
import { SM2KeyExchangePrivateParameters } from '../params/SM2KeyExchangePrivateParameters';
import { SM2KeyExchangePublicParameters } from '../params/SM2KeyExchangePublicParameters';
import { ECPoint } from '../../math/ec/ECPoint';
import { ECFieldElement } from '../../math/ec/ECFieldElement';
import { ECAlgorithms } from '../../math/ec/ECAlgorithms';
import { Arrays } from '../../util/Arrays';
import { Pack } from '../../util/Pack';

/**
 * SM2 Key Exchange implementation.
 * 
 * This class implements the SM2 key agreement protocol that allows two parties
 * (initiator and responder) to establish a shared secret key.
 */
export class SM2KeyExchange {
  private readonly digest: Digest;

  private userID: Uint8Array = new Uint8Array(0);
  private staticKey!: ECPrivateKeyParameters;
  private staticPubPoint!: ECPoint;
  private ephemeralPubPoint!: ECPoint;
  private ecParams!: ECDomainParameters;
  private w!: number;
  private ephemeralKey!: ECPrivateKeyParameters;
  private initiator!: boolean;

  /**
   * Constructor with default SM3 digest.
   */
  constructor();
  
  /**
   * Constructor with custom digest.
   */
  constructor(digest: Digest);
  
  constructor(digest?: Digest) {
    this.digest = digest || new SM3Digest();
  }

  /**
   * Initialize the key exchange with private parameters.
   * 
   * @param privParam Private parameters for key exchange
   */
  init(privParam: CipherParameters): void {
    let baseParam: SM2KeyExchangePrivateParameters;

    if (privParam instanceof ParametersWithID) {
      baseParam = privParam.getParameters() as SM2KeyExchangePrivateParameters;
      this.userID = privParam.getID();
    } else {
      baseParam = privParam as SM2KeyExchangePrivateParameters;
      this.userID = new Uint8Array(0);
    }

    this.initiator = baseParam.isInitiator();
    this.staticKey = baseParam.getStaticPrivateKey();
    this.ephemeralKey = baseParam.getEphemeralPrivateKey();
    this.ecParams = this.staticKey.getParameters();
    this.staticPubPoint = baseParam.getStaticPublicPoint();
    this.ephemeralPubPoint = baseParam.getEphemeralPublicPoint();

    // Calculate w = floor((field_size - 1) / 2)
    this.w = Math.floor((this.ecParams.getCurve().getFieldSize() - 1) / 2);
  }

  /**
   * Calculate the shared key.
   * 
   * @param kLen Length of the key to generate (in bits)
   * @param pubParam Public parameters from the other party
   * @returns The generated shared key
   */
  calculateKey(kLen: number, pubParam: CipherParameters): Uint8Array {
    if (kLen <= 0) {
      throw new Error('Key length must be positive');
    }

    let otherPub: SM2KeyExchangePublicParameters;
    let otherUserID: Uint8Array;

    if (pubParam instanceof ParametersWithID) {
      otherPub = pubParam.getParameters() as SM2KeyExchangePublicParameters;
      otherUserID = pubParam.getID();
    } else {
      otherPub = pubParam as SM2KeyExchangePublicParameters;
      otherUserID = new Uint8Array(0);
    }

    const za = this.getZ(this.digest, this.userID, this.staticPubPoint);
    const zb = this.getZ(this.digest, otherUserID, otherPub.getStaticPublicKey().getQ());

    const U = this.calculateU(otherPub);

    let rv: Uint8Array;
    if (this.initiator) {
      rv = this.kdf(U, za, zb, kLen);
    } else {
      rv = this.kdf(U, zb, za, kLen);
    }

    return rv;
  }

  /**
   * Calculate key with confirmation tags.
   * 
   * @param kLen Length of the key to generate (in bits)
   * @param confirmationTag Confirmation tag from the other party (for initiator)
   * @param pubParam Public parameters from the other party
   * @returns Array containing [key, confirmationTag1, confirmationTag2]
   */
  calculateKeyWithConfirmation(
    kLen: number,
    confirmationTag: Uint8Array | null,
    pubParam: CipherParameters
  ): Uint8Array[] {
    if (kLen <= 0) {
      throw new Error('Key length must be positive');
    }

    let otherPub: SM2KeyExchangePublicParameters;
    let otherUserID: Uint8Array;

    if (pubParam instanceof ParametersWithID) {
      otherPub = pubParam.getParameters() as SM2KeyExchangePublicParameters;
      otherUserID = pubParam.getID();
    } else {
      otherPub = pubParam as SM2KeyExchangePublicParameters;
      otherUserID = new Uint8Array(0);
    }

    if (this.initiator && confirmationTag === null) {
      throw new Error('If initiating, confirmationTag must be set');
    }

    const za = this.getZ(this.digest, this.userID, this.staticPubPoint);
    const zb = this.getZ(this.digest, otherUserID, otherPub.getStaticPublicKey().getQ());

    const U = this.calculateU(otherPub);

    let rv: Uint8Array;
    if (this.initiator) {
      rv = this.kdf(U, za, zb, kLen);

      const inner = this.calculateInnerHash(
        this.digest,
        U,
        za,
        zb,
        this.ephemeralPubPoint,
        otherPub.getEphemeralPublicKey().getQ()
      );

      const s1 = this.S1(this.digest, U, inner);

      if (!Arrays.constantTimeAreEqual(s1, confirmationTag!)) {
        throw new Error('Confirmation tag mismatch');
      }

      return [rv, this.S2(this.digest, U, inner)];
    } else {
      rv = this.kdf(U, zb, za, kLen);

      const inner = this.calculateInnerHash(
        this.digest,
        U,
        zb,
        za,
        otherPub.getEphemeralPublicKey().getQ(),
        this.ephemeralPubPoint
      );

      return [rv, this.S1(this.digest, U, inner), this.S2(this.digest, U, inner)];
    }
  }

  /**
   * Calculate the U point for key derivation.
   */
  private calculateU(otherPub: SM2KeyExchangePublicParameters): ECPoint {
    const params = this.staticKey.getParameters();

    const p1 = ECAlgorithms.cleanPoint(params.getCurve(), otherPub.getStaticPublicKey().getQ());
    const p2 = ECAlgorithms.cleanPoint(params.getCurve(), otherPub.getEphemeralPublicKey().getQ());

    const x1 = this.reduce(this.ephemeralPubPoint.normalize().getAffineXCoord().toBigInteger());
    const x2 = this.reduce(p2.normalize().getAffineXCoord().toBigInteger());
    const tA = this.staticKey.getD() + (x1 * this.ephemeralKey.getD());
    const k1 = (this.ecParams.getH() * tA) % this.ecParams.getN();
    const k2 = (k1 * x2) % this.ecParams.getN();

    return ECAlgorithms.sumOfTwoMultiplies(p1, k1, p2, k2).normalize();
  }

  /**
   * Key Derivation Function (KDF) implementation.
   */
  private kdf(u: ECPoint, za: Uint8Array, zb: Uint8Array, klen: number): Uint8Array {
    const digestSize = this.digest.getDigestSize();
    const buf = new Uint8Array(Math.max(4, digestSize));
    const rv = new Uint8Array(Math.ceil(klen / 8));
    let off = 0;

    let memo: Memoable | null = null;
    let copy: Memoable | null = null;

    if (this.digest.constructor.name.includes('Memoable') || 'copy' in this.digest) {
      const normalizedU = u.normalize();
      this.addFieldElement(this.digest, normalizedU.getAffineXCoord());
      this.addFieldElement(this.digest, normalizedU.getAffineYCoord());
      this.digest.updateArray(za, 0, za.length);
      this.digest.updateArray(zb, 0, zb.length);
      memo = this.digest as unknown as Memoable;
      copy = memo.copy();
    }

    let ct = 0;

    while (off < rv.length) {
      if (memo !== null && copy !== null) {
        memo.resetFromMemoable(copy);
      } else {
        const normalizedU2 = u.normalize();
        this.addFieldElement(this.digest, normalizedU2.getAffineXCoord());
        this.addFieldElement(this.digest, normalizedU2.getAffineYCoord());
        this.digest.updateArray(za, 0, za.length);
        this.digest.updateArray(zb, 0, zb.length);
      }

      Pack.intToBigEndian(++ct, buf, 0);
      this.digest.updateArray(buf, 0, 4);
      this.digest.doFinal(buf, 0);

      const copyLen = Math.min(digestSize, rv.length - off);
      rv.set(buf.subarray(0, copyLen), off);
      off += copyLen;
    }

    return rv;
  }

  /**
   * Reduce function: x1~ = 2^w + (x1 AND (2^w - 1))
   */
  private reduce(x: bigint): bigint {
    const mask = (1n << BigInt(this.w)) - 1n;
    return (x & mask) | (1n << BigInt(this.w));
  }

  /**
   * Calculate S1 confirmation tag.
   */
  private S1(digest: Digest, u: ECPoint, inner: Uint8Array): Uint8Array {
    digest.update(0x02);
    const normalizedU = u.normalize();
    this.addFieldElement(digest, normalizedU.getAffineYCoord());
    digest.updateArray(inner, 0, inner.length);
    return this.digestDoFinal();
  }

  /**
   * Calculate inner hash for confirmation.
   */
  private calculateInnerHash(
    digest: Digest,
    u: ECPoint,
    za: Uint8Array,
    zb: Uint8Array,
    p1: ECPoint,
    p2: ECPoint
  ): Uint8Array {
    const normalizedU = u.normalize();
    const normalizedP1 = p1.normalize();
    const normalizedP2 = p2.normalize();
    this.addFieldElement(digest, normalizedU.getAffineXCoord());
    digest.updateArray(za, 0, za.length);
    digest.updateArray(zb, 0, zb.length);
    this.addFieldElement(digest, normalizedP1.getAffineXCoord());
    this.addFieldElement(digest, normalizedP1.getAffineYCoord());
    this.addFieldElement(digest, normalizedP2.getAffineXCoord());
    this.addFieldElement(digest, normalizedP2.getAffineYCoord());
    return this.digestDoFinal();
  }

  /**
   * Calculate S2 confirmation tag.
   */
  private S2(digest: Digest, u: ECPoint, inner: Uint8Array): Uint8Array {
    digest.update(0x03);
    const normalizedU = u.normalize();
    this.addFieldElement(digest, normalizedU.getAffineYCoord());
    digest.updateArray(inner, 0, inner.length);
    return this.digestDoFinal();
  }

  /**
   * Calculate Z value (user identification hash).
   */
  private getZ(digest: Digest, userID: Uint8Array, pubPoint: ECPoint): Uint8Array {
    this.addUserID(digest, userID);

    this.addFieldElement(digest, this.ecParams.getCurve().getA());
    this.addFieldElement(digest, this.ecParams.getCurve().getB());
    this.addFieldElement(digest, this.ecParams.getG().getAffineXCoord());
    this.addFieldElement(digest, this.ecParams.getG().getAffineYCoord());
    const normalizedPubPoint = pubPoint.normalize();
    this.addFieldElement(digest, normalizedPubPoint.getAffineXCoord());
    this.addFieldElement(digest, normalizedPubPoint.getAffineYCoord());

    return this.digestDoFinal();
  }

  /**
   * Add user ID to digest with length prefix.
   */
  private addUserID(digest: Digest, userID: Uint8Array): void {
    const len = userID.length * 8; // Length in bits
    digest.update(len >>> 8);
    digest.update(len & 0xFF);
    digest.updateArray(userID, 0, userID.length);
  }

  /**
   * Add field element to digest.
   */
  private addFieldElement(digest: Digest, v: ECFieldElement): void {
    const p = v.getEncoded();
    digest.updateArray(p, 0, p.length);
  }

  /**
   * Finalize digest and return result.
   */
  private digestDoFinal(): Uint8Array {
    const result = new Uint8Array(this.digest.getDigestSize());
    this.digest.doFinal(result, 0);
    return result;
  }
}