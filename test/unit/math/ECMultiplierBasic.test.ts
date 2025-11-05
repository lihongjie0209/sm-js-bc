import { describe, it, expect, beforeEach } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { SimpleECMultiplier, FixedPointCombMultiplier } from '../../../src/math/ec/ECMultiplier';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('ECMultiplier Basic Tests', () => {
  // Test curve: y² = x³ + 4x + 20 over F_1063
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  
  let curve: ECCurveFp;
  let G: any; // ECPoint
  let simpleMultiplier: SimpleECMultiplier;
  let fixedPointMultiplier: FixedPointCombMultiplier;

  // Helper function to normalize a point and get affine coordinates
  function normalizePoint(point: any): { x: bigint; y: bigint } {
    if (point.isInfinity()) {
      throw new Error('Cannot get affine coordinates of infinity point');
    }
    const normalized = point.normalize();
    return {
      x: normalized.getAffineXCoord().toBigInteger(),
      y: normalized.getAffineYCoord().toBigInteger()
    };
  }

  beforeEach(() => {
    curve = new ECCurveFp(p, a, b);
    G = curve.validatePoint(1n, 5n);
    simpleMultiplier = new SimpleECMultiplier();
    fixedPointMultiplier = new FixedPointCombMultiplier();
  });

  describe('SimpleECMultiplier', () => {
    it('should multiply by zero', () => {
      const result = simpleMultiplier.multiply(G, 0n);
      expect(result.isInfinity()).toBe(true);
    });

    it('should multiply by one', () => {
      const result = simpleMultiplier.multiply(G, 1n);
      const coords = normalizePoint(result);
      expect(coords.x).toBe(1n);
      expect(coords.y).toBe(5n);
    });

    it('should multiply by two', () => {
      const result = simpleMultiplier.multiply(G, 2n);
      const coords = normalizePoint(result);
      expect(coords.x).toBe(817n);
      expect(coords.y).toBe(912n);
    });

    it('should handle small positive integers', () => {
      const testCases = [
        { k: 3n, expectedX: 54n, expectedY: 521n },
        { k: 5n, expectedX: 1010n, expectedY: 399n },
        { k: 10n, expectedX: 249n, expectedY: 649n }
      ];

      for (const { k, expectedX, expectedY } of testCases) {
        const result = simpleMultiplier.multiply(G, k);
        const coords = normalizePoint(result);
        expect(coords.x).toBe(expectedX);
        expect(coords.y).toBe(expectedY);
      }
    });

    it('should handle negative scalars', () => {
      const result2 = simpleMultiplier.multiply(G, 2n);
      const resultNeg2 = simpleMultiplier.multiply(G, -2n);
      
      // -2*G should be the negation of 2*G
      const expected = result2.negate();
      const resultCoords = normalizePoint(resultNeg2);
      const expectedCoords = normalizePoint(expected);
      expect(resultCoords.x).toBe(expectedCoords.x);
      expect(resultCoords.y).toBe(expectedCoords.y);
    });

    it('should handle large positive scalars', () => {
      const largeK = 12345n;
      const result = simpleMultiplier.multiply(G, largeK);
      expect(result.isInfinity()).toBe(false);
      expect(result.isValid()).toBe(true);
    });

    it('should multiply infinity point', () => {
      const infinity = curve.getInfinity() as any;
      const result = simpleMultiplier.multiply(infinity, 123n);
      expect(result.isInfinity()).toBe(true);
    });
  });

  describe('FixedPointCombMultiplier', () => {
    it('should multiply by zero', () => {
      const result = fixedPointMultiplier.multiply(G, 0n);
      expect(result.isInfinity()).toBe(true);
    });

    it('should multiply by one', () => {
      const result = fixedPointMultiplier.multiply(G, 1n);
      const coords = normalizePoint(result);
      expect(coords.x).toBe(1n);
      expect(coords.y).toBe(5n);
    });

    it('should multiply by two', () => {
      const result = fixedPointMultiplier.multiply(G, 2n);
      const coords = normalizePoint(result);
      expect(coords.x).toBe(817n);
      expect(coords.y).toBe(912n);
    });

    it('should match SimpleECMultiplier for small values', () => {
      for (let k = 0n; k <= 10n; k++) {
        const simpleResult = simpleMultiplier.multiply(G, k);
        const fixedResult = fixedPointMultiplier.multiply(G, k);

        if (simpleResult.isInfinity()) {
          expect(fixedResult.isInfinity()).toBe(true);
        } else {
          const simpleCoords = normalizePoint(simpleResult);
          const fixedCoords = normalizePoint(fixedResult);
          expect(fixedCoords.x).toBe(simpleCoords.x);
          expect(fixedCoords.y).toBe(simpleCoords.y);
        }
      }
    });

    it('should handle negative scalars', () => {
      const result2 = fixedPointMultiplier.multiply(G, 2n);
      const resultNeg2 = fixedPointMultiplier.multiply(G, -2n);
      
      // -2*G should be the negation of 2*G
      const expected = result2.negate();
      const resultCoords = normalizePoint(resultNeg2);
      const expectedCoords = normalizePoint(expected);
      expect(resultCoords.x).toBe(expectedCoords.x);
      expect(resultCoords.y).toBe(expectedCoords.y);
    });

    it('should handle moderately large scalars', () => {
      const testCases = [100n, 256n, 1000n];
      
      for (const k of testCases) {
        const simpleResult = simpleMultiplier.multiply(G, k);
        const fixedResult = fixedPointMultiplier.multiply(G, k);
        
        if (simpleResult.isInfinity()) {
          expect(fixedResult.isInfinity()).toBe(true);
        } else {
          const simpleCoords = normalizePoint(simpleResult);
          const fixedCoords = normalizePoint(fixedResult);
          expect(fixedCoords.x).toBe(simpleCoords.x);
          expect(fixedCoords.y).toBe(simpleCoords.y);
        }
      }
    });

    it('should handle first multiplication (triggers precomputation)', () => {
      const freshPoint = curve.validatePoint(1n, 5n) as any;
      const result = fixedPointMultiplier.multiply(freshPoint, 5n);
      
      expect(result.isValid()).toBe(true);
      const coords = normalizePoint(result);
      expect(coords.x).toBe(1010n);
    });

    it('should multiply infinity point', () => {
      const infinity = curve.getInfinity() as any;
      const result = fixedPointMultiplier.multiply(infinity, 123n);
      expect(result.isInfinity()).toBe(true);
    });

    it('should throw on oversized scalars', () => {
      const oversizedK = 1n << 20n; // Much larger than field size
      
      expect(() => {
        fixedPointMultiplier.multiply(G, oversizedK);
      }).toThrow("fixed-point comb doesn't support scalars larger than the curve order");
    });
  });

  describe('Multiplier Consistency', () => {
    it('should produce identical results for range of scalars', () => {
      const testScalars = [
        0n, 1n, 2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 
        31n, 42n, 64n, 100n, 127n, 128n, 255n, 256n, 500n, 1000n
      ];

      for (const k of testScalars) {
        const simpleResult = simpleMultiplier.multiply(G, k);
        const fixedResult = fixedPointMultiplier.multiply(G, k);

        if (simpleResult.isInfinity()) {
          expect(fixedResult.isInfinity()).toBe(true);
        } else {
          const simpleCoords = normalizePoint(simpleResult);
          const fixedCoords = normalizePoint(fixedResult);
          expect(fixedCoords.x).toBe(simpleCoords.x);
          expect(fixedCoords.y).toBe(simpleCoords.y);
        }
      }
    });

    it('should handle repeated multiplications', () => {
      const k = 123n;
      
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = fixedPointMultiplier.multiply(G, k);
        expect(result.isValid()).toBe(true);
        results.push(normalizePoint(result));
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].x).toBe(results[0].x);
        expect(results[i].y).toBe(results[0].y);
      }
    });

    it('should satisfy distributive property: k*(P+Q) = k*P + k*Q', () => {
      const P = G;
      const Q = simpleMultiplier.multiply(G, 2n); // 2*G
      const k = 3n;

      const left = simpleMultiplier.multiply(P.add(Q), k);
      const right = simpleMultiplier.multiply(P, k).add(simpleMultiplier.multiply(Q, k));

      const leftCoords = normalizePoint(left);
      const rightCoords = normalizePoint(right);
      expect(leftCoords.x).toBe(rightCoords.x);
      expect(leftCoords.y).toBe(rightCoords.y);
    });

    it('should satisfy associative property: (a*b)*P = a*(b*P)', () => {
      const a = 3n;
      const b = 5n;
      const P = G;

      const left = simpleMultiplier.multiply(P, a * b);
      const right = simpleMultiplier.multiply(simpleMultiplier.multiply(P, b), a);

      const leftCoords = normalizePoint(left);
      const rightCoords = normalizePoint(right);
      expect(leftCoords.x).toBe(rightCoords.x);
      expect(leftCoords.y).toBe(rightCoords.y);
    });
  });
});