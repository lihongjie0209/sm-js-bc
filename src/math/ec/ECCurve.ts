/**
 * Base class for elliptic curves.
 * 
 * Based on: org.bouncycastle.math.ec.ECCurve
 */

import { ECFieldElement, ECFieldElementFp } from './ECFieldElement';
import { ECConstants } from './ECConstants';
import { BigIntegers } from '../../util/BigIntegers';
import { Integers } from '../../util/Integers';
import { SecureRandom } from '../../util/SecureRandom';
import { createECPoint } from './ECPointFactory';
import type { PreCompInfo, PreCompCallback } from './PreCompInfo';
import type { ECLookupTable } from './ECLookupTable';
import { AbstractECLookupTable } from './ECLookupTable';
import type { ECPoint } from './ECPoint';

/**
 * Coordinate system constants.
 */
export enum CoordinateSystem {
  AFFINE = 0,
  HOMOGENEOUS = 1,
  JACOBIAN = 2,
  JACOBIAN_CHUDNOVSKY = 3,
  JACOBIAN_MODIFIED = 4,
  LAMBDA_AFFINE = 5,
  LAMBDA_PROJECTIVE = 6,
  SKEWED = 7
}

/**
 * Abstract base class for all elliptic curves.
 */
export abstract class ECCurve {
  protected a!: ECFieldElement;
  protected b!: ECFieldElement;
  protected order: bigint | null;
  protected cofactor: bigint | null;
  protected coord: CoordinateSystem;

  constructor(order: bigint | null = null, cofactor: bigint | null = null) {
    this.order = order;
    this.cofactor = cofactor;
    this.coord = CoordinateSystem.AFFINE;
  }

  /**
   * Get the size of the field in bits.
   */
  abstract getFieldSize(): number;

  /**
   * Create a field element from a BigInt.
   */
  abstract fromBigInteger(x: bigint): ECFieldElement;

  /**
   * Check if a value is a valid field element.
   */
  abstract isValidFieldElement(x: bigint): boolean;

  /**
   * Create a random field element.
   */
  abstract randomFieldElement(r: SecureRandom): ECFieldElement;

  /**
   * Create a random non-zero field element (for multiplication).
   */
  abstract randomFieldElementMult(r: SecureRandom): ECFieldElement;

  /**
   * Get the field element encoding length in bytes.
   */
  getFieldElementEncodingLength(): number {
    return Math.ceil(this.getFieldSize() / 8);
  }

  /**
   * Get the affine point encoding length.
   */
  getAffinePointEncodingLength(compressed: boolean): number {
    const fieldLength = this.getFieldElementEncodingLength();
    return compressed ? 1 + fieldLength : 1 + fieldLength * 2;
  }

  /**
   * Create a point and validate it lies on the curve.
   */
  validatePoint(x: bigint, y: bigint): ECPoint {
    const p = this.createPoint(x, y);
    if (!p.isValid()) {
      throw new Error('Invalid point coordinates');
    }
    return p;
  }

  /**
   * Create a point on the curve.
   */
  abstract createPoint(x: bigint, y: bigint): ECPoint;

  /**
   * Create a raw point (without validation).
   */
  abstract createRawPoint(x: ECFieldElement, y: ECFieldElement): ECPoint;

  /**
   * Create a raw point with z-coordinates.
   */
  abstract createRawPoint(x: ECFieldElement, y: ECFieldElement, zs: ECFieldElement[]): ECPoint;

  /**
   * Clone this curve.
   */
  protected abstract cloneCurve(): ECCurve;

  /**
   * Check if a coordinate system is supported.
   */
  supportsCoordinateSystem(coord: CoordinateSystem): boolean {
    return coord === CoordinateSystem.AFFINE;
  }

  /**
   * Get the coordinate system.
   */
  getCoordinateSystem(): CoordinateSystem {
    return this.coord;
  }

