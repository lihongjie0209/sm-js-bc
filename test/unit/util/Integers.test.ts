import { describe, it, expect } from 'vitest';
import { Integers } from '../../../src/util/Integers';

describe('Integers Utility Class', () => {
  describe('numberOfLeadingZeros()', () => {
    it('should return 32 for zero', () => {
      expect(Integers.numberOfLeadingZeros(0)).toBe(32);
    });

    it('should return 31 for 1', () => {
      expect(Integers.numberOfLeadingZeros(1)).toBe(31);
    });

    it('should return 30 for 2', () => {
      expect(Integers.numberOfLeadingZeros(2)).toBe(30);
    });

    it('should return 30 for 3', () => {
      expect(Integers.numberOfLeadingZeros(3)).toBe(30);
    });

    it('should return 0 for negative numbers with MSB set', () => {
      expect(Integers.numberOfLeadingZeros(-1)).toBe(0);
      expect(Integers.numberOfLeadingZeros(-2147483648)).toBe(0); // 0x80000000
    });

    it('should handle powers of 2', () => {
      expect(Integers.numberOfLeadingZeros(1)).toBe(31);
      expect(Integers.numberOfLeadingZeros(2)).toBe(30);
      expect(Integers.numberOfLeadingZeros(4)).toBe(29);
      expect(Integers.numberOfLeadingZeros(8)).toBe(28);
      expect(Integers.numberOfLeadingZeros(16)).toBe(27);
      expect(Integers.numberOfLeadingZeros(32)).toBe(26);
      expect(Integers.numberOfLeadingZeros(64)).toBe(25);
      expect(Integers.numberOfLeadingZeros(128)).toBe(24);
      expect(Integers.numberOfLeadingZeros(256)).toBe(23);
      expect(Integers.numberOfLeadingZeros(512)).toBe(22);
      expect(Integers.numberOfLeadingZeros(1024)).toBe(21);
    });

    it('should handle large positive numbers', () => {
      expect(Integers.numberOfLeadingZeros(0x40000000)).toBe(1); // 2^30
      expect(Integers.numberOfLeadingZeros(0x7FFFFFFF)).toBe(1); // Max positive int
    });

    it('should handle numbers with mixed bits', () => {
      expect(Integers.numberOfLeadingZeros(0xFF)).toBe(24);      // 255
      expect(Integers.numberOfLeadingZeros(0xFFFF)).toBe(16);    // 65535
      expect(Integers.numberOfLeadingZeros(0xFFFFFF)).toBe(8);   // 16777215
    });
  });

  describe('bitCount()', () => {
    it('should return 0 for zero', () => {
      expect(Integers.bitCount(0)).toBe(0);
    });

    it('should return 1 for powers of 2', () => {
      expect(Integers.bitCount(1)).toBe(1);
      expect(Integers.bitCount(2)).toBe(1);
      expect(Integers.bitCount(4)).toBe(1);
      expect(Integers.bitCount(8)).toBe(1);
      expect(Integers.bitCount(16)).toBe(1);
    });

    it('should return 32 for -1 (all bits set)', () => {
      expect(Integers.bitCount(-1)).toBe(32);
    });

    it('should count bits correctly for various numbers', () => {
      expect(Integers.bitCount(3)).toBe(2);     // 11
      expect(Integers.bitCount(7)).toBe(3);     // 111
      expect(Integers.bitCount(15)).toBe(4);    // 1111
      expect(Integers.bitCount(31)).toBe(5);    // 11111
      expect(Integers.bitCount(63)).toBe(6);    // 111111
      expect(Integers.bitCount(127)).toBe(7);   // 1111111
      expect(Integers.bitCount(255)).toBe(8);   // 11111111
    });

    it('should handle negative numbers', () => {
      expect(Integers.bitCount(-2)).toBe(31);   // All bits set except LSB
      expect(Integers.bitCount(-3)).toBe(31);   // 11111...1101
      expect(Integers.bitCount(-4)).toBe(30);   // 11111...1100
    });

    it('should handle alternating bit patterns', () => {
      expect(Integers.bitCount(0x55555555)).toBe(16); // 01010101...
      expect(Integers.bitCount(0xAAAAAAAA | 0)).toBe(16); // 10101010...
    });
  });

  describe('rotateLeft()', () => {
    it('should handle zero rotation', () => {
      expect(Integers.rotateLeft(0x12345678, 0)).toBe(0x12345678);
    });

    it('should handle single bit rotation', () => {
      expect(Integers.rotateLeft(1, 1)).toBe(2);
      expect(Integers.rotateLeft(2, 1)).toBe(4);
    });

    it('should wrap around after 32 bits', () => {
      expect(Integers.rotateLeft(0x80000000 | 0, 1)).toBe(1);
      expect(Integers.rotateLeft(0x40000000, 1)).toBe(0x80000000 | 0);
    });

    it('should handle full rotation (32 bits)', () => {
      const value = 0x12345678;
      expect(Integers.rotateLeft(value, 32)).toBe(value);
    });

    it('should handle rotation distances > 32', () => {
      const value = 0x12345678;
      expect(Integers.rotateLeft(value, 33)).toBe(Integers.rotateLeft(value, 1));
      expect(Integers.rotateLeft(value, 64)).toBe(value);
    });

    it('should preserve bit patterns correctly', () => {
      expect(Integers.rotateLeft(0xF0F0F0F0 | 0, 4)).toBe(0x0F0F0F0F);
      expect(Integers.rotateLeft(0xFF000000 | 0, 8)).toBe(0xFF);
    });

    it('should handle negative rotation distances', () => {
      const value = 0x12345678;
      expect(Integers.rotateLeft(value, -1)).toBe(Integers.rotateLeft(value, 31));
    });
  });

  describe('rotateRight()', () => {
    it('should handle zero rotation', () => {
      expect(Integers.rotateRight(0x12345678, 0)).toBe(0x12345678);
    });

    it('should handle single bit rotation', () => {
      expect(Integers.rotateRight(2, 1)).toBe(1);
      expect(Integers.rotateRight(4, 1)).toBe(2);
    });

    it('should wrap around from LSB to MSB', () => {
      expect(Integers.rotateRight(1, 1)).toBe(0x80000000 | 0);
      expect(Integers.rotateRight(3, 1)).toBe(0x80000001 | 0);
    });

    it('should handle full rotation (32 bits)', () => {
      const value = 0x12345678;
      expect(Integers.rotateRight(value, 32)).toBe(value);
    });

    it('should be inverse of rotateLeft', () => {
      const value = 0x12345678;
      expect(Integers.rotateRight(Integers.rotateLeft(value, 5), 5)).toBe(value);
      expect(Integers.rotateLeft(Integers.rotateRight(value, 7), 7)).toBe(value);
    });

    it('should preserve bit patterns correctly', () => {
      expect(Integers.rotateRight(0x0F0F0F0F, 4)).toBe(0xF0F0F0F0 | 0);
      expect(Integers.rotateRight(0xFF, 8)).toBe(0xFF000000 | 0);
    });
  });

  describe('numberOfTrailingZeros()', () => {
    it('should return 32 for zero', () => {
      expect(Integers.numberOfTrailingZeros(0)).toBe(32);
    });

    it('should return 0 for odd numbers', () => {
      expect(Integers.numberOfTrailingZeros(1)).toBe(0);
      expect(Integers.numberOfTrailingZeros(3)).toBe(0);
      expect(Integers.numberOfTrailingZeros(5)).toBe(0);
      expect(Integers.numberOfTrailingZeros(-1)).toBe(0);
    });

    it('should count trailing zeros for powers of 2', () => {
      expect(Integers.numberOfTrailingZeros(2)).toBe(1);
      expect(Integers.numberOfTrailingZeros(4)).toBe(2);
      expect(Integers.numberOfTrailingZeros(8)).toBe(3);
      expect(Integers.numberOfTrailingZeros(16)).toBe(4);
      expect(Integers.numberOfTrailingZeros(32)).toBe(5);
      expect(Integers.numberOfTrailingZeros(64)).toBe(6);
      expect(Integers.numberOfTrailingZeros(128)).toBe(7);
      expect(Integers.numberOfTrailingZeros(256)).toBe(8);
    });

    it('should handle numbers ending in zeros', () => {
      expect(Integers.numberOfTrailingZeros(6)).toBe(1);    // 110
      expect(Integers.numberOfTrailingZeros(12)).toBe(2);   // 1100
      expect(Integers.numberOfTrailingZeros(24)).toBe(3);   // 11000
      expect(Integers.numberOfTrailingZeros(48)).toBe(4);   // 110000
    });

    it('should handle negative numbers', () => {
      expect(Integers.numberOfTrailingZeros(-2)).toBe(1);
      expect(Integers.numberOfTrailingZeros(-4)).toBe(2);
      expect(Integers.numberOfTrailingZeros(-8)).toBe(3);
    });

    it('should handle large numbers', () => {
      expect(Integers.numberOfTrailingZeros(0x80000000 | 0)).toBe(31);
      expect(Integers.numberOfTrailingZeros(0x40000000)).toBe(30);
    });
  });

  describe('highestOneBit()', () => {
    it('should return 0 for zero', () => {
      expect(Integers.highestOneBit(0)).toBe(0);
    });

    it('should return the number itself for powers of 2', () => {
      expect(Integers.highestOneBit(1)).toBe(1);
      expect(Integers.highestOneBit(2)).toBe(2);
      expect(Integers.highestOneBit(4)).toBe(4);
      expect(Integers.highestOneBit(8)).toBe(8);
      expect(Integers.highestOneBit(16)).toBe(16);
    });

    it('should return highest power of 2 ≤ n for positive numbers', () => {
      expect(Integers.highestOneBit(3)).toBe(2);
      expect(Integers.highestOneBit(5)).toBe(4);
      expect(Integers.highestOneBit(6)).toBe(4);
      expect(Integers.highestOneBit(7)).toBe(4);
      expect(Integers.highestOneBit(9)).toBe(8);
      expect(Integers.highestOneBit(15)).toBe(8);
      expect(Integers.highestOneBit(31)).toBe(16);
    });

    it('should handle negative numbers', () => {
      expect(Integers.highestOneBit(-1)).toBe(0x80000000 | 0);
      expect(Integers.highestOneBit(-2)).toBe(0x80000000 | 0);
    });

    it('should handle large positive numbers', () => {
      expect(Integers.highestOneBit(0x7FFFFFFF)).toBe(0x40000000);
      expect(Integers.highestOneBit(0x40000000)).toBe(0x40000000);
      expect(Integers.highestOneBit(0x3FFFFFFF)).toBe(0x20000000);
    });
  });

  describe('lowestOneBit()', () => {
    it('should return 0 for zero', () => {
      expect(Integers.lowestOneBit(0)).toBe(0);
    });

    it('should return 1 for odd numbers', () => {
      expect(Integers.lowestOneBit(1)).toBe(1);
      expect(Integers.lowestOneBit(3)).toBe(1);
      expect(Integers.lowestOneBit(5)).toBe(1);
      expect(Integers.lowestOneBit(7)).toBe(1);
      expect(Integers.lowestOneBit(-1)).toBe(1);
    });

    it('should return the lowest power of 2 factor', () => {
      expect(Integers.lowestOneBit(2)).toBe(2);
      expect(Integers.lowestOneBit(4)).toBe(4);
      expect(Integers.lowestOneBit(6)).toBe(2);
      expect(Integers.lowestOneBit(8)).toBe(8);
      expect(Integers.lowestOneBit(12)).toBe(4);
      expect(Integers.lowestOneBit(16)).toBe(16);
      expect(Integers.lowestOneBit(24)).toBe(8);
    });

    it('should handle negative numbers', () => {
      expect(Integers.lowestOneBit(-2)).toBe(2);
      expect(Integers.lowestOneBit(-4)).toBe(4);
      expect(Integers.lowestOneBit(-8)).toBe(8);
    });

    it('should handle large numbers', () => {
      expect(Integers.lowestOneBit(0x80000000 | 0)).toBe(0x80000000 | 0);
      expect(Integers.lowestOneBit(0x40000000)).toBe(0x40000000);
    });

    it('should satisfy: lowestOneBit(n) = 2^numberOfTrailingZeros(n) for n != 0', () => {
      const testValues = [1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 24, 31, 32, 48, 64];
      for (const n of testValues) {
        const lowest = Integers.lowestOneBit(n);
        const trailingZeros = Integers.numberOfTrailingZeros(n);
        expect(lowest).toBe(1 << trailingZeros);
      }
    });
  });

  describe('Edge Cases and Integration Tests', () => {
    it('should handle all bit manipulation functions consistently', () => {
      const testValue = 0x12345678;
      
      // Test that operations are consistent
      const leadingZeros = Integers.numberOfLeadingZeros(testValue);
      const trailingZeros = Integers.numberOfTrailingZeros(testValue);
      const bitCount = Integers.bitCount(testValue);
      
      expect(leadingZeros).toBeGreaterThanOrEqual(0);
      expect(leadingZeros).toBeLessThanOrEqual(32);
      expect(trailingZeros).toBeGreaterThanOrEqual(0);
      expect(trailingZeros).toBeLessThanOrEqual(32);
      expect(bitCount).toBeGreaterThanOrEqual(0);
      expect(bitCount).toBeLessThanOrEqual(32);
    });

    it('should handle boundary values correctly', () => {
      const maxInt = 0x7FFFFFFF;
      const minInt = 0x80000000 | 0;
      
      expect(Integers.numberOfLeadingZeros(maxInt)).toBe(1);
      expect(Integers.numberOfLeadingZeros(minInt)).toBe(0);
      expect(Integers.bitCount(maxInt)).toBe(31);
      expect(Integers.bitCount(minInt)).toBe(1);
    });

    it('should handle rotation symmetry', () => {
      const testValues = [0, 1, -1, 0x12345678, 0x80000000 | 0];
      
      for (const value of testValues) {
        // Rotating left by n then right by n should give original value
        for (let n = 0; n < 32; n++) {
          const rotated = Integers.rotateLeft(value, n);
          const restored = Integers.rotateRight(rotated, n);
          expect(restored).toBe(value);
        }
      }
    });

    it('should validate bit counting properties', () => {
      // For any number n, bitCount(n) + bitCount(~n) should equal 32
      const testValues = [0, 1, -1, 0x12345678, 0xAAAAAAAA | 0, 0x55555555];
      
      for (const n of testValues) {
        const count = Integers.bitCount(n);
        const complementCount = Integers.bitCount(~n);
        expect(count + complementCount).toBe(32);
      }
    });
  });

  describe('Performance and Correctness', () => {
    it('should handle all 32-bit integer values correctly', () => {
      // Test a sample of values across the entire range
      const testValues = [
        0, 1, -1,
        0x7FFFFFFF, 0x80000000 | 0,  // Max and min signed integers
        0xFFFFFFFF | 0,              // All bits set
        0x55555555, 0xAAAAAAAA | 0,  // Alternating patterns
        0xFF00FF00 | 0, 0x00FF00FF,  // Byte patterns
        123456789, -123456789        // Random values
      ];
      
      for (const value of testValues) {
        expect(() => {
          Integers.numberOfLeadingZeros(value);
          Integers.numberOfTrailingZeros(value);
          Integers.bitCount(value);
          Integers.highestOneBit(value);
          Integers.lowestOneBit(value);
          Integers.rotateLeft(value, 5);
          Integers.rotateRight(value, 5);
        }).not.toThrow();
      }
    });
  });
});