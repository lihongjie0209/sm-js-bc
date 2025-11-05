import { describe, it, expect } from 'vitest';
import { Pack } from '../../../src/util/Pack';

describe('Pack', () => {
  describe('bigEndianToInt', () => {
    it('should convert bytes to int correctly', () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const result = Pack.bigEndianToInt(bytes, 0);
      expect(result).toBe(0x01020304);
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
      const result = Pack.bigEndianToInt(bytes, 1);
      expect(result).toBe(0x01020304);
    });

    it('should handle max value', () => {
      const bytes = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
      const result = Pack.bigEndianToInt(bytes, 0);
      expect(result).toBe(-1);
    });

    it('should handle zero', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const result = Pack.bigEndianToInt(bytes, 0);
      expect(result).toBe(0);
    });
  });

  describe('intToBigEndian', () => {
    it('should convert int to bytes correctly', () => {
      const bytes = new Uint8Array(4);
      Pack.intToBigEndian(0x01020304, bytes, 0);
      expect(bytes).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array(6);
      Pack.intToBigEndian(0x01020304, bytes, 1);
      expect(bytes).toEqual(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x00]));
    });

    it('should handle zero', () => {
      const bytes = new Uint8Array(4);
      Pack.intToBigEndian(0, bytes, 0);
      expect(bytes).toEqual(new Uint8Array([0x00, 0x00, 0x00, 0x00]));
    });

    it('should handle negative values', () => {
      const bytes = new Uint8Array(4);
      Pack.intToBigEndian(-1, bytes, 0);
      expect(bytes).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    });
  });

  describe('round trip int', () => {
    it('should convert back and forth correctly', () => {
      const testValues = [0, 1, -1, 0x12345678, 0x7fffffff, -0x80000000];
      
      for (const original of testValues) {
        const bytes = new Uint8Array(4);
        Pack.intToBigEndian(original, bytes, 0);
        const result = Pack.bigEndianToInt(bytes, 0);
        expect(result).toBe(original);
      }
    });
  });

  describe('bigEndianToLong', () => {
    it('should convert bytes to bigint correctly', () => {
      const bytes = new Uint8Array([
        0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08
      ]);
      const result = Pack.bigEndianToLong(bytes, 0);
      expect(result).toBe(0x0102030405060708n);
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array([
        0xff, 0xff,
        0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08,
        0xff, 0xff
      ]);
      const result = Pack.bigEndianToLong(bytes, 2);
      expect(result).toBe(0x0102030405060708n);
    });

    it('should handle zero', () => {
      const bytes = new Uint8Array(8);
      const result = Pack.bigEndianToLong(bytes, 0);
      expect(result).toBe(0n);
    });

    it('should handle max value', () => {
      const bytes = new Uint8Array([
        0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff
      ]);
      const result = Pack.bigEndianToLong(bytes, 0);
      expect(result).toBe(0xffffffffffffffffn);
    });
  });

  describe('longToBigEndian', () => {
    it('should convert bigint to bytes correctly', () => {
      const bytes = new Uint8Array(8);
      Pack.longToBigEndian(0x0102030405060708n, bytes, 0);
      expect(bytes).toEqual(new Uint8Array([
        0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08
      ]));
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array(10);
      Pack.longToBigEndian(0x0102030405060708n, bytes, 1);
      expect(bytes).toEqual(new Uint8Array([
        0x00,
        0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08,
        0x00
      ]));
    });

    it('should handle zero', () => {
      const bytes = new Uint8Array(8);
      Pack.longToBigEndian(0n, bytes, 0);
      expect(bytes).toEqual(new Uint8Array(8));
    });

    it('should handle max value', () => {
      const bytes = new Uint8Array(8);
      Pack.longToBigEndian(0xffffffffffffffffn, bytes, 0);
      expect(bytes).toEqual(new Uint8Array([
        0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff
      ]));
    });
  });

  describe('round trip long', () => {
    it('should convert back and forth correctly', () => {
      const testValues = [
        0n,
        1n,
        0x0102030405060708n,
        0xffffffffffffffffn,
        0x8000000000000000n
      ];
      
      for (const original of testValues) {
        const bytes = new Uint8Array(8);
        Pack.longToBigEndian(original, bytes, 0);
        const result = Pack.bigEndianToLong(bytes, 0);
        expect(result).toBe(original);
      }
    });
  });
});
