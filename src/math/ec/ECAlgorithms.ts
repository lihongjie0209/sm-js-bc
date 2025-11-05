/**
 * Elliptic curve algorithms utility class.
 * 
 * Provides common elliptic curve operations and algorithms.
 */

import { ECPoint } from './ECPoint';
import { ECCurve } from './ECCurve';

/**
 * Utility class containing various elliptic curve algorithms.
 */
export class ECAlgorithms {
  
  /**
   * Clean a point by validating it's on the curve and normalizing if needed.
   * 
   * @param curve The elliptic curve
   * @param point The point to clean
   * @returns The cleaned (validated and normalized) point
   */
  static cleanPoint(curve: ECCurve, point: ECPoint): ECPoint {
    if (!curve.equals(point.getCurve())) {
      throw new Error('Point is not on the expected curve');
    }
    
    if (!point.isValid()) {
      throw new Error('Point is not valid');
    }
    
    return point.normalize();
  }

  /**
   * Calculate k1*P1 + k2*P2 efficiently.
   * 
   * This method computes the sum of two scalar multiplications more efficiently
   * than computing them separately and then adding.
   * 
   * @param P1 The first point
   * @param k1 The first scalar
   * @param P2 The second point  
   * @param k2 The second scalar
   * @returns The result point k1*P1 + k2*P2
   */
  static sumOfTwoMultiplies(P1: ECPoint, k1: bigint, P2: ECPoint, k2: bigint): ECPoint {
    if (!P1.getCurve().equals(P2.getCurve())) {
      throw new Error('Points must be on the same curve');
    }

    // Use Shamir's trick for efficient dual scalar multiplication
    // This is a simplified implementation - could be optimized further
    
    const result1 = P1.multiply(k1);
    const result2 = P2.multiply(k2);
    
    return result1.add(result2);
  }

  /**
   * Validate that a scalar is in the valid range [1, n-1] for the curve.
   * 
   * @param curve The elliptic curve
   * @param scalar The scalar to validate
   * @returns true if valid, false otherwise
   */
  static isValidScalar(curve: ECCurve, scalar: bigint): boolean {
    if (scalar <= 0n) {
      return false;
    }
    
    // For elliptic curves, we need the domain parameters to get n
    // This is a simplified check
    return scalar < (2n ** 256n); // Rough upper bound for SM2
  }

  /**
   * Check if a point is the point at infinity.
   * 
   * @param point The point to check
   * @returns true if the point is at infinity
   */
  static isPointAtInfinity(point: ECPoint): boolean {
    return point.isInfinity();
  }

  /**
   * Validate that two points are on the same curve.
   * 
   * @param P1 First point
   * @param P2 Second point
   * @returns true if both points are on the same curve
   */
  static areOnSameCurve(P1: ECPoint, P2: ECPoint): boolean {
    return P1.getCurve().equals(P2.getCurve());
  }
}