import { describe, it, expect } from 'vitest';
import { SM2 } from '../../../src/crypto/SM2';
import { FixedPointCombMultiplier } from '../../../src/math/ec/ECMultiplier';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('FixedPointCombMultiplier Debug', () => {
  it('should multiply generator point correctly', () => {
    const domainParams = SM2.getParameters();
    const G = domainParams.getG();
    const n = domainParams.getN();

    console.log('Generator point:', G.getEncoded(false).length, 'bytes');
    console.log('First byte:', G.getEncoded(false)[0].toString(16));
    
    // Test with multiplier
    const multiplier = new FixedPointCombMultiplier();
    const k = 12345678901234567890n;
    const result = multiplier.multiply(G, k);
    
    console.log('Result point:', result.getEncoded(false).length, 'bytes');
    console.log('First byte:', result.getEncoded(false)[0].toString(16));
    console.log('Is infinity:', result.isInfinity());
    console.log('Is valid:', result.isValid());
    
    // Should be 65 bytes (0x04 + 32 + 32)
    expect(result.getEncoded(false).length).toBe(65);
    expect(result.getEncoded(false)[0]).toBe(0x04);
    expect(result.isInfinity()).toBe(false);
  });

  it('should handle k = 1', () => {
    const domainParams = SM2.getParameters();
    const G = domainParams.getG();
    
    // Test with simple multiplier as baseline
    const result1 = G.multiply(1n);
    console.log('G.multiply(1) with simpleMultiply:', result1.getEncoded(false).length, 'bytes', 'equals G:', result1.equals(G));
    
    // Test FixedPointCombMultiplier
    const multiplier = new FixedPointCombMultiplier();
    const result = multiplier.multiply(G, 1n);
    
    console.log('k=1 with FixedPointCombMultiplier:', result.getEncoded(false).length, 'bytes');
    
    // Try normalizing explicitly
    const resultNorm = result.normalize();
    console.log('After explicit normalize:', resultNorm.getEncoded(false).length, 'bytes', 'isInfinity:', resultNorm.isInfinity());
    
    expect(result.getEncoded(false).length).toBe(65);
    
    // Should be equal to G
    expect(result.equals(G)).toBe(true);
  });

  it('should handle k = 0', () => {
    const domainParams = SM2.getParameters();
    const G = domainParams.getG();
    
    const multiplier = new FixedPointCombMultiplier();
    const result = multiplier.multiply(G, 0n);
    
    console.log('k=0 result:', result.getEncoded(false).length, 'bytes');
    console.log('Is infinity:', result.isInfinity());
    
    // Should be infinity (1 byte: 0x00)
    expect(result.isInfinity()).toBe(true);
    expect(result.getEncoded(false).length).toBe(1);
  });
});
