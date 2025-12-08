import { Fp2Element } from './Fp2Element';

/**
 * Point on twisted elliptic curve E'(Fp2)
 * 
 * For SM9, the twisted curve is defined over Fp2:
 * E': y^2 = x^3 + b'
 * where b' = b/ξ (ξ is the twist parameter)
 * 
 * Used in SM9 pairing computations for G2 group.
 * 
 * 参考: GM/T 0044-2016, org.bouncycastle.math.ec
 */
export class ECPointFp2 {
  private readonly x: Fp2Element;
  private readonly y: Fp2Element;
  private readonly z: Fp2Element;
  private readonly p: bigint;
  private readonly isInfinityPoint: boolean;

  /**
   * Create a point on E'(Fp2)
   * 
   * @param x - X coordinate (Fp2 element)
   * @param y - Y coordinate (Fp2 element)
   * @param z - Z coordinate (Fp2 element) for projective coordinates
   * @param p - Prime modulus
   */
  constructor(x: Fp2Element, y: Fp2Element, z: Fp2Element, p: bigint) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.p = p;
    this.isInfinityPoint = z.isZero();
  }

  /**
   * Get X coordinate
   */
  getX(): Fp2Element {
    return this.x;
  }

  /**
   * Get Y coordinate
   */
  getY(): Fp2Element {
    return this.y;
  }

  /**
   * Get Z coordinate
   */
  getZ(): Fp2Element {
    return this.z;
  }

  /**
   * Get affine X coordinate (x/z)
   */
  getAffineX(): Fp2Element {
    if (this.isInfinityPoint) {
      throw new Error('Cannot get affine coordinates of point at infinity');
    }
    if (this.z.isOne()) {
      return this.x;
    }
    return this.x.divide(this.z) as Fp2Element;
  }

  /**
   * Get affine Y coordinate (y/z)
   */
  getAffineY(): Fp2Element {
    if (this.isInfinityPoint) {
      throw new Error('Cannot get affine coordinates of point at infinity');
    }
    if (this.z.isOne()) {
      return this.y;
    }
    return this.y.divide(this.z) as Fp2Element;
  }

  /**
   * Check if this is the point at infinity
   */
  isInfinity(): boolean {
    return this.isInfinityPoint;
  }

  /**
   * Add another point
   * Uses projective coordinates for efficiency
   */
  add(other: ECPointFp2): ECPointFp2 {
    if (this.isInfinity()) {
      return other;
    }
    if (other.isInfinity()) {
      return this;
    }

    // If points are the same, use doubling
    if (this.equals(other)) {
      return this.twice();
    }

    // Point addition in projective coordinates
    // Using standard formulas for y^2 = x^3 + b'
    const x1 = this.x;
    const y1 = this.y;
    const z1 = this.z;
    const x2 = other.x;
    const y2 = other.y;
    const z2 = other.z;

    // U1 = X1*Z2, U2 = X2*Z1
    const u1 = x1.multiply(z2) as Fp2Element;
    const u2 = x2.multiply(z1) as Fp2Element;

    // S1 = Y1*Z2, S2 = Y2*Z1
    const s1 = y1.multiply(z2) as Fp2Element;
    const s2 = y2.multiply(z1) as Fp2Element;

    if (u1.equals(u2)) {
      // Points have same X coordinate
      if (s1.equals(s2)) {
        // Same point, use doubling
        return this.twice();
      } else {
        // Points are inverses, result is infinity
        return ECPointFp2.infinity(this.p);
      }
    }

    // H = U2 - U1
    const h = u2.subtract(u1) as Fp2Element;
    // R = S2 - S1
    const r = s2.subtract(s1) as Fp2Element;

    // H2 = H^2
    const h2 = h.square() as Fp2Element;
    // H3 = H^3
    const h3 = h2.multiply(h) as Fp2Element;

    // X3 = R^2 - H3 - 2*U1*H2
    const r2 = r.square() as Fp2Element;
    const u1h2 = u1.multiply(h2) as Fp2Element;
    const two = new Fp2Element(2n, 0n, this.p);
    const twoU1H2 = two.multiply(u1h2) as Fp2Element;
    const x3 = r2.subtract(h3).subtract(twoU1H2) as Fp2Element;

    // Y3 = R*(U1*H2 - X3) - S1*H3
    const y3 = r.multiply(u1h2.subtract(x3) as Fp2Element)
                .subtract(s1.multiply(h3) as Fp2Element) as Fp2Element;

    // Z3 = Z1*Z2*H
    const z3 = z1.multiply(z2).multiply(h) as Fp2Element;

    return new ECPointFp2(x3, y3, z3, this.p);
  }

  /**
   * Double this point
   */
  twice(): ECPointFp2 {
    if (this.isInfinity()) {
      return this;
    }

    // Point doubling in projective coordinates
    const x1 = this.x;
    const y1 = this.y;
    const z1 = this.z;

    // Constants
    const two = new Fp2Element(2n, 0n, this.p);
    const three = new Fp2Element(3n, 0n, this.p);
    const four = new Fp2Element(4n, 0n, this.p);
    const eight = new Fp2Element(8n, 0n, this.p);

    // M = 3*X1^2
    const x1Sq = x1.square() as Fp2Element;
    const m = three.multiply(x1Sq) as Fp2Element;

    // S = 4*X1*Y1^2
    const y1Sq = y1.square() as Fp2Element;
    const s = four.multiply(x1).multiply(y1Sq) as Fp2Element;

    // X3 = M^2 - 2*S
    const mSq = m.square() as Fp2Element;
    const twoS = two.multiply(s) as Fp2Element;
    const x3 = mSq.subtract(twoS) as Fp2Element;

    // Y3 = M*(S - X3) - 8*Y1^4
    const y1Fourth = y1Sq.square() as Fp2Element;
    const eightY1Fourth = eight.multiply(y1Fourth) as Fp2Element;
    const y3 = m.multiply(s.subtract(x3) as Fp2Element)
                .subtract(eightY1Fourth) as Fp2Element;

    // Z3 = 2*Y1*Z1
    const z3 = two.multiply(y1).multiply(z1) as Fp2Element;

    return new ECPointFp2(x3, y3, z3, this.p);
  }

  /**
   * Negate this point
   */
  negate(): ECPointFp2 {
    if (this.isInfinity()) {
      return this;
    }
    return new ECPointFp2(this.x, this.y.negate() as Fp2Element, this.z, this.p);
  }

  /**
   * Multiply point by scalar
   * Uses double-and-add algorithm
   */
  multiply(k: bigint): ECPointFp2 {
    // Handle zero and infinity cases
    if (k === 0n || this.isInfinity()) {
      return ECPointFp2.infinity(this.p);
    }
    if (k === 1n) {
      return this;
    }
    if (k < 0n) {
      return this.negate().multiply(-k);
    }

    let result: ECPointFp2 = ECPointFp2.infinity(this.p);
    let addend: ECPointFp2 = this;
    let scalar = k;

    while (scalar > 0n) {
      if (scalar & 1n) {
        result = result.add(addend);
      }
      addend = addend.twice();
      scalar = scalar >> 1n;
    }

    return result;
  }

  /**
   * Check equality with another point
   */
  equals(other: ECPointFp2): boolean {
    if (this.isInfinity() && other.isInfinity()) {
      return true;
    }
    if (this.isInfinity() || other.isInfinity()) {
      return false;
    }

    // Check if X1*Z2 = X2*Z1 and Y1*Z2 = Y2*Z1
    const x1z2 = this.x.multiply(other.z) as Fp2Element;
    const x2z1 = other.x.multiply(this.z) as Fp2Element;
    const y1z2 = this.y.multiply(other.z) as Fp2Element;
    const y2z1 = other.y.multiply(this.z) as Fp2Element;

    return x1z2.equals(x2z1) && y1z2.equals(y2z1);
  }

  /**
   * Convert to string
   */
  toString(): string {
    if (this.isInfinity()) {
      return 'ECPointFp2(infinity)';
    }
    return `ECPointFp2(${this.x.toString()}, ${this.y.toString()})`;
  }

  /**
   * Create point at infinity
   */
  static infinity(p: bigint): ECPointFp2 {
    const zero = Fp2Element.zero(p);
    const one = Fp2Element.one(p);
    return new ECPointFp2(zero, one, zero, p);
  }

  /**
   * Create point from affine coordinates
   */
  static fromAffine(x: Fp2Element, y: Fp2Element, p: bigint): ECPointFp2 {
    const one = Fp2Element.one(p);
    return new ECPointFp2(x, y, one, p);
  }

  /**
   * Normalize point to affine coordinates (Z=1)
   */
  normalize(): ECPointFp2 {
    if (this.isInfinity() || this.z.isOne()) {
      return this;
    }

    const zInv = this.z.invert() as Fp2Element;
    const xAffine = this.x.multiply(zInv) as Fp2Element;
    const yAffine = this.y.multiply(zInv) as Fp2Element;

    return ECPointFp2.fromAffine(xAffine, yAffine, this.p);
  }
}
