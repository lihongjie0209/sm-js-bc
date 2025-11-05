import { describe, it, expect } from 'vitest';
import {
  SM2,
  SM2Engine,
  SM2Mode,
  ECPublicKeyParameters,
  ECPrivateKeyParameters,
  ParametersWithRandom,
  SecureRandom,
  BigIntegers
} from '../../../src/index';

describe('SM2Engine', () => {
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
   * 生成测试用密钥对
   */
  function generateKeyPair() {
    const domainParams = SM2.getParameters();
    const n = SM2.getN();
    const G = SM2.getG();
    
    // 使用固定的私钥用于测试（生产环境应使用随机生成）
    const d = 0x128B2FA8BD433C6C068C8D803DFF79792A519A55171B1B650C23661D15897263n;
    
    // 计算公钥 Q = dG
    const Q = G.multiply(d).normalize();
    
    return {
      privateKey: new ECPrivateKeyParameters(d, domainParams),
      publicKey: new ECPublicKeyParameters(Q, domainParams)
    };
  }

  /**
   * 生成随机密钥对
   */
  function generateRandomKeyPair() {
    const domainParams = SM2.getParameters();
    const n = SM2.getN();
    const G = SM2.getG();
    
    const random = new SecureRandom();
    let d: bigint;
    do {
      d = BigIntegers.createRandomBigInteger(256, random);
    } while (d === 0n || d >= n);
    
    const Q = G.multiply(d).normalize();
    
    return {
      privateKey: new ECPrivateKeyParameters(d, domainParams),
      publicKey: new ECPublicKeyParameters(Q, domainParams)
    };
  }

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt short message in C1C2C3 mode', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Hello SM2!');
      
      // 加密
      const encryptEngine = new SM2Engine(SM2Mode.C1C2C3);
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // 解密
      const decryptEngine = new SM2Engine(SM2Mode.C1C2C3);
      decryptEngine.init(false, keyPair.privateKey);
      const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      
      expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
      expect(new TextDecoder().decode(decrypted)).toBe('Hello SM2!');
    });

    it('should encrypt and decrypt short message in C1C3C2 mode', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Hello SM2!');
      
      // 加密
      const encryptEngine = new SM2Engine(SM2Mode.C1C3C2);
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // 解密
      const decryptEngine = new SM2Engine(SM2Mode.C1C3C2);
      decryptEngine.init(false, keyPair.privateKey);
      const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      
      expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
      expect(new TextDecoder().decode(decrypted)).toBe('Hello SM2!');
    });

    it('should handle empty message', () => {
      const keyPair = generateKeyPair();
      const message = new Uint8Array(0);
      
      const encryptEngine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      
      // Should throw DataLengthException for empty input
      expect(() => {
        encryptEngine.processBlock(message, 0, message.length);
      }).toThrow('input buffer too short');
    });

    it('should handle single byte message', () => {
      const keyPair = generateKeyPair();
      const message = new Uint8Array([0x42]);
      
      const encryptEngine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      const decryptEngine = new SM2Engine();
      decryptEngine.init(false, keyPair.privateKey);
      const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      
      expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
    });
  });

  describe('Different Message Lengths', () => {
    const testLengths = [1, 16, 32, 63, 64, 65, 100, 256, 1000];

    testLengths.forEach(length => {
      it(`should encrypt and decrypt ${length}-byte message`, () => {
        const keyPair = generateKeyPair();
        const message = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          message[i] = i & 0xff;
        }
        
        const encryptEngine = new SM2Engine();
        const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
        encryptEngine.init(true, encryptParams);
        const ciphertext = encryptEngine.processBlock(message, 0, message.length);
        
        const decryptEngine = new SM2Engine();
        decryptEngine.init(false, keyPair.privateKey);
        const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
        
        expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
      });
    });
  });

  describe('Mode Compatibility', () => {
    it('should not decrypt C1C2C3 ciphertext with C1C3C2 mode', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Test message');
      
      // 使用 C1C2C3 模式加密
      const encryptEngine = new SM2Engine(SM2Mode.C1C2C3);
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // 尝试用 C1C3C2 模式解密（应该失败）
      const decryptEngine = new SM2Engine(SM2Mode.C1C3C2);
      decryptEngine.init(false, keyPair.privateKey);
      
      expect(() => {
        decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      }).toThrow();
    });

    it('should not decrypt C1C3C2 ciphertext with C1C2C3 mode', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Test message');
      
      // 使用 C1C3C2 模式加密
      const encryptEngine = new SM2Engine(SM2Mode.C1C3C2);
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // 尝试用 C1C2C3 模式解密（应该失败）
      const decryptEngine = new SM2Engine(SM2Mode.C1C2C3);
      decryptEngine.init(false, keyPair.privateKey);
      
      expect(() => {
        decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      }).toThrow();
    });
  });

  describe('Output Size', () => {
    it('should calculate correct output size', () => {
      const keyPair = generateKeyPair();
      const engine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      engine.init(true, encryptParams);
      
      const inputLengths = [0, 1, 16, 32, 64, 100, 256];
      
      for (const inputLen of inputLengths) {
        const expectedSize = (1 + 2 * 32) + inputLen + 32; // C1(65) + message + C3(32)
        expect(engine.getOutputSize(inputLen)).toBe(expectedSize);
      }
    });
  });

  describe('Ciphertext Structure', () => {
    it('should produce ciphertext with correct length in C1C2C3 mode', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Test');
      
      const encryptEngine = new SM2Engine(SM2Mode.C1C2C3);
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // C1 (65 bytes: 0x04 + 32 bytes x + 32 bytes y) + C2 (message.length) + C3 (32 bytes)
      const expectedLength = 65 + message.length + 32;
      expect(ciphertext.length).toBe(expectedLength);
      
      // C1 应该以 0x04 开始（未压缩点）
      expect(ciphertext[0]).toBe(0x04);
    });

    it('should produce ciphertext with correct length in C1C3C2 mode', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Test');
      
      const encryptEngine = new SM2Engine(SM2Mode.C1C3C2);
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // C1 (65 bytes) + C3 (32 bytes) + C2 (message.length)
      const expectedLength = 65 + 32 + message.length;
      expect(ciphertext.length).toBe(expectedLength);
      
      // C1 应该以 0x04 开始
      expect(ciphertext[0]).toBe(0x04);
    });
  });

  describe('Multiple Key Pairs', () => {
    it('should work with different key pairs', () => {
      const message = new TextEncoder().encode('Secret message');
      
      // 生成两个不同的密钥对
      const keyPair1 = generateRandomKeyPair();
      const keyPair2 = generateRandomKeyPair();
      
      // 使用密钥对1加密
      const engine1 = new SM2Engine();
      const params1 = new ParametersWithRandom(keyPair1.publicKey, new SecureRandom());
      engine1.init(true, params1);
      const ciphertext1 = engine1.processBlock(message, 0, message.length);
      
      // 使用密钥对1解密
      const decrypt1 = new SM2Engine();
      decrypt1.init(false, keyPair1.privateKey);
      const decrypted1 = decrypt1.processBlock(ciphertext1, 0, ciphertext1.length);
      expect(new TextDecoder().decode(decrypted1)).toBe('Secret message');
      
      // 使用密钥对2不能解密密钥对1的密文
      const decrypt2 = new SM2Engine();
      decrypt2.init(false, keyPair2.privateKey);
      expect(() => {
        decrypt2.processBlock(ciphertext1, 0, ciphertext1.length);
      }).toThrow();
    });
  });

  describe('Randomness', () => {
    it('should produce different ciphertexts for same message', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Same message');
      
      const ciphertexts: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const engine = new SM2Engine();
        const params = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
        engine.init(true, params);
        const ciphertext = engine.processBlock(message, 0, message.length);
        ciphertexts.push(bytesToHex(ciphertext));
      }
      
      // 所有密文应该不同（因为随机数k不同）
      expect(ciphertexts[0]).not.toBe(ciphertexts[1]);
      expect(ciphertexts[1]).not.toBe(ciphertexts[2]);
      expect(ciphertexts[0]).not.toBe(ciphertexts[2]);
    });

    it('should decrypt all random ciphertexts to same message', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Same message');
      
      for (let i = 0; i < 5; i++) {
        const encryptEngine = new SM2Engine();
        const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
        encryptEngine.init(true, encryptParams);
        const ciphertext = encryptEngine.processBlock(message, 0, message.length);
        
        const decryptEngine = new SM2Engine();
        decryptEngine.init(false, keyPair.privateKey);
        const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
        
        expect(new TextDecoder().decode(decrypted)).toBe('Same message');
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw on corrupted ciphertext', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Test message');
      
      const encryptEngine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // 修改密文中的一个字节
      ciphertext[ciphertext.length - 1] ^= 0x01;
      
      const decryptEngine = new SM2Engine();
      decryptEngine.init(false, keyPair.privateKey);
      
      expect(() => {
        decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      }).toThrow();
    });

    it('should throw on truncated ciphertext', () => {
      const keyPair = generateKeyPair();
      const message = new TextEncoder().encode('Test message');
      
      const encryptEngine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      // 截断密文
      const truncated = ciphertext.subarray(0, ciphertext.length - 10);
      
      const decryptEngine = new SM2Engine();
      decryptEngine.init(false, keyPair.privateKey);
      
      expect(() => {
        decryptEngine.processBlock(truncated, 0, truncated.length);
      }).toThrow();
    });

    it('should throw on invalid buffer length', () => {
      const keyPair = generateKeyPair();
      const message = new Uint8Array(10);
      
      const engine = new SM2Engine();
      const params = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      engine.init(true, params);
      
      expect(() => {
        engine.processBlock(message, 0, 20); // inLen > buffer
      }).toThrow();
    });

    it('should throw on zero-length input for decryption', () => {
      const keyPair = generateKeyPair();
      const message = new Uint8Array(0);
      
      const engine = new SM2Engine();
      engine.init(false, keyPair.privateKey);
      
      expect(() => {
        engine.processBlock(message, 0, 0);
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle message with all zeros', () => {
      const keyPair = generateKeyPair();
      const message = new Uint8Array(32);
      message.fill(0);
      
      const encryptEngine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      const decryptEngine = new SM2Engine();
      decryptEngine.init(false, keyPair.privateKey);
      const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      
      expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
    });

    it('should handle message with all 0xFF', () => {
      const keyPair = generateKeyPair();
      const message = new Uint8Array(32);
      message.fill(0xFF);
      
      const encryptEngine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      const decryptEngine = new SM2Engine();
      decryptEngine.init(false, keyPair.privateKey);
      const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      
      expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
    });

    it('should handle message with pattern', () => {
      const keyPair = generateKeyPair();
      const message = new Uint8Array(100);
      for (let i = 0; i < message.length; i++) {
        message[i] = (i * 7) & 0xff;
      }
      
      const encryptEngine = new SM2Engine();
      const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      encryptEngine.init(true, encryptParams);
      const ciphertext = encryptEngine.processBlock(message, 0, message.length);
      
      const decryptEngine = new SM2Engine();
      decryptEngine.init(false, keyPair.privateKey);
      const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
      
      expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
    });
  });

  describe('Reusability', () => {
    it('should allow multiple encryptions with same engine', () => {
      const keyPair = generateKeyPair();
      const engine = new SM2Engine();
      const params = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
      engine.init(true, params);
      
      const messages = [
        new TextEncoder().encode('First'),
        new TextEncoder().encode('Second'),
        new TextEncoder().encode('Third')
      ];
      
      for (const message of messages) {
        const ciphertext = engine.processBlock(message, 0, message.length);
        
        const decryptEngine = new SM2Engine();
        decryptEngine.init(false, keyPair.privateKey);
        const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
        
        expect(bytesToHex(decrypted)).toBe(bytesToHex(message));
      }
    });

    it('should allow multiple decryptions with same engine', () => {
      const keyPair = generateKeyPair();
      const messages = [
        new TextEncoder().encode('First'),
        new TextEncoder().encode('Second'),
        new TextEncoder().encode('Third')
      ];
      
      const ciphertexts: Uint8Array[] = [];
      for (const message of messages) {
        const engine = new SM2Engine();
        const params = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
        engine.init(true, params);
        ciphertexts.push(engine.processBlock(message, 0, message.length));
      }
      
      const decryptEngine = new SM2Engine();
      decryptEngine.init(false, keyPair.privateKey);
      
      for (let i = 0; i < messages.length; i++) {
        const decrypted = decryptEngine.processBlock(ciphertexts[i], 0, ciphertexts[i].length);
        expect(bytesToHex(decrypted)).toBe(bytesToHex(messages[i]));
      }
    });
  });
});
