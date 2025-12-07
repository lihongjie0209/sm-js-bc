import { describe, it, expect } from 'vitest';
import { SM9Pairing } from '../../../../src/math/ec/SM9Pairing';
import { SM9Parameters } from '../../../../src/crypto/params/SM9Parameters';
import { ECPointFp2 } from '../../../../src/math/ec/ECPointFp2';
import { Fp2Element } from '../../../../src/math/ec/Fp2Element';
import { Fp12Element } from '../../../../src/math/ec/Fp12Element';
// Import ECPoint to ensure factory registration
import '../../../../src/math/ec/ECPoint';

describe('SM9Pairing', () => {
  const p = SM9Parameters.P;
  const pairing = new SM9Pairing();

  it('should create pairing engine', () => {
    expect(pairing).toBeDefined();
  });

  it('should return identity for pairing with infinity', () => {
    const P = SM9Parameters.getP1();
    const Q = SM9Parameters.getP2();
    const infinityFp = P.getCurve().getInfinity();
    
    const result = pairing.pairing(infinityFp, Q);
    const identity = Fp12Element.one(p);
    
    expect(result.equals(identity)).toBe(true);
  });

  it('should compute pairing of generators', () => {
    const P1 = SM9Parameters.getP1();
    const P2 = SM9Parameters.getP2();
    
    const result = pairing.pairing(P1, P2);
    
    // Result should be in GT (not identity for non-trivial pairing)
    expect(result).toBeDefined();
    expect(result.equals(Fp12Element.one(p))).toBe(false);
  });

  it('should satisfy bilinearity: e(aP, Q) = e(P, Q)^a', () => {
    const P = SM9Parameters.getP1();
    const Q = SM9Parameters.getP2();
    const a = 3n;
    
    const aP = P.multiply(a);
    const left = pairing.pairing(aP, Q);
    
    const ePQ = pairing.pairing(P, Q);
    const right = ePQ.pow(a);
    
    expect(left.equals(right)).toBe(true);
  });

  it('should satisfy bilinearity: e(P, aQ) = e(P, Q)^a', () => {
    const P = SM9Parameters.getP1();
    const Q = SM9Parameters.getP2();
    const a = 5n;
    
    const aQ = Q.multiply(a);
    const left = pairing.pairing(P, aQ);
    
    const ePQ = pairing.pairing(P, Q);
    const right = ePQ.pow(a);
    
    expect(left.equals(right)).toBe(true);
  });

  it('should satisfy bilinearity: e(P1+P2, Q) = e(P1,Q) * e(P2,Q)', () => {
    const P1 = SM9Parameters.getP1();
    const P2 = P1.twice();
    const Q = SM9Parameters.getP2();
    
    const P1plusP2 = P1.add(P2);
    const left = pairing.pairing(P1plusP2, Q);
    
    const eP1Q = pairing.pairing(P1, Q);
    const eP2Q = pairing.pairing(P2, Q);
    const right = eP1Q.multiply(eP2Q);
    
    expect(left.equals(right)).toBe(true);
  });

  it('should satisfy bilinearity: e(P, Q1+Q2) = e(P,Q1) * e(P,Q2)', () => {
    const P = SM9Parameters.getP1();
    const Q1 = SM9Parameters.getP2();
    const Q2 = Q1.twice();
    
    const Q1plusQ2 = Q1.add(Q2);
    const left = pairing.pairing(P, Q1plusQ2);
    
    const ePQ1 = pairing.pairing(P, Q1);
    const ePQ2 = pairing.pairing(P, Q2);
    const right = ePQ1.multiply(ePQ2);
    
    expect(left.equals(right)).toBe(true);
  });

  it('should verify non-degeneracy', () => {
    const P = SM9Parameters.getP1();
    const Q = SM9Parameters.getP2();
    
    const result = pairing.pairing(P, Q);
    const identity = Fp12Element.one(p);
    
    // Pairing should be non-degenerate (not identity for generators)
    expect(result.equals(identity)).toBe(false);
  });

  it('should be consistent for same inputs', () => {
    const P = SM9Parameters.getP1();
    const Q = SM9Parameters.getP2();
    
    const result1 = pairing.pairing(P, Q);
    const result2 = pairing.pairing(P, Q);
    
    expect(result1.equals(result2)).toBe(true);
  });

  it('should verify e(P, Q)^n = identity for n = curve order', () => {
    const P = SM9Parameters.getP1();
    const Q = SM9Parameters.getP2();
    const n = SM9Parameters.N;
    
    const ePQ = pairing.pairing(P, Q);
    const result = ePQ.pow(n);
    const identity = Fp12Element.one(p);
    
    // By Lagrange's theorem, g^n = 1 where n is the group order
    expect(result.equals(identity)).toBe(true);
  });

  it('should use verifyBilinearity helper', () => {
    const P = SM9Parameters.getP1();
    const Q = SM9Parameters.getP2();
    const a = 7n;
    
    const result = pairing.verifyBilinearity(P, Q, a);
    expect(result).toBe(true);
  });
});
