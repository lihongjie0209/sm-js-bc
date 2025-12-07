import { describe, it, expect } from 'vitest';
import { Fp12Element } from '../../../../src/math/ec/Fp12Element';
import { Fp4Element } from '../../../../src/math/ec/Fp4Element';
import { Fp2Element } from '../../../../src/math/ec/Fp2Element';

describe('Fp12Element', () => {
  const p = 97n;

  describe('Basic operations', () => {
    it('should create element correctly', () => {
      const a = Fp4Element.one(p);
      const b = Fp4Element.zero(p);
      const c = Fp4Element.zero(p);
      const elem = new Fp12Element(a, b, c);
      
      expect(elem.getA().equals(a)).toBe(true);
      expect(elem.getB().equals(b)).toBe(true);
      expect(elem.getC().equals(c)).toBe(true);
      expect(elem.getP()).toBe(p);
    });

    it('should create zero element', () => {
      const zero = Fp12Element.zero(p);
      expect(zero.isZero()).toBe(true);
    });

    it('should create one element', () => {
      const one = Fp12Element.one(p);
      expect(one.isOne()).toBe(true);
    });
  });

  describe('Addition', () => {
    it('should add two elements', () => {
      const elem1 = Fp12Element.one(p);
      const elem2 = Fp12Element.one(p);
      const result = elem1.add(elem2);
      
      expect(result.getA().getA().getA()).toBe(2n);
    });

    it('should be commutative', () => {
      const elem1 = Fp12Element.one(p);
      const elem2 = Fp12Element.zero(p);
      
      const result1 = elem1.add(elem2);
      const result2 = elem2.add(elem1);
      
      expect(result1.equals(result2)).toBe(true);
    });
  });

  describe('Multiplication', () => {
    it('should multiply by zero', () => {
      const elem = Fp12Element.one(p);
      const zero = Fp12Element.zero(p);
      const result = elem.multiply(zero);
      
      expect(result.isZero()).toBe(true);
    });

    it('should multiply by one', () => {
      const elem = Fp12Element.one(p);
      const one = Fp12Element.one(p);
      const result = elem.multiply(one);
      
      expect(result.equals(elem)).toBe(true);
    });
  });

  describe('Inversion', () => {
    it('should invert one', () => {
      const one = Fp12Element.one(p);
      const inv = one.invert();
      
      expect(inv.isOne()).toBe(true);
    });

    it('should throw error when inverting zero', () => {
      const zero = Fp12Element.zero(p);
      expect(() => zero.invert()).toThrow('Cannot invert zero element');
    });

    it('should satisfy a * a^-1 = 1', () => {
      const one = Fp12Element.one(p);
      const inv = one.invert();
      const product = one.multiply(inv);
      
      expect(product.isOne()).toBe(true);
    });
  });

  describe('Exponentiation', () => {
    it('should handle exponent 0', () => {
      const elem = Fp12Element.one(p);
      const result = elem.pow(0n);
      
      expect(result.isOne()).toBe(true);
    });

    it('should handle exponent 1', () => {
      const elem = Fp12Element.one(p);
      const result = elem.pow(1n);
      
      expect(result.equals(elem)).toBe(true);
    });

    it('should handle exponent 2', () => {
      const elem = Fp12Element.one(p);
      const squared = elem.square();
      const pow2 = elem.pow(2n);
      
      expect(squared.equals(pow2)).toBe(true);
    });
  });
});
