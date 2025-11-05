import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('ECPoint twice() debug', () => {
  // Test curve: y² = x³ + 4x + 20 over F_1063
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);

  it('should debug twice operation', () => {
    const P = curve.validatePoint(1n, 5n);
    
    console.log('\n=== Input Point P ===');
    console.log('P.x:', P.normalize().getXCoord().toBigInteger());
    console.log('P.y:', P.normalize().getYCoord().toBigInteger());
    console.log('P.isValid():', P.isValid());
    
    const twoP = P.twice();
    
    console.log('\n=== Result 2*P ===');
    console.log('twoP.isInfinity():', twoP.isInfinity());
    
    if (!twoP.isInfinity()) {
      const normed = twoP.normalize();
      console.log('twoP.x:', normed.getXCoord().toBigInteger());
      console.log('twoP.y:', normed.getYCoord().toBigInteger());
      console.log('twoP.isValid():', twoP.isValid());
      
      // Manually verify: should satisfy y² = x³ + ax + b (mod p)
      const x = normed.getXCoord().toBigInteger();
      const y = normed.getYCoord().toBigInteger();
      const lhs = (y * y) % p;
      const rhs = ((x * x % p) * x % p + a * x % p + b) % p;
      console.log('lhs (y²):', lhs);
      console.log('rhs (x³+ax+b):', rhs);
      console.log('equation satisfied:', lhs === rhs);
      
      // Also compute using reference double-and-add: 2*P = P + P
      const P_plus_P = P.add(P);
      console.log('\n=== Reference: P + P ===');
      console.log('P+P.isInfinity():', P_plus_P.isInfinity());
      if (!P_plus_P.isInfinity()) {
        const pppNormed = P_plus_P.normalize();
        console.log('(P+P).x:', pppNormed.getXCoord().toBigInteger());
        console.log('(P+P).y:', pppNormed.getYCoord().toBigInteger());
        console.log('(P+P).isValid():', P_plus_P.isValid());
      }
    }
  });
});
