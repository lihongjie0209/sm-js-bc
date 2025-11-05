import { describe, it, expect } from 'vitest';
import { KDF } from '../../../src/crypto/kdf/KDF';
import { SM3Digest } from '../../../src/crypto/digests/SM3Digest';

describe('KDF (Key Derivation Function)', () => {
  describe('Constructor', () => {
    it('should create KDF instance', () => {
      const kdf = new KDF();
      expect(kdf).toBeDefined();
      expect(kdf).toBeInstanceOf(KDF);
    });
  });

  describe('deriveKey()', () => {
    it('should derive key material from shared secret', () => {
      const kdf = new KDF();
      const sharedSecret = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const keyLength = 16;
      
      const derivedKey = kdf.deriveKey(sharedSecret, keyLength);
      
      expect(derivedKey).toBeDefined();
      expect(derivedKey.length).toBe(keyLength);
      expect(derivedKey).toBeInstanceOf(Uint8Array);
    });

    it('should produce different keys for different shared secrets', () => {
      const kdf = new KDF();
      const secret1 = new Uint8Array([1, 2, 3, 4]);
      const secret2 = new Uint8Array([1, 2, 3, 5]); // Different last byte
      const keyLength = 16;
      
      const key1 = kdf.deriveKey(secret1, keyLength);
      const key2 = kdf.deriveKey(secret2, keyLength);
      
      expect(key1).not.toEqual(key2);
    });

    it('should produce same keys for same inputs', () => {
      const kdf1 = new KDF();
      const kdf2 = new KDF();
      const sharedSecret = new Uint8Array([10, 20, 30, 40, 50]);
      const keyLength = 24;
      
      const key1 = kdf1.deriveKey(sharedSecret, keyLength);
      const key2 = kdf2.deriveKey(sharedSecret, keyLength);
      
      expect(key1).toEqual(key2);
    });

    it('should handle various key lengths', () => {
      const kdf = new KDF();
      const sharedSecret = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      
      // Test different key lengths
      const lengths = [1, 8, 16, 32, 33, 64, 65, 100];
      
      for (const length of lengths) {
        const derivedKey = kdf.deriveKey(sharedSecret, length);
        expect(derivedKey.length).toBe(length);
      }
    });

    it('should handle empty shared secret', () => {
      const kdf = new KDF();
      const emptySecret = new Uint8Array([]);
      const keyLength = 16;
      
      const derivedKey = kdf.deriveKey(emptySecret, keyLength);
      
      expect(derivedKey.length).toBe(keyLength);
    });

    it('should handle zero-length key request', () => {
      const kdf = new KDF();
      const sharedSecret = new Uint8Array([1, 2, 3, 4]);
      const keyLength = 0;
      
      const derivedKey = kdf.deriveKey(sharedSecret, keyLength);
      
      expect(derivedKey.length).toBe(0);
    });

    it('should handle key length exactly equal to digest size', () => {
      const kdf = new KDF();
      const digest = new SM3Digest();
      const digestSize = digest.getDigestSize(); // Should be 32 bytes for SM3
      const sharedSecret = new Uint8Array([1, 2, 3, 4, 5]);
      
      const derivedKey = kdf.deriveKey(sharedSecret, digestSize);
      
      expect(derivedKey.length).toBe(digestSize);
    });

    it('should handle key length greater than digest size', () => {
      const kdf = new KDF();
      const digest = new SM3Digest();
      const digestSize = digest.getDigestSize();
      const keyLength = digestSize * 2 + 5; // More than 2 digest blocks
      const sharedSecret = new Uint8Array([0xAB, 0xCD, 0xEF]);
      
      const derivedKey = kdf.deriveKey(sharedSecret, keyLength);
      
      expect(derivedKey.length).toBe(keyLength);
    });

    it('should handle large shared secrets', () => {
      const kdf = new KDF();
      const largeSecret = new Uint8Array(1000);
      // Fill with some pattern
      for (let i = 0; i < largeSecret.length; i++) {
        largeSecret[i] = i % 256;
      }
      const keyLength = 48;
      
      const derivedKey = kdf.deriveKey(largeSecret, keyLength);
      
      expect(derivedKey.length).toBe(keyLength);
    });

    it('should use counter correctly in derivation', () => {
      const kdf = new KDF();
      const sharedSecret = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
      
      // Derive keys of different lengths to test counter behavior
      const key16 = kdf.deriveKey(sharedSecret, 16);
      const key32 = kdf.deriveKey(sharedSecret, 32);
      const key64 = kdf.deriveKey(sharedSecret, 64);
      
      // First 16 bytes should be the same
      expect(key32.subarray(0, 16)).toEqual(key16);
      expect(key64.subarray(0, 16)).toEqual(key16);
      expect(key64.subarray(0, 32)).toEqual(key32);
    });

    it('should be deterministic', () => {
      const kdf = new KDF();
      const sharedSecret = new Uint8Array([0xFF, 0xEE, 0xDD, 0xCC]);
      const keyLength = 40;
      
      // Multiple derivations should produce same result
      const key1 = kdf.deriveKey(sharedSecret, keyLength);
      const key2 = kdf.deriveKey(sharedSecret, keyLength);
      const key3 = kdf.deriveKey(sharedSecret, keyLength);
      
      expect(key1).toEqual(key2);
      expect(key2).toEqual(key3);
    });

    it('should handle special byte values in shared secret', () => {
      const kdf = new KDF();
      const specialSecret = new Uint8Array([0x00, 0xFF, 0x80, 0x7F, 0x01]);
      const keyLength = 20;
      
      const derivedKey = kdf.deriveKey(specialSecret, keyLength);
      
      expect(derivedKey.length).toBe(keyLength);
    });
  });

  describe('isZero() static method', () => {
    it('should return true for all-zero array', () => {
      const zeroArray = new Uint8Array([0, 0, 0, 0, 0]);
      expect(KDF.isZero(zeroArray)).toBe(true);
    });

    it('should return true for empty array', () => {
      const emptyArray = new Uint8Array([]);
      expect(KDF.isZero(emptyArray)).toBe(true);
    });

    it('should return false for array with non-zero bytes', () => {
      const nonZeroArray = new Uint8Array([0, 0, 1, 0, 0]);
      expect(KDF.isZero(nonZeroArray)).toBe(false);
    });

    it('should return false for array with all non-zero bytes', () => {
      const allNonZeroArray = new Uint8Array([1, 2, 3, 4, 5]);
      expect(KDF.isZero(allNonZeroArray)).toBe(false);
    });

    it('should handle single byte arrays', () => {
      expect(KDF.isZero(new Uint8Array([0]))).toBe(true);
      expect(KDF.isZero(new Uint8Array([1]))).toBe(false);
      expect(KDF.isZero(new Uint8Array([255]))).toBe(false);
    });

    it('should handle large arrays', () => {
      const largeZeroArray = new Uint8Array(1000);
      expect(KDF.isZero(largeZeroArray)).toBe(true);
      
      const largeNonZeroArray = new Uint8Array(1000);
      largeNonZeroArray[999] = 1; // Set last byte to non-zero
      expect(KDF.isZero(largeNonZeroArray)).toBe(false);
      
      largeNonZeroArray[999] = 0;
      largeNonZeroArray[0] = 1; // Set first byte to non-zero
      expect(KDF.isZero(largeNonZeroArray)).toBe(false);
      
      largeNonZeroArray[0] = 0;
      largeNonZeroArray[500] = 255; // Set middle byte to non-zero
      expect(KDF.isZero(largeNonZeroArray)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should work with real SM2 key exchange scenario', () => {
      const kdf = new KDF();
      
      // Simulate shared secret from SM2 key exchange
      // In real scenario, this would be the x-coordinate of shared point
      const sharedSecretX = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0,
        0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
        0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x00, 0x11,
        0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99
      ]);
      
      // Derive different key types from the same shared secret
      const encKey = kdf.deriveKey(sharedSecretX, 16); // 128-bit AES key
      expect(encKey.length).toBe(16);
      
      const macKey = kdf.deriveKey(sharedSecretX, 32);  // 256-bit MAC key
      expect(macKey.length).toBe(32);
      
      // The first 16 bytes of the 32-byte MAC key should equal the 16-byte encryption key
      // (this is the correct KDF behavior - same input, same output prefix)
      expect(encKey).toEqual(macKey.subarray(0, 16));
      
      // But the full MAC key should be longer
      expect(macKey.length).toBeGreaterThan(encKey.length);
    });

    it('should handle consecutive derivations independently', () => {
      const kdf = new KDF();
      const secret1 = new Uint8Array([1, 2, 3]);
      const secret2 = new Uint8Array([4, 5, 6]);
      
      const key1a = kdf.deriveKey(secret1, 20);
      const key2a = kdf.deriveKey(secret2, 20);
      const key1b = kdf.deriveKey(secret1, 20);
      
      expect(key1a).toEqual(key1b); // Same secret should give same key
      expect(key1a).not.toEqual(key2a); // Different secrets should give different keys
    });

    it('should verify KDF output is not all zeros for non-empty input', () => {
      const kdf = new KDF();
      const sharedSecret = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      
      const derivedKey = kdf.deriveKey(sharedSecret, 64);
      
      // The derived key should not be all zeros
      expect(KDF.isZero(derivedKey)).toBe(false);
      
      // Should have some distribution of bytes
      const uniqueBytes = new Set(derivedKey);
      expect(uniqueBytes.size).toBeGreaterThan(1); // Should have more than one unique byte value
    });
  });

  describe('Edge Cases and Error Resistance', () => {
    it('should handle maximum practical key lengths', () => {
      const kdf = new KDF();
      const sharedSecret = new Uint8Array([0xAA, 0xBB, 0xCC]);
      
      // Test reasonably large key length (not too large to avoid memory issues in tests)
      const keyLength = 1024; // 1KB
      const derivedKey = kdf.deriveKey(sharedSecret, keyLength);
      
      expect(derivedKey.length).toBe(keyLength);
      expect(KDF.isZero(derivedKey)).toBe(false);
    });

    it('should handle shared secrets with repeated patterns', () => {
      const kdf = new KDF();
      
      // Test with repeating pattern
      const pattern = new Uint8Array([0xAB, 0xCD]);
      const repeatedSecret = new Uint8Array(100);
      for (let i = 0; i < repeatedSecret.length; i++) {
        repeatedSecret[i] = pattern[i % pattern.length];
      }
      
      const derivedKey = kdf.deriveKey(repeatedSecret, 32);
      
      expect(derivedKey.length).toBe(32);
      expect(KDF.isZero(derivedKey)).toBe(false);
    });

    it('should handle all-same-byte shared secrets', () => {
      const kdf = new KDF();
      
      const allOnes = new Uint8Array(32).fill(0xFF);
      const allZeros = new Uint8Array(32).fill(0x00);
      const all0xAA = new Uint8Array(32).fill(0xAA);
      
      const key1 = kdf.deriveKey(allOnes, 24);
      const key2 = kdf.deriveKey(allZeros, 24);
      const key3 = kdf.deriveKey(all0xAA, 24);
      
      // All should produce different keys
      expect(key1).not.toEqual(key2);
      expect(key2).not.toEqual(key3);
      expect(key1).not.toEqual(key3);
    });
  });
});