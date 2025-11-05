import { describe, it } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import '../../../src/math/ec/ECPoint';

describe('Debug 3*G.twice()', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should trace twice() calculation for 3*G', () => {
    const twoG = G.twice();
    const threeG = twoG.add(G);
    
    console.log('\n3*G before twice():');
    console.log('  Affine x =', threeG.normalize().getXCoord().toBigInteger());
    console.log('  Affine y =', threeG.normalize().getYCoord().toBigInteger());
    console.log('  isNormalized =', threeG.isNormalized());
    console.log('  Z coord =', threeG.getZCoord(0).toBigInteger());
    
    // Check if there's a W coordinate
    try {
      const W = threeG.getZCoord(1);
      console.log('  W coord =', W.toBigInteger());
    } catch (e) {
      console.log('  W coord = (none)');
    }
    
    const sixG = threeG.twice();
    
    console.log('\n6*G after twice():');
    console.log('  Affine x =', sixG.normalize().getXCoord().toBigInteger());
    console.log('  Affine y =', sixG.normalize().getYCoord().toBigInteger());
    console.log('  Expected x = 340');
    console.log('  Expected y = 933');
    
    // Manually compute twice using the formula
    console.log('\nManual computation:');
    const x = threeG.normalize().getXCoord().toBigInteger(); // 54
    const y = threeG.normalize().getYCoord().toBigInteger(); // 521
    
    // Formula: λ = (3x² + a) / (2y)
    const threexsq = (3n * x * x) % p;
    const numerator = (threexsq + a) % p;
    const denominator = (2n * y) % p;
    
    console.log('  3x² + a =', numerator);
    console.log('  2y =', denominator);
    
    // Modular inverse of 2y
    const invDenom = modInverse(denominator, p);
    const lambda = (numerator * invDenom) % p;
    
    console.log('  λ =', lambda);
    
    // x' = λ² - 2x
    const xPrime = (lambda * lambda - 2n * x) % p;
    const xPrimePos = xPrime < 0n ? xPrime + p : xPrime;
    
    console.log('  x\' = λ² - 2x =', xPrimePos);
    
    // y' = λ(x - x') - y
    const yPrime = (lambda * (x - xPrimePos) - y) % p;
    const yPrimePos = yPrime < 0n ? yPrime + p : yPrime;
    
    console.log('  y\' = λ(x - x\') - y =', yPrimePos);
  });
});

function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [a, m];
  let [oldS, s] = [1n, 0n];
  
  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  
  return oldS < 0n ? oldS + m : oldS;
}
