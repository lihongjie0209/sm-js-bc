import { describe, it } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import '../../../src/math/ec/ECPoint';
import { SimpleECMultiplier } from '../../../src/math/ec/ECMultiplier';

describe('Compare twice() vs SimpleECMultiplier', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should compare all doubling paths', () => {
    const multiplier = new SimpleECMultiplier();
    
    console.log('\nComparing twice() chain vs SimpleECMultiplier:');
    console.log('\nG x =', G.normalize().getXCoord().toBigInteger());
    
    // 2*G
    const twoG_twice = G.twice();
    const twoG_mult = multiplier.multiply(G as any, 2n);
    console.log('\n2*G:');
    console.log('  twice(): x =', twoG_twice.normalize().getXCoord().toBigInteger());
    console.log('  SimpleECMultiplier: x =', twoG_mult.normalize().getXCoord().toBigInteger());
    console.log('  Match:', twoG_twice.normalize().getXCoord().toBigInteger() === twoG_mult.normalize().getXCoord().toBigInteger());
    
    // 3*G
    const threeG_add = twoG_twice.add(G);
    const threeG_mult = multiplier.multiply(G as any, 3n);
    console.log('\n3*G:');
    console.log('  2*G + G: x =', threeG_add.normalize().getXCoord().toBigInteger());
    console.log('  SimpleECMultiplier: x =', threeG_mult.normalize().getXCoord().toBigInteger());
    console.log('  Match:', threeG_add.normalize().getXCoord().toBigInteger() === threeG_mult.normalize().getXCoord().toBigInteger());
    
    // 4*G
    const fourG_twice = twoG_twice.twice();
    const fourG_mult = multiplier.multiply(G as any, 4n);
    console.log('\n4*G:');
    console.log('  (2*G).twice(): x =', fourG_twice.normalize().getXCoord().toBigInteger());
    console.log('  SimpleECMultiplier: x =', fourG_mult.normalize().getXCoord().toBigInteger());
    console.log('  Match:', fourG_twice.normalize().getXCoord().toBigInteger() === fourG_mult.normalize().getXCoord().toBigInteger());
    
    // 6*G (this is where the bug might be)
    const sixG_twice = threeG_add.twice();
    const sixG_mult = multiplier.multiply(G as any, 6n);
    console.log('\n6*G:');
    console.log('  (3*G).twice(): x =', sixG_twice.normalize().getXCoord().toBigInteger());
    console.log('  SimpleECMultiplier: x =', sixG_mult.normalize().getXCoord().toBigInteger());
    console.log('  Match:', sixG_twice.normalize().getXCoord().toBigInteger() === sixG_mult.normalize().getXCoord().toBigInteger());
    
    if (sixG_twice.normalize().getXCoord().toBigInteger() !== sixG_mult.normalize().getXCoord().toBigInteger()) {
      console.log('\n  BUG FOUND: 3*G.twice() ≠ 6*G!');
      console.log('  3*G (input to twice):');
      console.log('    x =', threeG_add.normalize().getXCoord().toBigInteger());
      console.log('    y =', threeG_add.normalize().getYCoord().toBigInteger());
      console.log('  6*G (expected):');
      console.log('    x =', sixG_mult.normalize().getXCoord().toBigInteger());
      console.log('    y =', sixG_mult.normalize().getYCoord().toBigInteger());
      console.log('  6*G (from twice):');
      console.log('    x =', sixG_twice.normalize().getXCoord().toBigInteger());
      console.log('    y =', sixG_twice.normalize().getYCoord().toBigInteger());
    }
    
    // 8*G
    const eightG_twice = fourG_twice.twice();
    const eightG_mult = multiplier.multiply(G as any, 8n);
    console.log('\n8*G:');
    console.log('  (4*G).twice(): x =', eightG_twice.normalize().getXCoord().toBigInteger());
    console.log('  SimpleECMultiplier: x =', eightG_mult.normalize().getXCoord().toBigInteger());
    console.log('  Match:', eightG_twice.normalize().getXCoord().toBigInteger() === eightG_mult.normalize().getXCoord().toBigInteger());
  });
});
