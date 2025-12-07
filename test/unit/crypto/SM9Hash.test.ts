import { describe, it, expect } from 'vitest';
import { SM9Hash } from '../../../src/crypto/SM9Hash';
import { SM9Parameters } from '../../../src/crypto/params/SM9Parameters';

describe('SM9Hash', () => {
  describe('H1 function', () => {
    it('should compute H1 for identity', () => {
      const id = new TextEncoder().encode('Alice');
      const hid = SM9Parameters.HID_SIGN;
      const n = SM9Parameters.N;

      const h = SM9Hash.H1(id, hid, n);

      expect(h).toBeGreaterThan(0n);
      expect(h).toBeLessThan(n);
    });

    it('should produce deterministic values', () => {
      const id = new TextEncoder().encode('Alice');
      const hid = SM9Parameters.HID_SIGN;
      const n = SM9Parameters.N;

      const h1 = SM9Hash.H1(id, hid, n);
      const h2 = SM9Hash.H1(id, hid, n);

      expect(h1).toBe(h2);
    });

    it('should handle different hid values', () => {
      const id = new TextEncoder().encode('Alice');
      const n = SM9Parameters.N;

      const h1 = SM9Hash.H1(id, SM9Parameters.HID_SIGN, n);
      const h2 = SM9Hash.H1(id, SM9Parameters.HID_ENC, n);

      // Both should be valid values in range
      expect(h1).toBeGreaterThan(0n);
      expect(h2).toBeGreaterThan(0n);
    });

    it('should always return value in range [1, N-1]', () => {
      const id = new TextEncoder().encode('test@example.com');
      const hid = SM9Parameters.HID_SIGN;
      const n = SM9Parameters.N;

      for (let i = 0; i < 10; i++) {
        const testId = new TextEncoder().encode(`test${i}@example.com`);
        const h = SM9Hash.H1(testId, hid, n);
        
        expect(h).toBeGreaterThanOrEqual(1n);
        expect(h).toBeLessThan(n);
      }
    });
  });

  describe('H2 function', () => {
    it('should compute H2 for message', () => {
      const message = new TextEncoder().encode('Hello, SM9!');
      const w = new Uint8Array(384); // Placeholder for Fp12 element
      const n = SM9Parameters.N;

      const h = SM9Hash.H2(message, w, n);

      expect(h).toBeGreaterThan(0n);
      expect(h).toBeLessThan(n);
    });

    it('should produce deterministic values', () => {
      const msg = new TextEncoder().encode('Message 1');
      const w = new Uint8Array(384);
      const n = SM9Parameters.N;

      const h1 = SM9Hash.H2(msg, w, n);
      const h2 = SM9Hash.H2(msg, w, n);

      expect(h1).toBe(h2);
    });

    it('should always return value in range [1, N-1]', () => {
      const w = new Uint8Array(384);
      const n = SM9Parameters.N;

      for (let i = 0; i < 10; i++) {
        const message = new TextEncoder().encode(`Message ${i}`);
        const h = SM9Hash.H2(message, w, n);
        
        expect(h).toBeGreaterThanOrEqual(1n);
        expect(h).toBeLessThan(n);
      }
    });
  });

  describe('KDF', () => {
    it('should derive key of specified length', () => {
      const Z = new Uint8Array(32).fill(0x42);
      const klen = 64;

      const K = SM9Hash.KDF(Z, klen);

      expect(K.length).toBe(klen);
    });

    it('should produce deterministic output', () => {
      const Z = new Uint8Array(32).fill(0x42);
      const klen = 32;

      const K1 = SM9Hash.KDF(Z, klen);
      const K2 = SM9Hash.KDF(Z, klen);

      expect(K1).toEqual(K2);
    });

    it('should handle different length outputs', () => {
      const Z = new Uint8Array(32).fill(0x42);

      const K1 = SM9Hash.KDF(Z, 32);
      const K2 = SM9Hash.KDF(Z, 64);

      expect(K1.length).toBe(32);
      expect(K2.length).toBe(64);
    });
  });

  describe('bigIntToBytes', () => {
    it('should convert bigint to bytes', () => {
      const value = 0x123456789ABCDEFn;
      const bytes = SM9Hash.bigIntToBytes(value, 8);

      expect(bytes.length).toBe(8);
      expect(bytes[0]).toBe(0x01);
      expect(bytes[7]).toBe(0xEF);
    });

    it('should handle zero', () => {
      const value = 0n;
      const bytes = SM9Hash.bigIntToBytes(value, 4);

      expect(bytes).toEqual(new Uint8Array(4));
    });
  });
});
