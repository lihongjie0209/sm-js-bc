import { ExtensionFieldElement, ExtensionFieldUtil } from './ExtensionField';

/**
 * Fp2 Element - Quadratic Extension Field
 * 
 * Fp2 = Fp[u] / (u^2 + 1)
 * An element is represented as a + b*u where a, b ∈ Fp
 * 
 * Used in SM9 pairing computations.
 * 
 * 参考: org.bouncycastle.math.ec.custom.gm.SM9Fields
 */
export class Fp2Element implements ExtensionFieldElement {
  private readonly a: bigint; // Real part
  private readonly b: bigint; // Imaginary part (coefficient of u)
  private readonly p: bigint; // Prime modulus

  /**
   * Create an Fp2 element
   * 
   * @param a - real part
   * @param b - imaginary part (coefficient of u)
   * @param p - prime modulus
   */
  constructor(a: bigint, b: bigint, p: bigint) {
    this.a = ExtensionFieldUtil.mod(a, p);
    this.b = ExtensionFieldUtil.mod(b, p);
    this.p = p;
  }

  /**
   * Get the real part
   */
  getA(): bigint {
    return this.a;
  }

  /**
   * Get the imaginary part
   */
  getB(): bigint {
    return this.b;
  }

  /**
   * Get the prime modulus
   */
  getP(): bigint {
    return this.p;
  }

  /**
   * Add another Fp2 element
   * (a + bu) + (c + du) = (a+c) + (b+d)u
   */
  add(other: ExtensionFieldElement): Fp2Element {
    if (!(other instanceof Fp2Element)) {
      throw new Error('Can only add Fp2Element to Fp2Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot add elements from different fields');
    }

    const newA = ExtensionFieldUtil.mod(this.a + other.a, this.p);
    const newB = ExtensionFieldUtil.mod(this.b + other.b, this.p);
    return new Fp2Element(newA, newB, this.p);
  }

  /**
   * Subtract another Fp2 element
   * (a + bu) - (c + du) = (a-c) + (b-d)u
   */
  subtract(other: ExtensionFieldElement): Fp2Element {
    if (!(other instanceof Fp2Element)) {
      throw new Error('Can only subtract Fp2Element from Fp2Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot subtract elements from different fields');
    }

    const newA = ExtensionFieldUtil.mod(this.a - other.a, this.p);
    const newB = ExtensionFieldUtil.mod(this.b - other.b, this.p);
    return new Fp2Element(newA, newB, this.p);
  }

  /**
   * Multiply by another Fp2 element
   * (a + bu) * (c + du) = (ac - bd) + (ad + bc)u
   * where u^2 = -1
   */
  multiply(other: ExtensionFieldElement): Fp2Element {
    if (!(other instanceof Fp2Element)) {
      throw new Error('Can only multiply Fp2Element by Fp2Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot multiply elements from different fields');
    }

    // (a + bu) * (c + du) = ac + adu + bcu + bdu^2
    // Since u^2 = -1: = ac - bd + (ad + bc)u
    const ac = this.a * other.a;
    const bd = this.b * other.b;
    const ad = this.a * other.b;
    const bc = this.b * other.a;

    const newA = ExtensionFieldUtil.mod(ac - bd, this.p);
    const newB = ExtensionFieldUtil.mod(ad + bc, this.p);

    return new Fp2Element(newA, newB, this.p);
  }

  /**
   * Divide by another Fp2 element
   */
  divide(other: ExtensionFieldElement): Fp2Element {
    if (!(other instanceof Fp2Element)) {
      throw new Error('Can only divide Fp2Element by Fp2Element');
    }
    return this.multiply(other.invert());
  }

  /**
   * Negate this element
   * -(a + bu) = -a + (-b)u
   */
  negate(): Fp2Element {
    const newA = ExtensionFieldUtil.mod(-this.a, this.p);
    const newB = ExtensionFieldUtil.mod(-this.b, this.p);
    return new Fp2Element(newA, newB, this.p);
  }

  /**
   * Square this element
   * (a + bu)^2 = a^2 + 2abu + b^2u^2 = (a^2 - b^2) + 2abu
   */
  square(): Fp2Element {
    const a2 = this.a * this.a;
    const b2 = this.b * this.b;
    const ab2 = 2n * this.a * this.b;

    const newA = ExtensionFieldUtil.mod(a2 - b2, this.p);
    const newB = ExtensionFieldUtil.mod(ab2, this.p);

    return new Fp2Element(newA, newB, this.p);
  }

  /**
   * Compute multiplicative inverse
   * 1/(a + bu) = (a - bu) / (a^2 + b^2)
   */
  invert(): Fp2Element {
    if (this.isZero()) {
      throw new Error('Cannot invert zero element');
    }

    // Compute norm: a^2 + b^2 (since u^2 = -1, conjugate is a - bu)
    const norm = ExtensionFieldUtil.mod(this.a * this.a + this.b * this.b, this.p);
    const normInv = ExtensionFieldUtil.modInverse(norm, this.p);

    const newA = ExtensionFieldUtil.mod(this.a * normInv, this.p);
    const newB = ExtensionFieldUtil.mod(-this.b * normInv, this.p);

    return new Fp2Element(newA, newB, this.p);
  }

  /**
   * Check if this element is zero
   */
  isZero(): boolean {
    return this.a === 0n && this.b === 0n;
  }

  /**
   * Check if this element is one
   */
  isOne(): boolean {
    return this.a === 1n && this.b === 0n;
  }

  /**
   * Convert to string
   */
  toString(): string {
    return `(${this.a} + ${this.b}u)`;
  }

  /**
   * Check equality
   */
  equals(other: ExtensionFieldElement): boolean {
    if (!(other instanceof Fp2Element)) {
      return false;
    }
    return this.a === other.a && this.b === other.b && this.p === other.p;
  }

  /**
   * Create zero element
   */
  static zero(p: bigint): Fp2Element {
    return new Fp2Element(0n, 0n, p);
  }

  /**
   * Create one element
   */
  static one(p: bigint): Fp2Element {
    return new Fp2Element(1n, 0n, p);
  }

  /**
   * Conjugate (a + bu) -> (a - bu)
   */
  conjugate(): Fp2Element {
    return new Fp2Element(this.a, ExtensionFieldUtil.mod(-this.b, this.p), this.p);
  }
}
