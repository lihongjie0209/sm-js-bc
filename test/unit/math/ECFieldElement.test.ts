import { describe, it, expect } from 'vitest';
import { ECFieldElementFp } from '../../../src/math/ec/ECFieldElement';

describe('ECFieldElement Fp Operations', () => {
  const p = 1063n; // Prime from test curve

  it('should compute addition correctly', () => {
    const a = new ECFieldElementFp(p, 5n);
    const b = new ECFieldElementFp(p, 7n);
    const result = a.add(b);
    expect(result.toBigInteger()).toBe(12n);
  });

  it('should compute subtraction correctly', () => {
    const a = new ECFieldElementFp(p, 7n);
    const b = new ECFieldElementFp(p, 5n);
    const result = a.subtract(b);
    expect(result.toBigInteger()).toBe(2n);
  });

  it('should compute subtraction with wrap around', () => {
    const a = new ECFieldElementFp(p, 5n);
    const b = new ECFieldElementFp(p, 7n);
    const result = a.subtract(b);
    expect(result.toBigInteger()).toBe((5n - 7n + p) % p); // 1061
  });

  it('should compute multiplication correctly', () => {
    const a = new ECFieldElementFp(p, 5n);
    const b = new ECFieldElementFp(p, 7n);
    const result = a.multiply(b);
    expect(result.toBigInteger()).toBe(35n);
  });

  it('should compute multiplication with wrap around', () => {
    const a = new ECFieldElementFp(p, 500n);
    const b = new ECFieldElementFp(p, 500n);
    const result = a.multiply(b);
    expect(result.toBigInteger()).toBe(250000n % p); // 972
  });

  it('should compute square correctly', () => {
    const a = new ECFieldElementFp(p, 5n);
    const result = a.square();
    expect(result.toBigInteger()).toBe(25n);
  });

  it('should compute negation correctly', () => {
    const a = new ECFieldElementFp(p, 5n);
    const result = a.negate();
    expect(result.toBigInteger()).toBe((p - 5n) % p); // 1058
  });

  it('should compute inversion correctly: 2 * inv(2) = 1', () => {
    const two = new ECFieldElementFp(p, 2n);
    const invTwo = two.invert();
    const result = two.multiply(invTwo);
    
    console.log('inv(2) mod 1063:', invTwo.toBigInteger());
    console.log('2 * inv(2) mod 1063:', result.toBigInteger());
    
    expect(result.toBigInteger()).toBe(1n);
  });

  it('should compute division correctly: 10 / 2 = 5', () => {
    const ten = new ECFieldElementFp(p, 10n);
    const two = new ECFieldElementFp(p, 2n);
    const result = ten.divide(two);
    
    console.log('10 / 2 mod 1063:', result.toBigInteger());
    
    expect(result.toBigInteger()).toBe(5n);
  });

  it('should compute division with non-trivial inverse', () => {
    const a = new ECFieldElementFp(p, 7n);
    const b = new ECFieldElementFp(p, 3n);
    const result = a.divide(b);
    
    // Verify: result * 3 = 7 (mod p)
    const verify = result.multiply(b);
    
    console.log('7 / 3 mod 1063:', result.toBigInteger());
    console.log('(7/3) * 3 mod 1063:', verify.toBigInteger());
    
    expect(verify.toBigInteger()).toBe(7n);
  });

  it('should verify point (1, 5) is on curve y² = x³ + 4x + 20', () => {
    const x = new ECFieldElementFp(p, 1n);
    const y = new ECFieldElementFp(p, 5n);
    const a = new ECFieldElementFp(p, 4n);
    const b = new ECFieldElementFp(p, 20n);
    
    // Compute y²
    const lhs = y.square();
    
    // Compute x³ + 4x + 20
    const x3 = x.square().multiply(x);
    const ax = a.multiply(x);
    const rhs = x3.add(ax).add(b);
    
    console.log('y² mod p:', lhs.toBigInteger());
    console.log('x³+4x+20 mod p:', rhs.toBigInteger());
    
    expect(lhs.toBigInteger()).toBe(rhs.toBigInteger());
  });
});
