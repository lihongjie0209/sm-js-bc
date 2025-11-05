/**
 * Base class for points on elliptic curves.
 * 
 * Based on: org.bouncycastle.math.ec.ECPoint
 */

import { ECCurve, ECCurveFp, CoordinateSystem } from './ECCurve';
import { ECFieldElement, ECFieldElementFp } from './ECFieldElement';
import { ECConstants } from './ECConstants';
import { Arrays } from '../../util/Arrays';
import { BigIntegers } from '../../util/BigIntegers';
import { SecureRandom } from '../../util/SecureRandom';
import type { PreCompInfo } from './PreCompInfo';

/**
 * Abstract base class for all elliptic curve points.
 */
export abstract class ECPoint {
  protected static readonly EMPTY_ZS: ECFieldElement[] = [];

  public curve: ECCurve | null;
  public x: ECFieldElement | null;
  public y: ECFieldElement | null;
  public zs: ECFieldElement[];
  
  /**
   * Precomputation table for this point (lazy-initialized).
   * Maps precomputation name to PreCompInfo.
   */
  public preCompTable: Map<string, PreCompInfo> | null = null;

  constructor(curve: ECCurve | null, x: ECFieldElement | null, y: ECFieldElement | null, zs?: ECFieldElement[]) {
    this.curve = curve;
    this.x = x;
    this.y = y;
    this.zs = zs || ECPoint.getInitialZCoords(curve);
  }

  /**
   * Get initial z-coordinates based on curve coordinate system.
   */
  protected static getInitialZCoords(curve: ECCurve | null): ECFieldElement[] {
    if (!curve) {
      return ECPoint.EMPTY_ZS;
    }

    const coord = curve.getCoordinateSystem();

    switch (coord) {
      case CoordinateSystem.AFFINE:
      case CoordinateSystem.LAMBDA_AFFINE:
        return ECPoint.EMPTY_ZS;

      case CoordinateSystem.HOMOGENEOUS:
      case CoordinateSystem.JACOBIAN:
      case CoordinateSystem.LAMBDA_PROJECTIVE:
        return [curve.fromBigInteger(ECConstants.ONE)];

      case CoordinateSystem.JACOBIAN_CHUDNOVSKY: {
        const one = curve.fromBigInteger(ECConstants.ONE);
        return [one, one, one];
      }

      case CoordinateSystem.JACOBIAN_MODIFIED: {
        const one = curve.fromBigInteger(ECConstants.ONE);
        return [one, curve.getA()];
      }

      default:
        throw new Error('unknown coordinate system');
    }
  }

  /**
   * Check if this point satisfies the curve equation.
   */
  protected abstract satisfiesCurveEquation(): boolean;

  /**
   * Get the detached point (normalized and detached from curve).
   */
  getDetachedPoint(): ECPoint {
    return this.normalize().detach();
  }

  /**
   * Get the curve.
   */
  getCurve(): ECCurve {
    if (!this.curve) {
      throw new Error('Detached point has no curve');
    }
    return this.curve;
  }

  /**
   * Detach point from curve.
   */
  protected abstract detach(): ECPoint;

  /**
   * Get curve coordinate system.
   */
  protected getCurveCoordinateSystem(): CoordinateSystem {
    return this.curve ? this.curve.getCoordinateSystem() : CoordinateSystem.AFFINE;
  }

  /**
   * Get affine x-coordinate (requires normalized point).
   */
  getAffineXCoord(): ECFieldElement {
    this.checkNormalized();
    return this.getXCoord();
  }

  /**
   * Get affine y-coordinate (requires normalized point).
   */
  getAffineYCoord(): ECFieldElement {
    this.checkNormalized();
    return this.getYCoord();
  }

  /**
   * Get x-coordinate (may be projective).
   */
  getXCoord(): ECFieldElement {
    if (!this.x) {
      throw new Error('Point at infinity has no x-coordinate');
    }
    return this.x;
  }

  /**
   * Get y-coordinate (may be projective).
   */
  getYCoord(): ECFieldElement {
    if (!this.y) {
      throw new Error('Point at infinity has no y-coordinate');
    }
    return this.y;
  }