  /**
   * Import a point from another curve.
   */
  importPoint(p: ECPoint): ECPoint {
    if (this === p.getCurve()) {
      return p;
    }
    if (p.isInfinity()) {
      return this.getInfinity();
    }

    // Normalize to affine coordinates
    const pNorm = p.normalize();
    return this.createPoint(pNorm.getXCoord().toBigInteger(), pNorm.getYCoord().toBigInteger());
  }

  /**
   * Normalize all points in an array.
   */
  normalizeAll(points: ECPoint[]): void {
    this.normalizeAllWithRange(points, 0, points.length, null);
  }

  /**
   * Normalize a range of points with optional iso scaling.
   */
  normalizeAllWithRange(points: ECPoint[], off: number, len: number, iso: ECFieldElement | null): void {
    this.checkPoints(points, off, len);

    switch (this.getCoordinateSystem()) {
      case CoordinateSystem.AFFINE:
      case CoordinateSystem.LAMBDA_AFFINE:
        if (iso !== null) {
          throw new Error("'iso' not valid for affine coordinates");
        }
        return;
    }

    // Find points that need normalization
    const zs: ECFieldElement[] = [];
    const indices: number[] = [];
    let count = 0;

    for (let i = 0; i < len; i++) {
      const p = points[off + i];
      if (p && (iso !== null || !p.isNormalized())) {
        zs[count] = p.getZCoord(0);
        indices[count++] = off + i;
      }
    }

    if (count === 0) {
      return;
    }

    // Use Montgomery trick for batch inversion (will be implemented in ECAlgorithms)
    // For now, normalize each point individually
    for (let j = 0; j < count; j++) {
      const index = indices[j];
      points[index] = points[index].normalize();
    }
  }

  /**
   * Precompute and cache data for a point.
   * @param point The point to precompute for
   * @param name The name of the precomputation (e.g., "bc_fixed_point")
   * @param callback The callback that performs the actual precomputation
   * @returns The precomputed data
   */
  precompute(point: ECPoint, name: string, callback: PreCompCallback): PreCompInfo {
    this.checkPoint(point);

    // Ensure preCompTable exists
    if (!point.preCompTable) {
      point.preCompTable = new Map<string, PreCompInfo>();
    }

    // Check if precomputation already exists
    const existing = point.preCompTable.get(name) || null;
    const result = callback.precompute(existing);

    // Store if different
    if (result !== existing) {
      point.preCompTable.set(name, result);
    }

    return result;
  }

  /**
   * Create a cache-safe lookup table from an array of points.
   * Points must already be normalized.
   * @param points The array of points
   * @param off The offset in the array
   * @param len The number of points
   */
  createCacheSafeLookupTable(points: ECPoint[], off: number, len: number): ECLookupTable {
    const feBytes = this.getFieldElementEncodingLength();
    const table = new Uint8Array(len * feBytes * 2);
    let pos = 0;

    for (let i = 0; i < len; i++) {
      const p = points[off + i];
      const xBytes = p.getXCoord().getEncoded();
      const yBytes = p.getYCoord().getEncoded();
      
      table.set(xBytes, pos);
      pos += feBytes;
      table.set(yBytes, pos);
      pos += feBytes;
    }

    const curve = this;
    return new (class extends AbstractECLookupTable {
      getSize(): number {
        return len;
      }

      lookup(index: number): ECPoint {
        const x = new Uint8Array(feBytes);
        const y = new Uint8Array(feBytes);
        let pos = 0;

        // Constant-time lookup using masking
        for (let i = 0; i < len; i++) {
          const MASK = ((i ^ index) - 1) >> 31;

          for (let j = 0; j < feBytes; j++) {
            x[j] ^= table[pos + j] & MASK;
            y[j] ^= table[pos + feBytes + j] & MASK;
          }

          pos += feBytes * 2;
        }

        return curve.createRawPoint(
          curve.fromBigInteger(BigIntegers.fromUnsignedByteArray(x)),
          curve.fromBigInteger(BigIntegers.fromUnsignedByteArray(y))
        );
      }

      lookupVar(index: number): ECPoint {
        const x = new Uint8Array(feBytes);
        const y = new Uint8Array(feBytes);
        const pos = index * feBytes * 2;

        for (let j = 0; j < feBytes; j++) {
          x[j] = table[pos + j];
          y[j] = table[pos + feBytes + j];
        }

        return curve.createRawPoint(
          curve.fromBigInteger(BigIntegers.fromUnsignedByteArray(x)),
          curve.fromBigInteger(BigIntegers.fromUnsignedByteArray(y))
        );
      }
    })();
  }

