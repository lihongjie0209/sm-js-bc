import { describe, it, expect } from 'vitest';
import { SM4 } from '../../../src/crypto/SM4';

describe('SM4 高级 API', () => {
  describe('密钥生成', () => {
    it('应该生成128位（16字节）的密钥', () => {
      const key = SM4.generateKey();
      expect(key.length).toBe(16);
    });

    it('应该每次生成不同的密钥', () => {
      const key1 = SM4.generateKey();
      const key2 = SM4.generateKey();
      expect(bytesToHex(key1)).not.toBe(bytesToHex(key2));
    });
  });

  describe('块加密/解密', () => {
    it('应该正确加密和解密单个块', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

      const ciphertext = SM4.encryptBlock(plaintext, key);
      const decrypted = SM4.decryptBlock(ciphertext, key);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('块长度不是16字节时应该抛出错误', () => {
      const key = SM4.generateKey();
      const shortBlock = new Uint8Array(15);

      expect(() => {
        SM4.encryptBlock(shortBlock, key);
      }).toThrow('Block must be exactly 16 bytes');
    });
  });

  describe('ECB模式加密/解密', () => {
    it('应该正确加密和解密短消息', () => {
      const key = SM4.generateKey();
      const message = 'Hello, SM4!';
      const plaintext = new TextEncoder().encode(message);

      const ciphertext = SM4.encrypt(plaintext, key);
      const decrypted = SM4.decrypt(ciphertext, key);

      const decryptedMessage = new TextDecoder().decode(decrypted);
      expect(decryptedMessage).toBe(message);
    });

    it('应该正确加密和解密长消息', () => {
      const key = SM4.generateKey();
      const message = '这是一个比较长的测试消息，用于验证SM4算法对于多块数据的处理能力。';
      const plaintext = new TextEncoder().encode(message);

      const ciphertext = SM4.encrypt(plaintext, key);
      const decrypted = SM4.decrypt(ciphertext, key);

      const decryptedMessage = new TextDecoder().decode(decrypted);
      expect(decryptedMessage).toBe(message);
    });

    it('应该正确处理正好16字节的消息', () => {
      const key = SM4.generateKey();
      const plaintext = new Uint8Array(16).fill(0x42);

      const ciphertext = SM4.encrypt(plaintext, key);
      const decrypted = SM4.decrypt(ciphertext, key);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('应该正确处理32字节的消息', () => {
      const key = SM4.generateKey();
      const plaintext = new Uint8Array(32).fill(0x42);

      const ciphertext = SM4.encrypt(plaintext, key);
      const decrypted = SM4.decrypt(ciphertext, key);

      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('密文长度应该是块大小的倍数', () => {
      const key = SM4.generateKey();
      const plaintext = new TextEncoder().encode('Test message');

      const ciphertext = SM4.encrypt(plaintext, key);

      expect(ciphertext.length % 16).toBe(0);
      expect(ciphertext.length).toBeGreaterThan(plaintext.length);
    });

    it('不同的明文应该产生不同的密文', () => {
      const key = SM4.generateKey();
      const plaintext1 = new TextEncoder().encode('Message 1');
      const plaintext2 = new TextEncoder().encode('Message 2');

      const ciphertext1 = SM4.encrypt(plaintext1, key);
      const ciphertext2 = SM4.encrypt(plaintext2, key);

      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));
    });

    it('不同的密钥应该产生不同的密文', () => {
      const key1 = SM4.generateKey();
      const key2 = SM4.generateKey();
      const plaintext = new TextEncoder().encode('Test message');

      const ciphertext1 = SM4.encrypt(plaintext, key1);
      const ciphertext2 = SM4.encrypt(plaintext, key2);

      expect(bytesToHex(ciphertext1)).not.toBe(bytesToHex(ciphertext2));
    });
  });

  describe('PKCS7 填充', () => {
    it('应该正确处理需要完整填充块的数据', () => {
      const key = SM4.generateKey();
      const plaintext = new Uint8Array(16).fill(0x42); // 正好1个块

      const ciphertext = SM4.encrypt(plaintext, key);
      
      // PKCS7填充会添加一个完整的填充块
      expect(ciphertext.length).toBe(32);

      const decrypted = SM4.decrypt(ciphertext, key);
      expect(bytesToHex(decrypted)).toBe(bytesToHex(plaintext));
    });

    it('应该正确处理空数据', () => {
      const key = SM4.generateKey();
      const plaintext = new Uint8Array(0);

      const ciphertext = SM4.encrypt(plaintext, key);
      
      // PKCS7填充会添加一个完整的填充块
      expect(ciphertext.length).toBe(16);

      const decrypted = SM4.decrypt(ciphertext, key);
      expect(decrypted.length).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('密钥长度错误时应该抛出错误', () => {
      const wrongKey = new Uint8Array(15);
      const plaintext = new TextEncoder().encode('Test');

      expect(() => {
        SM4.encrypt(plaintext, wrongKey);
      }).toThrow('SM4 requires a 128 bit (16 byte) key');
    });

    it('密文长度不是块大小倍数时应该抛出错误', () => {
      const key = SM4.generateKey();
      const invalidCiphertext = new Uint8Array(15); // 不是16的倍数

      expect(() => {
        SM4.decrypt(invalidCiphertext, key);
      }).toThrow('Ciphertext length must be a multiple of block size');
    });

    it('使用错误的密钥解密应该失败', () => {
      const correctKey = SM4.generateKey();
      const wrongKey = SM4.generateKey();
      const plaintext = new TextEncoder().encode('Secret message');

      const ciphertext = SM4.encrypt(plaintext, correctKey);

      // 使用错误的密钥解密会导致填充验证失败
      expect(() => {
        SM4.decrypt(ciphertext, wrongKey);
      }).toThrow();
    });
  });

  describe('与底层引擎的一致性', () => {
    it('高级API应该与直接使用引擎产生相同结果', () => {
      const key = hexToBytes('0123456789abcdeffedcba9876543210');
      const block = hexToBytes('0123456789abcdeffedcba9876543210');

      const ciphertext = SM4.encryptBlock(block, key);
      const expected = hexToBytes('681edf34d206965e86b3e94f536e4246');

      expect(bytesToHex(ciphertext)).toBe(bytesToHex(expected));
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
