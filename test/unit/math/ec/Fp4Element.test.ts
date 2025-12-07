import { describe, it, expect } from 'vitest';
import { Fp4Element } from '../../../../src/math/ec/Fp4Element';
import { Fp2Element } from '../../../../src/math/ec/Fp2Element';

describe('Fp4Element', () => {
  const p = 97n;

  describe('Basic operations', () => {
    it('should create element correctly', () => {
      const a = new Fp2Element(3n, 4n, p);
      const b = new Fp2Element(5n, 6n, p);
      const elem = new Fp4Element(a, b);
      
      expect(elem.getA().equals(a)).toBe(true);
      expect(elem.getB().equals(b)).toBe(true);
      expect(elem.getP()).toBe(p);
    });

    it('should create zero element', () => {
      const zero = Fp4Element.zero(p);
      expect(zero.isZero()).toBe(true);
    });

    it('should create one element', () => {
      const one = Fp4Element.one(p);
      expect(one.isOne()).toBe(true);
    });

    it('should reject elements with different moduli', () => {
      const a = new Fp2Element(3n, 4n, p);
      const b = new Fp2Element(5n, 6n, 101n);
      
      expect(() => new Fp4Element(a, b)).toThrow('same prime modulus');
    });
  });

  describe('Addition', () => {
    it('should add two elements', () => {
      const a1 = new Fp2Element(3n, 4n, p);
      const b1 = new Fp2Element(5n, 6n, p);
      const elem1 = new Fp4Element(a1, b1);

      const a2 = new Fp2Element(7n, 8n, p);
      const b2 = new Fp2Element(9n, 10n, p);
      const elem2 = new Fp4Element(a2, b2);

      const result = elem1.add(elem2);
      
      expect(result.getA().getA()).toBe(10n);
      expect(result.getA().getB()).toBe(12n);
      expect(result.getB().getA()).toBe(14n);
      expect(result.getB().getB()).toBe(16n);
    });

    it('should be commutative', () => {
      const a1 = new Fp2Element(3n, 4n, p);
      const b1 = new Fp2Element(5n, 6n, p);
      const elem1 = new Fp4Element(a1, b1);

      const a2 = new Fp2Element(7n, 8n, p);
      const b2 = new Fp2Element(9n, 10n, p);
      const elem2 = new Fp4Element(a2, b2);

      const result1 = elem1.add(elem2);
      const result2 = elem2.add(elem1);
      
      expect(result1.equals(result2)).toBe(true);
    });
  });

  describe('Multiplication', () => {
    it('should multiply two elements', () => {
      const a1 = new Fp2Element(2n, 3n, p);
      const b1 = new Fp2Element(1n, 1n, p);
      const elem1 = new Fp4Element(a1, b1);

      const a2 = new Fp2Element(1n, 0n, p);
      const b2 = new Fp2Element(0n, 1n, p);
      const elem2 = new Fp4Element(a2, b2);

      const result = elem1.multiply(elem2);
      
      // Result should be deterministic
      expect(result).toBeDefined();
    });

    it('should multiply by zero', () => {
      const a1 = new Fp2Element(5n, 7n, p);
      const b1 = new Fp2Element(3n, 4n, p);
      const elem = new Fp4Element(a1, b1);
      
      const zero = Fp4Element.zero(p);
      const result = elem.multiply(zero);
      
      expect(result.isZero()).toBe(true);
    });

    it('should multiply by one', () => {
      const a1 = new Fp2Element(5n, 7n, p);
      const b1 = new Fp2Element(3n, 4n, p);
      const elem = new Fp4Element(a1, b1);
      
      const one = Fp4Element.one(p);
      const result = elem.multiply(one);
      
      expect(result.equals(elem)).toBe(true);
    });

    it('should be commutative', () => {
      const a1 = new Fp2Element(3n, 4n, p);
      const b1 = new Fp2Element(5n, 6n, p);
      const elem1 = new Fp4Element(a1, b1);

      const a2 = new Fp2Element(7n, 8n, p);
      const b2 = new Fp2Element(9n, 10n, p);
      const elem2 = new Fp4Element(a2, b2);

      const result1 = elem1.multiply(elem2);
      const result2 = elem2.multiply(elem1);
      
      expect(result1.equals(result2)).toBe(true);
    });
  });

  describe('Inversion', () => {
    it('should invert non-zero element', () => {
      const a = new Fp2Element(3n, 4n, p);
      const b = new Fp2Element(5n, 6n, p);
      const elem = new Fp4Element(a, b);
      
      const inv = elem.invert();
      const product = elem.multiply(inv);
      
      expect(product.isOne()).toBe(true);
    });

    it('should throw error when inverting zero', () => {
      const zero = Fp4Element.zero(p);
      expect(() => zero.invert()).toThrow('Cannot invert zero element');
    });
  });

  describe('Square', () => {
    it('should square element', () => {
      const a = new Fp2Element(3n, 4n, p);
      const b = new Fp2Element(5n, 6n, p);
      const elem = new Fp4Element(a, b);
      
      const squared = elem.square();
      const multiplied = elem.multiply(elem);
      
      expect(squared.equals(multiplied)).toBe(true);
    });
  });

  describe('Frobenius map', () => {
    it('should apply Frobenius map', () => {
      const a = new Fp2Element(3n, 4n, p);
      const b = new Fp2Element(5n, 6n, p);
      const elem = new Fp4Element(a, b);
      
      const frob = elem.frobenius();
      
      expect(frob).toBeDefined();
      expect(frob.getP()).toBe(p);
    });
  });
});