  /**
   * Get the point at infinity.
   */
  abstract getInfinity(): ECPoint;

  /**
   * Get the curve parameter a.
   */
  getA(): ECFieldElement {
    return this.a;
  }

  /**
   * Get the curve parameter b.
   */
  getB(): ECFieldElement {
    return this.b;
  }

  /**
   * Get the order of the curve.
   */
  getOrder(): bigint | null {
    return this.order;
  }

  /**
   * Get the cofactor of the curve.
   */
  getCofactor(): bigint | null {
    return this.cofactor;
  }

  /**
   * Decode a point from bytes.
   */
  abstract decodePoint(encoded: Uint8Array): ECPoint;

  /**
   * Check a single point.
   */
  protected checkPoint(point: ECPoint): void {
    if (!point || this !== point.getCurve()) {
      throw new Error("'point' must be non-null and on this curve");
    }
  }

  /**
   * Check an array of points.
   */
  protected checkPoints(points: ECPoint[], off: number = 0, len: number = points.length): void {
    if (!points) {
      throw new Error("'points' cannot be null");
    }
    if (off < 0 || len < 0 || off > points.length - len) {
      throw new Error('invalid range specified for points');
    }

    for (let i = 0; i < len; i++) {
      const point = points[off + i];
      if (point && this !== point.getCurve()) {
        throw new Error("'points' entries must be null or on this curve");
      }
    }
  }

  /**
   * Check equality with another curve.
   */
  equals(other: ECCurve): boolean {
    return (
      this === other ||
      (other &&
        this.getFieldSize() === other.getFieldSize() &&
        this.a.toBigInteger() === other.a.toBigInteger() &&
        this.b.toBigInteger() === other.b.toBigInteger())
    );
  }

  /**
   * Get hash code.
   */
  hashCode(): number {
    const aHash = Number(this.a.toBigInteger() & 0xffffffffn);
    const bHash = Number(this.b.toBigInteger() & 0xffffffffn);
    return this.getFieldSize() ^ Integers.rotateLeft(aHash, 8) ^ Integers.rotateLeft(bHash, 16);
  }
}

/**
 * Abstract base class for curves over prime fields Fp.
 */
export abstract class ECCurveAbstractFp extends ECCurve {
  protected q: bigint;

  constructor(q: bigint, order: bigint | null = null, cofactor: bigint | null = null) {
    super(order, cofactor);
    this.q = q;
  }

  /**
   * Get the prime modulus.
   */
  getQ(): bigint {
    return this.q;
  }

  getFieldSize(): number {
    return BigIntegers.bitLength(this.q);
  }

  isValidFieldElement(x: bigint): boolean {
    return x >= 0n && x < this.q;
  }

  randomFieldElement(r: SecureRandom): ECFieldElement {
    // Use product of two independent elements to mitigate side-channels
    const p = this.getQ();
    const fe1 = this.fromBigInteger(this.implRandomFieldElement(r, p));
    const fe2 = this.fromBigInteger(this.implRandomFieldElement(r, p));
    return fe1.multiply(fe2);
  }

  randomFieldElementMult(r: SecureRandom): ECFieldElement {
    // Use product of two independent elements to mitigate side-channels
    const p = this.getQ();
    const fe1 = this.fromBigInteger(this.implRandomFieldElementMult(r, p));
    const fe2 = this.fromBigInteger(this.implRandomFieldElementMult(r, p));
    return fe1.multiply(fe2);
  }

