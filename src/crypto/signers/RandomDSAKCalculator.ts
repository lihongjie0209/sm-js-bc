/**
 * Random k calculator for DSA-style signatures.
 * 
 * This implementation generates cryptographically secure random k values
 * for each signature operation. Each k value is uniformly distributed
 * in the range [1, n-1] where n is the curve order.
 * 
 * Based on: org.bouncycastle.crypto.signers.RandomDSAKCalculator
 */

import { DSAKCalculator } from './DSAKCalculator';
import { SecureRandom } from '../../util/SecureRandom';
import { BigIntegers } from '../../util/BigIntegers';

/**
 * Random DSA k value calculator.
 */
export class RandomDSAKCalculator implements DSAKCalculator {
  private q: bigint | null = null;
  private random: SecureRandom | null = null;

  /**
   * Initialize with curve order and random source.
   */
  init(n: bigint, random: SecureRandom): void {
    if (n <= 1n) {
      throw new Error('Order must be greater than 1');
    }
    
    this.q = n;
    this.random = random;
  }

  /**
   * Generate next random k value.
   */
  nextK(): bigint {
    if (!this.q || !this.random) {
      throw new Error('Calculator not initialized');
    }

    const bitLength = this.getBitLength(this.q);
    
    // Generate random k in range [1, q-1]
    let k: bigint;
    do {
      k = BigIntegers.createRandomBigInteger(bitLength - 1, this.random);
      // Ensure k is in the correct range
      if (k === 0n) {
        k = 1n;
      }
    } while (k >= this.q);

    return k;
  }

  /**
   * This is a non-deterministic (random) calculator.
   */
  isDeterministic(): boolean {
    return false;
  }

  /**
   * Calculate bit length of a bigint.
   */
  private getBitLength(value: bigint): number {
    if (value === 0n) {
      return 0;
    }

    let bitLength = 0;
    let temp = value;
    while (temp > 0n) {
      bitLength++;
      temp = temp >> 1n;
    }

    return bitLength;
  }
}