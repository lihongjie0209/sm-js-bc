import { describe, it, expect } from 'vitest';
import { ECFieldElementFp } from '../../../src/math/ec/ECFieldElement';

describe('Manual Jacobian Modified Doubling', () => {
  const p = 1063n;
  const a = 4n;
  
  // Point P = (1, 5) in affine coords => (X=1, Y=5, Z=1, W=a) in Jacobian Modified
  const X1 = new ECFieldElementFp(p, 1n);
  const Y1 = new ECFieldElementFp(p, 5n);
  const Z1 = new ECFieldElementFp(p, 1n);
  const W1 = new ECFieldElementFp(p, a);

  it('should manually compute 2*P using Jacobian Modified formula', () => {
    console.log('\n=== Manual Calculation using Jacobian Modified ===');
    console.log('Input: (X=1, Y=5, Z=1, W=4)');
    
    // Java formula:
    // ECFieldElement X1Squared = X1.square();
    const X1Squared = X1.square();
    console.log('X1²:', X1Squared.toBigInteger());
    
    // ECFieldElement M = three(X1Squared).add(W1);
    const three_X1Squared = X1Squared.add(X1Squared).add(X1Squared);
    const M = three_X1Squared.add(W1);
    console.log('3*X1²:', three_X1Squared.toBigInteger());
    console.log('M = 3*X1² + W1:', M.toBigInteger());
    
    // ECFieldElement _2Y1 = two(Y1);
    const _2Y1 = Y1.add(Y1);
    console.log('2*Y1:', _2Y1.toBigInteger());
    
    // ECFieldElement _2Y1Squared = _2Y1.multiply(Y1);
    const _2Y1Squared = _2Y1.multiply(Y1);
    console.log('(2*Y1)²:', _2Y1Squared.toBigInteger());
    
    // ECFieldElement S = two(X1.multiply(_2Y1Squared));
    const X1_times_2Y1Squared = X1.multiply(_2Y1Squared);
    const S = X1_times_2Y1Squared.add(X1_times_2Y1Squared);
    console.log('X1 * (2*Y1)²:', X1_times_2Y1Squared.toBigInteger());
    console.log('S = 2 * (X1 * (2*Y1)²):', S.toBigInteger());
    
    // ECFieldElement X3 = M.square().subtract(two(S));
    const M_squared = M.square();
    const two_S = S.add(S);
    const X3 = M_squared.subtract(two_S);
    console.log('M²:', M_squared.toBigInteger());
    console.log('2*S:', two_S.toBigInteger());
    console.log('X3 = M² - 2*S:', X3.toBigInteger());
    
    // ECFieldElement _4T = _2Y1Squared.square();
    const _4T = _2Y1Squared.square();
    console.log('4*T = ((2*Y1)²)²:', _4T.toBigInteger());
    
    // ECFieldElement _8T = two(_4T);
    const _8T = _4T.add(_4T);
    console.log('8*T = 2*(4*T):', _8T.toBigInteger());
    
    // ECFieldElement Y3 = M.multiply(S.subtract(X3)).subtract(_8T);
    const S_minus_X3 = S.subtract(X3);
    const M_times_diff = M.multiply(S_minus_X3);
    const Y3 = M_times_diff.subtract(_8T);
    console.log('S - X3:', S_minus_X3.toBigInteger());
    console.log('M * (S - X3):', M_times_diff.toBigInteger());
    console.log('Y3 = M*(S-X3) - 8*T:', Y3.toBigInteger());
    
    // ECFieldElement W3 = calculateW ? two(_8T.multiply(W1)) : null;
    const _8T_times_W1 = _8T.multiply(W1);
    const W3 = _8T_times_W1.add(_8T_times_W1);
    console.log('8*T * W1:', _8T_times_W1.toBigInteger());
    console.log('W3 = 2 * (8*T * W1):', W3.toBigInteger());
    
    // ECFieldElement Z3 = Z1.isOne() ? _2Y1 : _2Y1.multiply(Z1);
    const Z3 = Z1.toBigInteger() === 1n ? _2Y1 : _2Y1.multiply(Z1);
    console.log('Z3 = 2*Y1 (since Z1=1):', Z3.toBigInteger());
    
    console.log('\n=== Result in Jacobian Modified ===');
    console.log('(X3=' + X3.toBigInteger() + ', Y3=' + Y3.toBigInteger() + ', Z3=' + Z3.toBigInteger() + ', W3=' + W3.toBigInteger() + ')');
    
    // Convert to affine coordinates
    // Affine x = X / Z²
    // Affine y = Y / Z³
    const Z3_squared = Z3.square();
    const Z3_cubed = Z3_squared.multiply(Z3);
    const affine_x = X3.divide(Z3_squared);
    const affine_y = Y3.divide(Z3_cubed);
    
    console.log('\n=== Convert to Affine ===');
    console.log('Z3²:', Z3_squared.toBigInteger());
    console.log('Z3³:', Z3_cubed.toBigInteger());
    console.log('Affine x = X3/Z3²:', affine_x.toBigInteger());
    console.log('Affine y = Y3/Z3³:', affine_y.toBigInteger());
    
    // Verify on curve
    const A = new ECFieldElementFp(p, 4n);
    const B = new ECFieldElementFp(p, 20n);
    const lhs = affine_y.square();
    const rhs = affine_x.square().multiply(affine_x).add(A.multiply(affine_x)).add(B);
    console.log('\nVerification:');
    console.log('y²:', lhs.toBigInteger());
    console.log('x³+ax+b:', rhs.toBigInteger());
    console.log('On curve:', lhs.toBigInteger() === rhs.toBigInteger());
    
    if (lhs.toBigInteger() === rhs.toBigInteger()) {
      console.log('\n✓ Correct result: 2*P = (' + affine_x.toBigInteger() + ', ' + affine_y.toBigInteger() + ')');
    }
  });
});
