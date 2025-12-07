import { describe, it, expect } from 'vitest';
import { ECPointFp2 } from '../../../../src/math/ec/ECPointFp2';
import { Fp2Element } from '../../../../src/math/ec/Fp2Element';

describe('ECPointFp2', () => {
  const p = 97n;

  describe('Point creation', () => {
    it('should create point from affine coordinates', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      
      const point = ECPointFp2.fromAffine(x, y, p);
      
      expect(point.getX().equals(x)).toBe(true);
      expect(point.getY().equals(y)).toBe(true);
      expect(point.getZ().isOne()).toBe(true);
      expect(point.isInfinity()).toBe(false);
    });

    it('should create point at infinity', () => {
      const point = ECPointFp2.infinity(p);
      
      expect(point.isInfinity()).toBe(true);
    });

    it('should get affine coordinates', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const affineX = point.getAffineX();
      const affineY = point.getAffineY();
      
      expect(affineX.equals(x)).toBe(true);
      expect(affineY.equals(y)).toBe(true);
    });
  });

  describe('Point addition', () => {
    it('should add point at infinity', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      const infinity = ECPointFp2.infinity(p);
      
      const result = point.add(infinity);
      
      expect(result.equals(point)).toBe(true);
    });

    it('should add infinity to point', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      const infinity = ECPointFp2.infinity(p);
      
      const result = infinity.add(point);
      
      expect(result.equals(point)).toBe(true);
    });

    it('should add two points', () => {
      const x1 = new Fp2Element(3n, 4n, p);
      const y1 = new Fp2Element(5n, 6n, p);
      const p1 = ECPointFp2.fromAffine(x1, y1, p);
      
      const x2 = new Fp2Element(7n, 8n, p);
      const y2 = new Fp2Element(9n, 10n, p);
      const p2 = ECPointFp2.fromAffine(x2, y2, p);
      
      const result = p1.add(p2);
      
      expect(result.isInfinity()).toBe(false);
    });
  });

  describe('Point doubling', () => {
    it('should double a point', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const doubled = point.twice();
      
      expect(doubled.isInfinity()).toBe(false);
    });

    it('should double infinity', () => {
      const infinity = ECPointFp2.infinity(p);
      const doubled = infinity.twice();
      
      expect(doubled.isInfinity()).toBe(true);
    });

    it('should equal add with itself', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const doubled = point.twice();
      const added = point.add(point);
      
      expect(doubled.equals(added)).toBe(true);
    });
  });

  describe('Negation', () => {
    it('should negate a point', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const negated = point.negate();
      
      expect(negated.getX().equals(x)).toBe(true);
      expect(negated.getY().equals(y.negate())).toBe(true);
    });

    it('should satisfy P + (-P) = O', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const negated = point.negate();
      const result = point.add(negated);
      
      expect(result.isInfinity()).toBe(true);
    });

    it('should negate infinity to infinity', () => {
      const infinity = ECPointFp2.infinity(p);
      const negated = infinity.negate();
      
      expect(negated.isInfinity()).toBe(true);
    });
  });

  describe('Scalar multiplication', () => {
    it('should multiply by zero', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const result = point.multiply(0n);
      
      expect(result.isInfinity()).toBe(true);
    });

    it('should multiply by one', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const result = point.multiply(1n);
      
      expect(result.equals(point)).toBe(true);
    });

    it('should multiply by two', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const doubled = point.twice();
      const multiplied = point.multiply(2n);
      
      expect(multiplied.equals(doubled)).toBe(true);
    });

    it('should handle negative scalars', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const result = point.multiply(-1n);
      const negated = point.negate();
      
      expect(result.equals(negated)).toBe(true);
    });
  });

  describe('Normalization', () => {
    it('should normalize projective point', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const z = new Fp2Element(2n, 0n, p);
      const point = new ECPointFp2(x, y, z, p);
      
      const normalized = point.normalize();
      
      expect(normalized.getZ().isOne()).toBe(true);
      expect(normalized.equals(point)).toBe(true);
    });

    it('should not change affine point', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const point = ECPointFp2.fromAffine(x, y, p);
      
      const normalized = point.normalize();
      
      expect(normalized.equals(point)).toBe(true);
    });
  });

  describe('Equality', () => {
    it('should recognize equal points', () => {
      const x = new Fp2Element(3n, 4n, p);
      const y = new Fp2Element(5n, 6n, p);
      const p1 = ECPointFp2.fromAffine(x, y, p);
      const p2 = ECPointFp2.fromAffine(x, y, p);
      
      expect(p1.equals(p2)).toBe(true);
    });

    it('should recognize different points', () => {
      const x1 = new Fp2Element(3n, 4n, p);
      const y1 = new Fp2Element(5n, 6n, p);
      const p1 = ECPointFp2.fromAffine(x1, y1, p);
      
      const x2 = new Fp2Element(7n, 8n, p);
      const y2 = new Fp2Element(9n, 10n, p);
      const p2 = ECPointFp2.fromAffine(x2, y2, p);
      
      expect(p1.equals(p2)).toBe(false);
    });

    it('should recognize equal projective points', () => {
      const x = new Fp2Element(6n, 8n, p);
      const y = new Fp2Element(10n, 12n, p);
      const z = new Fp2Element(2n, 0n, p);
      const p1 = new ECPointFp2(x, y, z, p);
      
      const xAff = new Fp2Element(3n, 4n, p);
      const yAff = new Fp2Element(5n, 6n, p);
      const p2 = ECPointFp2.fromAffine(xAff, yAff, p);
      
      expect(p1.equals(p2)).toBe(true);
    });
  });
});
