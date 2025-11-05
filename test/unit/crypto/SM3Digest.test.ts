import { describe, it, expect } from 'vitest';
import { SM3Digest } from '../../../src/crypto/digests/SM3Digest';

describe('SM3Digest', () => {
  /**
   * 辅助函数：将十六进制字符串转换为 Uint8Array
   */
  function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * 辅助函数：将 Uint8Array 转换为十六进制字符串
   */
  function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 辅助函数：计算摘要
   */
  function digest(input: Uint8Array): Uint8Array {
    const sm3 = new SM3Digest();
    sm3.updateArray(input, 0, input.length);
    const out = new Uint8Array(32);
    sm3.doFinal(out, 0);
    return out;
  }

  describe('Basic Properties', () => {
    it('should return correct algorithm name', () => {
      const sm3 = new SM3Digest();
      expect(sm3.getAlgorithmName()).toBe('SM3');
    });

    it('should return correct digest size', () => {
      const sm3 = new SM3Digest();
      expect(sm3.getDigestSize()).toBe(32);
    });

    it('should return correct byte length', () => {
      const sm3 = new SM3Digest();
      expect(sm3.getByteLength()).toBe(64);
    });
  });

  describe('GB/T 32905-2016 Test Vectors', () => {
    it('should compute correct hash for "abc"', () => {
      const input = new TextEncoder().encode('abc');
      const result = digest(input);
      const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
      expect(bytesToHex(result)).toBe(expected);
    });

    it('should compute correct hash for 64-byte message', () => {
      const input = new TextEncoder().encode(
        'abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd'
      );
      const result = digest(input);
      const expected = 'debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732';
      expect(bytesToHex(result)).toBe(expected);
    });

    it('should compute correct hash for empty string', () => {
      const input = new Uint8Array(0);
      const result = digest(input);
      const expected = '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b';
      expect(bytesToHex(result)).toBe(expected);
    });

    it('should compute correct hash for single byte', () => {
      const input = new Uint8Array([0x61]); // 'a'
      const result = digest(input);
      const expected = '623476ac18f65a2909e43c7fec61b49c7e764a91a18ccb82f1917a29c86c5e88';
      expect(bytesToHex(result)).toBe(expected);
    });
  });

  describe('Update Methods', () => {
    it('should work with single byte updates', () => {
      const sm3 = new SM3Digest();
      const input = new TextEncoder().encode('abc');
      
      for (let i = 0; i < input.length; i++) {
        sm3.update(input[i]);
      }
      
      const out = new Uint8Array(32);
      sm3.doFinal(out, 0);
      const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
      expect(bytesToHex(out)).toBe(expected);
    });

    it('should work with array updates', () => {
      const sm3 = new SM3Digest();
      const input = new TextEncoder().encode('abc');
      sm3.updateArray(input, 0, input.length);
      
      const out = new Uint8Array(32);
      sm3.doFinal(out, 0);
      const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
      expect(bytesToHex(out)).toBe(expected);
    });

    it('should work with mixed updates', () => {
      const sm3 = new SM3Digest();
      sm3.update(0x61); // 'a'
      sm3.updateArray(new TextEncoder().encode('bc'), 0, 2);
      
      const out = new Uint8Array(32);
      sm3.doFinal(out, 0);
      const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
      expect(bytesToHex(out)).toBe(expected);
    });
  });

  describe('Reset', () => {
    it('should reset state correctly', () => {
      const sm3 = new SM3Digest();
      const input = new TextEncoder().encode('abc');
      sm3.updateArray(input, 0, input.length);
      
      sm3.reset();
      
      sm3.updateArray(input, 0, input.length);
      const out = new Uint8Array(32);
      sm3.doFinal(out, 0);
      const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
      expect(bytesToHex(out)).toBe(expected);
    });

    it('should auto-reset after doFinal', () => {
      const sm3 = new SM3Digest();
      const input = new TextEncoder().encode('abc');
      
      sm3.updateArray(input, 0, input.length);
      const out1 = new Uint8Array(32);
      sm3.doFinal(out1, 0);
      
      // Should be able to use again without explicit reset
      sm3.updateArray(input, 0, input.length);
      const out2 = new Uint8Array(32);
      sm3.doFinal(out2, 0);
      
      expect(bytesToHex(out1)).toBe(bytesToHex(out2));
    });
  });

  describe('Memoable', () => {
    it('should copy state correctly', () => {
      const sm3 = new SM3Digest();
      const input = new TextEncoder().encode('abc');
      sm3.updateArray(input, 0, 2); // Only 'ab'
      
      const copy = sm3.copy() as SM3Digest;
      
      // Continue with original
      sm3.update(0x63); // 'c'
      const out1 = new Uint8Array(32);
      sm3.doFinal(out1, 0);
      
      // Continue with copy
      copy.update(0x63); // 'c'
      const out2 = new Uint8Array(32);
      copy.doFinal(out2, 0);
      
      expect(bytesToHex(out1)).toBe(bytesToHex(out2));
      const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
      expect(bytesToHex(out1)).toBe(expected);
    });

    it('should reset from memoable correctly', () => {
      const sm3 = new SM3Digest();
      const input = new TextEncoder().encode('abc');
      sm3.updateArray(input, 0, 2); // 'ab'
      
      const saved = sm3.copy();
      
      // Continue and finish
      sm3.update(0x63); // 'c'
      const out1 = new Uint8Array(32);
      sm3.doFinal(out1, 0);
      
      // Reset to saved state
      sm3.resetFromMemoable(saved);
      sm3.update(0x63); // 'c'
      const out2 = new Uint8Array(32);
      sm3.doFinal(out2, 0);
      
      expect(bytesToHex(out1)).toBe(bytesToHex(out2));
    });
  });

  describe('Large Messages', () => {
    it('should handle messages larger than one block', () => {
      // Create a message of 128 bytes (2 blocks)
      const input = new Uint8Array(128);
      for (let i = 0; i < 128; i++) {
        input[i] = i & 0xff;
      }
      
      const result = digest(input);
      // Verify it produces a valid 32-byte hash
      expect(result.length).toBe(32);
    });

    it('should handle very large messages', () => {
      // Create a 1KB message
      const input = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        input[i] = (i * 31) & 0xff;
      }
      
      const result = digest(input);
      expect(result.length).toBe(32);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exact block size', () => {
      const input = new Uint8Array(64); // Exactly one block
      input.fill(0x42);
      
      const result = digest(input);
      expect(result.length).toBe(32);
    });

    it('should handle block boundary', () => {
      // Test messages around block boundaries
      const sizes = [63, 64, 65, 127, 128, 129];
      
      for (const size of sizes) {
        const input = new Uint8Array(size);
        input.fill(0x61);
        
        const result = digest(input);
        expect(result.length).toBe(32);
      }
    });

    it('should produce different hashes for different inputs', () => {
      const input1 = new TextEncoder().encode('abc');
      const input2 = new TextEncoder().encode('abd');
      
      const hash1 = digest(input1);
      const hash2 = digest(input2);
      
      expect(bytesToHex(hash1)).not.toBe(bytesToHex(hash2));
    });

    it('should be deterministic', () => {
      const input = new TextEncoder().encode('test message');
      
      const hash1 = digest(input);
      const hash2 = digest(input);
      
      expect(bytesToHex(hash1)).toBe(bytesToHex(hash2));
    });
  });
});