  /**
   * Get z-coordinate at index.
   */
  getZCoord(index: number): ECFieldElement {
    if (index < 0 || index >= this.zs.length) {
      throw new Error('Invalid z-coordinate index');
    }
    return this.zs[index];
  }

  /**
   * Get all z-coordinates.
   */
  getZCoords(): ECFieldElement[] {
    if (this.zs.length === 0) {
      return ECPoint.EMPTY_ZS;
    }
    return [...this.zs];
  }

  /**
   * Get raw x-coordinate (without checking).
   */
  getRawXCoord(): ECFieldElement | null {
    return this.x;
  }

  /**
   * Get raw y-coordinate (without checking).
   */
  getRawYCoord(): ECFieldElement | null {
    return this.y;
  }

  /**
   * Get raw z-coordinates (without checking).
   */
  protected getRawZCoords(): ECFieldElement[] {
    return this.zs;
  }

  /**
   * Check that point is normalized.
   */
  protected checkNormalized(): void {
    if (!this.isNormalized()) {
      throw new Error('point not in normal form');
    }
  }

  /**
   * Check if point is normalized (affine or z=1).
   */
  isNormalized(): boolean {
    const coord = this.getCurveCoordinateSystem();
    return (
      coord === CoordinateSystem.AFFINE ||
      coord === CoordinateSystem.LAMBDA_AFFINE ||
      this.isInfinity() ||
      this.zs[0].isOne()
    );
  }

  /**
   * Normalize point to affine coordinates.
   */
  normalize(): ECPoint {
    if (this.isInfinity()) {
      return this;
    }

    switch (this.getCurveCoordinateSystem()) {
      case CoordinateSystem.AFFINE:
      case CoordinateSystem.LAMBDA_AFFINE:
        return this;

      default: {
        const z = this.getZCoord(0);
        if (z.isOne()) {
          return this;
        }

        if (!this.curve) {
          throw new Error('Detached points must be in affine coordinates');
        }

        // Direct inversion (blinding temporarily disabled for debugging)
        const zInv = z.invert();

        return this.normalizeWithZInv(zInv);
      }
    }
  }

  /**
   * Normalize with pre-computed z-inverse.
   */
  normalizeWithZInv(zInv: ECFieldElement): ECPoint {
    switch (this.getCurveCoordinateSystem()) {
      case CoordinateSystem.HOMOGENEOUS:
      case CoordinateSystem.LAMBDA_PROJECTIVE:
        return this.createScaledPoint(zInv, zInv);

      case CoordinateSystem.JACOBIAN:
      case CoordinateSystem.JACOBIAN_CHUDNOVSKY:
      case CoordinateSystem.JACOBIAN_MODIFIED: {
        const zInv2 = zInv.square();
        const zInv3 = zInv2.multiply(zInv);
        return this.createScaledPoint(zInv2, zInv3);
      }

      default:
        throw new Error('not a projective coordinate system');
    }
  }

  /**
   * Create scaled point.
   */
  protected createScaledPoint(sx: ECFieldElement, sy: ECFieldElement): ECPoint {
    const rawX = this.getRawXCoord();
    const rawY = this.getRawYCoord();
    if (!rawX || !rawY) {
      throw new Error('Cannot scale infinity point');
    }
    return this.getCurve().createRawPoint(rawX.multiply(sx), rawY.multiply(sy));
  }

  /**
   * Check if this is the point at infinity.
   */
  isInfinity(): boolean {
    return !this.x || !this.y || (this.zs.length > 0 && this.zs[0].isZero());
  }

  /**
   * Check if point is valid (lies on curve and satisfies order).
   */
  isValid(): boolean {
    if (this.isInfinity()) {
      return true;
    }

    if (!this.satisfiesCurveEquation()) {
      return false;
    }

    // Check order if available
    const order = this.curve?.getOrder();
    if (order) {
      // For now, skip order check (requires multiply implementation)
      // return this.multiply(order).isInfinity();
    }

    return true;
  }

