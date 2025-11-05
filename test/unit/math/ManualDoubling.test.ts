import { describe, it, expect } from 'vitest';
import { ECFieldElementFp } from '../../../src/math/ec/ECFieldElement';

describe('Manual Point Doubling Calculation', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  
  // Point P = (1, 5)
  const x1 = 1n;
  const y1 = 5n;

  it('should manually compute 2*P using standard formula', () => {
    console.log('\n=== Manual Calculation of 2*P ===');
    console.log('Curve: y² = x³ + 4x + 20 (mod 1063)');
    console.log('Point P = (1, 5)');
    
    // Standard doubling formula:
    // λ = (3x1² + a) / (2y1)
    // x3 = λ² - 2x1
    // y3 = λ(x1 - x3) - y1
    
    const X1 = new ECFieldElementFp(p, x1);
    const Y1 = new ECFieldElementFp(p, y1);
    const A = new ECFieldElementFp(p, a);
    
    // Compute λ = (3x1² + a) / (2y1)
    const x1Squared = X1.square(); // 1
    console.log('x1² =', x1Squared.toBigInteger());
    
    const three_x1_squared = x1Squared.add(x1Squared).add(x1Squared); // 3
    console.log('3x1² =', three_x1_squared.toBigInteger());
    
    const numerator = three_x1_squared.add(A); // 3 + 4 = 7
    console.log('3x1² + a =', numerator.toBigInteger());
    
    const two_y1 = Y1.add(Y1); // 10
    console.log('2y1 =', two_y1.toBigInteger());
    
    const lambda = numerator.divide(two_y1); // 7 / 10 (mod p)
    console.log('λ = (3x1² + a) / (2y1) =', lambda.toBigInteger());
    
    // Verify: lambda * two_y1 = numerator
    const verify_lambda = lambda.multiply(two_y1);
    console.log('Verify λ * 2y1 =', verify_lambda.toBigInteger(), '(should be', numerator.toBigInteger(), ')');
    expect(verify_lambda.toBigInteger()).toBe(numerator.toBigInteger());
    
    // Compute x3 = λ² - 2x1
    const lambda_squared = lambda.square();
    console.log('\nλ² =', lambda_squared.toBigInteger());
    
    const two_x1 = X1.add(X1); // 2
    console.log('2x1 =', two_x1.toBigInteger());
    
    const X3 = lambda_squared.subtract(two_x1);
    console.log('x3 = λ² - 2x1 =', X3.toBigInteger());
    
    // Compute y3 = λ(x1 - x3) - y1
    const x1_minus_x3 = X1.subtract(X3);
    console.log('\nx1 - x3 =', x1_minus_x3.toBigInteger());
    
    const lambda_times_diff = lambda.multiply(x1_minus_x3);
    console.log('λ(x1 - x3) =', lambda_times_diff.toBigInteger());
    
    const Y3 = lambda_times_diff.subtract(Y1);
    console.log('y3 = λ(x1 - x3) - y1 =', Y3.toBigInteger());
    
    console.log('\n=== Result: 2*P = (' + X3.toBigInteger() + ', ' + Y3.toBigInteger() + ') ===');
    
    // Verify the result is on the curve
    const lhs = Y3.square();
    const rhs = X3.square().multiply(X3).add(A.multiply(X3)).add(new ECFieldElementFp(p, b));
    console.log('\nVerification:');
    console.log('y3² =', lhs.toBigInteger());
    console.log('x3³ + ax3 + b =', rhs.toBigInteger());
    console.log('On curve:', lhs.toBigInteger() === rhs.toBigInteger());
    
    expect(lhs.toBigInteger()).toBe(rhs.toBigInteger());
    
    // This is the correct result
    console.log('\n✓ Correct result: 2*P = (' + X3.toBigInteger() + ', ' + Y3.toBigInteger() + ')');
    
    // Now compare with what ECPoint.twice() gives
    console.log('\n(Compare this with ECPoint.twice() output)');
  });
});
