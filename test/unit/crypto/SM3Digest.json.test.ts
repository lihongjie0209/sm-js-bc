import { describe, it, expect } from 'vitest';
import { SM3Digest } from '../../../src/crypto/digests/SM3Digest';
import testVectors from '../../../testdata/sm3.json';

describe('SM3Digest - JSON Test Vectors', () => {
  /**
   * 辅助函数：将 Uint8Array 转换为十六进制字符串
   */
  function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
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

  testVectors.forEach((vector, index) => {
    it(`should compute correct hash for test vector ${index + 1}: "${vector.text}"`, () => {
      const input = new TextEncoder().encode(vector.text);
      const result = digest(input);
      const expectedHex = vector.result.toUpperCase();
      const actualHex = bytesToHex(result);
      
      console.log(`Input: "${vector.text}"`);
      console.log(`Expected: ${expectedHex}`);
      console.log(`Actual:   ${actualHex}`);
      
      expect(actualHex).toBe(expectedHex);
    });
  });
});
