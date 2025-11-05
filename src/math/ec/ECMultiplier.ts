/**
 * Point multiplier interfaces and implementations.
 * 
 * Based on: org.bouncycastle.math.ec.ECMultiplier
 */

import { ECPoint } from './ECPoint';
import { FixedPointUtil } from './FixedPointUtil';
import { Nat } from '../raw/Nat';

/**
 * Interface for point multiplication algorithms.
 */
export interface ECMultiplier {
  /**
   * Multiply point p by scalar k.
   * 
   * @param p - The point to multiply
   * @param k - The scalar multiplier
   * @returns k * p
   */
  multiply(p: ECPoint, k: bigint): ECPoint;
}

/**
 * Abstract base class for EC multipliers.
 */
export abstract class AbstractECMultiplier implements ECMultiplier {
  multiply(p: ECPoint, k: bigint): ECPoint {
    if (k === 0n || p.isInfinity()) {
      return p.getCurve().getInfinity();
    }

    const sign = k < 0n ? -1 : 1;
    const kAbs = k < 0n ? -k : k;

    const positive = this.multiplyPositive(p, kAbs);
    const result = sign > 0 ? positive : positive.negate();

    return this.checkResult(result);
  }

  /**
   * Multiply by positive scalar.
   */
  protected abstract multiplyPositive(p: ECPoint, k: bigint): ECPoint;

  /**
   * Check result validity.
   */
  protected checkResult(p: ECPoint): ECPoint {
    // Basic check - could be enhanced with full validation
    return p.isInfinity() || p.isValid() ? p : p.getCurve().getInfinity();
  }
}

/**
 * Fixed-point comb multiplier for efficient multiplication.
 * Uses precomputed lookup tables for fast scalar multiplication.
 * Based on: org.bouncycastle.math.ec.FixedPointCombMultiplier
 */
export class FixedPointCombMultiplier extends AbstractECMultiplier {
  protected multiplyPositive(p: ECPoint, k: bigint): ECPoint {
    const c = p.getCurve();
    const size = FixedPointUtil.getCombSize(c);

    // Get bit length of k
    const bitLength = k === 0n ? 0 : k.toString(2).length;
    if (bitLength > size) {
      throw new Error("fixed-point comb doesn't support scalars larger than the curve order");
    }

    // Precompute lookup table if not already done
    const info = FixedPointUtil.precompute(p);
    const lookupTable = info.getLookupTable();
    const width = info.getWidth();

    if (!lookupTable) {
      throw new Error('Failed to precompute lookup table');
    }

    const d = Math.floor((size + width - 1) / width);

    let R = c.getInfinity();

    const fullComb = d * width;
    const K = Nat.fromBigInteger(fullComb, k);

    const top = fullComb - 1;
    for (let i = 0; i < d; i++) {
      let secretIndex = 0;

      for (let j = top - i; j >= 0; j -= d) {
        const secretBit = K[j >>> 5] >>> (j & 0x1F);
        secretIndex ^= secretBit >>> 1;
        secretIndex <<= 1;
        secretIndex ^= secretBit;
      }

      const add = lookupTable.lookup(secretIndex);
      R = R.twicePlus(add);
    }

    const offset = info.getOffset();
    if (!offset) {
      throw new Error('Missing offset in precomputed data');
    }

    return R.add(offset);
  }
}

/**
 * Simple double-and-add multiplier (for reference).
 */
export class SimpleECMultiplier extends AbstractECMultiplier {
  protected multiplyPositive(p: ECPoint, k: bigint): ECPoint {
    let result = p.getCurve().getInfinity();
    let addend = p;

    while (k !== 0n) {
      if ((k & 1n) === 1n) {
        result = result.add(addend);
      }
      addend = addend.twice();
      k >>= 1n;
    }

    return result;
  }
}
