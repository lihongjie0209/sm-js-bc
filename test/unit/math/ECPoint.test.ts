import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('ECPoint Basic Operations', () => {
  // Use test curve from bc-java ECPointTest.java:
  // y² = x³ + 4x + 20 over F_1063
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);

  // Test points from bc-java (verified to be on curve)
  const P1 = curve.validatePoint(1n, 5n);
  const P2 = curve.validatePoint(4n, 10n);

  describe('Point validation', () => {
    it('should validate points on curve', () => {
      expect(P1.isValid()).toBe(true);
      expect(P2.isValid()).toBe(true);
    });

    it('should recognize infinity', () => {
      const inf = curve.getInfinity();
      expect(inf.isInfinity()).toBe(true);
      expect(inf.isValid()).toBe(true);
    });
  });

  describe('Point doubling (twice)', () => {
    it('should compute 2*P correctly', () => {
      const P = P1;
      const twoP = P.twice();
      
      expect(twoP.isInfinity()).toBe(false);
      expect(twoP.isValid()).toBe(true);
      
      // Verify by computing P + P
      const P_plus_P = P.add(P);
      expect(twoP.normalize().equals(P_plus_P.normalize())).toBe(true);
    });

    it('should handle infinity', () => {
      const inf = curve.getInfinity();
      const result = inf.twice();
      expect(result.isInfinity()).toBe(true);
    });
  });

  describe('Point addition', () => {
    it('should compute P1 + P2 correctly', () => {
      const result = P1.add(P2);
      expect(result.isInfinity()).toBe(false);
      expect(result.isValid()).toBe(true);
    });

    it('should be commutative: P1 + P2 = P2 + P1', () => {
      const r1 = P1.add(P2);
      const r2 = P2.add(P1);
      expect(r1.normalize().equals(r2.normalize())).toBe(true);
    });

    it('should handle P + infinity = P', () => {
      const inf = curve.getInfinity();
      const result = P1.add(inf);
      expect(result.normalize().equals(P1.normalize())).toBe(true);
    });

    it('should handle infinity + P = P', () => {
      const inf = curve.getInfinity();
      const result = inf.add(P1);
      expect(result.normalize().equals(P1.normalize())).toBe(true);
    });

    it('should handle P + (-P) = infinity', () => {
      const P = P1;
      const negP = P.negate();
      const result = P.add(negP);
      expect(result.isInfinity()).toBe(true);
    });
  });

  describe('Point negation', () => {
    it('should compute -P correctly', () => {
      const P = P1;
      const negP = P.negate();
      
      expect(negP.isInfinity()).toBe(false);
      expect(negP.isValid()).toBe(true);
      
      // Verify x coordinate is same, y is negated
      const Pnorm = P.normalize();
      const negPnorm = negP.normalize();
      expect(negPnorm.getXCoord().toBigInteger()).toBe(Pnorm.getXCoord().toBigInteger());
      expect(negPnorm.getYCoord().toBigInteger()).toBe((p - Pnorm.getYCoord().toBigInteger()) % p);
    });
  });

  describe('Point encoding/decoding', () => {
    it('should encode/decode uncompressed point correctly', () => {
      const P = P1;
      const encoded = P.getEncoded(false);
      
      // Should start with 0x04 for uncompressed
      expect(encoded[0]).toBe(0x04);
      
      const decoded = curve.decodePoint(encoded);
      expect(decoded.normalize().equals(P.normalize())).toBe(true);
    });

    it('should encode infinity as single 0x00 byte', () => {
      const inf = curve.getInfinity();
      const encoded = inf.getEncoded(false);
      
      expect(encoded.length).toBe(1);
      expect(encoded[0]).toBe(0x00);
      
      const decoded = curve.decodePoint(encoded);
      expect(decoded.isInfinity()).toBe(true);
    });
  });

  describe('Point normalization', () => {
    it('should normalize point to affine coordinates', () => {
      const P = P1;
      const normed = P.normalize();
      
      expect(normed.isValid()).toBe(true);
      expect(normed.isNormalized()).toBe(true);
    });

    it('should be idempotent: normalize(normalize(P)) = normalize(P)', () => {
      const P = P1;
      const normed1 = P.normalize();
      const normed2 = normed1.normalize();
      
      expect(normed2.equals(normed1)).toBe(true);
    });
  });
});
