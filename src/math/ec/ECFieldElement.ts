/**
 * Abstract base class for finite field elements.
 * 
 * Based on: org.bouncycastle.math.ec.ECFieldElement
 */

import { BigIntegers } from '../../util/BigIntegers';
import { Arrays } from '../../util/Arrays';

/**
 * Abstract base class for all field elements.
 */
export abstract class ECFieldElement {
  /**
   * Convert the field element to a BigInt.
   */
  abstract toBigInteger(): bigint;

  /**
   * Get the name of the field (e.g., "Fp" for prime field).
   */
  abstract getFieldName(): string;

  /**
   * Get the size of the field in bits.
   */
  abstract getFieldSize(): number;

  /**
   * Add another field element: this + b
   */
  abstract add(b: ECFieldElement): ECFieldElement;

  /**
   * Add one to this element: this + 1
   */
  abstract addOne(): ECFieldElement;

  /**
   * Subtract another field element: this - b
   */
  abstract subtract(b: ECFieldElement): ECFieldElement;

  /**
   * Multiply by another field element: this * b
   */
  abstract multiply(b: ECFieldElement): ECFieldElement;

  /**
   * Divide by another field element: this / b
   */
  abstract divide(b: ECFieldElement): ECFieldElement;

  /**
   * Negate this element: -this
   */
  abstract negate(): ECFieldElement;

  /**
   * Square this element: this^2
   */
  abstract square(): ECFieldElement;

  /**
   * Compute multiplicative inverse: this^(-1)
   */
  abstract invert(): ECFieldElement;

  /**
   * Compute square root if it exists, null otherwise.
   */
  abstract sqrt(): ECFieldElement | null;

  /**
   * Check if this element is zero.
   */
  isZero(): boolean {
    return this.toBigInteger() === 0n;
  }

  /**
   * Check if this element is one.
   */
  isOne(): boolean {
    return this.toBigInteger() === 1n;
  }

  /**
   * Test if the lowest bit is 1.
   */
  testBitZero(): boolean {
    return BigIntegers.testBit(this.toBigInteger(), 0);
  }

  /**
   * Encode this field element to bytes.
   * 
   * @returns byte array representation
   */
  getEncoded(): Uint8Array {
    const byteLength = Math.ceil(this.getFieldSize() / 8);
    return BigIntegers.asUnsignedByteArray(byteLength, this.toBigInteger());
  }

  /**
   * Check equality with another field element.
   */
  equals(other: ECFieldElement): boolean {
    if (this === other) return true;
    return this.toBigInteger() === other.toBigInteger();
  }
}

/**
 * Field element for prime field Fp (integers modulo p).
 */
export class ECFieldElementFp extends ECFieldElement {
  readonly q: bigint;  // The prime modulus
  readonly x: bigint;  // The value

  constructor(q: bigint, x: bigint) {
    super();
    
    if (x < 0n || x >= q) {
      x = ((x % q) + q) % q;
    }
    
    this.q = q;
    this.x = x;
  }

  toBigInteger(): bigint {
    return this.x;
  }

  getFieldName(): string {
    return 'Fp';
  }

  getFieldSize(): number {
    return BigIntegers.bitLength(this.q);
  }

  /**
   * Get the prime modulus.
   */
  getQ(): bigint {
    return this.q;
  }

  add(b: ECFieldElement): ECFieldElement {
    return new ECFieldElementFp(this.q, this.modAdd(this.x, b.toBigInteger()));
  }

  addOne(): ECFieldElement {
    let x2 = this.x + 1n;
    if (x2 === this.q) {
      x2 = 0n;
    }
    return new ECFieldElementFp(this.q, x2);
  }

  subtract(b: ECFieldElement): ECFieldElement {
    return new ECFieldElementFp(this.q, this.modSubtract(this.x, b.toBigInteger()));
  }

  multiply(b: ECFieldElement): ECFieldElement {
    return new ECFieldElementFp(this.q, this.modMult(this.x, b.toBigInteger()));
  }

  /**
   * Compute this * b - x * y (optimized).
   */
  multiplyMinusProduct(b: ECFieldElement, x: ECFieldElement, y: ECFieldElement): ECFieldElement {
    const ax = this.x;
    const bx = b.toBigInteger();
    const xx = x.toBigInteger();
    const yx = y.toBigInteger();
    const ab = ax * bx;
    const xy = xx * yx;
    return new ECFieldElementFp(this.q, this.modReduce(ab - xy));
  }

  /**
   * Compute this * b + x * y (optimized).
   */
  multiplyPlusProduct(b: ECFieldElement, x: ECFieldElement, y: ECFieldElement): ECFieldElement {
    const ax = this.x;
    const bx = b.toBigInteger();
    const xx = x.toBigInteger();
    const yx = y.toBigInteger();
    const ab = ax * bx;
    const xy = xx * yx;
    return new ECFieldElementFp(this.q, this.modReduce(ab + xy));
  }

  divide(b: ECFieldElement): ECFieldElement {
    return new ECFieldElementFp(this.q, this.modMult(this.x, this.modInverse(b.toBigInteger())));
  }

  negate(): ECFieldElement {
    return this.x === 0n ? this : new ECFieldElementFp(this.q, this.q - this.x);
  }

