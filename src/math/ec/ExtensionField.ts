/**
 * Base interface for extension field elements
 * 
 * Extension fields are used in pairing-based cryptography like SM9.
 * 
 * 参考: org.bouncycastle.math.ec
 */
export interface ExtensionFieldElement {
  /**
   * Add another element to this element
   */
  add(b: ExtensionFieldElement): ExtensionFieldElement;

  /**
   * Subtract another element from this element
   */
  subtract(b: ExtensionFieldElement): ExtensionFieldElement;

  /**
   * Multiply this element by another
   */
  multiply(b: ExtensionFieldElement): ExtensionFieldElement;

  /**
   * Divide this element by another
   */
  divide(b: ExtensionFieldElement): ExtensionFieldElement;

  /**
   * Negate this element
   */
  negate(): ExtensionFieldElement;

  /**
   * Square this element
   */
  square(): ExtensionFieldElement;

  /**
   * Compute multiplicative inverse
   */
  invert(): ExtensionFieldElement;

  /**
   * Check if this element is zero
   */
  isZero(): boolean;

  /**
   * Check if this element is one
   */
  isOne(): boolean;

  /**
   * Convert to string representation
   */
  toString(): string;

  /**
   * Check equality with another element
   */
  equals(other: ExtensionFieldElement): boolean;
}

/**
 * Helper functions for extension field arithmetic
 */
export class ExtensionFieldUtil {
  /**
   * Reduce a bigint modulo p
   */
  static mod(x: bigint, p: bigint): bigint {
    let result = x % p;
    if (result < 0n) {
      result += p;
    }
    return result;
  }

  /**
   * Compute modular inverse using extended Euclidean algorithm
   */
  static modInverse(a: bigint, p: bigint): bigint {
    if (a === 0n) {
      throw new Error('Cannot compute inverse of zero');
    }

    let old_r = a;
    let r = p;
    let old_s = 1n;
    let s = 0n;

    while (r !== 0n) {
      const quotient = old_r / r;
      
      let temp = r;
      r = old_r - quotient * r;
      old_r = temp;

      temp = s;
      s = old_s - quotient * s;
      old_s = temp;
    }

    if (old_r > 1n) {
      throw new Error('a is not invertible');
    }

    if (old_s < 0n) {
      old_s += p;
    }

    return old_s;
  }
}
