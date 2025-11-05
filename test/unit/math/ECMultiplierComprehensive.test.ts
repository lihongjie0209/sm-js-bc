import { describe, it, expect, beforeEach } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { SimpleECMultiplier, FixedPointCombMultiplier } from '../../../src/math/ec/ECMultiplier';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('ECMultiplier Comprehensive Tests', () => {
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
    describe('Basic Operations', () => {
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

      it('should multiply by small positive integers', () => {
        const testCases = [
          { k: 1n, expectedX: 1n, expectedY: 5n },
          { k: 2n, expectedX: 817n, expectedY: 912n },
          { k: 3n, expectedX: 54n, expectedY: 521n },
          { k: 4n, expectedX: 229n, expectedY: 884n },
          { k: 5n, expectedX: 1010n, expectedY: 399n },
          { k: 6n, expectedX: 340n, expectedY: 933n },
          { k: 7n, expectedX: 796n, expectedY: 321n },
          { k: 8n, expectedX: 1001n, expectedY: 714n },
          { k: 9n, expectedX: 1023n, expectedY: 276n },
          { k: 10n, expectedX: 249n, expectedY: 649n }
        ];

        for (const { k, expectedX, expectedY } of testCases) {
          const result = simpleMultiplier.multiply(G, k);
          const coords = normalizePoint(result);
          expect(coords.x).toBe(expectedX);
          expect(coords.y).toBe(expectedY);
          expect(result.isValid()).toBe(true);
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

      it('should multiply infinity point', () => {
        const infinity = curve.getInfinity() as any;
        const result = simpleMultiplier.multiply(infinity, 123n);
        expect(result.isInfinity()).toBe(true);
      });
    });

    describe('Large Scalars', () => {
      it('should handle large positive scalars', () => {
        const largeK = 12345n;
        const result = simpleMultiplier.multiply(G, largeK);
        expect(result.isInfinity()).toBe(false);
        expect(result.isValid()).toBe(true);
      });

      it('should handle large negative scalars', () => {
        const largeK = -98765n;
        const result = simpleMultiplier.multiply(G, largeK);
        expect(result.isInfinity()).toBe(false);
        expect(result.isValid()).toBe(true);
      });

      it('should handle powers of 2', () => {
        for (let i = 0; i < 10; i++) {
          const k = 1n << BigInt(i); // 2^i
          const result = simpleMultiplier.multiply(G, k);
          expect(result.isValid()).toBe(true);
        }
      });

      it('should handle maximum field size scalars', () => {
        const maxK = (1n << BigInt(curve.getFieldSize())) - 1n;
        const result = simpleMultiplier.multiply(G, maxK);
        expect(result.isValid()).toBe(true);
      });
    });

    describe('Algebraic Properties', () => {
      it('should be distributive: k*(P+Q) = k*P + k*Q', () => {
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

      it('should be associative: (a*b)*P = a*(b*P)', () => {
        const a = 3n;
        const b = 5n;
        const P = G;

        const left = simpleMultiplier.multiply(P, a * b).normalize();
        const right = simpleMultiplier.multiply(simpleMultiplier.multiply(P, b), a).normalize();

        expect(left.getAffineXCoord().toBigInteger()).toBe(right.getAffineXCoord().toBigInteger());
        expect(left.getAffineYCoord().toBigInteger()).toBe(right.getAffineYCoord().toBigInteger());
      });

      it('should satisfy additive property: (a+b)*P = a*P + b*P', () => {
        const a = 7n;
        const b = 11n;
        const P = G;

        const left = simpleMultiplier.multiply(P, a + b).normalize();
        const right = simpleMultiplier.multiply(P, a).add(simpleMultiplier.multiply(P, b)).normalize();

        expect(left.getAffineXCoord().toBigInteger()).toBe(right.getAffineXCoord().toBigInteger());
        expect(left.getAffineYCoord().toBigInteger()).toBe(right.getAffineYCoord().toBigInteger());
      });
    });
  });

  describe('FixedPointCombMultiplier', () => {
    describe('Basic Operations', () => {
      it('should multiply by zero', () => {
        const result = fixedPointMultiplier.multiply(G, 0n);
        expect(result.isInfinity()).toBe(true);
      });

      it('should multiply by one', () => {
        const result = fixedPointMultiplier.multiply(G, 1n).normalize();
        expect(result.getAffineXCoord().toBigInteger()).toBe(1n);
        expect(result.getAffineYCoord().toBigInteger()).toBe(5n);
      });

      it('should multiply by two', () => {
        const result = fixedPointMultiplier.multiply(G, 2n).normalize();
        expect(result.getAffineXCoord().toBigInteger()).toBe(817n);
        expect(result.getAffineYCoord().toBigInteger()).toBe(912n);
      });

      it('should match SimpleECMultiplier for small values', () => {
        for (let k = 0n; k <= 20n; k++) {
          const simpleResult = simpleMultiplier.multiply(G, k).normalize();
          const fixedResult = fixedPointMultiplier.multiply(G, k).normalize();

          if (simpleResult.isInfinity()) {
            expect(fixedResult.isInfinity()).toBe(true);
          } else {
            expect(fixedResult.getAffineXCoord().toBigInteger()).toBe(simpleResult.getAffineXCoord().toBigInteger());
            expect(fixedResult.getAffineYCoord().toBigInteger()).toBe(simpleResult.getAffineYCoord().toBigInteger());
          }
        }
      });

      it('should handle negative scalars', () => {
        const result2 = fixedPointMultiplier.multiply(G, 2n).normalize();
        const resultNeg2 = fixedPointMultiplier.multiply(G, -2n).normalize();
        
        // -2*G should be the negation of 2*G
        const expected = result2.negate().normalize();
        expect(resultNeg2.getAffineXCoord().toBigInteger()).toBe(expected.getAffineXCoord().toBigInteger());
        expect(resultNeg2.getAffineYCoord().toBigInteger()).toBe(expected.getAffineYCoord().toBigInteger());
      });

      it('should multiply infinity point', () => {
        const infinity = curve.getInfinity() as any;
        const result = fixedPointMultiplier.multiply(infinity, 123n);
        expect(result.isInfinity()).toBe(true);
      });
    });

    describe('Precomputation', () => {
      it('should handle first multiplication (triggers precomputation)', () => {
        const freshPoint = curve.validatePoint(1n, 5n) as any;
        const result = fixedPointMultiplier.multiply(freshPoint, 5n).normalize();
        
        expect(result.isValid()).toBe(true);
        expect(result.getAffineXCoord().toBigInteger()).toBe(1010n);
      });

      it('should reuse precomputation on subsequent calls', () => {
        // First call - triggers precomputation
        const result1 = fixedPointMultiplier.multiply(G, 3n).normalize();
        
        // Second call - should reuse precomputation
        const result2 = fixedPointMultiplier.multiply(G, 7n).normalize();
        
        expect(result1.getAffineXCoord().toBigInteger()).toBe(54n);
        expect(result2.getAffineXCoord().toBigInteger()).toBe(796n);
      });
    });

    describe('Large Scalars', () => {
      it('should handle moderately large scalars', () => {
        const testCases = [100n, 256n, 1000n, 2047n];
        
        for (const k of testCases) {
          const simpleResult = simpleMultiplier.multiply(G, k).normalize();
          const fixedResult = fixedPointMultiplier.multiply(G, k).normalize();
          
          if (simpleResult.isInfinity()) {
            expect(fixedResult.isInfinity()).toBe(true);
          } else {
            expect(fixedResult.getAffineXCoord().toBigInteger()).toBe(simpleResult.getAffineXCoord().toBigInteger());
            expect(fixedResult.getAffineYCoord().toBigInteger()).toBe(simpleResult.getAffineYCoord().toBigInteger());
          }
        }
      });

      it('should handle maximum supported scalar size', () => {
        // The fixed-point multiplier should handle scalars up to combSize
        const maxK = (1n << 12n) - 1n; // 2^12 - 1 (combSize for this curve is 12)
        
        const result = fixedPointMultiplier.multiply(G, maxK).normalize();
        expect(result.isValid()).toBe(true);
      });

      it('should throw on oversized scalars', () => {
        const oversizedK = 1n << 20n; // Much larger than field size
        
        expect(() => {
          fixedPointMultiplier.multiply(G, oversizedK);
        }).toThrow("fixed-point comb doesn't support scalars larger than the curve order");
      });
    });

    describe('Edge Cases', () => {
      it('should handle bit boundary cases', () => {
        const testCases = [
          (1n << 7n) - 1n,  // 127
          1n << 7n,         // 128
          (1n << 8n) - 1n,  // 255
          1n << 8n,         // 256
          (1n << 10n) - 1n, // 1023
          1n << 10n,        // 1024
        ];

        for (const k of testCases) {
          const simpleResult = simpleMultiplier.multiply(G, k).normalize();
          const fixedResult = fixedPointMultiplier.multiply(G, k).normalize();
          
          if (simpleResult.isInfinity()) {
            expect(fixedResult.isInfinity()).toBe(true);
          } else {
            expect(fixedResult.getAffineXCoord().toBigInteger()).toBe(simpleResult.getAffineXCoord().toBigInteger());
            expect(fixedResult.getAffineYCoord().toBigInteger()).toBe(simpleResult.getAffineYCoord().toBigInteger());
          }
        }
      });

      it('should handle powers of 2', () => {
        for (let i = 0; i < 11; i++) { // Up to 2^10
          const k = 1n << BigInt(i);
          const simpleResult = simpleMultiplier.multiply(G, k).normalize();
          const fixedResult = fixedPointMultiplier.multiply(G, k).normalize();
          
          if (simpleResult.isInfinity()) {
            expect(fixedResult.isInfinity()).toBe(true);
          } else {
            expect(fixedResult.getAffineXCoord().toBigInteger()).toBe(simpleResult.getAffineXCoord().toBigInteger());
            expect(fixedResult.getAffineYCoord().toBigInteger()).toBe(simpleResult.getAffineYCoord().toBigInteger());
          }
        }
      });

      it('should handle odd and even scalars consistently', () => {
        const testPairs = [
          [99n, 100n],
          [255n, 256n],
          [511n, 512n],
          [1023n, 1024n]
        ];

        for (const [odd, even] of testPairs) {
          const oddResult = fixedPointMultiplier.multiply(G, odd).normalize();
          const evenResult = fixedPointMultiplier.multiply(G, even).normalize();
          
          expect(oddResult.isValid()).toBe(true);
          expect(evenResult.isValid()).toBe(true);
          
          // odd + 1 = even, so even*G = odd*G + G
          const computed = oddResult.add(G).normalize();
          expect(evenResult.getAffineXCoord().toBigInteger()).toBe(computed.getAffineXCoord().toBigInteger());
        }
      });
    });
  });

  describe('Multiplier Comparison', () => {
    it('should produce identical results for range of scalars', () => {
      const testScalars = [
        0n, 1n, 2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 
        31n, 42n, 64n, 100n, 127n, 128n, 255n, 256n, 500n, 1000n
      ];

      for (const k of testScalars) {
        const simpleResult = simpleMultiplier.multiply(G, k).normalize();
        const fixedResult = fixedPointMultiplier.multiply(G, k).normalize();

        if (simpleResult.isInfinity()) {
          expect(fixedResult.isInfinity()).toBe(true);
        } else {
          expect(fixedResult.getAffineXCoord().toBigInteger()).toBe(simpleResult.getAffineXCoord().toBigInteger());
          expect(fixedResult.getAffineYCoord().toBigInteger()).toBe(simpleResult.getAffineYCoord().toBigInteger());
        }
      }
    });

    it('should handle same point with different multipliers', () => {
      const P = curve.validatePoint(1n, 5n) as any;
      const k = 42n;

      const result1 = simpleMultiplier.multiply(P, k).normalize();
      const result2 = fixedPointMultiplier.multiply(P, k).normalize();

      expect(result1.getAffineXCoord().toBigInteger()).toBe(result2.getAffineXCoord().toBigInteger());
      expect(result1.getAffineYCoord().toBigInteger()).toBe(result2.getAffineYCoord().toBigInteger());
    });

    it('should handle different points with same scalar', () => {
      const P1 = G;
      const P2 = simpleMultiplier.multiply(G, 3n).normalize(); // Different point
      const k = 7n;

      const simple1 = simpleMultiplier.multiply(P1, k).normalize();
      const simple2 = simpleMultiplier.multiply(P2, k).normalize();
      const fixed1 = fixedPointMultiplier.multiply(P1, k).normalize();
      const fixed2 = fixedPointMultiplier.multiply(P2, k).normalize();

      expect(simple1.getAffineXCoord().toBigInteger()).toBe(fixed1.getAffineXCoord().toBigInteger());
      expect(simple2.getAffineXCoord().toBigInteger()).toBe(fixed2.getAffineXCoord().toBigInteger());
    });
  });

  describe('Performance and Robustness', () => {
    it('should handle repeated multiplications', () => {
      const k = 123n;
      
      for (let i = 0; i < 10; i++) {
        const result = fixedPointMultiplier.multiply(G, k).normalize();
        expect(result.isValid()).toBe(true);
        
        // All results should be identical
        if (i === 0) {
          var firstResult = result;
        } else {
          expect(result.getAffineXCoord().toBigInteger()).toBe(firstResult!.getAffineXCoord().toBigInteger());
        }
      }
    });

    it('should handle alternating multiplications', () => {
      const scalars = [7n, 13n, 21n, 9n, 15n];
      
      for (const k of scalars) {
        const simpleResult = simpleMultiplier.multiply(G, k).normalize();
        const fixedResult = fixedPointMultiplier.multiply(G, k).normalize();
        
        expect(simpleResult.getAffineXCoord().toBigInteger()).toBe(fixedResult.getAffineXCoord().toBigInteger());
      }
    });

    it('should maintain state correctly across operations', () => {
      // Perform various operations that might affect internal state
      fixedPointMultiplier.multiply(G, 1n);
      fixedPointMultiplier.multiply(G, 100n);
      fixedPointMultiplier.multiply(G, 0n);
      
      // Verify basic operation still works
      const result = fixedPointMultiplier.multiply(G, 5n).normalize();
      expect(result.getAffineXCoord().toBigInteger()).toBe(1010n);
    });
  });
});