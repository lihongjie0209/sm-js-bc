import { describe, it, expect } from 'vitest';
import { Fp2Element } from '../../../../src/math/ec/Fp2Element';

describe('Fp2Element', () => {
  // Use a small prime for testing
  const p = 97n;

  describe('Basic operations', () => {
    it('should create element correctly', () => {
      const elem = new Fp2Element(3n, 4n, p);
      expect(elem.getA()).toBe(3n);
      expect(elem.getB()).toBe(4n);
      expect(elem.getP()).toBe(p);
    });

    it('should create zero element', () => {
      const zero = Fp2Element.zero(p);
      expect(zero.isZero()).toBe(true);
      expect(zero.getA()).toBe(0n);
      expect(zero.getB()).toBe(0n);
    });

    it('should create one element', () => {
      const one = Fp2Element.one(p);
      expect(one.isOne()).toBe(true);
      expect(one.getA()).toBe(1n);
      expect(one.getB()).toBe(0n);
    });
  });

  describe('Addition', () => {
    it('should add two elements', () => {
      const a = new Fp2Element(3n, 4n, p);
      const b = new Fp2Element(5n, 6n, p);
      const result = a.add(b);

      expect(result.getA()).toBe(8n);
      expect(result.getB()).toBe(10n);
    });

    it('should be commutative', () => {
      const a = new Fp2Element(3n, 4n, p);
      const b = new Fp2Element(5n, 6n, p);

      const ab = a.add(b);
      const ba = b.add(a);

      expect(ab.equals(ba)).toBe(true);
    });
  });

  describe('Multiplication', () => {
    it('should multiply two elements', () => {
      const a = new Fp2Element(2n, 3n, p);
      const b = new Fp2Element(4n, 5n, p);
      const result = a.multiply(b);

      // (2 + 3u)(4 + 5u) = 8 + 10u + 12u + 15u^2
      // = 8 + 22u - 15 (since u^2 = -1)
      // = -7 + 22u = 90 + 22u (mod 97)
      expect(result.getA()).toBe(90n);
      expect(result.getB()).toBe(22n);
    });

    it('should multiply by zero', () => {
      const a = new Fp2Element(5n, 7n, p);
      const zero = Fp2Element.zero(p);
      const result = a.multiply(zero);

      expect(result.isZero()).toBe(true);
    });

    it('should multiply by one', () => {
      const a = new Fp2Element(5n, 7n, p);
      const one = Fp2Element.one(p);
      const result = a.multiply(one);

      expect(result.equals(a)).toBe(true);
    });
  });

  describe('Inversion', () => {
    it('should invert non-zero element', () => {
      const a = new Fp2Element(3n, 4n, p);
      const inv = a.invert();
      const product = a.multiply(inv);

      expect(product.isOne()).toBe(true);
    });

    it('should throw error when inverting zero', () => {
      const zero = Fp2Element.zero(p);
      expect(() => zero.invert()).toThrow('Cannot invert zero element');
    });
  });
});