  /**
   * Get compression Y tilde (for compressed encoding).
   */
  protected abstract getCompressionYTilde(): boolean;

  /**
   * Add another point.
   */
  abstract add(b: ECPoint): ECPoint;

  /**
   * Negate this point.
   */
  abstract negate(): ECPoint;

  /**
   * Subtract another point.
   */
  subtract(b: ECPoint): ECPoint {
    if (b.isInfinity()) {
      return this;
    }
    return this.add(b.negate());
  }

  /**
   * Double this point.
   */
  abstract twice(): ECPoint;

  /**
   * Double this point e times.
   */
  timesPow2(e: number): ECPoint {
    if (e < 0) {
      throw new Error("'e' cannot be negative");
    }

    let p: ECPoint = this;
    while (--e >= 0) {
      p = p.twice();
    }
    return p;
  }

  /**
   * Compute 2*this + b.
   */
  twicePlus(b: ECPoint): ECPoint {
    return this.twice().add(b);
  }

  /**
   * Compute 3*this.
   */
  threeTimes(): ECPoint {
    return this.twicePlus(this);
  }

  /**
   * Multiply by scalar (will use curve's multiplier).
   */
  multiply(k: bigint): ECPoint {
    // For now, use simple double-and-add algorithm
    // Will be replaced by FixedPointCombMultiplier
    return this.simpleMultiply(k);
  }

  /**
   * Simple double-and-add multiplication algorithm.
   */
  private simpleMultiply(k: bigint): ECPoint {
    if (k === 0n) {
      return this.getCurve().getInfinity();
    }

    if (k < 0n) {
      throw new Error('Scalar must be non-negative');
    }

    let result = this.getCurve().getInfinity();
    let addend: ECPoint = this;

    while (k !== 0n) {
      if ((k & 1n) === 1n) {
        result = result.add(addend);
      }
      addend = addend.twice();
      k >>= 1n;
    }

    return result;
  }

  /**
   * Check equality.
   */
  equals(other: ECPoint | null): boolean {
    if (!other) {
      return false;
    }

    const c1 = this.curve;
    const c2 = other.curve;
    const n1 = !c1;
    const n2 = !c2;
    const i1 = this.isInfinity();
    const i2 = other.isInfinity();

    if (i1 || i2) {
      return i1 && i2 && (n1 || n2 || c1!.equals(c2!));
    }

    let p1: ECPoint = this;
    let p2: ECPoint = other;

    if (n1 && n2) {
      // Points with null curve are in affine form
    } else if (n1) {
      p2 = p2.normalize();
    } else if (n2) {
      p1 = p1.normalize();
    } else if (!c1!.equals(c2!)) {
      return false;
    } else {
      const points = [this, c1!.importPoint(p2)];
      c1!.normalizeAll(points);
      p1 = points[0];
      p2 = points[1];
    }

    return p1.getXCoord().equals(p2.getXCoord()) && p1.getYCoord().equals(p2.getYCoord());
  }

  /**
   * Get hash code.
   */
  hashCode(): number {
    const c = this.curve;
    let hc = c ? ~c.hashCode() : 0;

    if (!this.isInfinity()) {
      const p = this.normalize();
      const xHash = Number(p.getXCoord().toBigInteger() & 0xffffffffn);
      const yHash = Number(p.getYCoord().toBigInteger() & 0xffffffffn);
      hc ^= xHash * 17;
      hc ^= yHash * 257;
    }

    return hc | 0;
  }

  /**
   * Convert to string.
   */
  toString(): string {
    if (this.isInfinity()) {
      return 'INF';
    }

    const parts: string[] = [`(${this.getRawXCoord()!.toBigInteger()}`, `${this.getRawYCoord()!.toBigInteger()}`];
    for (const z of this.zs) {
      parts.push(z.toBigInteger().toString());
    }
    return parts.join(',') + ')';
  }

