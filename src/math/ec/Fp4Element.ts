import { ExtensionFieldElement } from './ExtensionField';
import { Fp2Element } from './Fp2Element';

/**
 * Fp4 Element - Quartic Extension Field
 * 
 * Fp4 = Fp2[v] / (v^2 - u)
 * An element is represented as a + b*v where a, b ∈ Fp2
 * 
 * Used in SM9 pairing computations.
 * 
 * 参考: org.bouncycastle.math.ec.custom.gm.SM9Fields
 */
export class Fp4Element implements ExtensionFieldElement {
  private readonly a: Fp2Element; // Coefficient of 1
  private readonly b: Fp2Element; // Coefficient of v
  private readonly p: bigint;     // Prime modulus

  /**
   * Create an Fp4 element
   * 
   * @param a - coefficient of 1 (Fp2 element)
   * @param b - coefficient of v (Fp2 element)
   */
  constructor(a: Fp2Element, b: Fp2Element) {
    if (a.getP() !== b.getP()) {
      throw new Error('Fp2 elements must have same prime modulus');
    }
    this.a = a;
    this.b = b;
    this.p = a.getP();
  }

  /**
   * Get coefficient of 1
   */
  getA(): Fp2Element {
    return this.a;
  }

  /**
   * Get coefficient of v
   */
  getB(): Fp2Element {
    return this.b;
  }

  /**
   * Get the prime modulus
   */
  getP(): bigint {
    return this.p;
  }

  /**
   * Add another Fp4 element
   * (a + bv) + (c + dv) = (a+c) + (b+d)v
   */
  add(other: ExtensionFieldElement): Fp4Element {
    if (!(other instanceof Fp4Element)) {
      throw new Error('Can only add Fp4Element to Fp4Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot add elements from different fields');
    }

    const newA = this.a.add(other.a) as Fp2Element;
    const newB = this.b.add(other.b) as Fp2Element;
    return new Fp4Element(newA, newB);
  }

  /**
   * Subtract another Fp4 element
   * (a + bv) - (c + dv) = (a-c) + (b-d)v
   */
  subtract(other: ExtensionFieldElement): Fp4Element {
    if (!(other instanceof Fp4Element)) {
      throw new Error('Can only subtract Fp4Element from Fp4Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot subtract elements from different fields');
    }

    const newA = this.a.subtract(other.a) as Fp2Element;
    const newB = this.b.subtract(other.b) as Fp2Element;
    return new Fp4Element(newA, newB);
  }

  /**
   * Multiply by another Fp4 element
   * (a + bv) * (c + dv) = ac + adv + bcv + bdv^2
   * Since v^2 = u (where u is the generator of Fp2): = ac + bd*u + (ad + bc)v
   */
  multiply(other: ExtensionFieldElement): Fp4Element {
    if (!(other instanceof Fp4Element)) {
      throw new Error('Can only multiply Fp4Element by Fp4Element');
    }
    if (this.p !== other.p) {
      throw new Error('Cannot multiply elements from different fields');
    }

    // (a + bv) * (c + dv) = ac + (ad + bc)v + bd*v^2
    // v^2 = u (the generator of Fp2, which is represented as (0, 1))
    const ac = this.a.multiply(other.a) as Fp2Element;
    const bd = this.b.multiply(other.b) as Fp2Element;
    const ad = this.a.multiply(other.b) as Fp2Element;
    const bc = this.b.multiply(other.a) as Fp2Element;

    // v^2 = u means we multiply bd by (0, 1) in Fp2
    // (x, y) * (0, 1) = (x*0 - y*1, x*1 + y*0) = (-y, x)
    const u = new Fp2Element(0n, 1n, this.p);
    const bdTimesU = bd.multiply(u) as Fp2Element;

    const newA = ac.add(bdTimesU) as Fp2Element;
    const newB = ad.add(bc) as Fp2Element;

    return new Fp4Element(newA, newB);
  }

