import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { SimpleECMultiplier } from '../../../src/math/ec/ECMultiplier';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('SimpleECMultiplier Debug', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);

  const G = curve.validatePoint(1n, 5n);

  it('should debug k=1 multiplication', () => {
    console.log('\n=== Input ===');
    console.log('G:', G.normalize().getXCoord().toBigInteger(), G.normalize().getYCoord().toBigInteger());
    console.log('k = 1');
    
    const multiplier = new SimpleECMultiplier();
    const result = multiplier.multiply(G, 1n);
    
    console.log('\n=== Result ===');
    console.log('result.isInfinity():', result.isInfinity());
    if (!result.isInfinity()) {
      const normed = result.normalize();
      console.log('result.x:', normed.getXCoord().toBigInteger());
      console.log('result.y:', normed.getYCoord().toBigInteger());
    }
    
    // Should be G
    expect(result.isInfinity()).toBe(false);
    const normed = result.normalize();
    expect(normed.getXCoord().toBigInteger()).toBe(1n);
    expect(normed.getYCoord().toBigInteger()).toBe(5n);
  });
});
