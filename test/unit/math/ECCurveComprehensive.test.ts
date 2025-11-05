import { describe, it, expect, beforeEach } from 'vitest';
import { ECCurveFp, CoordinateSystem } from '../../../src/math/ec/ECCurve';
import { ECFieldElementFp } from '../../../src/math/ec/ECFieldElement';
import { SecureRandom } from '../../../src/util/SecureRandom';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('ECCurve Comprehensive Tests', () => {
  // Test curve: y² = x³ + 4x + 20 over F_1063
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const order = 1069n; // Approximate order for testing
  const cofactor = 1n;

  let curve: ECCurveFp;

  beforeEach(() => {
    curve = new ECCurveFp(p, a, b, order, cofactor);
  });

  describe('Constructor and Basic Properties', () => {
    it('should create curve with correct parameters', () => {
      expect(curve.getQ()).toBe(p);
      expect(curve.getA().toBigInteger()).toBe(a);
      expect(curve.getB().toBigInteger()).toBe(b);
      expect(curve.getOrder()).toBe(order);
      expect(curve.getCofactor()).toBe(cofactor);
    });

    it('should use JACOBIAN_MODIFIED coordinate system by default', () => {
      expect(curve.getCoordinateSystem()).toBe(CoordinateSystem.JACOBIAN_MODIFIED);
    });

    it('should compute field size correctly', () => {
      const fieldSize = curve.getFieldSize();
      expect(fieldSize).toBe(11); // log2(1063) ≈ 10.05, so 11 bits
    });

    it('should create curve without order and cofactor', () => {
      const simpleCurve = new ECCurveFp(p, a, b);
      expect(simpleCurve.getQ()).toBe(p);
      expect(simpleCurve.getOrder()).toBeNull();
      expect(simpleCurve.getCofactor()).toBeNull();
    });
  });

  describe('Field Element Operations', () => {
    it('should create field elements from BigInt', () => {
      const elem = curve.fromBigInteger(123n);
      expect(elem.toBigInteger()).toBe(123n);
      expect(elem).toBeInstanceOf(ECFieldElementFp);
    });

    it('should validate field elements correctly', () => {
      expect(curve.isValidFieldElement(0n)).toBe(true);
      expect(curve.isValidFieldElement(p - 1n)).toBe(true);
      expect(curve.isValidFieldElement(p)).toBe(false);
      expect(curve.isValidFieldElement(-1n)).toBe(false);
    });

    it('should normalize negative field elements', () => {
      const elem = curve.fromBigInteger(-5n);
      expect(elem.toBigInteger()).toBe(p - 5n); // 1058n
    });

    it('should create random field elements', () => {
      const random = new SecureRandom();
      
      for (let i = 0; i < 10; i++) {
        const elem = curve.randomFieldElement(random);
        expect(elem.toBigInteger()).toBeGreaterThanOrEqual(0n);
        expect(elem.toBigInteger()).toBeLessThan(p);
      }
    });

    it('should create random non-zero field elements', () => {
      const random = new SecureRandom();
      
      for (let i = 0; i < 10; i++) {
        const elem = curve.randomFieldElementMult(random);
        expect(elem.toBigInteger()).toBeGreaterThan(0n);
        expect(elem.toBigInteger()).toBeLessThan(p);
      }
    });
  });

  describe('Point Creation and Validation', () => {
    it('should create valid points on the curve', () => {
      // Known point: (1, 5)
      const point = curve.createPoint(1n, 5n);
      expect(point.isInfinity()).toBe(false);
      expect(point.isValid()).toBe(true);
      expect(point.getAffineXCoord().toBigInteger()).toBe(1n);
      expect(point.getAffineYCoord().toBigInteger()).toBe(5n);
    });

    it('should validate points correctly', () => {
      // Valid point
      expect(() => curve.validatePoint(1n, 5n)).not.toThrow();
      
      // Invalid point - should throw
      expect(() => curve.validatePoint(1n, 6n)).toThrow('Invalid point coordinates');
    });

    it('should create raw points without validation', () => {
      const x = curve.fromBigInteger(1n);
      const y = curve.fromBigInteger(6n); // Invalid y coordinate
      const point = curve.createRawPoint(x, y);
      
      expect(point.isValid()).toBe(false); // Should be invalid but not throw
    });

    it('should create raw points with z-coordinates', () => {
      const x = curve.fromBigInteger(1n);
      const y = curve.fromBigInteger(5n);
      const z = curve.fromBigInteger(1n);
      const w = curve.getA(); // For JACOBIAN_MODIFIED
      
      const point = curve.createRawPoint(x, y, [z, w]);
      expect(point.isValid()).toBe(true);
    });

    it('should verify curve equation for valid points', () => {
      const testCases = [
        [1n, 5n],
        [817n, 912n], // 2*G
        [54n, 521n],  // 3*G
      ];

      for (const [x, y] of testCases) {
        const point = curve.createPoint(x, y);
        expect(point.isValid()).toBe(true);
        
        // Verify: y² = x³ + ax + b (mod p)
        const lhs = (y * y) % p;
        const rhs = (x * x * x + a * x + b) % p;
        expect(lhs).toBe(rhs);
      }
    });
  });

  describe('Infinity Point', () => {
    it('should provide infinity point', () => {
      const infinity = curve.getInfinity();
      expect(infinity.isInfinity()).toBe(true);
      expect(infinity.isValid()).toBe(true);
    });

    it('should return same infinity instance', () => {
      const inf1 = curve.getInfinity();
      const inf2 = curve.getInfinity();
      expect(inf1).toBe(inf2);
    });

    it('should handle infinity in operations', () => {
      const G = curve.validatePoint(1n, 5n);
      const infinity = curve.getInfinity();

      // G + O = G
      expect(G.add(infinity).equals(G)).toBe(true);
      expect(infinity.add(G).equals(G)).toBe(true);

      // 2*O = O
      expect(infinity.twice().isInfinity()).toBe(true);
    });
  });

  describe('Coordinate System Support', () => {
    it('should support standard coordinate systems', () => {
      expect(curve.supportsCoordinateSystem(CoordinateSystem.AFFINE)).toBe(true);
      expect(curve.supportsCoordinateSystem(CoordinateSystem.HOMOGENEOUS)).toBe(true);
      expect(curve.supportsCoordinateSystem(CoordinateSystem.JACOBIAN)).toBe(true);
      expect(curve.supportsCoordinateSystem(CoordinateSystem.JACOBIAN_MODIFIED)).toBe(true);
    });

    it('should not support unsupported coordinate systems', () => {
      expect(curve.supportsCoordinateSystem(CoordinateSystem.LAMBDA_AFFINE)).toBe(false);
      expect(curve.supportsCoordinateSystem(CoordinateSystem.LAMBDA_PROJECTIVE)).toBe(false);
      expect(curve.supportsCoordinateSystem(CoordinateSystem.SKEWED)).toBe(false);
    });
  });

  describe('Point Import and Export', () => {
    it('should import points from same curve', () => {
      const G = curve.validatePoint(1n, 5n);
      const imported = curve.importPoint(G);
      
      expect(imported).toBe(G); // Should be same instance
    });

    it('should import points from different curves', () => {
      const otherCurve = new ECCurveFp(p, a, b + 1n); // Different curve
      const G = curve.validatePoint(1n, 5n);
      
      // Create equivalent point on other curve (won't be valid, but for testing)
      const otherPoint = otherCurve.createRawPoint(
        otherCurve.fromBigInteger(1n),
        otherCurve.fromBigInteger(5n)
      );
      
      const imported = curve.importPoint(otherPoint);
      expect(imported.getAffineXCoord().toBigInteger()).toBe(1n);
      expect(imported.getAffineYCoord().toBigInteger()).toBe(5n);
    });

    it('should import infinity correctly', () => {
      const otherCurve = new ECCurveFp(p, a, b + 1n);
      const otherInfinity = otherCurve.getInfinity();
      
      const imported = curve.importPoint(otherInfinity);
      expect(imported.isInfinity()).toBe(true);
      expect(imported).toBe(curve.getInfinity());
    });
  });

  describe('Encoding and Field Properties', () => {
    it('should compute field element encoding length', () => {
      const length = curve.getFieldElementEncodingLength();
      expect(length).toBe(2); // ceil(11/8) = 2 bytes
    });

    it('should compute affine point encoding length', () => {
      const compressedLength = curve.getAffinePointEncodingLength(true);
      const uncompressedLength = curve.getAffinePointEncodingLength(false);
      
      expect(compressedLength).toBe(3);   // 1 + 2 bytes
      expect(uncompressedLength).toBe(5); // 1 + 2*2 bytes
    });
  });

  describe('Point Normalization', () => {
    it('should normalize single points', () => {
      const G = curve.validatePoint(1n, 5n);
      const twoG = G.twice(); // This creates non-normalized point
      
      expect(twoG.isNormalized()).toBe(false);
      
      const normalized = twoG.normalize();
      expect(normalized.isNormalized()).toBe(true);
      expect(normalized.getAffineXCoord().toBigInteger()).toBe(817n);
    });

    it('should normalize arrays of points', () => {
      const G = curve.validatePoint(1n, 5n);
      const points = [
        G.twice(),      // 2*G
        G.add(G.twice()), // 3*G
        G.twice().twice() // 4*G
      ];

      // Before normalization
      points.forEach(p => expect(p.isNormalized()).toBe(false));

      curve.normalizeAll(points);

      // After normalization
      points.forEach(p => expect(p.isNormalized()).toBe(true));
      expect(points[0].getAffineXCoord().toBigInteger()).toBe(817n); // 2*G
      expect(points[1].getAffineXCoord().toBigInteger()).toBe(54n);  // 3*G
      expect(points[2].getAffineXCoord().toBigInteger()).toBe(229n); // 4*G
    });
  });

  describe('Curve Cloning', () => {
    it('should clone curve with same parameters', () => {
      // Access protected method through any
      const cloned = (curve as any).cloneCurve() as ECCurveFp;
      
      expect(cloned.getQ()).toBe(curve.getQ());
      expect(cloned.getA().toBigInteger()).toBe(curve.getA().toBigInteger());
      expect(cloned.getB().toBigInteger()).toBe(curve.getB().toBigInteger());
      expect(cloned.getOrder()).toBe(curve.getOrder());
      expect(cloned.getCofactor()).toBe(curve.getCofactor());
      expect(cloned.getCoordinateSystem()).toBe(curve.getCoordinateSystem());
    });

    it('should create independent curve instance', () => {
      const cloned = (curve as any).cloneCurve() as ECCurveFp;
      expect(cloned).not.toBe(curve);
      
      // Points should be independent
      const G1 = curve.validatePoint(1n, 5n);
      const G2 = cloned.validatePoint(1n, 5n);
      expect(G1).not.toBe(G2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle large field values', () => {
      const largeCurve = new ECCurveFp(2n ** 256n - 2n ** 224n + 2n ** 192n + 2n ** 96n - 1n, 0n, 7n);
      expect(largeCurve.getFieldSize()).toBeGreaterThan(200);
    });

    it('should handle zero and one parameters', () => {
      const zeroCurve = new ECCurveFp(p, 0n, 0n);
      expect(zeroCurve.getA().isZero()).toBe(true);
      expect(zeroCurve.getB().isZero()).toBe(true);

      const oneCurve = new ECCurveFp(p, 1n, 1n);
      expect(oneCurve.getA().isOne()).toBe(true);
      expect(oneCurve.getB().isOne()).toBe(true);
    });

    it('should handle invalid coordinates gracefully', () => {
      expect(() => {
        curve.validatePoint(1n, 100n); // Invalid point
      }).toThrow();
    });

    it('should handle boundary field values', () => {
      expect(curve.isValidFieldElement(0n)).toBe(true);
      expect(curve.isValidFieldElement(p - 1n)).toBe(true);
      expect(curve.isValidFieldElement(p)).toBe(false);
    });
  });

  describe('Consistency Checks', () => {
    it('should maintain curve equation for all operations', () => {
      const G = curve.validatePoint(1n, 5n);
      
      // Test various point operations maintain validity
      const operations = [
        G.twice(),
        G.add(G),
        G.multiply(3n),
        G.multiply(5n),
        G.negate(),
        G.timesPow2(2)
      ];

      operations.forEach(point => {
        if (!point.isInfinity()) {
          expect(point.isValid()).toBe(true);
        }
      });
    });

    it('should have consistent field operations', () => {
      const x = 123n;
      const y = 456n;
      
      const elem1 = curve.fromBigInteger(x);
      const elem2 = curve.fromBigInteger(y);
      
      // Test field operations consistency
      const sum = elem1.add(elem2);
      const diff = sum.subtract(elem2);
      expect(diff.toBigInteger()).toBe(x);
      
      const prod = elem1.multiply(elem2);
      const quot = prod.divide(elem2);
      expect(quot.toBigInteger()).toBe(x);
    });
  });
});