  /**
   * Decompress a point from compressed format.
   */
  protected decompressPoint(yTilde: number, X1: bigint): ECPoint {
    const x = this.fromBigInteger(X1);
    const rhs = x.square().add(this.a).multiply(x).add(this.b);
    let y = rhs.sqrt();

    if (y === null) {
      throw new Error('Invalid point compression');
    }

    if (y.testBitZero() !== (yTilde === 1)) {
      // Use the other root
      y = y.negate();
    }

    return this.createRawPoint(x, y);
  }

  private implRandomFieldElement(r: SecureRandom, p: bigint): bigint {
    let x: bigint;
    do {
      x = BigIntegers.createRandomBigInteger(BigIntegers.bitLength(p), r);
    } while (x >= p);
    return x;
  }

  private implRandomFieldElementMult(r: SecureRandom, p: bigint): bigint {
    let x: bigint;
    do {
      x = BigIntegers.createRandomBigInteger(BigIntegers.bitLength(p), r);
    } while (x <= 0n || x >= p);
    return x;
  }
}

/**
 * Elliptic curve over prime field Fp: y^2 = x^3 + ax + b (mod p)
 */
export class ECCurveFp extends ECCurveAbstractFp {
  private static readonly FP_DEFAULT_COORDS = CoordinateSystem.JACOBIAN_MODIFIED;

  private r: bigint;
  private _infinity: ECPoint | null = null;

  /**
   * Constructor for Fp curve.
   * 
   * @param q - The prime modulus
   * @param a - Curve parameter a
   * @param b - Curve parameter b
   * @param order - Order of the base point (optional)
   * @param cofactor - Cofactor (optional)
   */
  constructor(q: bigint, a: bigint, b: bigint, order: bigint | null = null, cofactor: bigint | null = null) {
    super(q, order, cofactor);

    this.q = q;
    this.r = this.calculateResidue(q);
    
    this.a = new ECFieldElementFp(q, a);
    this.b = new ECFieldElementFp(q, b);
    
    this.coord = ECCurveFp.FP_DEFAULT_COORDS;
  }
  
  /**
   * Lazy getter for infinity point to avoid circular dependency.
   */
  private get infinity(): ECPoint {
    if (!this._infinity) {
      this._infinity = createECPoint(this, null, null);
    }
    return this._infinity!;
  }
  
  /**
   * Setter for infinity point (used in createInternal).
   */
  private set infinity(value: ECPoint) {
    this._infinity = value;
  }

  /**
   * Internal constructor with pre-computed values.
   */
  private static createInternal(
    q: bigint,
    r: bigint,
    a: ECFieldElement,
    b: ECFieldElement,
    order: bigint | null,
    cofactor: bigint | null
  ): ECCurveFp {
    const curve = Object.create(ECCurveFp.prototype);
    curve.q = q;
    curve.r = r;
    curve.a = a;
    curve.b = b;
    curve.order = order;
    curve.cofactor = cofactor;
    curve.coord = ECCurveFp.FP_DEFAULT_COORDS;
    return curve;
  }

  /**
   * Calculate residue for Montgomery reduction optimization.
   */
  private calculateResidue(p: bigint): bigint {
    const bitLength = BigIntegers.bitLength(p);
    if (bitLength >= 96) {
      const firstWord = p >> BigInt(bitLength - 64);
      if (firstWord === -1n) {
        return 1n;
      }
      if ((firstWord | 1n) === -1n) {
        return 2n;
      }
    }
    return 0n;
  }

  protected cloneCurve(): ECCurve {
    return ECCurveFp.createInternal(this.q, this.r, this.a, this.b, this.order, this.cofactor);
  }

  supportsCoordinateSystem(coord: CoordinateSystem): boolean {
    switch (coord) {
      case CoordinateSystem.AFFINE:
      case CoordinateSystem.HOMOGENEOUS:
      case CoordinateSystem.JACOBIAN:
      case CoordinateSystem.JACOBIAN_MODIFIED:
        return true;
      default:
        return false;
    }
  }

  getQ(): bigint {
    return this.q;
  }

  getFieldSize(): number {
    return BigIntegers.bitLength(this.q);
  }

  fromBigInteger(x: bigint): ECFieldElement {
    return new ECFieldElementFp(this.q, x);
  }

