import { describe, it, expect } from 'vitest';
import { Arrays } from '../../../src/util/Arrays';
import { BigIntegers } from '../../../src/util/BigIntegers';
import { SecureRandom } from '../../../src/util/SecureRandom';

describe('Utility Classes for SM2Engine', () => {
  describe('Arrays utility', () => {
    it('should check array equality', () => {
      const arr1 = new Uint8Array([1, 2, 3, 4]);
      const arr2 = new Uint8Array([1, 2, 3, 4]);
      const arr3 = new Uint8Array([1, 2, 3, 5]);
      
      expect(Arrays.areEqual(arr1, arr2)).toBe(true);
      expect(Arrays.areEqual(arr1, arr3)).toBe(false);
    });

    it('should concatenate arrays', () => {
      const arr1 = new Uint8Array([1, 2]);
      const arr2 = new Uint8Array([3, 4]);
      const arr3 = new Uint8Array([5, 6]);
      
      const result = Arrays.concatenate(arr1, arr2, arr3);
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it('should fill arrays', () => {
      const arr = new Uint8Array(5);
      Arrays.fill(arr, 42);
      
      expect(Array.from(arr)).toEqual([42, 42, 42, 42, 42]);
    });
  });

  describe('BigIntegers utility', () => {
    it('should convert bigint to bytes with specified length', () => {
      const value = 0x123456789ABCDEFn;
      const bytes = BigIntegers.asUnsignedByteArray(8, value);
      
      expect(bytes).toBeDefined();
      expect(bytes.length).toBe(8);
    });

    it('should handle zero', () => {
      const bytes = BigIntegers.asUnsignedByteArray(4, 0n);
      expect(bytes).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('should handle large numbers', () => {
      const largeNum = 2n ** 256n - 1n;
      const bytes = BigIntegers.asUnsignedByteArray(32, largeNum);
      
      expect(bytes.length).toBe(32); // 256 bits = 32 bytes
      expect(bytes[0]).toBe(0xFF);
    });

    it('should convert from unsigned byte array', () => {
      const bytes = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
      const value = BigIntegers.fromUnsignedByteArray(bytes);
      
      expect(value).toBe(0x01234567n);
    });

    it('should handle round trip conversion', () => {
      const original = 0x123456789ABCDEFn;
      const bytes = BigIntegers.asUnsignedByteArray(8, original);
      const result = BigIntegers.fromUnsignedByteArray(bytes);
      
      expect(result).toBe(original);
    });
  });

  describe('SecureRandom utility', () => {
    it('should generate random bytes', () => {
      const random = new SecureRandom();
      const bytes1 = new Uint8Array(16);
      const bytes2 = new Uint8Array(16);
      
      random.nextBytes(bytes1);
      random.nextBytes(bytes2);
      
      // Should be different (extremely unlikely to be the same)
      expect(Arrays.areEqual(bytes1, bytes2)).toBe(false);
    });

    it('should generate different random data each time', () => {
      const random = new SecureRandom();
      const size = 32;
      const samples = [];
      
      for (let i = 0; i < 5; i++) {
        const bytes = new Uint8Array(size);
        random.nextBytes(bytes);
        samples.push(Array.from(bytes).join(','));
      }
      
      // All samples should be unique
      const uniqueSamples = new Set(samples);
      expect(uniqueSamples.size).toBe(5);
    });

    it('should handle different buffer sizes', () => {
      const random = new SecureRandom();
      
      for (const size of [1, 8, 16, 32, 64]) {
        const bytes = new Uint8Array(size);
        random.nextBytes(bytes);
        
        expect(bytes.length).toBe(size);
        // Should have some non-zero bytes (very high probability)
        const hasNonZero = bytes.some(b => b !== 0);
        expect(hasNonZero).toBe(true);
      }
    });
  });

  describe('Integration tests', () => {
    it('should work together for typical SM2 operations', () => {
      // Simulate typical SM2Engine data handling
      const random = new SecureRandom();
      const data = new Uint8Array(32);
      random.nextBytes(data);
      
      // Store original for comparison
      const originalData = new Uint8Array(data);
      
      // Convert to bigint and back
      const asNumber = BigIntegers.fromUnsignedByteArray(data);
      const backToBytes = BigIntegers.asUnsignedByteArray(32, asNumber);
      
      // Should be equal after round trip
      expect(Arrays.areEqual(originalData, backToBytes)).toBe(true);
    });

    it('should handle SM2 field element size data', () => {
      // SM2 uses 32-byte field elements
      const random = new SecureRandom();
      const fieldElement = new Uint8Array(32);
      random.nextBytes(fieldElement);
      
      // Convert to bigint
      const value = BigIntegers.fromUnsignedByteArray(fieldElement);
      
      // Should be a valid 256-bit number
      expect(value).toBeGreaterThanOrEqual(0n);
      expect(value).toBeLessThan(2n ** 256n);
      
      // Convert back should preserve size
      const converted = BigIntegers.asUnsignedByteArray(32, value);
      expect(converted.length).toBe(32);
    });

    it('should handle concatenation of multiple arrays', () => {
      const part1 = new Uint8Array([0x01, 0x02]);
      const part2 = new Uint8Array([0x03, 0x04]);
      const part3 = new Uint8Array([0x05, 0x06]);
      
      const combined = Arrays.concatenate(part1, part2, part3);
      expect(combined).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
      
      // Should work with empty arrays too
      const withEmpty = Arrays.concatenate(part1, new Uint8Array(0), part2);
      expect(withEmpty).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    });
  });
});