  square(): ECFieldElement {
    return new ECFieldElementFp(this.q, this.modMult(this.x, this.x));
  }

  /**
   * Compute this^2 - x * y (optimized).
   */
  squareMinusProduct(x: ECFieldElement, y: ECFieldElement): ECFieldElement {
    const ax = this.x;
    const xx = x.toBigInteger();
    const yx = y.toBigInteger();
    const aa = ax * ax;
    const xy = xx * yx;
    return new ECFieldElementFp(this.q, this.modReduce(aa - xy));
  }

  /**
   * Compute this^2 + x * y (optimized).
   */
  squarePlusProduct(x: ECFieldElement, y: ECFieldElement): ECFieldElement {
    const ax = this.x;
    const xx = x.toBigInteger();
    const yx = y.toBigInteger();
    const aa = ax * ax;
    const xy = xx * yx;
    return new ECFieldElementFp(this.q, this.modReduce(aa + xy));
  }

  invert(): ECFieldElement {
    return new ECFieldElementFp(this.q, this.modInverse(this.x));
  }

  /**
   * Compute square root using Tonelli-Shanks algorithm.
   * Returns null if no square root exists.
   */
  sqrt(): ECFieldElement | null {
    if (this.isZero() || this.isOne()) {
      return this;
    }

    // Check if q is odd
    if (!BigIntegers.testBit(this.q, 0)) {
      throw new Error('Square root not implemented for even modulus');
    }

    // Case 1: q ≡ 3 (mod 4)
    if (BigIntegers.testBit(this.q, 1)) {
      const e = (this.q >> 2n) + 1n;
      const result = new ECFieldElementFp(this.q, BigIntegers.modPow(this.x, e, this.q));
      return this.checkSqrt(result);
    }

    // Case 2: q ≡ 5 (mod 8)
    if (BigIntegers.testBit(this.q, 2)) {
      const t1 = BigIntegers.modPow(this.x, this.q >> 3n, this.q);
      const t2 = this.modMult(t1, this.x);
      const t3 = this.modMult(t2, t1);

      if (t3 === 1n) {
        return this.checkSqrt(new ECFieldElementFp(this.q, t2));
      }

      const t4 = BigIntegers.modPow(2n, this.q >> 2n, this.q);
      const y = this.modMult(t2, t4);
      return this.checkSqrt(new ECFieldElementFp(this.q, y));
    }

    // Case 3: q ≡ 1 (mod 8) - Use Tonelli-Shanks
    return this.sqrtTonelliShanks();
  }

  /**
   * Tonelli-Shanks algorithm for computing square root in Fp.
   */
  private sqrtTonelliShanks(): ECFieldElement | null {
    // Check if x is a quadratic residue using Legendre symbol
    const legendreExponent = this.q >> 1n;
    if (BigIntegers.modPow(this.x, legendreExponent, this.q) !== 1n) {
      return null; // Not a quadratic residue
    }

    // Write q - 1 = 2^s * t where t is odd
    let s = 0;
    let t = this.q - 1n;
    while ((t & 1n) === 0n) {
      s++;
      t >>= 1n;
    }

    // Find a quadratic non-residue n
    let n = 2n;
    while (BigIntegers.modPow(n, legendreExponent, this.q) !== this.q - 1n) {
      n++;
    }

    // Initialize
    let c = BigIntegers.modPow(n, t, this.q);
    let r = BigIntegers.modPow(this.x, (t + 1n) / 2n, this.q);
    let tt = BigIntegers.modPow(this.x, t, this.q);
    let m = BigInt(s);

    while (tt !== 1n) {
      // Find the least i such that tt^(2^i) = 1
      let i = 1n;
      let temp = this.modMult(tt, tt);
      while (temp !== 1n && i < m) {
        temp = this.modMult(temp, temp);
        i++;
      }

      // Update values
      const b = BigIntegers.modPow(c, 1n << (m - i - 1n), this.q);
      r = this.modMult(r, b);
      c = this.modMult(b, b);
      tt = this.modMult(tt, c);
      m = i;
    }

    return this.checkSqrt(new ECFieldElementFp(this.q, r));
  }

  /**
   * Check if z is a square root of this element.
   */
  private checkSqrt(z: ECFieldElement): ECFieldElement | null {
    return z.square().toBigInteger() === this.x ? z : null;
  }

  // Modular arithmetic helpers

  private modAdd(a: bigint, b: bigint): bigint {
    const t = a + b;
    return t >= this.q ? t - this.q : t;
  }

  private modSubtract(a: bigint, b: bigint): bigint {
    const t = a - b;
    return t < 0n ? t + this.q : t;
  }

  private modMult(a: bigint, b: bigint): bigint {
    return this.modReduce(a * b);
  }

  private modReduce(x: bigint): bigint {
    return ((x % this.q) + this.q) % this.q;
  }

  private modInverse(a: bigint): bigint {
    return BigIntegers.modOddInverse(this.q, a);
  }

  equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof ECFieldElementFp)) return false;
    return this.q === other.q && this.x === other.x;
  }

  hashCode(): number {
    // Simple hash code implementation
    return Number(this.q ^ this.x);
  }
}
