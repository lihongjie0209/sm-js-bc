import { describe, it } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import '../../../src/math/ec/ECPoint';

describe('Check normalization status', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should check which points are normalized before twice()', () => {
    console.log('\nG:');
    console.log('  isNormalized =', G.isNormalized());
    console.log('  Z =', G.getZCoord(0).toBigInteger());
    try {
      console.log('  W =', G.getZCoord(1).toBigInteger());
    } catch {}
    
    const twoG = G.twice();
    console.log('\n2*G (from G.twice()):');
    console.log('  isNormalized =', twoG.isNormalized());
    console.log('  Z =', twoG.getZCoord(0).toBigInteger());
    try {
      console.log('  W =', twoG.getZCoord(1).toBigInteger());
    } catch {}
    
    const threeG = twoG.add(G);
    console.log('\n3*G (from 2*G + G):');
    console.log('  isNormalized =', threeG.isNormalized());
    console.log('  Z =', threeG.getZCoord(0).toBigInteger());
    try {
      console.log('  W =', threeG.getZCoord(1).toBigInteger());
    } catch {}
    
    const fourG = twoG.twice();
    console.log('\n4*G (from 2*G.twice()):');
    console.log('  isNormalized =', fourG.isNormalized());
    console.log('  Z =', fourG.getZCoord(0).toBigInteger());
    try {
      console.log('  W =', fourG.getZCoord(1).toBigInteger());
    } catch {}
    
    // Now test if normalize() before twice() fixes the issue
    const threeG_normalized = threeG.normalize();
    console.log('\n3*G.normalize():');
    console.log('  isNormalized =', threeG_normalized.isNormalized());
    console.log('  Z =', threeG_normalized.getZCoord(0).toBigInteger());
    try {
      console.log('  W =', threeG_normalized.getZCoord(1).toBigInteger());
    } catch {}
    
    const sixG_from_normalized = threeG_normalized.twice();
    console.log('\n6*G (from 3*G.normalize().twice()):');
    console.log('  x =', sixG_from_normalized.normalize().getXCoord().toBigInteger());
    console.log('  Expected x = 340');
  });
});
