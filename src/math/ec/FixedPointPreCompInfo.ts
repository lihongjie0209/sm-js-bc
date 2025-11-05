import type { PreCompInfo } from './PreCompInfo';
import type { ECLookupTable } from './ECLookupTable';
import type { ECPoint } from './ECPoint';

/**
 * Precomputation data for fixed-point multiplications.
 * Holds the lookup table and related data for fast scalar multiplication.
 */
export class FixedPointPreCompInfo implements PreCompInfo {
  private _offset: ECPoint | null = null;
  private _lookupTable: ECLookupTable | null = null;
  private _width: number = -1;

  /**
   * Get the lookup table for precomputed points.
   */
  getLookupTable(): ECLookupTable | null {
    return this._lookupTable;
  }

  /**
   * Set the lookup table.
   */
  setLookupTable(lookupTable: ECLookupTable): void {
    this._lookupTable = lookupTable;
  }

  /**
   * Get the offset point.
   * The offset is used to adjust the result after the comb multiplication.
   */
  getOffset(): ECPoint | null {
    return this._offset;
  }

  /**
   * Set the offset point.
   */
  setOffset(offset: ECPoint): void {
    this._offset = offset;
  }

  /**
   * Get the width used for precomputation.
   * If a larger width precomputation is already available, this may be larger
   * than was requested.
   */
  getWidth(): number {
    return this._width;
  }

  /**
   * Set the width.
   */
  setWidth(width: number): void {
    this._width = width;
  }
}
