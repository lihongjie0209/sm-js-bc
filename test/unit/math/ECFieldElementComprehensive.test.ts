import { describe, it, expect } from 'vitest';
import { ECFieldElementFp } from '../../../src/math/ec/ECFieldElement';

describe('ECFieldElementFp Comprehensive Tests', () => {
  // Use test prime: p = 1063 (same as our curve tests)
  const p = 1063n;
  
  describe('Constructor and Basic Properties', () => {
    it('should create element with value in range [0, p)', () => {
      const elem = new ECFieldElementFp(p, 42n);
      expect(elem.toBigInteger()).toBe(42n);
      expect(elem.getQ()).toBe(p);
      expect(elem.getFieldName()).toBe('Fp');
    });

    it('should normalize negative values', () => {
      const elem = new ECFieldElementFp(p, -5n);
      expect(elem.toBigInteger()).toBe(p - 5n); // 1058n
    });

    it('should normalize values >= p', () => {
      const elem = new ECFieldElementFp(p, p + 7n);
      expect(elem.toBigInteger()).toBe(7n);
    });

    it('should compute field size correctly', () => {
      const elem = new ECFieldElementFp(p, 1n);
      expect(elem.getFieldSize()).toBe(11); // log2(1063) ≈ 10.05, so 11 bits
    });

    it('should identify zero and one correctly', () => {
      const zero = new ECFieldElementFp(p, 0n);
      const one = new ECFieldElementFp(p, 1n);
      const five = new ECFieldElementFp(p, 5n);

      expect(zero.isZero()).toBe(true);
      expect(zero.isOne()).toBe(false);
      
      expect(one.isZero()).toBe(false);
      expect(one.isOne()).toBe(true);
      
      expect(five.isZero()).toBe(false);
      expect(five.isOne()).toBe(false);
    });

    it('should test bit zero correctly', () => {
      const even = new ECFieldElementFp(p, 42n); // even
      const odd = new ECFieldElementFp(p, 43n);  // odd

      expect(even.testBitZero()).toBe(false);
      expect(odd.testBitZero()).toBe(true);
    });
  });

  describe('Addition Operations', () => {
    it('should add two elements correctly', () => {
      const a = new ECFieldElementFp(p, 100n);
      const b = new ECFieldElementFp(p, 200n);
      const sum = a.add(b);

      expect(sum.toBigInteger()).toBe(300n);
    });

    it('should handle addition with modular reduction', () => {
      const a = new ECFieldElementFp(p, 800n);
      const b = new ECFieldElementFp(p, 500n);
      const sum = a.add(b);

      expect(sum.toBigInteger()).toBe((800n + 500n) % p); // 237n
    });

    it('should add one correctly', () => {
      const a = new ECFieldElementFp(p, 100n);
      const result = a.addOne();
      expect(result.toBigInteger()).toBe(101n);

      // Test wrap-around case: (p-1) + 1 = 0
      const max = new ECFieldElementFp(p, p - 1n);
      const wrapped = max.addOne();
      expect(wrapped.toBigInteger()).toBe(0n);
    });

    it('should be commutative: a + b = b + a', () => {
      const a = new ECFieldElementFp(p, 123n);
      const b = new ECFieldElementFp(p, 456n);

      expect(a.add(b).toBigInteger()).toBe(b.add(a).toBigInteger());
    });

    it('should be associative: (a + b) + c = a + (b + c)', () => {
      const a = new ECFieldElementFp(p, 100n);
      const b = new ECFieldElementFp(p, 200n);
      const c = new ECFieldElementFp(p, 300n);

      const left = a.add(b).add(c);
      const right = a.add(b.add(c));
      
      expect(left.toBigInteger()).toBe(right.toBigInteger());
    });

    it('should have zero as additive identity', () => {
      const a = new ECFieldElementFp(p, 123n);
      const zero = new ECFieldElementFp(p, 0n);

      expect(a.add(zero).toBigInteger()).toBe(a.toBigInteger());
      expect(zero.add(a).toBigInteger()).toBe(a.toBigInteger());
    });
  });

  describe('Subtraction Operations', () => {
    it('should subtract elements correctly', () => {
      const a = new ECFieldElementFp(p, 500n);
      const b = new ECFieldElementFp(p, 200n);
      const diff = a.subtract(b);

      expect(diff.toBigInteger()).toBe(300n);
    });

    it('should handle subtraction with negative result', () => {
      const a = new ECFieldElementFp(p, 100n);
      const b = new ECFieldElementFp(p, 200n);
      const diff = a.subtract(b);

      expect(diff.toBigInteger()).toBe(p - 100n); // p + (100 - 200) = p - 100
    });

    it('should satisfy a - a = 0', () => {
      const a = new ECFieldElementFp(p, 123n);
      const result = a.subtract(a);
      expect(result.toBigInteger()).toBe(0n);
    });
  });

  describe('Multiplication Operations', () => {
    it('should multiply elements correctly', () => {
      const a = new ECFieldElementFp(p, 10n);
      const b = new ECFieldElementFp(p, 20n);
      const product = a.multiply(b);

      expect(product.toBigInteger()).toBe(200n);
    });

    it('should handle multiplication with modular reduction', () => {
      const a = new ECFieldElementFp(p, 50n);
      const b = new ECFieldElementFp(p, 30n);
      const product = a.multiply(b);

      expect(product.toBigInteger()).toBe((50n * 30n) % p); // 1500 % 1063 = 437
    });

    it('should be commutative: a * b = b * a', () => {
      const a = new ECFieldElementFp(p, 17n);
      const b = new ECFieldElementFp(p, 23n);

      expect(a.multiply(b).toBigInteger()).toBe(b.multiply(a).toBigInteger());
    });

    it('should be associative: (a * b) * c = a * (b * c)', () => {
      const a = new ECFieldElementFp(p, 5n);
      const b = new ECFieldElementFp(p, 7n);
      const c = new ECFieldElementFp(p, 11n);

      const left = a.multiply(b).multiply(c);
      const right = a.multiply(b.multiply(c));
      
      expect(left.toBigInteger()).toBe(right.toBigInteger());
    });

    it('should have one as multiplicative identity', () => {
      const a = new ECFieldElementFp(p, 123n);
      const one = new ECFieldElementFp(p, 1n);

      expect(a.multiply(one).toBigInteger()).toBe(a.toBigInteger());
      expect(one.multiply(a).toBigInteger()).toBe(a.toBigInteger());
    });

    it('should have zero as multiplicative annihilator', () => {
      const a = new ECFieldElementFp(p, 123n);
      const zero = new ECFieldElementFp(p, 0n);

      expect(a.multiply(zero).toBigInteger()).toBe(0n);
      expect(zero.multiply(a).toBigInteger()).toBe(0n);
    });
  });

  describe('Division and Inversion', () => {
    it('should compute multiplicative inverse correctly', () => {
      const a = new ECFieldElementFp(p, 7n);
      const inv = a.invert();

      // Verify: a * a^(-1) = 1
      const product = a.multiply(inv);
      expect(product.toBigInteger()).toBe(1n);
    });

    it('should divide correctly', () => {
      const a = new ECFieldElementFp(p, 15n);
      const b = new ECFieldElementFp(p, 3n);
      const quotient = a.divide(b);

      expect(quotient.toBigInteger()).toBe(5n);
    });

    it('should satisfy division property: (a/b) * b = a', () => {
      const a = new ECFieldElementFp(p, 100n);
      const b = new ECFieldElementFp(p, 7n);

      const quotient = a.divide(b);
      const result = quotient.multiply(b);
      
      expect(result.toBigInteger()).toBe(a.toBigInteger());
    });

    it('should handle division by 1', () => {
      const a = new ECFieldElementFp(p, 123n);
      const one = new ECFieldElementFp(p, 1n);
      const result = a.divide(one);

      expect(result.toBigInteger()).toBe(a.toBigInteger());
    });
  });

  describe('Negation', () => {
    it('should negate non-zero elements correctly', () => {
      const a = new ECFieldElementFp(p, 5n);
      const neg = a.negate();

      expect(neg.toBigInteger()).toBe(p - 5n); // 1058n
    });

    it('should handle negation of zero', () => {
      const zero = new ECFieldElementFp(p, 0n);
      const negZero = zero.negate();

      expect(negZero.toBigInteger()).toBe(0n);
    });

    it('should satisfy a + (-a) = 0', () => {
      const a = new ECFieldElementFp(p, 123n);
      const neg = a.negate();
      const sum = a.add(neg);

      expect(sum.toBigInteger()).toBe(0n);
    });

    it('should satisfy -(-a) = a', () => {
      const a = new ECFieldElementFp(p, 123n);
      const doubleNeg = a.negate().negate();

      expect(doubleNeg.toBigInteger()).toBe(a.toBigInteger());
    });
  });

  describe('Squaring', () => {
    it('should square elements correctly', () => {
      const a = new ECFieldElementFp(p, 5n);
      const square = a.square();

      expect(square.toBigInteger()).toBe(25n);
    });

    it('should handle large squares with modular reduction', () => {
      const a = new ECFieldElementFp(p, 50n);
      const square = a.square();

      expect(square.toBigInteger()).toBe((50n * 50n) % p); // 2500 % 1063 = 374
    });

    it('should satisfy (a^2) = a * a', () => {
      const a = new ECFieldElementFp(p, 17n);

      expect(a.square().toBigInteger()).toBe(a.multiply(a).toBigInteger());
    });
  });

  describe('Optimized Operations', () => {
    it('should compute multiplyMinusProduct correctly', () => {
      const a = new ECFieldElementFp(p, 10n);
      const b = new ECFieldElementFp(p, 20n);
      const x = new ECFieldElementFp(p, 3n);
      const y = new ECFieldElementFp(p, 4n);

      const result = a.multiplyMinusProduct(b, x, y);
      const expected = a.multiply(b).subtract(x.multiply(y));

      expect(result.toBigInteger()).toBe(expected.toBigInteger());
    });

    it('should compute multiplyPlusProduct correctly', () => {
      const a = new ECFieldElementFp(p, 10n);
      const b = new ECFieldElementFp(p, 20n);
      const x = new ECFieldElementFp(p, 3n);
      const y = new ECFieldElementFp(p, 4n);

      const result = a.multiplyPlusProduct(b, x, y);
      const expected = a.multiply(b).add(x.multiply(y));

      expect(result.toBigInteger()).toBe(expected.toBigInteger());
    });

    it('should compute squareMinusProduct correctly', () => {
      const a = new ECFieldElementFp(p, 10n);
      const x = new ECFieldElementFp(p, 3n);
      const y = new ECFieldElementFp(p, 4n);

      const result = a.squareMinusProduct(x, y);
      const expected = a.square().subtract(x.multiply(y));

      expect(result.toBigInteger()).toBe(expected.toBigInteger());
    });

    it('should compute squarePlusProduct correctly', () => {
      const a = new ECFieldElementFp(p, 10n);
      const x = new ECFieldElementFp(p, 3n);
      const y = new ECFieldElementFp(p, 4n);

      const result = a.squarePlusProduct(x, y);
      const expected = a.square().add(x.multiply(y));

      expect(result.toBigInteger()).toBe(expected.toBigInteger());
    });
  });

  describe('Square Root', () => {
    it('should compute square root for perfect squares', () => {
      const a = new ECFieldElementFp(p, 25n); // 5^2 = 25
      const sqrt = a.sqrt();

      expect(sqrt).not.toBeNull();
      if (sqrt) {
        const square = sqrt.square();
        expect(square.toBigInteger()).toBe(25n);
      }
    });

    it('should return null for non-quadratic residues', () => {
      // Find a non-quadratic residue
      let nonResidue = 2n;
      while (true) {
        const elem = new ECFieldElementFp(p, nonResidue);
        const legendreSymbol = elem.toBigInteger() ** ((p - 1n) / 2n) % p;
        if (legendreSymbol === p - 1n) { // -1 mod p
          break;
        }
        nonResidue++;
      }

      const elem = new ECFieldElementFp(p, nonResidue);
      const sqrt = elem.sqrt();
      expect(sqrt).toBeNull();
    });

    it('should handle square root of 0 and 1', () => {
      const zero = new ECFieldElementFp(p, 0n);
      const one = new ECFieldElementFp(p, 1n);

      expect(zero.sqrt()?.toBigInteger()).toBe(0n);
      expect(one.sqrt()?.toBigInteger()).toBe(1n);
    });
  });

  describe('Equality and Hashing', () => {
    it('should check equality correctly', () => {
      const a1 = new ECFieldElementFp(p, 123n);
      const a2 = new ECFieldElementFp(p, 123n);
      const b = new ECFieldElementFp(p, 456n);

      expect(a1.equals(a2)).toBe(true);
      expect(a1.equals(b)).toBe(false);
    });

    it('should handle equality with different moduli', () => {
      const a = new ECFieldElementFp(p, 123n);
      const b = new ECFieldElementFp(p + 1n, 123n);

      expect(a.equals(b)).toBe(false);
    });

    it('should handle self-equality', () => {
      const a = new ECFieldElementFp(p, 123n);
      expect(a.equals(a)).toBe(true);
    });

    it('should generate hash codes', () => {
      const a = new ECFieldElementFp(p, 123n);
      const hash = a.hashCode();
      expect(typeof hash).toBe('number');
    });
  });

  describe('Encoding', () => {
    it('should encode elements to byte arrays', () => {
      const a = new ECFieldElementFp(p, 123n);
      const encoded = a.getEncoded();

      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);
      
      // Should be able to reconstruct the value
      let reconstructed = 0n;
      for (let i = 0; i < encoded.length; i++) {
        reconstructed = (reconstructed << 8n) | BigInt(encoded[i]);
      }
      expect(reconstructed).toBe(123n);
    });

    it('should encode zero correctly', () => {
      const zero = new ECFieldElementFp(p, 0n);
      const encoded = zero.getEncoded();
      
      expect(encoded.every(byte => byte === 0)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle maximum field value', () => {
      const max = new ECFieldElementFp(p, p - 1n);
      expect(max.toBigInteger()).toBe(p - 1n);
      
      const doubled = max.add(max);
      expect(doubled.toBigInteger()).toBe(2n * (p - 1n) % p);
    });

    it('should handle very large input values', () => {
      const large = p * 100n + 42n;
      const elem = new ECFieldElementFp(p, large);
      expect(elem.toBigInteger()).toBe(42n);
    });

    it('should throw error for square root on even modulus', () => {
      expect(() => {
        const elem = new ECFieldElementFp(100n, 25n); // 100 is even
        elem.sqrt();
      }).toThrow('Square root not implemented for even modulus');
    });
  });
});