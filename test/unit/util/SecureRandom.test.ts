import { describe, it, expect } from 'vitest';
import { SecureRandom } from '../../../src/util/SecureRandom';

describe('SecureRandom', () => {
  describe('Constructor and Basic Operations', () => {
    it('should create SecureRandom instance', () => {
      const random = new SecureRandom();
      expect(random).toBeDefined();
      expect(random).toBeInstanceOf(SecureRandom);
    });
  });

  describe('nextBytes()', () => {
    it('should fill array with random bytes', () => {
      const random = new SecureRandom();
      const bytes = new Uint8Array(16);
      const originalBytes = new Uint8Array(bytes);
      
      random.nextBytes(bytes);
      
      // Array should be modified
      expect(bytes).not.toEqual(originalBytes);
    });

    it('should handle empty arrays', () => {
      const random = new SecureRandom();
      const emptyArray = new Uint8Array(0);
      
      expect(() => {
        random.nextBytes(emptyArray);
      }).not.toThrow();
    });

    it('should handle single byte arrays', () => {
      const random = new SecureRandom();
      const singleByte = new Uint8Array(1);
      
      random.nextBytes(singleByte);
      expect(singleByte.length).toBe(1);
    });

    it('should handle large arrays', () => {
      const random = new SecureRandom();
      const largeArray = new Uint8Array(1000);
      
      random.nextBytes(largeArray);
      expect(largeArray.length).toBe(1000);
      
      // Should not be all zeros (extremely unlikely)
      const allZeros = largeArray.every(b => b === 0);
      expect(allZeros).toBe(false);
    });

    it('should produce different results on multiple calls', () => {
      const random = new SecureRandom();
      const bytes1 = new Uint8Array(32);
      const bytes2 = new Uint8Array(32);
      
      random.nextBytes(bytes1);
      random.nextBytes(bytes2);
      
      expect(bytes1).not.toEqual(bytes2);
    });
  });

  describe('generateSeed()', () => {
    it('should generate seed of requested length', () => {
      const random = new SecureRandom();
      const seedLength = 16;
      const seed = random.generateSeed(seedLength);
      
      expect(seed).toBeDefined();
      expect(seed.length).toBe(seedLength);
      expect(seed).toBeInstanceOf(Uint8Array);
    });

    it('should generate different seeds on multiple calls', () => {
      const random = new SecureRandom();
      const seed1 = random.generateSeed(32);
      const seed2 = random.generateSeed(32);
      
      expect(seed1).not.toEqual(seed2);
    });

    it('should handle zero length seed', () => {
      const random = new SecureRandom();
      const seed = random.generateSeed(0);
      expect(seed.length).toBe(0);
    });

    it('should handle single byte seed', () => {
      const random = new SecureRandom();
      const seed = random.generateSeed(1);
      expect(seed.length).toBe(1);
    });

    it('should handle large seed sizes', () => {
      const random = new SecureRandom();
      const seed = random.generateSeed(1024);
      expect(seed.length).toBe(1024);
    });
  });

  describe('Multiple Instances Behavior', () => {
    it('should produce different results from different instances', () => {
      const random1 = new SecureRandom();
      const random2 = new SecureRandom();
      
      const bytes1 = new Uint8Array(16);
      const bytes2 = new Uint8Array(16);
      
      random1.nextBytes(bytes1);
      random2.nextBytes(bytes2);
      
      // Different instances should produce different random values
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should handle generateSeed from different instances', () => {
      const random1 = new SecureRandom();
      const random2 = new SecureRandom();
      
      const seed1 = random1.generateSeed(32);
      const seed2 = random2.generateSeed(32);
      
      expect(seed1).not.toEqual(seed2);
    });

    it('should handle various seed sizes with generateSeed', () => {
      const random = new SecureRandom();
      const seedSizes = [1, 4, 8, 16, 32, 64];
      
      for (const size of seedSizes) {
        const seed = random.generateSeed(size);
        expect(seed.length).toBe(size);
      }
    });
  });

  describe('State Management', () => {
    it('should maintain internal state correctly', () => {
      const random = new SecureRandom();
      const results = [];
      
      // Generate multiple sequences
      for (let i = 0; i < 5; i++) {
        const bytes = new Uint8Array(8);
        random.nextBytes(bytes);
        results.push(Array.from(bytes));
      }
      
      // All results should be different
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          expect(results[i]).not.toEqual(results[j]);
        }
      }
    });

    it('should handle consecutive operations', () => {
      const random = new SecureRandom();
      
      // Mix different sized operations
      const small = new Uint8Array(4);
      const medium = new Uint8Array(16);
      const large = new Uint8Array(64);
      
      random.nextBytes(small);
      random.nextBytes(medium);
      random.nextBytes(large);
      
      expect(small.length).toBe(4);
      expect(medium.length).toBe(16);
      expect(large.length).toBe(64);
    });
  });

  describe('Cryptographic Properties', () => {
    it('should produce bytes with reasonable distribution', () => {
      const random = new SecureRandom();
      const bytes = new Uint8Array(1000);
      random.nextBytes(bytes);
      
      // Count occurrences of each byte value
      const counts = new Array(256).fill(0);
      for (const byte of bytes) {
        counts[byte]++;
      }
      
      // Should have some distribution (not all same value)
      const uniqueValues = counts.filter(count => count > 0).length;
      expect(uniqueValues).toBeGreaterThan(50); // At least 50 different byte values
      
      // No single byte value should dominate
      const maxCount = Math.max(...counts);
      expect(maxCount).toBeLessThan(bytes.length * 0.1); // Less than 10% of total
    });

    it('should not have obvious patterns', () => {
      const random = new SecureRandom();
      const bytes = new Uint8Array(100);
      random.nextBytes(bytes);
      
      // Check for simple patterns
      let consecutiveZeros = 0;
      let consecutiveFFs = 0;
      let maxConsecutiveZeros = 0;
      let maxConsecutiveFFs = 0;
      
      for (const byte of bytes) {
        if (byte === 0) {
          consecutiveZeros++;
          consecutiveFFs = 0;
          maxConsecutiveZeros = Math.max(maxConsecutiveZeros, consecutiveZeros);
        } else if (byte === 0xFF) {
          consecutiveFFs++;
          consecutiveZeros = 0;
          maxConsecutiveFFs = Math.max(maxConsecutiveFFs, consecutiveFFs);
        } else {
          consecutiveZeros = 0;
          consecutiveFFs = 0;
        }
      }
      
      // Should not have long runs of same byte
      expect(maxConsecutiveZeros).toBeLessThan(20);
      expect(maxConsecutiveFFs).toBeLessThan(20);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid succession calls', () => {
      const random = new SecureRandom();
      
      for (let i = 0; i < 100; i++) {
        const bytes = new Uint8Array(1);
        expect(() => {
          random.nextBytes(bytes);
        }).not.toThrow();
      }
    });

    it('should handle mixed array sizes', () => {
      const random = new SecureRandom();
      const sizes = [1, 3, 7, 16, 33, 64, 127, 256];
      
      for (const size of sizes) {
        const bytes = new Uint8Array(size);
        random.nextBytes(bytes);
        expect(bytes.length).toBe(size);
      }
    });

    it('should work with different Uint8Array creation methods', () => {
      const random = new SecureRandom();
      
      // Different ways to create arrays
      const array1 = new Uint8Array(16);
      const array2 = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
      const array3 = new Uint8Array(new ArrayBuffer(12));
      
      expect(() => {
        random.nextBytes(array1);
        random.nextBytes(array2);
        random.nextBytes(array3);
      }).not.toThrow();
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle large arrays efficiently', () => {
      const random = new SecureRandom();
      const largeArray = new Uint8Array(10000);
      
      const startTime = Date.now();
      random.nextBytes(largeArray);
      const endTime = Date.now();
      
      // Should complete reasonably quickly (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(largeArray.length).toBe(10000);
    });
  });
});