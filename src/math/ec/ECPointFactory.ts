/**
 * Factory for creating EC points, used to break circular dependency.
 */

import type { ECCurve } from './ECCurve';
import type { ECFieldElement } from './ECFieldElement';
import type { ECPoint } from './ECPoint';

/**
 * Factory function type for creating ECPoint instances.
 */
export type ECPointFactory = (
  curve: ECCurve,
  x: ECFieldElement | null,
  y: ECFieldElement | null,
  zs?: ECFieldElement[]
) => ECPoint;

/**
 * Global point factory - will be set by ECPoint module.
 */
let pointFactory: ECPointFactory | null = null;

/**
 * Register the ECPoint factory.
 */
export function registerECPointFactory(factory: ECPointFactory): void {
  pointFactory = factory;
}

/**
 * Create an EC point using the registered factory.
 */
export function createECPoint(
  curve: ECCurve,
  x: ECFieldElement | null,
  y: ECFieldElement | null,
  zs?: ECFieldElement[]
): ECPoint {
  if (!pointFactory) {
    throw new Error('ECPoint factory not registered');
  }
  return pointFactory(curve, x, y, zs);
}
