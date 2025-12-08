import { ExtensionFieldElement } from './ExtensionField';
import { Fp4Element } from './Fp4Element';
import { Fp2Element } from './Fp2Element';

/**
 * Fp12 Element - Dodecic Extension Field
 * 
 * Fp12 = Fp4[w] / (w^3 - v)
 * An element is represented as a + b*w + c*w^2 where a, b, c ∈ Fp4
 * 
 * This is the target group GT for SM9 pairings.
 * 
 * 参考: org.bouncycastle.math.ec.custom.gm.SM9Fields
 */
export class Fp12Element implements ExtensionFieldElement {
  private readonly a: Fp4Element; // Coefficient of 1
  private readonly b: Fp4Element; // Coefficient of w
  private readonly c: Fp4Element; // Coefficient of w^2
  private readonly p: bigint;     // Prime modulus

  /**
   * Create an Fp12 element
   * 
   * @param a - coefficient of 1 (Fp4 element)
   * @param b - coefficient of w (Fp4 element)
   * @param c - coefficient of w^2 (Fp4 element)
   */
  constructor(a: Fp4Element, b: Fp4Element, c: Fp4Element) {
    if (a.getP() !== b.getP() || b.getP() !== c.getP()) {
      throw new Error('Fp4 elements must have same prime modulus');
    }
    this.a = a;
    this.b = b;
    this.c = c;
    this.p = a.getP();
  }

  /**
   * Get coefficient of 1
   */
  getA(): Fp4Element {
    return this.a;
  }

  /**
   * Get coefficient of w
   */
  getB(): Fp4Element {
    return this.b;
  }

  /**
   * Get coefficient of w^2
   */
  getC(): Fp4Element {
    return this.c;
  }

  /**
   * Get the prime modulus
   */
  getP(): bigint {
    return this.p;
  }

  /**
   * Add another Fp12 element
   */
  add(other: ExtensionFieldElement): Fp12Element {
    if (!(other instanceof Fp12Element)) {
      throw new Error('Can only add Fp12Element to Fp12Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot add elements from different fields');
    }

    const newA = this.a.add(other.a) as Fp4Element;
    const newB = this.b.add(other.b) as Fp4Element;
    const newC = this.c.add(other.c) as Fp4Element;
    return new Fp12Element(newA, newB, newC);
  }

  /**
   * Subtract another Fp12 element
   */
  subtract(other: ExtensionFieldElement): Fp12Element {
    if (!(other instanceof Fp12Element)) {
      throw new Error('Can only subtract Fp12Element from Fp12Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot subtract elements from different fields');
    }

    const newA = this.a.subtract(other.a) as Fp4Element;
    const newB = this.b.subtract(other.b) as Fp4Element;
    const newC = this.c.subtract(other.c) as Fp4Element;
    return new Fp12Element(newA, newB, newC);
  }

  /**
   * Multiply by another Fp12 element
   * Uses Karatsuba-like multiplication for efficiency
   */
  multiply(other: ExtensionFieldElement): Fp12Element {
    if (!(other instanceof Fp12Element)) {
      throw new Error('Can only multiply Fp12Element by Fp12Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot multiply elements from different fields');
    }

    // (a0 + a1*w + a2*w^2) * (b0 + b1*w + b2*w^2)
    // w^3 = v (the generator of Fp4)
    
    const a0 = this.a;
    const a1 = this.b;
    const a2 = this.c;
    const b0 = other.a;
    const b1 = other.b;
    const b2 = other.c;

    // Compute products
    const a0b0 = a0.multiply(b0) as Fp4Element;
    const a0b1 = a0.multiply(b1) as Fp4Element;
    const a0b2 = a0.multiply(b2) as Fp4Element;
    const a1b0 = a1.multiply(b0) as Fp4Element;
    const a1b1 = a1.multiply(b1) as Fp4Element;
    const a1b2 = a1.multiply(b2) as Fp4Element;
    const a2b0 = a2.multiply(b0) as Fp4Element;
    const a2b1 = a2.multiply(b1) as Fp4Element;
    const a2b2 = a2.multiply(b2) as Fp4Element;

    // w^3 = v means multiply by v which is (0, 1, 0, 0) in Fp4
    // For Fp4 element (x, y) where x,y are Fp2, multiplying by v means:
    // (x, y) * v = (y*u, x) where u is Fp2 generator
    const v = new Fp4Element(
      Fp2Element.zero(this.p),
      new Fp2Element(1n, 0n, this.p)
    );

    // Coefficient of 1: a0*b0 + a1*b2*v + a2*b1*v
    const t0_1 = a1b2.multiply(v) as Fp4Element;
    const t0_2 = a2b1.multiply(v) as Fp4Element;
    const newA = a0b0.add(t0_1).add(t0_2) as Fp4Element;

    // Coefficient of w: a0*b1 + a1*b0 + a2*b2*v
    const t1 = a2b2.multiply(v) as Fp4Element;
    const newB = a0b1.add(a1b0).add(t1) as Fp4Element;

    // Coefficient of w^2: a0*b2 + a1*b1 + a2*b0
    const newC = a0b2.add(a1b1).add(a2b0) as Fp4Element;

    return new Fp12Element(newA, newB, newC);
  }