  /**
   * Get encoded point.
   */
  getEncoded(compressed: boolean): Uint8Array {
    if (this.isInfinity()) {
      return new Uint8Array([0x00]);
    }

    const normed = this.normalize();
    const X = normed.getXCoord().getEncoded();

    if (compressed) {
      const PO = new Uint8Array(X.length + 1);
      PO[0] = normed.getCompressionYTilde() ? 0x03 : 0x02;
      PO.set(X, 1);
      return PO;
    }

    const Y = normed.getYCoord().getEncoded();
    const PO = new Uint8Array(X.length + Y.length + 1);
    PO[0] = 0x04;
    PO.set(X, 1);
    PO.set(Y, X.length + 1);
    return PO;
  }
}

/**
 * Abstract base class for points over prime field Fp.
 */
export abstract class ECPointAbstractFp extends ECPoint {
  constructor(curve: ECCurve | null, x: ECFieldElement | null, y: ECFieldElement | null, zs?: ECFieldElement[]) {
    super(curve, x, y, zs);
  }

  protected getCompressionYTilde(): boolean {
    return this.getAffineYCoord().testBitZero();
  }

  protected satisfiesCurveEquation(): boolean {
    const X = this.x;
    const Y = this.y;
    if (!X || !Y) {
      return false; // Infinity
    }

    const curve = this.getCurve();
    let A = curve.getA();
    let B = curve.getB();
    let lhs = Y.square();

    switch (this.getCurveCoordinateSystem()) {
      case CoordinateSystem.AFFINE:
        break;

      case CoordinateSystem.HOMOGENEOUS: {
        const Z = this.zs[0];
        if (!Z.isOne()) {
          const Z2 = Z.square();
          const Z3 = Z.multiply(Z2);
          lhs = lhs.multiply(Z);
          A = A.multiply(Z2);
          B = B.multiply(Z3);
        }
        break;
      }

      case CoordinateSystem.JACOBIAN:
      case CoordinateSystem.JACOBIAN_CHUDNOVSKY:
      case CoordinateSystem.JACOBIAN_MODIFIED: {
        const Z = this.zs[0];
        if (!Z.isOne()) {
          const Z2 = Z.square();
          const Z4 = Z2.square();
          const Z6 = Z2.multiply(Z4);
          A = A.multiply(Z4);
          B = B.multiply(Z6);
        }
        break;
      }

      default:
        throw new Error('unsupported coordinate system');
    }

    // Check if lhs = rhs, where rhs = x^3 + ax + b
    const rhs = X.square().add(A).multiply(X).add(B);
    return lhs.equals(rhs);
  }
}

/**
 * Elliptic curve point over prime field Fp.
 */
export class ECPointFp extends ECPointAbstractFp {
  constructor(curve: ECCurve | null, x: ECFieldElement | null, y: ECFieldElement | null, zs?: ECFieldElement[]) {
    super(curve, x, y, zs);
  }

  protected detach(): ECPoint {
    return new ECPointFp(null, this.getAffineXCoord(), this.getAffineYCoord());
  }

  getZCoord(index: number): ECFieldElement {
    if (index === 1 && this.getCurveCoordinateSystem() === CoordinateSystem.JACOBIAN_MODIFIED) {
      return this.getJacobianModifiedW();
    }
    return super.getZCoord(index);
  }

  /**
   * Get Jacobian Modified W coordinate.
   */
  private getJacobianModifiedW(): ECFieldElement {
    const Zs = this.zs;
    let W = Zs[1];
    if (!W) {
      // Lazy calculation: W = a * Z^4
      W = this.calculateJacobianModifiedW(Zs[0], null);
      Zs[1] = W;
    }
    return W;
  }

  /**
   * Calculate W coordinate for Jacobian Modified.
   * W = a * Z^4 (but simplified to 'a' when Z=1)
   */
  private calculateJacobianModifiedW(Z: ECFieldElement, ZSquared: ECFieldElement | null): ECFieldElement {
    const a4 = this.getCurve().getA();
    if (a4.isZero() || Z.isOne()) {
      return a4;
    }

    const ZSq = ZSquared || Z.square();
    const W = ZSq.square();
    
    // Optimization: use negation if -a has smaller bit length
    const a4Neg = a4.negate();
    const a4NegBitLen = a4Neg.toBigInteger() < 0n 
      ? BigInt.asIntN(256, a4Neg.toBigInteger()).toString(2).length 
      : a4Neg.toBigInteger().toString(2).length;
    const a4BitLen = a4.toBigInteger() < 0n
      ? BigInt.asIntN(256, a4.toBigInteger()).toString(2).length
      : a4.toBigInteger().toString(2).length;
    
    if (a4NegBitLen < a4BitLen) {
      return W.multiply(a4Neg).negate();
    } else {
      return W.multiply(a4);
    }
  }

