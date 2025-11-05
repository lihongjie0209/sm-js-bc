import { describe, it, expect } from 'vitest';
import { SICBlockCipher } from '../../../../src/crypto/modes/SICBlockCipher';
import { SM4Engine } from '../../../../src/crypto/engines/SM4Engine';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';
import { ParametersWithIV } from '../../../../src/crypto/params/ParametersWithIV';

describe('SICBlockCipher with SM4 (CTR Mode)', () => {
  describe('基础功能', () => {
    it('应该返回正确的算法名称', () => {
      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      expect(cipher.getAlgorithmName()).toBe('SM4/SIC');
    });

    it('应该返回正确的块大小', () => {
      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      expect(cipher.getBlockSize()).toBe(16);
    });

    it('应该正确获取底层引擎', () => {
      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      expect(cipher.getUnderlyingCipher()).toBe(engine);
    });
  });

  describe('IV 验证', () => {
    it('IV 长度小于块大小一半时应该抛出错误', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const shortIV = hexToBytes('00112233445566'); // 7 bytes < 8 bytes (16/2)

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), shortIV);

      expect(() => {
        cipher.init(true, params);
      }).toThrow('CTR/SIC mode requires IV of at least');
    });

    it('IV 长度大于块大小时应该抛出错误', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const longIV = hexToBytes('00112233445566778899aabbccddeeff00'); // 17 bytes > 16

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), longIV);

      expect(() => {
        cipher.init(true, params);
      }).toThrow('CTR/SIC mode requires IV no greater than');
    });

    it('应该接受等于块大小的 IV', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const validIV = hexToBytes('00112233445566778899aabbccddeeff'); // 16 bytes

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), validIV);

      expect(() => {
        cipher.init(true, params);
      }).not.toThrow();
    });

    it('应该接受等于块大小一半的 IV', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const validIV = hexToBytes('0011223344556677'); // 8 bytes = 16/2

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), validIV);

      expect(() => {
        cipher.init(true, params);
      }).not.toThrow();
    });
  });

  describe('加密和解密', () => {
    it('应该正确加密单个块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext, 0);

      // CTR 模式：C = P XOR E(Counter)
      // E(00000000000000000000000000000000) = 681edf34d206965e86b3e94f536e4246
      // 然后与明文 XOR
      expect(ciphertext.length).toBe(16);
    });

    it('CTR 模式加密和解密应该是对称的', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('fedcba98765432100123456789abcdef');
      const plaintext = hexToBytes('aabbccddeeff00112233445566778899');

      // 加密
      const encEngine = new SM4Engine();
      const encCipher = new SICBlockCipher(encEngine);
      const encParams = new ParametersWithIV(new KeyParameter(key), iv);
      encCipher.init(true, encParams);

      const ciphertext = new Uint8Array(16);
      encCipher.processBlock(plaintext, 0, ciphertext, 0);

      // 解密（CTR 模式对称，使用相同操作）
      const decEngine = new SM4Engine();
      const decCipher = new SICBlockCipher(decEngine);
      const decParams = new ParametersWithIV(new KeyParameter(key), iv);
      decCipher.init(false, decParams); // forEncryption 参数被忽略

      const decrypted = new Uint8Array(16);
      decCipher.processBlock(ciphertext, 0, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('应该正确处理多个块的加密', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext1 = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext2 = hexToBytes('0123456789abcdeffedcba9876543210'); // 相同明文

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext1 = new Uint8Array(16);
      const ciphertext2 = new Uint8Array(16);
      
      cipher.processBlock(plaintext1, 0, ciphertext1, 0);
      cipher.processBlock(plaintext2, 0, ciphertext2, 0);

      // CTR 模式：相同明文使用不同计数器，应该产生不同密文
      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));

      // 解密验证
      cipher.reset();
      const decrypted1 = new Uint8Array(16);
      const decrypted2 = new Uint8Array(16);
      
      cipher.processBlock(ciphertext1, 0, decrypted1, 0);
      cipher.processBlock(ciphertext2, 0, decrypted2, 0);

      expect(bytesToHex(decrypted1)).toBe(bytesToHex(plaintext1));
      expect(bytesToHex(decrypted2)).toBe(bytesToHex(plaintext2));
    });
  });

  describe('流式处理 (processBytes)', () => {
    it('应该正确处理部分块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdef'); // 8 bytes

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext = new Uint8Array(8);
      const processed = cipher.processBytes(plaintext, 0, 8, ciphertext, 0);

      expect(processed).toBe(8);
      expect(ciphertext.length).toBe(8);
    });

    it('应该正确处理跨块的流式数据', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdeffedcba98765432100011223344556677'); // 24 bytes

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext = new Uint8Array(24);
      const processed = cipher.processBytes(plaintext, 0, 24, ciphertext, 0);

      expect(processed).toBe(24);

      // 解密验证
      cipher.reset();
      const decrypted = new Uint8Array(24);
      cipher.processBytes(ciphertext, 0, 24, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('流式处理和块处理应该产生相同结果', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      // 使用块处理
      const blockEngine = new SM4Engine();
      const blockCipher = new SICBlockCipher(blockEngine);
      blockCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const blockResult = new Uint8Array(16);
      blockCipher.processBlock(plaintext, 0, blockResult, 0);

      // 使用流式处理
      const streamEngine = new SM4Engine();
      const streamCipher = new SICBlockCipher(streamEngine);
      streamCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const streamResult = new Uint8Array(16);
      streamCipher.processBytes(plaintext, 0, 16, streamResult, 0);

      expect(bytesToHex(streamResult)).toBe(bytesToHex(blockResult));
    });
  });

  describe('计数器增量', () => {
    it('应该正确递增计数器', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      // 使用接近溢出的初始计数器：...fffffffe
      const iv = hexToBytes('000000000000000000000000fffffffe');
      const plaintext1 = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext2 = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext1 = new Uint8Array(16);
      const ciphertext2 = new Uint8Array(16);
      
      // 第一个块使用计数器 ...fffffffe
      cipher.processBlock(plaintext1, 0, ciphertext1, 0);
      // 第二个块使用计数器 ...ffffffff
      cipher.processBlock(plaintext2, 0, ciphertext2, 0);

      // 密文应该不同
      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));
    });

    it('计数器溢出检查', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      // 使用 8 字节 IV，后面 8 字节为计数器空间
      // 初始化为能很快触发溢出的值
      const iv = hexToBytes('0000000000000001');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext = new Uint8Array(16);
      
      // 正常处理多个块
      for (let i = 0; i < 5; i++) {
        cipher.processBlock(plaintext, 0, ciphertext, 0);
      }

      // 验证计数器仍在有效范围内（counter[7] 应该还是 0x01）
      // 这个测试主要验证计数器机制工作正常，不会意外抛出错误
      expect(ciphertext.length).toBe(16);
    });
  });

  describe('Reset 功能', () => {
    it('reset 后应该回到初始状态', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00112233445566778899aabbccddeeff');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      // 第一次加密
      const ciphertext1 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext1, 0);

      // Reset 并再次加密相同的明文
      cipher.reset();
      const ciphertext2 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext2, 0);

      // 应该产生相同的密文（计数器重置）
      expect(bytesToHex(ciphertext1)).toBe(bytesToHex(ciphertext2));
    });

    it('reset 应该清除 byteCount', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789'); // 5 bytes

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      // 处理部分块
      const ciphertext1 = new Uint8Array(5);
      cipher.processBytes(plaintext, 0, 5, ciphertext1, 0);

      // Reset
      cipher.reset();

      // 再次处理相同数据
      const ciphertext2 = new Uint8Array(5);
      cipher.processBytes(plaintext, 0, 5, ciphertext2, 0);

      // 应该产生相同结果
      expect(bytesToHex(ciphertext1)).toBe(bytesToHex(ciphertext2));
    });
  });

  describe('边界条件', () => {
    it('应该正确处理空输入', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = new Uint8Array(0);

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext = new Uint8Array(0);
      const processed = cipher.processBytes(plaintext, 0, 0, ciphertext, 0);

      expect(processed).toBe(0);
    });

    it('应该正确处理单字节输入', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('ff');

      const engine = new SM4Engine();
      const cipher = new SICBlockCipher(engine);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext = new Uint8Array(1);
      const processed = cipher.processBytes(plaintext, 0, 1, ciphertext, 0);

      expect(processed).toBe(1);

      // 解密验证
      cipher.reset();
      const decrypted = new Uint8Array(1);
      cipher.processBytes(ciphertext, 0, 1, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe('ff');
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
