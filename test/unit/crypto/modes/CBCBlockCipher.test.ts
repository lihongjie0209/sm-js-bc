import { describe, it, expect } from 'vitest';
import { CBCBlockCipher } from '../../../../src/crypto/modes/CBCBlockCipher';
import { SM4Engine } from '../../../../src/crypto/engines/SM4Engine';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';
import { ParametersWithIV } from '../../../../src/crypto/params/ParametersWithIV';

describe('CBCBlockCipher with SM4', () => {
  describe('基础功能', () => {
    it('应该返回正确的算法名称', () => {
      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      expect(cipher.getAlgorithmName()).toBe('SM4/CBC');
    });

    it('应该返回正确的块大小', () => {
      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      expect(cipher.getBlockSize()).toBe(16);
    });

    it('应该正确获取底层引擎', () => {
      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      expect(cipher.getUnderlyingCipher()).toBe(engine);
    });
  });

  describe('加密和解密', () => {
    it('应该正确加密单个块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext, 0);

      // CBC 第一个块：C1 = E(P1 XOR IV)
      // 由于 IV 是全零，等同于 E(P1)
      const expected = hexToBytes('681edf34d206965e86b3e94f536e4246');
      expect(bytesToHex(ciphertext)).toBe(bytesToHex(expected));
    });

    it('应该正确解密单个块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const ciphertext = hexToBytes('681edf34d206965e86b3e94f536e4246');

      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(false, params);

      const plaintext = new Uint8Array(16);
      cipher.processBlock(ciphertext, 0, plaintext, 0);

      const expected = hexToBytes('0123456789abcdeffedcba9876543210');
      expect(bytesToHex(plaintext)).toBe(bytesToHex(expected));
    });

    it('应该正确处理多个块的加密', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00112233445566778899aabbccddeeff');
      const plaintext1 = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext2 = hexToBytes('fedcba98765432100123456789abcdef');

      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext1 = new Uint8Array(16);
      const ciphertext2 = new Uint8Array(16);
      
      cipher.processBlock(plaintext1, 0, ciphertext1, 0);
      cipher.processBlock(plaintext2, 0, ciphertext2, 0);

      // 验证两个密文块不同
      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));

      // 解密验证
      cipher.init(false, params);
      const decrypted1 = new Uint8Array(16);
      const decrypted2 = new Uint8Array(16);
      
      cipher.processBlock(ciphertext1, 0, decrypted1, 0);
      cipher.processBlock(ciphertext2, 0, decrypted2, 0);

      expect(bytesToHex(decrypted1)).toBe(bytesToHex(plaintext1));
      expect(bytesToHex(decrypted2)).toBe(bytesToHex(plaintext2));
    });

    it('加密解密往返应该恢复原文', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('fedcba98765432100123456789abcdef');
      const plaintext = hexToBytes('aabbccddeeff00112233445566778899');

      // 加密
      const encEngine = new SM4Engine();
      const encCipher = new CBCBlockCipher(encEngine);
      const encParams = new ParametersWithIV(new KeyParameter(key), iv);
      encCipher.init(true, encParams);

      const ciphertext = new Uint8Array(16);
      encCipher.processBlock(plaintext, 0, ciphertext, 0);

      // 解密
      const decEngine = new SM4Engine();
      const decCipher = new CBCBlockCipher(decEngine);
      const decParams = new ParametersWithIV(new KeyParameter(key), iv);
      decCipher.init(false, decParams);

      const decrypted = new Uint8Array(16);
      decCipher.processBlock(ciphertext, 0, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });
  });

  describe('IV 处理', () => {
    it('IV 长度错误时应该抛出错误', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const wrongIV = hexToBytes('0011223344'); // 只有5字节

      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      const params = new ParametersWithIV(new KeyParameter(key), wrongIV);

      expect(() => {
        cipher.init(true, params);
      }).toThrow('initialization vector must be the same length as block size');
    });

    it('不同的 IV 应该产生不同的密文', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv1 = hexToBytes('00000000000000000000000000000000');
      const iv2 = hexToBytes('11111111111111111111111111111111');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine1 = new SM4Engine();
      const cipher1 = new CBCBlockCipher(engine1);
      cipher1.init(true, new ParametersWithIV(new KeyParameter(key), iv1));

      const engine2 = new SM4Engine();
      const cipher2 = new CBCBlockCipher(engine2);
      cipher2.init(true, new ParametersWithIV(new KeyParameter(key), iv2));

      const ciphertext1 = new Uint8Array(16);
      const ciphertext2 = new Uint8Array(16);

      cipher1.processBlock(plaintext, 0, ciphertext1, 0);
      cipher2.processBlock(plaintext, 0, ciphertext2, 0);

      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));
    });
  });

  describe('Reset 功能', () => {
    it('reset 后应该回到初始状态', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00112233445566778899aabbccddeeff');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      // 第一次加密
      const ciphertext1 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext1, 0);

      // Reset 并再次加密相同的明文
      cipher.reset();
      const ciphertext2 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext2, 0);

      // 应该产生相同的密文
      expect(bytesToHex(ciphertext1)).toBe(bytesToHex(ciphertext2));
    });
  });

  describe('链接效应', () => {
    it('应该展示 CBC 的链接特性', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext1 = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext2 = hexToBytes('0123456789abcdeffedcba9876543210'); // 相同明文

      const engine = new SM4Engine();
      const cipher = new CBCBlockCipher(engine);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext1 = new Uint8Array(16);
      const ciphertext2 = new Uint8Array(16);

      cipher.processBlock(plaintext1, 0, ciphertext1, 0);
      cipher.processBlock(plaintext2, 0, ciphertext2, 0);

      // 即使明文相同，由于链接效应，密文应该不同
      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));
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