  createRawPoint(x: ECFieldElement, y: ECFieldElement, zs?: ECFieldElement[]): ECPoint {
    return createECPoint(this, x, y, zs);
  }

  createPoint(x: bigint, y: bigint): ECPoint {
    return this.createRawPoint(this.fromBigInteger(x), this.fromBigInteger(y));
  }

  /**
   * Import a point, with optimization for Jacobian coordinates.
   */
  importPoint(p: ECPoint): ECPoint {
    if (this !== p.getCurve() && this.getCoordinateSystem() === CoordinateSystem.JACOBIAN && !p.isInfinity()) {
      const pCoord = p.getCurve().getCoordinateSystem();
      if (
        pCoord === CoordinateSystem.JACOBIAN ||
        pCoord === CoordinateSystem.JACOBIAN_CHUDNOVSKY ||
        pCoord === CoordinateSystem.JACOBIAN_MODIFIED
      ) {
        return this.createRawPoint(
          this.fromBigInteger(p.getXCoord().toBigInteger()),
          this.fromBigInteger(p.getYCoord().toBigInteger()),
          [this.fromBigInteger(p.getZCoord(0).toBigInteger())]
        );
      }
    }

    return super.importPoint(p);
  }

  getInfinity(): ECPoint {
    if (!this._infinity) {
      this._infinity = createECPoint(this, null, null);
    }
    return this._infinity!;
  }

  /**
   * Set the infinity point (called after ECPoint is implemented).
   */
  setInfinity(infinity: ECPoint): void {
    this.infinity = infinity;
  }

  /**
   * Decode a point from byte array.
   * 
   * Format:
   * - 0x00: Point at infinity
   * - 0x02/0x03: Compressed point (x-coordinate + sign bit)
   * - 0x04: Uncompressed point (x-coordinate + y-coordinate)
   * - 0x06/0x07: Hybrid format (uncompressed + sign bit)
   */
  decodePoint(encoded: Uint8Array): ECPoint {
    if (encoded.length === 0) {
      throw new Error('Invalid point encoding');
    }

    const type = encoded[0];
    const expectedLength = this.getFieldElementEncodingLength();

    switch (type) {
      case 0x00: // Infinity
        if (encoded.length !== 1) {
          throw new Error('Incorrect length for infinity encoding');
        }
        return this.getInfinity();

      case 0x02: // Compressed, yTilde = 0
      case 0x03: // Compressed, yTilde = 1
        if (encoded.length !== 1 + expectedLength) {
          throw new Error('Incorrect length for compressed encoding');
        }
        const yTilde = type & 1;
        const X = BigIntegers.fromUnsignedByteArray(encoded.subarray(1, 1 + expectedLength));
        return this.decompressPoint(yTilde, X);

      case 0x04: // Uncompressed
        if (encoded.length !== 1 + 2 * expectedLength) {
          throw new Error('Incorrect length for uncompressed encoding');
        }
        const x = BigIntegers.fromUnsignedByteArray(encoded.subarray(1, 1 + expectedLength));
        const y = BigIntegers.fromUnsignedByteArray(encoded.subarray(1 + expectedLength, 1 + 2 * expectedLength));
        return this.validatePoint(x, y);

      case 0x06: // Hybrid, yTilde = 0
      case 0x07: // Hybrid, yTilde = 1
        if (encoded.length !== 1 + 2 * expectedLength) {
          throw new Error('Incorrect length for hybrid encoding');
        }
        const xh = BigIntegers.fromUnsignedByteArray(encoded.subarray(1, 1 + expectedLength));
        const yh = BigIntegers.fromUnsignedByteArray(encoded.subarray(1 + expectedLength, 1 + 2 * expectedLength));
        const point = this.validatePoint(xh, yh);
        
        // Check that yTilde matches
        if (point.getYCoord().testBitZero() !== ((type & 1) === 1)) {
          throw new Error('Inconsistent Y coordinate in hybrid encoding');
        }
        
        return point;

      default:
        throw new Error('Invalid point encoding: ' + type);
    }
  }
}
