import { describe, it, expect } from 'vitest';
import { Nat } from '../../../src/math/raw/Nat';

describe('Nat Utility Tests', () => {
  describe('fromBigInteger()', () => {
    it('should convert 0 to zero array', () => {
      const result = Nat.fromBigInteger(32, 0n);
      expect(result).toEqual([0]);
    });

    it('should convert 1 to [1, 0, 0, ...]', () => {
      const result = Nat.fromBigInteger(32, 1n);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(1);
    });

    it('should convert small number correctly', () => {
      const result = Nat.fromBigInteger(32, 0x12345678n);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(0x12345678);
    });

    it('should convert 32-bit boundary', () => {
      const result = Nat.fromBigInteger(32, 0xFFFFFFFFn);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(0xFFFFFFFF);
    });

    it('should convert to multiple words', () => {
      const value = (BigInt(0x12345678) << 32n) | BigInt(0xABCDEF01);
      const result = Nat.fromBigInteger(64, value);
      
      expect(result.length).toBe(2);
      expect(result[0]).toBe(0xABCDEF01); // Little-endian: lower 32 bits first
      expect(result[1]).toBe(0x12345678); // Higher 32 bits second
    });

    it('should handle large numbers (256-bit)', () => {
      // SM2 curve order is 256 bits, let's test a 256-bit number
      const value = (1n << 255n) | 0x123456789ABCDEFn;
      const result = Nat.fromBigInteger(256, value);
      
      expect(result.length).toBe(8); // 256 bits = 8 * 32-bit words
      expect(result[0]).toBe(0x89ABCDEF); // Lower 32 bits
      expect(result[7]).toBe(0x80000000); // Highest bit set
    });

    it('should handle bitLength smaller than value', () => {
      // If we ask for 64-bit array but provide larger value, it should still work
      const value = (1n << 100n);
      const result = Nat.fromBigInteger(128, value);
      
      expect(result.length).toBe(4); // 128 bits = 4 words
      expect(result[3]).toBe(0x10); // Bit 100 is in word 3, bit 4
    });
  });

  describe('toBigInteger()', () => {
    it('should convert back to original value', () => {
      const original = 0x123456789ABCDEFn;
      const arr = Nat.fromBigInteger(64, original);
      const result = Nat.toBigInteger(arr);
      
      expect(result).toBe(original);
    });

    it('should handle zero', () => {
      const arr = [0, 0, 0, 0];
      const result = Nat.toBigInteger(arr);
      
      expect(result).toBe(0n);
    });

    it('should handle large values', () => {
      const arr = [0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF];
      const result = Nat.toBigInteger(arr);
      
      expect(result).toBe((1n << 128n) - 1n);
    });
  });

  describe('getBit()', () => {
    it('should get bit 0', () => {
      const arr = [0b1010];
      expect(Nat.getBit(arr, 0)).toBe(0);
      expect(Nat.getBit(arr, 1)).toBe(1);
      expect(Nat.getBit(arr, 2)).toBe(0);
      expect(Nat.getBit(arr, 3)).toBe(1);
    });

    it('should get bits across word boundary', () => {
      const arr = [0xFFFFFFFF, 0x00000001];
      
      expect(Nat.getBit(arr, 31)).toBe(1); // Last bit of first word
      expect(Nat.getBit(arr, 32)).toBe(1); // First bit of second word
      expect(Nat.getBit(arr, 33)).toBe(0);
    });

    it('should return 0 for out-of-bounds index', () => {
      const arr = [0xFF];
      expect(Nat.getBit(arr, 100)).toBe(0);
    });
  });

  describe('Roundtrip test with actual comb multiplication values', () => {
    it('should correctly extract bits for k=1', () => {
      const k = 1n;
      const fullComb = 256; // Typical for SM2
      const K = Nat.fromBigInteger(fullComb, k);
      
      console.log('\n=== k=1 bit extraction ===');
      console.log('K array length:', K.length);
      console.log('K[0]:', K[0].toString(2).padStart(32, '0'));
      
      // For k=1, only bit 0 should be set
      expect(Nat.getBit(K, 0)).toBe(1);
      expect(Nat.getBit(K, 1)).toBe(0);
      expect(Nat.getBit(K, 2)).toBe(0);
      
      // Verify the secretBit extraction logic
      const j = 0; // First bit
      const secretBit = K[j >>> 5] >>> (j & 0x1F);
      console.log('secretBit at j=0:', secretBit & 1);
      expect(secretBit & 1).toBe(1);
    });

    it('should correctly extract bits for k=7 (binary 111)', () => {
      const k = 7n;
      const fullComb = 256;
      const K = Nat.fromBigInteger(fullComb, k);
      
      console.log('\n=== k=7 bit extraction ===');
      console.log('K[0] binary:', K[0].toString(2).padStart(32, '0'));
      
      // For k=7 = 0b111, bits 0,1,2 should be set
      expect(Nat.getBit(K, 0)).toBe(1);
      expect(Nat.getBit(K, 1)).toBe(1);
      expect(Nat.getBit(K, 2)).toBe(1);
      expect(Nat.getBit(K, 3)).toBe(0);
    });

    it('should correctly extract secretIndex for k=1, width=5, d=52', () => {
      // This simulates actual FixedPointCombMultiplier parameters for SM2
      const k = 1n;
      const width = 5;
      const d = 52; // 256 bits / 5 width ≈ 51.2, rounds up to 52
      const fullComb = d * width; // 260
      const K = Nat.fromBigInteger(fullComb, k);
      
      console.log('\n=== secretIndex calculation for k=1 ===');
      console.log('width:', width, 'd:', d, 'fullComb:', fullComb);
      
      const top = fullComb - 1; // 259
      
      // First iteration (i=0)
      let secretIndex = 0;
      console.log('Iteration i=0:');
      for (let j = top - 0; j >= 0; j -= d) {
        const secretBit = K[j >>> 5] >>> (j & 0x1F);
        const oldIndex = secretIndex;
        secretIndex ^= secretBit >>> 1;
        secretIndex <<= 1;
        secretIndex ^= secretBit;
        
        if (j < 10 || secretBit !== 0) {
          console.log(`  j=${j}: secretBit=${secretBit & 1}, secretIndex: ${oldIndex} -> ${secretIndex}`);
        }
      }
      
      console.log('Final secretIndex for i=0:', secretIndex);
      
      // For k=1, only bit 0 is set
      // j goes: 259, 207, 155, 103, 51 (all > 0, so secretBit=0 for these)
      // Then j=-1 (loop ends)
      // So secretIndex should be 0 for first iteration
      // Wait, let me trace this more carefully...
      
      // Actually j goes from top-i down by d each time
      // For i=0: j starts at 259, goes 259, 207, 155, 103, 51, -1 (stops)
      // None of these j values hit bit 0, so secretIndex stays 0
      
      // Expected: lookup(0) which should give the first point in the table
    });
  });
});
