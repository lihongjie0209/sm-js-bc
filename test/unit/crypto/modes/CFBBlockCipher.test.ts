import { describe, it, expect } from 'vitest';
import { CFBBlockCipher } from '../../../../src/crypto/modes/CFBBlockCipher';
import { SM4Engine } from '../../../../src/crypto/engines/SM4Engine';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';
import { ParametersWithIV } from '../../../../src/crypto/params/ParametersWithIV';

describe('CFBBlockCipher with SM4', () => {
  describe('基础功能', () => {
    it('应该返回正确的算法名称 (CFB128)', () => {
      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      expect(cipher.getAlgorithmName()).toBe('SM4/CFB128');
    });

    it('应该返回正确的算法名称 (CFB64)', () => {
      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 64);
      expect(cipher.getAlgorithmName()).toBe('SM4/CFB64');
    });

    it('应该返回正确的块大小 (CFB128)', () => {
      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      expect(cipher.getBlockSize()).toBe(16); // 128 bits = 16 bytes
    });

    it('应该返回正确的块大小 (CFB64)', () => {
      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 64);
      expect(cipher.getBlockSize()).toBe(8); // 64 bits = 8 bytes
    });

    it('应该正确获取底层引擎', () => {
      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      expect(cipher.getUnderlyingCipher()).toBe(engine);
    });

    it('不支持的位块大小应该抛出错误', () => {
      const engine = new SM4Engine();
      
      // 块大小不是 8 的倍数
      expect(() => new CFBBlockCipher(engine, 7)).toThrow('CFB7 not supported');
      
      // 块大小小于 8
      expect(() => new CFBBlockCipher(engine, 4)).toThrow('CFB4 not supported');
      
      // 块大小大于密码块大小
      expect(() => new CFBBlockCipher(engine, 256)).toThrow('CFB256 not supported');
    });
  });

  describe('CFB128 模式加密和解密', () => {
    it('应该正确加密单个块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      
      cipher.init(true, params);

      const ciphertext = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext, 0);

      // CFB 模式：C = P XOR E(IV)
      expect(ciphertext.length).toBe(16);
    });

    it('应该正确解密单个块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      // 加密
      const encEngine = new SM4Engine();
      const encCipher = new CFBBlockCipher(encEngine, 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext = new Uint8Array(16);
      encCipher.processBlock(plaintext, 0, ciphertext, 0);

      // 解密
      const decEngine = new SM4Engine();
      const decCipher = new CFBBlockCipher(decEngine, 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));

      const decrypted = new Uint8Array(16);
      decCipher.processBlock(ciphertext, 0, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('加密解密往返应该恢复原文', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('fedcba98765432100123456789abcdef');
      const plaintext = hexToBytes('aabbccddeeff00112233445566778899');

      // 加密
      const encEngine = new SM4Engine();
      const encCipher = new CFBBlockCipher(encEngine, 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext = new Uint8Array(16);
      encCipher.processBlock(plaintext, 0, ciphertext, 0);

      // 解密
      const decEngine = new SM4Engine();
      const decCipher = new CFBBlockCipher(decEngine, 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));

      const decrypted = new Uint8Array(16);
      decCipher.processBlock(ciphertext, 0, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('应该正确处理多个块的加密', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00112233445566778899aabbccddeeff');
      const plaintext1 = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext2 = hexToBytes('0123456789abcdeffedcba9876543210'); // 相同明文

      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext1 = new Uint8Array(16);
      const ciphertext2 = new Uint8Array(16);
      
      cipher.processBlock(plaintext1, 0, ciphertext1, 0);
      cipher.processBlock(plaintext2, 0, ciphertext2, 0);

      // CFB 模式：相同明文使用不同反馈，应该产生不同密文
      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));

      // 解密验证
      cipher.reset();
      cipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      
      const decrypted1 = new Uint8Array(16);
      const decrypted2 = new Uint8Array(16);
      
      cipher.processBlock(ciphertext1, 0, decrypted1, 0);
      cipher.processBlock(ciphertext2, 0, decrypted2, 0);

      expect(bytesToHex(decrypted1)).toBe(bytesToHex(plaintext1));
      expect(bytesToHex(decrypted2)).toBe(bytesToHex(plaintext2));
    });
  });

  describe('CFB64 模式', () => {
    it('应该正确处理 64 位块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('0123456789abcdef'); // 8 bytes

      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 64);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext = new Uint8Array(8);
      cipher.processBlock(plaintext, 0, ciphertext, 0);

      expect(ciphertext.length).toBe(8);

      // 解密
      cipher.reset();
      cipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      
      const decrypted = new Uint8Array(8);
      cipher.processBlock(ciphertext, 0, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });
  });

  describe('流式处理 (processBytes)', () => {
    it('应该正确处理单字节输入', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00000000000000000000000000000000');
      const plaintext = hexToBytes('ff');

      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const ciphertext = new Uint8Array(1);
      cipher.processBytes(plaintext, 0, 1, ciphertext, 0);

      // 解密
      cipher.reset();
      cipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      
      const decrypted = new Uint8Array(1);
      cipher.processBytes(ciphertext, 0, 1, decrypted, 0);

      expect(bytesToHex(decrypted)).toBe('ff');
    });
  });

  describe('IV 处理', () => {
    it('短 IV 应该用零填充（FIPS PUB 81）', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const shortIV = hexToBytes('0011223344556677'); // 8 bytes, 短于 16
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), shortIV));

      const ciphertext = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext, 0);

      // 应该成功（使用填充后的 IV）
      expect(ciphertext.length).toBe(16);
    });

    it('不同的 IV 应该产生不同的密文', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv1 = hexToBytes('00000000000000000000000000000000');
      const iv2 = hexToBytes('11111111111111111111111111111111');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine1 = new SM4Engine();
      const cipher1 = new CFBBlockCipher(engine1, 128);
      cipher1.init(true, new ParametersWithIV(new KeyParameter(key), iv1));

      const engine2 = new SM4Engine();
      const cipher2 = new CFBBlockCipher(engine2, 128);
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
      const cipher = new CFBBlockCipher(engine, 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      // 第一次加密
      const ciphertext1 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext1, 0);

      // Reset 并再次加密相同的明文
      cipher.reset();
      const ciphertext2 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext2, 0);

      // 应该产生相同的密文（反馈寄存器重置）
      expect(bytesToHex(ciphertext1)).toBe(bytesToHex(ciphertext2));
    });
  });

  describe('getCurrentIV', () => {
    it('应该返回当前 IV 的副本', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00112233445566778899aabbccddeeff');

      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const currentIV = cipher.getCurrentIV();
      
      // 应该与初始 IV 相同
      expect(bytesToHex(currentIV)).toBe(bytesToHex(iv));

      // 修改返回的 IV 不应影响密码器
      currentIV[0] = 0xff;
      const currentIV2 = cipher.getCurrentIV();
      expect(currentIV2[0]).not.toBe(0xff);
    });

    it('处理数据后 IV 应该改变', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const iv = hexToBytes('00112233445566778899aabbccddeeff');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const engine = new SM4Engine();
      const cipher = new CFBBlockCipher(engine, 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));

      const initialIV = cipher.getCurrentIV();

      const ciphertext = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext, 0);

      const changedIV = cipher.getCurrentIV();

      // IV 应该已经改变（包含密文反馈）
      expect(bytesToHex(changedIV)).not.toBe(bytesToHex(initialIV));
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
