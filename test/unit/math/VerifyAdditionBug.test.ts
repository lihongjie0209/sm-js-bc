import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import '../../../src/math/ec/ECPoint';
import { SimpleECMultiplier } from '../../../src/math/ec/ECMultiplier';

describe('Verify Point Addition Bug', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should verify that repeated additions equal multiplications', () => {
    // Use SimpleECMultiplier as ground truth
    const multiplier = new SimpleECMultiplier();
    
    for (let k = 2n; k <= 10n; k++) {
      const expected = multiplier.multiply(G as any, k);
      
      // Compute k*G by adding G to itself k times
      let computed = G;
      for (let i = 1n; i < k; i++) {
        computed = computed.add(G);
      }
      
      const expectedX = expected.normalize().getXCoord().toBigInteger();
      const computedX = computed.normalize().getXCoord().toBigInteger();
      
      console.log(`${k}*G: expected x=${expectedX}, computed x=${computedX}, match=${expectedX === computedX}`);
      
      if (expectedX !== computedX) {
        console.log(`  MISMATCH at k=${k}!`);
        console.log(`  Expected y=${expected.normalize().getYCoord().toBigInteger()}`);
        console.log(`  Computed y=${computed.normalize().getYCoord().toBigInteger()}`);
      }
    }
  });

  it('should specifically test 6*G and 8*G', () => {
    const multiplier = new SimpleECMultiplier();
    
    const twoG = multiplier.multiply(G as any, 2n);
    const sixG = multiplier.multiply(G as any, 6n);
    const eightG = multiplier.multiply(G as any, 8n);
    
    console.log('\nUsing SimpleECMultiplier (ground truth):');
    console.log('2*G x =', twoG.normalize().getXCoord().toBigInteger());
    console.log('6*G x =', sixG.normalize().getXCoord().toBigInteger());
    console.log('8*G x =', eightG.normalize().getXCoord().toBigInteger());
    
    // Now compute 6*G + 2*G
    const sixGplusTwoG = sixG.add(twoG);
    console.log('\n6*G + 2*G x =', sixGplusTwoG.normalize().getXCoord().toBigInteger());
    console.log('Expected 8*G x =', eightG.normalize().getXCoord().toBigInteger());
    
    expect(sixGplusTwoG.normalize().getXCoord().toBigInteger()).toBe(
      eightG.normalize().getXCoord().toBigInteger()
    );
  });
});