  /**
   * Divide by another Fp4 element
   */
  divide(other: ExtensionFieldElement): Fp4Element {
    if (!(other instanceof Fp4Element)) {
      throw new Error('Can only divide Fp4Element by Fp4Element');
    }
    return this.multiply(other.invert());
  }

  /**
   * Negate this element
   * -(a + bv) = -a + (-b)v
   */
  negate(): Fp4Element {
    const newA = this.a.negate() as Fp2Element;
    const newB = this.b.negate() as Fp2Element;
    return new Fp4Element(newA, newB);
  }

  /**
   * Square this element
   * (a + bv)^2 = a^2 + 2abv + b^2v^2 = a^2 + b^2*u + 2abv
   */
  square(): Fp4Element {
    const a2 = this.a.square() as Fp2Element;
    const b2 = this.b.square() as Fp2Element;
    const ab2 = this.a.multiply(this.b) as Fp2Element;
    const two = new Fp2Element(2n, 0n, this.p);
    const ab2Times2 = ab2.multiply(two) as Fp2Element;

    // b^2 * u
    const u = new Fp2Element(0n, 1n, this.p);
    const b2TimesU = b2.multiply(u) as Fp2Element;

    const newA = a2.add(b2TimesU) as Fp2Element;
    const newB = ab2Times2;

    return new Fp4Element(newA, newB);
  }

  /**
   * Compute multiplicative inverse
   * 1/(a + bv) = (a - bv) / (a^2 - b^2*u)
   */
  invert(): Fp4Element {
    if (this.isZero()) {
      throw new Error('Cannot invert zero element');
    }

    // Compute norm: a^2 - b^2*v^2 = a^2 - b^2*u
    const a2 = this.a.square() as Fp2Element;
    const b2 = this.b.square() as Fp2Element;
    const u = new Fp2Element(0n, 1n, this.p);
    const b2TimesU = b2.multiply(u) as Fp2Element;
    const norm = a2.subtract(b2TimesU) as Fp2Element;
    
    const normInv = norm.invert() as Fp2Element;

    const newA = this.a.multiply(normInv) as Fp2Element;
    const newB = this.b.negate().multiply(normInv) as Fp2Element;

    return new Fp4Element(newA, newB);
  }

  /**
   * Check if this element is zero
   */
  isZero(): boolean {
    return this.a.isZero() && this.b.isZero();
  }

  /**
   * Check if this element is one
   */
  isOne(): boolean {
    return this.a.isOne() && this.b.isZero();
  }

  /**
   * Convert to string
   */
  toString(): string {
    return `(${this.a.toString()} + ${this.b.toString()}*v)`;
  }

  /**
   * Check equality
   */
  equals(other: ExtensionFieldElement): boolean {
    if (!(other instanceof Fp4Element)) {
      return false;
    }
    return this.a.equals(other.a) && this.b.equals(other.b) && this.p === other.p;
  }

  /**
   * Create zero element
   */
  static zero(p: bigint): Fp4Element {
    const zero2 = Fp2Element.zero(p);
    return new Fp4Element(zero2, zero2);
  }

  /**
   * Create one element
   */
  static one(p: bigint): Fp4Element {
    const one2 = Fp2Element.one(p);
    const zero2 = Fp2Element.zero(p);
    return new Fp4Element(one2, zero2);
  }

  /**
   * Frobenius map - raises to p-th power
   * Frob(a + bv) = Frob(a) + Frob(b) * Frob(v)
   * For SM9, Frob(v) = -v (since v^p = -v in the extension)
   */
  frobenius(): Fp4Element {
    // Apply Frobenius to Fp2 components: (x, y) -> (x, -y) for Fp2
    const frobA = this.a.conjugate();
    const frobB = this.b.conjugate();
    
    // Frob(v) = -v, so we negate the b coefficient
    const newB = frobB.negate() as Fp2Element;
    
    return new Fp4Element(frobA, newB);
  }
}