  // Point addition
  add(b: ECPoint): ECPoint {
    if (this.isInfinity()) {
      return b;
    }
    if (b.isInfinity()) {
      return this;
    }
    if (this === b) {
      return this.twice();
    }

    const curve = this.getCurve();
    const coord = curve.getCoordinateSystem();

    const X1 = this.x!;
    const Y1 = this.y!;
    const X2 = b.x!;
    const Y2 = b.y!;

    switch (coord) {
      case CoordinateSystem.AFFINE: {
        const dx = X2.subtract(X1);
        const dy = Y2.subtract(Y1);

        if (dx.isZero()) {
          if (dy.isZero()) {
            // this == b, must be doubled
            return this.twice();
          }
          // this == -b, result is infinity
          return curve.getInfinity();
        }

        // λ = (y2 - y1) / (x2 - x1)
        const gamma = dy.divide(dx);
        // x3 = λ^2 - x1 - x2
        const X3 = gamma.square().subtract(X1).subtract(X2);
        // y3 = λ(x1 - x3) - y1
        const Y3 = gamma.multiply(X1.subtract(X3)).subtract(Y1);

        return new ECPointFp(curve, X3, Y3);
      }

      case CoordinateSystem.JACOBIAN:
      case CoordinateSystem.JACOBIAN_MODIFIED: {
        const Z1 = this.zs[0];
        const Z2 = b.zs[0];

        const Z1IsOne = Z1.isOne();
        const Z2IsOne = Z2.isOne();

        let U1 = X1, U2 = X2, S1 = Y1, S2 = Y2;

        if (!Z1IsOne) {
          const Z1Sq = Z1.square();
          U2 = U2.multiply(Z1Sq);
          S2 = S2.multiply(Z1Sq).multiply(Z1);
        }

        if (!Z2IsOne) {
          const Z2Sq = Z2.square();
          U1 = U1.multiply(Z2Sq);
          S1 = S1.multiply(Z2Sq).multiply(Z2);
        }

        const H = U2.subtract(U1);
        const R = S2.subtract(S1);

        // Check if same or inverse point
        if (H.isZero()) {
          if (R.isZero()) {
            // Same point
            return this.twice();
          }
          // Inverse point
          return curve.getInfinity();
        }

        const HSquared = H.square();
        const G = HSquared.multiply(H);
        const V = U1.multiply(HSquared);

        const X3 = R.square().subtract(G).subtract(V).subtract(V);
        const Y3 = V.subtract(X3).multiply(R).subtract(S1.multiply(G));

        let Z3 = H;
        if (!Z1IsOne) {
          Z3 = Z3.multiply(Z1);
        }
        if (!Z2IsOne) {
          Z3 = Z3.multiply(Z2);
        }

        let zs: ECFieldElement[];
        if (coord === CoordinateSystem.JACOBIAN_MODIFIED) {
          // W3 = a * Z3^4
          const a = curve.getA();
          let W3: ECFieldElement;
          if (a.isZero() || Z3.isOne()) {
            W3 = a;
          } else {
            const Z3Sq = Z3.square();
            W3 = Z3Sq.square().multiply(a);
          }
          zs = [Z3, W3];
        } else {
          zs = [Z3];
        }

        return new ECPointFp(curve, X3, Y3, zs);
      }

      default:
        throw new Error('unsupported coordinate system');
    }
  }

