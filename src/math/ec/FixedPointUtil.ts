import type { ECCurve } from './ECCurve';
import type { ECPoint } from './ECPoint';
import type { PreCompInfo, PreCompCallback } from './PreCompInfo';
import { FixedPointPreCompInfo } from './FixedPointPreCompInfo';
import type { ECLookupTable } from './ECLookupTable';

/**
 * Utility class for fixed-point comb multiplication precomputation.
 * Based on: org.bouncycastle.math.ec.FixedPointUtil
 */
export class FixedPointUtil {
  /**
   * The name used for fixed-point precomputation in the precomputation table.
   */
  static readonly PRECOMP_NAME = 'bc_fixed_point';

  /**
   * Get the comb size for a curve.
   * This is the bit length used for the comb multiplication.
   * @param c The elliptic curve
   * @returns The comb size in bits
   */
  static getCombSize(c: ECCurve): number {
    const order = c.getOrder();
    return order === null ? c.getFieldSize() + 1 : this.bitLength(order);
  }

  /**
   * Get the bit length of a BigInt.
   */
  private static bitLength(n: bigint): number {
    if (n === 0n) return 0;
    return n.toString(2).length;
  }

  /**
   * Get fixed-point precomputation info from a generic PreCompInfo.
   * @param preCompInfo The precomputation info
   * @returns The fixed-point precomputation info, or null if not applicable
   */
  static getFixedPointPreCompInfo(preCompInfo: PreCompInfo | null): FixedPointPreCompInfo | null {
    return preCompInfo instanceof FixedPointPreCompInfo ? preCompInfo : null;
  }

  /**
   * Precompute fixed-point multiplication data for a point.
   * This creates a lookup table for efficient comb multiplication.
   * @param p The point to precompute for
   * @returns The precomputed data
   */
  static precompute(p: ECPoint): FixedPointPreCompInfo {
    const c = p.getCurve();

    return c.precompute(p, FixedPointUtil.PRECOMP_NAME, {
      precompute(existing: PreCompInfo | null): PreCompInfo {
        const existingFP = existing instanceof FixedPointPreCompInfo ? existing : null;

        const bits = FixedPointUtil.getCombSize(c);
        const minWidth = bits > 250 ? 6 : 5;
        const n = 1 << minWidth;

        // Check if existing precomputation is sufficient
        if (FixedPointUtil.checkExisting(existingFP, n)) {
          return existingFP!;
        }

        const d = Math.floor((bits + minWidth - 1) / minWidth);

        // Build pow2Table: [P, P*2^d, P*2^(2d), ..., P*2^((minWidth-1)*d)]
        const pow2Table: ECPoint[] = new Array(minWidth + 1);
        pow2Table[0] = p;
        for (let i = 1; i < minWidth; i++) {
          pow2Table[i] = pow2Table[i - 1].timesPow2(d);
        }

        // This will be the 'offset' value: P - P*2^d
        pow2Table[minWidth] = pow2Table[0].add(pow2Table[1].negate());

        // Normalize all points for efficiency
        c.normalizeAll(pow2Table);

        // Build lookup table with n entries
        const lookupTable: ECPoint[] = new Array(n);
        lookupTable[0] = pow2Table[0];

        // Fill lookup table with combinations
        for (let bit = minWidth - 1; bit >= 0; bit--) {
          const pow2 = pow2Table[bit];
          const step = 1 << bit;
          
          for (let i = step; i < n; i += step << 1) {
            lookupTable[i] = lookupTable[i - step].add(pow2);
          }
        }

        // Normalize lookup table
        c.normalizeAll(lookupTable);

        // Create result
        const result = new FixedPointPreCompInfo();
        result.setLookupTable(c.createCacheSafeLookupTable(lookupTable, 0, lookupTable.length));
        result.setOffset(pow2Table[minWidth]);
        result.setWidth(minWidth);
        return result;
      }
    }) as FixedPointPreCompInfo;
  }

  /**
   * Check if existing precomputation is sufficient.
   */
  private static checkExisting(existingFP: FixedPointPreCompInfo | null, n: number): boolean {
    return existingFP !== null && FixedPointUtil.checkTable(existingFP.getLookupTable(), n);
  }

  /**
   * Check if a lookup table is sufficient.
   */
  private static checkTable(table: ECLookupTable | null, n: number): boolean {
    return table !== null && table.getSize() >= n;
  }
}