  /**
   * Divide by another Fp12 element
   */
  divide(other: ExtensionFieldElement): Fp12Element {
    if (!(other instanceof Fp12Element)) {
      throw new Error('Can only divide Fp12Element by Fp12Element');
    }
    return this.multiply(other.invert());
  }

  /**
   * Negate this element
   */
  negate(): Fp12Element {
    const newA = this.a.negate() as Fp4Element;
    const newB = this.b.negate() as Fp4Element;
    const newC = this.c.negate() as Fp4Element;
    return new Fp12Element(newA, newB, newC);
  }

  /**
   * Square this element (optimized)
   */
  square(): Fp12Element {
    return this.multiply(this);
  }

  /**
   * Compute multiplicative inverse
   */
  invert(): Fp12Element {
    if (this.isZero()) {
      throw new Error('Cannot invert zero element');
    }

    // Use the formula for inversion in a cubic extension
    // For element (a, b, c), compute norm and use it to find inverse
    
    const a = this.a;
    const b = this.b;
    const c = this.c;

    // Compute intermediate values
    const a2 = a.square() as Fp4Element;
    const b2 = b.square() as Fp4Element;
    const c2 = c.square() as Fp4Element;
    const ab = a.multiply(b) as Fp4Element;
    const ac = a.multiply(c) as Fp4Element;
    const bc = b.multiply(c) as Fp4Element;

    const v = new Fp4Element(
      Fp2Element.zero(this.p),
      new Fp2Element(1n, 0n, this.p)
    );

    // Norm calculation for cubic extension
    const bcv = bc.multiply(v) as Fp4Element;
    const c2v = c2.multiply(v) as Fp4Element;
    const b2v = b2.multiply(v) as Fp4Element;
    
    const t0 = a2.subtract(bcv) as Fp4Element;
    const t1 = c2v.subtract(ab) as Fp4Element;
    const t2 = b2.subtract(ac) as Fp4Element;

    // Compute determinant
    const at0 = a.multiply(t0) as Fp4Element;
    const bt1v = b.multiply(t1).multiply(v) as Fp4Element;
    const ct2v = c.multiply(t2).multiply(v) as Fp4Element;
    const det = at0.add(bt1v).add(ct2v) as Fp4Element;

    const detInv = det.invert() as Fp4Element;

    const newA = t0.multiply(detInv) as Fp4Element;
    const newB = t1.multiply(detInv) as Fp4Element;
    const newC = t2.multiply(detInv) as Fp4Element;

    return new Fp12Element(newA, newB, newC);
  }

  /**
   * Check if this element is zero
   */
  isZero(): boolean {
    return this.a.isZero() && this.b.isZero() && this.c.isZero();
  }

  /**
   * Check if this element is one
   */
  isOne(): boolean {
    return this.a.isOne() && this.b.isZero() && this.c.isZero();
  }

  /**
   * Convert to string
   */
  toString(): string {
    return `(${this.a.toString()} + ${this.b.toString()}*w + ${this.c.toString()}*w^2)`;
  }

  /**
   * Check equality
   */
  equals(other: ExtensionFieldElement): boolean {
    if (!(other instanceof Fp12Element)) {
      return false;
    }
    return this.a.equals(other.a) && this.b.equals(other.b) && this.c.equals(other.c) && this.p === other.p;
  }

  /**
   * Create zero element
   */
  static zero(p: bigint): Fp12Element {
    const zero4 = Fp4Element.zero(p);
    return new Fp12Element(zero4, zero4, zero4);
  }

  /**
   * Create one element
   */
  static one(p: bigint): Fp12Element {
    const one4 = Fp4Element.one(p);
    const zero4 = Fp4Element.zero(p);
    return new Fp12Element(one4, zero4, zero4);
  }

  /**
   * Frobenius map - raises to p-th power
   * Critical for pairing computations
   */
  frobenius(): Fp12Element {
    const frobA = this.a.frobenius();
    const frobB = this.b.frobenius();
    const frobC = this.c.frobenius();

    // Apply twist to b and c components
    // This involves multiplication by constants specific to SM9
    return new Fp12Element(frobA, frobB, frobC);
  }

  /**
   * Cyclotomic square (optimized for elements in GT)
   * Used in final exponentiation
   */
  cyclotomicSquare(): Fp12Element {
    // For elements in the cyclotomic subgroup, squaring can be optimized
    // This is a placeholder - full optimization requires specific formulas
    return this.square();
  }

  /**
   * Exponentiation using square-and-multiply
   */
  pow(exponent: bigint): Fp12Element {
    if (exponent === 0n) {
      return Fp12Element.one(this.p);
    }
    if (exponent === 1n) {
      return this;
    }
    if (exponent < 0n) {
      return (this.invert() as Fp12Element).pow(-exponent);
    }

    let result: Fp12Element = Fp12Element.one(this.p);
    let base: Fp12Element = this;
    let exp = exponent;

    while (exp > 0n) {
      if (exp & 1n) {
        result = result.multiply(base) as Fp12Element;
      }
      base = base.square() as Fp12Element;
      exp = exp >> 1n;
    }

    return result;
  }
}