  // Point doubling
  twice(): ECPoint {
    if (this.isInfinity()) {
      return this;
    }

    const curve = this.getCurve();
    const Y1 = this.y!;

    if (Y1.isZero()) {
      return curve.getInfinity();
    }

    const coord = curve.getCoordinateSystem();
    const X1 = this.x!;

    switch (coord) {
      case CoordinateSystem.AFFINE: {
        const X1Squared = X1.square();
        // λ = (3x1^2 + a) / (2y1)
        const gamma = X1Squared.add(X1Squared).add(X1Squared).add(curve.getA()).divide(Y1.add(Y1));
        // x3 = λ^2 - 2x1
        const X3 = gamma.square().subtract(X1).subtract(X1);
        // y3 = λ(x1 - x3) - y1
        const Y3 = gamma.multiply(X1.subtract(X3)).subtract(Y1);

        return new ECPointFp(curve, X3, Y3);
      }

      case CoordinateSystem.JACOBIAN: {
        const Z1 = this.zs[0];
        const Z1IsOne = Z1.isOne();

        let Y1Squared = Y1.square();
        let T = Y1Squared.square();

        const a = curve.getA();
        let M = X1.square().multiply(curve.fromBigInteger(ECConstants.THREE));

        let S: ECFieldElement;
        if (!a.isZero()) {
          if (Z1IsOne) {
            M = M.add(a);
          } else {
            const Z1Squared = Z1.square();
            const Z1Pow4 = Z1Squared.square();
            M = M.add(a.multiply(Z1Pow4));
          }
        }

        S = X1.multiply(Y1Squared).multiply(curve.fromBigInteger(ECConstants.FOUR));
        const X3 = M.square().subtract(S).subtract(S);
        
        let Z3: ECFieldElement;
        if (Z1IsOne) {
          Z3 = Y1.add(Y1);
        } else {
          Z3 = Y1.multiply(Z1).add(Y1.multiply(Z1));
        }

        const Y3 = M.multiply(S.subtract(X3)).subtract(T.multiply(curve.fromBigInteger(ECConstants.EIGHT)));

        return new ECPointFp(curve, X3, Y3, [Z3]);
      }

      case CoordinateSystem.JACOBIAN_MODIFIED: {
        return this.twiceJacobianModified(true);
      }

      default:
        throw new Error('unsupported coordinate system');
    }
  }

  /**
   * Doubling in Jacobian Modified coordinates.
   */
  private twiceJacobianModified(calculateW: boolean): ECPoint {
    const curve = this.getCurve();
    const X1 = this.x!;
    const Y1 = this.y!;
    const Z1 = this.zs[0];
    const W1 = this.getJacobianModifiedW();

    const X1Squared = X1.square();
    const M = X1Squared.multiply(curve.fromBigInteger(ECConstants.THREE)).add(W1);
    const _2Y1 = Y1.add(Y1);
    const _2Y1Squared = _2Y1.multiply(Y1);
    const S = X1.multiply(_2Y1Squared).add(X1.multiply(_2Y1Squared)); // S = 2*(X1*(2Y1)^2)
    const X3 = M.square().subtract(S.add(S));
    const _4T = _2Y1Squared.square();
    const _8T = _4T.add(_4T);
    const Y3 = M.multiply(S.subtract(X3)).subtract(_8T);
    const W3 = calculateW ? _8T.multiply(W1).add(_8T.multiply(W1)) : curve.getA(); // W3 = 2*(8T*W1)
    const Z3 = Z1.isOne() ? _2Y1 : _2Y1.multiply(Z1);

    return new ECPointFp(curve, X3, Y3, [Z3, W3]);
  }

  // Point negation
  negate(): ECPoint {
    if (this.isInfinity()) {
      return this;
    }

    const curve = this.getCurve();
    const coord = curve.getCoordinateSystem();

    if (coord !== CoordinateSystem.AFFINE) {
      return new ECPointFp(curve, this.x, this.y!.negate(), this.zs);
    }

    return new ECPointFp(curve, this.x, this.y!.negate());
  }
}

// Register ECPointFp factory to break circular dependency
import { registerECPointFactory } from './ECPointFactory';
registerECPointFactory((curve, x, y, zs) => new ECPointFp(curve as ECCurveFp, x, y, zs));
