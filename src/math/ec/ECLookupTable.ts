import type { ECPoint } from './ECPoint';

/**
 * Abstract interface for EC point lookup tables.
 * Used for efficient constant-time point multiplication.
 */
export interface ECLookupTable {
  /**
   * Get the size of the lookup table.
   */
  getSize(): number;

  /**
   * Look up a point by index (constant-time).
   * @param index The index to lookup
   */
  lookup(index: number): ECPoint;

  /**
   * Look up a point by index (variable-time, may be faster but not constant-time).
   * @param index The index to lookup
   */
  lookupVar(index: number): ECPoint;
}

/**
 * Abstract base class for ECLookupTable implementations.
 */
export abstract class AbstractECLookupTable implements ECLookupTable {
  abstract getSize(): number;
  abstract lookup(index: number): ECPoint;

  /**
   * Default implementation of lookupVar delegates to lookup.
   * Subclasses can override for better performance.
   */
  lookupVar(index: number): ECPoint {
    return this.lookup(index);
  }
}
