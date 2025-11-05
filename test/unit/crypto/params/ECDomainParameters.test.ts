import { describe, it, expect } from 'vitest';
import { ECDomainParameters } from '../../../../src/crypto/params/ECDomainParameters';
import { SM2 } from '../../../../src/crypto/SM2';
// Import ECPoint to trigger factory registration
import '../../../../src/math/ec/ECPoint';

describe('ECDomainParameters', () => {
  // Use SM2 standard parameters for testing
  const sm2Params = SM2.getParameters();
  const curve = sm2Params.getCurve();
  const G = sm2Params.getG();
  const n = sm2Params.getN();
  const h = sm2Params.getH();

  it('should create domain parameters correctly', () => {
    const params = new ECDomainParameters(curve, G, n, h);
    
    expect(params.getCurve()).toBe(curve);
    expect(params.getG()).toBe(G);
    expect(params.getN()).toBe(n);
    expect(params.getH()).toBe(h);
    expect(params.getSeed()).toBeNull();
  });

  it('should create domain parameters with default h value', () => {
    const params = new ECDomainParameters(curve, G, n);
    
    expect(params.getH()).toBe(1n);
  });

  it('should create domain parameters with seed', () => {
    const seed = new Uint8Array([1, 2, 3, 4, 5]);
    const params = new ECDomainParameters(curve, G, n, h, seed);
    
    expect(params.getSeed()).toEqual(seed);
  });

  it('should test equality correctly', () => {
    const params1 = new ECDomainParameters(curve, G, n, h);
    const params2 = new ECDomainParameters(curve, G, n, h);
    const params3 = new ECDomainParameters(curve, G, n, 2n);  // Different h
    
    expect(params1.equals(params2)).toBe(true);
    expect(params1.equals(params3)).toBe(false);
    expect(params1.equals(null)).toBe(false);
    expect(params1.equals("not a parameters")).toBe(false);
  });

  it('should compute hashCode consistently', () => {
    const params1 = new ECDomainParameters(curve, G, n, h);
    const params2 = new ECDomainParameters(curve, G, n, h);
    
    expect(params1.hashCode()).toBe(params2.hashCode());
  });

  it('should create SM2 domain parameters', () => {
    // SM2 standard curve parameters
    const sm2Params = new ECDomainParameters(curve, G, n, h);
    
    expect(sm2Params.getCurve().getFieldSize()).toBe(256);
    expect(sm2Params.getN()).toBe(n);
    expect(sm2Params.getH()).toBe(1n);
  });

  it('should handle large parameter values', () => {
    const largeN = 2n ** 256n - 1n;
    const params = new ECDomainParameters(curve, G, largeN, h);
    
    expect(params.getN()).toBe(largeN);
  });

  it('should provide getters for all parameters', () => {
    const params = sm2Params;
    
    expect(params.getCurve()).toBeDefined();
    expect(params.getG()).toBeDefined();
    expect(params.getN()).toBeTypeOf('bigint');
    expect(params.getH()).toBeTypeOf('bigint');
    expect(params.getH()).toBe(1n);
  });
});