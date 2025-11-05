import { describe, it, expect } from 'vitest';
import { SM4Engine } from '../../../../src/crypto/engines/SM4Engine';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';

describe('SM4Engine', () => {
  describe('基础功能', () => {
    it('应该返回正确的算法名称', () => {
      const engine = new SM4Engine();
      expect(engine.getAlgorithmName()).toBe('SM4');
    });

    it('应该返回正确的块大小', () => {
      const engine = new SM4Engine();
      expect(engine.getBlockSize()).toBe(16);
    });

    it('未初始化时应该抛出错误', () => {
      const engine = new SM4Engine();
      const input = new Uint8Array(16);
      const output = new Uint8Array(16);
      
      expect(() => {
        engine.processBlock(input, 0, output, 0);
      }).toThrow('SM4 not initialised');
    });

    it('密钥长度错误时应该抛出错误', () => {
      const engine = new SM4Engine();
      const wrongKey = new Uint8Array(15); // 错误的密钥长度
      
      expect(() => {
        engine.init(true, new KeyParameter(wrongKey));
      }).toThrow('SM4 requires a 128 bit key');
    });
  });

  describe('标准测试向量', () => {
    it('应该正确加密单个块（测试向量1）', () => {
      // 来自 SM4Test.java
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');
      const expected = hexToBytes('681edf34d206965e86b3e94f536e4246');

      const engine = new SM4Engine();
      engine.init(true, new KeyParameter(key));

      const output = new Uint8Array(16);
      engine.processBlock(plaintext, 0, output, 0);

      expect(bytesToHex(output)).toBe(bytesToHex(expected));
    });

    it('应该正确解密单个块（测试向量1）', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const ciphertext = hexToBytes('681edf34d206965e86b3e94f536e4246');
      const expected = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      engine.init(false, new KeyParameter(key));

      const output = new Uint8Array(16);
      engine.processBlock(ciphertext, 0, output, 0);

      expect(bytesToHex(output)).toBe(bytesToHex(expected));
    });
  });

  describe('100万次迭代测试', () => {
    it('应该通过100万次加密迭代测试', () => {
      // 来自 SM4Test.java 的 test1000000()
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const plain = hexToBytes('0123456789abcdeffedcba9876543210');
      const expected = hexToBytes('595298c7c6fd271f0402f804c33d3f66');

      const engine = new SM4Engine();
      engine.init(true, new KeyParameter(key));

      const buf = new Uint8Array(plain);

      // 100万次迭代
      for (let i = 0; i < 1000000; i++) {
        engine.processBlock(buf, 0, buf, 0);
      }

      expect(bytesToHex(buf)).toBe(bytesToHex(expected));
    }, 30000); // 30秒超时

    it('应该通过100万次解密迭代测试', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const cipher = hexToBytes('595298c7c6fd271f0402f804c33d3f66');
      const expected = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      engine.init(false, new KeyParameter(key));

      const buf = new Uint8Array(cipher);

      // 100万次迭代
      for (let i = 0; i < 1000000; i++) {
        engine.processBlock(buf, 0, buf, 0);
      }

      expect(bytesToHex(buf)).toBe(bytesToHex(expected));
    }, 30000); // 30秒超时
  });

  describe('加密解密往返测试', () => {
    it('应该能够加密后解密恢复原文', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      // 加密
      const encEngine = new SM4Engine();
      encEngine.init(true, new KeyParameter(key));
      const ciphertext = new Uint8Array(16);
      encEngine.processBlock(plaintext, 0, ciphertext, 0);

      // 解密
      const decEngine = new SM4Engine();
      decEngine.init(false, new KeyParameter(key));
      const decrypted = new Uint8Array(16);
      decEngine.processBlock(ciphertext, 0, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('应该对不同的明文产生不同的密文', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext1 = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext2 = hexToBytes('0123456789abcdeffedcba9876543211'); // 最后一位不同

      const engine = new SM4Engine();
      engine.init(true, new KeyParameter(key));

      const ciphertext1 = new Uint8Array(16);
      const ciphertext2 = new Uint8Array(16);

      engine.processBlock(plaintext1, 0, ciphertext1, 0);
      
      // 重新初始化以处理第二个块
      engine.init(true, new KeyParameter(key));
      engine.processBlock(plaintext2, 0, ciphertext2, 0);

      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));
    });
  });

  describe('边界条件测试', () => {
    it('应该处理全零密钥和明文', () => {
      const key = new Uint8Array(16); // 全零
      const plaintext = new Uint8Array(16); // 全零

      const engine = new SM4Engine();
      engine.init(true, new KeyParameter(key));

      const output = new Uint8Array(16);
      expect(() => {
        engine.processBlock(plaintext, 0, output, 0);
      }).not.toThrow();
    });

    it('应该处理全1密钥和明文', () => {
      const key = new Uint8Array(16).fill(0xff);
      const plaintext = new Uint8Array(16).fill(0xff);

      const engine = new SM4Engine();
      engine.init(true, new KeyParameter(key));

      const output = new Uint8Array(16);
      expect(() => {
        engine.processBlock(plaintext, 0, output, 0);
      }).not.toThrow();
    });

    it('输入缓冲区太短时应该抛出错误', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const shortInput = new Uint8Array(15); // 少于16字节

      const engine = new SM4Engine();
      engine.init(true, new KeyParameter(key));

      const output = new Uint8Array(16);
      expect(() => {
        engine.processBlock(shortInput, 0, output, 0);
      }).toThrow('input buffer too short');
    });

    it('输出缓冲区太短时应该抛出错误', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const input = new Uint8Array(16);
      const shortOutput = new Uint8Array(15); // 少于16字节

      const engine = new SM4Engine();
      engine.init(true, new KeyParameter(key));

      expect(() => {
        engine.processBlock(input, 0, shortOutput, 0);
      }).toThrow('output buffer too short');
    });
  });
});

/**
 * 十六进制字符串转字节数组
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * 字节数组转十六进制字符串
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
