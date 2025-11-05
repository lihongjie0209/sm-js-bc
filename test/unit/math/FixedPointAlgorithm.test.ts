import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { FixedPointCombMultiplier, SimpleECMultiplier } from '../../../src/math/ec/ECMultiplier';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('FixedPointCombMultiplier Algorithm Test', () => {
  // Use simple test curve: y^2 = x^3 + 2 over F_97
  const p = 97n;
  const a = 0n;
  const b = 2n;
  const curve = new ECCurveFp(p, a, b);
  
  // Generator point: x=3, y²=3³+2=29 (mod 97)
  // Need to find y such that y²=29 (mod 97)
  // y=17 works: 17²=289=97*2+95=95=-2≡29 (mod 97)? No.
  // Let's use x=5: 5³+2=127=30 (mod 97), need y²=30
  // Actually, let's just use x=1: 1³+2=3, need y²=3
  // sqrt(3) mod 97: trying... Let me use a different approach
  // Use x=17: 17³+2=4915=50*97+65=65, need y²=65
  // Let me just find a valid point by trial
  // x=5: 5³+2=127 mod 97 = 30. Is 30 a QR? 30 = 2*15 = 2*3*5
  // Let's try small x values systematically
  // x=3: 3³+2=29. Is 29 QR mod 97?
  // Actually for testing, use secp256k1-like curve: y^2 = x^3 + 7 with known generator
  // But simpler: use x=2
  // x=2: 2³+2=10, y²=10. sqrt(10) mod 97?
  // Let's use a point we know works: just use secp256k1 params scaled down
  
  // Simpler: use curve y²=x³+x over small prime
  // Or even simpler: use the curve from bc-java test with known points
  // Let me use: y² = x³ + 4x + 20 over F_1063 (from ECPointTest.java)
  const p_test = 1063n;
  const a_test = 4n;
  const b_test = 20n;
  const curve_test = new ECCurveFp(p_test, a_test, b_test);
  
  // Known point from bc-java test: (1, 5)
  const G = curve_test.validatePoint(1n, 5n);
  
  it('should compute k*G correctly for small k values using simple curve', () => {
    const simpleMultiplier = new SimpleECMultiplier();
    const fixedMultiplier = new FixedPointCombMultiplier();
    
    // Test k=1 to k=10
    for (let k = 1; k <= 10; k++) {
      const expected = simpleMultiplier.multiply(G, BigInt(k));
      const actual = fixedMultiplier.multiply(G, BigInt(k));
      
      console.log(`k=${k}: simple=${expected.isInfinity()}, fixed=${actual.isInfinity()}`);
      
      if (!expected.isInfinity() && !actual.isInfinity()) {
        const expX = expected.normalize().getXCoord().toBigInteger();
        const expY = expected.normalize().getYCoord().toBigInteger();
        const actX = actual.normalize().getXCoord().toBigInteger();
        const actY = actual.normalize().getYCoord().toBigInteger();
        
        console.log(`  Expected: (${expX}, ${expY})`);
        console.log(`  Actual:   (${actX}, ${actY})`);
        
        expect(actX).toBe(expX);
        expect(actY).toBe(expY);
      } else {
        expect(actual.isInfinity()).toBe(expected.isInfinity());
      }
    }
  });
});
