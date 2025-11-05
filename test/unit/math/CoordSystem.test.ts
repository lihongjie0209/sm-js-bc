import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { CoordinateSystem } from '../../../src/math/ec/ECCurve';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('ECPoint Coordinate System Debug', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);

  it('should check coordinate system', () => {
    console.log('Coordinate system:', curve.getCoordinateSystem());
    console.log('Expected AFFINE:', CoordinateSystem.AFFINE);
    console.log('Expected JACOBIAN:', CoordinateSystem.JACOBIAN);
    console.log('Expected JACOBIAN_MODIFIED:', CoordinateSystem.JACOBIAN_MODIFIED);
    
    // ECCurveFp uses JACOBIAN_MODIFIED coordinate system by default
    expect(curve.getCoordinateSystem()).toBe(CoordinateSystem.JACOBIAN_MODIFIED);
  });
});
