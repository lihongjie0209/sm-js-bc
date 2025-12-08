import { describe, it, expect } from 'vitest';
import { ZUCEngine } from '../../../../src/crypto/engines/ZUCEngine';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';
import { ParametersWithIV } from '../../../../src/crypto/params/ParametersWithIV';

describe('ZUCEngine', () => {
  describe('Basic functionality', () => {
    it('should have correct algorithm name', () => {
      const engine = new ZUCEngine();
      expect(engine.getAlgorithmName()).toBe('ZUC-128');
    });

    it('should require 128-bit key', () => {
      const engine = new ZUCEngine();
      const key = new Uint8Array(15); // Wrong size
      const iv = new Uint8Array(16);
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      expect(() => engine.init(true, params)).toThrow('ZUC requires a 128-bit key');
    });

    it('should require 128-bit IV', () => {
      const engine = new ZUCEngine();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(15); // Wrong size
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      expect(() => engine.init(true, params)).toThrow('ZUC requires a 128-bit IV');
    });

    it('should require ParametersWithIV', () => {
      const engine = new ZUCEngine();
      const key = new Uint8Array(16);
      const params = new KeyParameter(key);

      expect(() => engine.init(true, params)).toThrow(
        'ZUC init parameters must include an IV'
      );
    });
  });

  describe('GM/T 0001-2012 and 3GPP TS 35.221 Test Vectors', () => {
    it('Test Set 1: All zeros (3GPP TS 35.221)', () => {
      const engine = new ZUCEngine();
      const key = new Uint8Array(16); // All zeros
      const iv = new Uint8Array(16);  // All zeros
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      engine.init(true, params);

      // Generate keystream by XORing with zeros
      const input = new Uint8Array(8);
      const output = new Uint8Array(8);
      
      engine.processBytes(input, 0, 8, output, 0);

      // Expected keystream from ZUC specification (3GPP TS 35.221)
      // First keystream word: 0x27BEDE74
      // Second keystream word: 0x018082DA
      const expected = new Uint8Array([
        0x27, 0xBE, 0xDE, 0x74,  // First word
        0x01, 0x80, 0x82, 0xDA   // Second word
      ]);
      
      expect(output).toEqual(expected);
    });

    it('Test Set 2: All ones (3GPP TS 35.221)', () => {
      const engine = new ZUCEngine();
      
      const key = new Uint8Array(16).fill(0xFF);
      const iv = new Uint8Array(16).fill(0xFF);
      
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      engine.init(true, params);

      const input = new Uint8Array(8);
      const output = new Uint8Array(8);
      
      engine.processBytes(input, 0, 8, output, 0);
      
      // Expected keystream from ZUC specification (3GPP TS 35.221)
      // First keystream word: 0x0657CFA0
      // Second keystream word: 0x7096398B
      const expected = new Uint8Array([
        0x06, 0x57, 0xCF, 0xA0,  // First word
        0x70, 0x96, 0x39, 0x8B   // Second word
      ]);
      
      expect(output).toEqual(expected);
    });

    it('Test Case: First 2 words (GM/T 0001-2012)', () => {
      const engine = new ZUCEngine();
      
      const key = new Uint8Array(16); // All zeros
      const iv = new Uint8Array(16);  // All zeros
      
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      engine.init(true, params);

      const input = new Uint8Array(8);
      const output = new Uint8Array(8);
      
      engine.processBytes(input, 0, 8, output, 0);
      
      // Expected first 8 bytes from GM/T 0001-2012
      const expected = new Uint8Array([
        0x27, 0xBE, 0xDE, 0x74,  // First keystream word
        0x01, 0x80, 0x82, 0xDA   // Second keystream word
      ]);
      
      expect(output).toEqual(expected);
    });
  });

  describe('Stream cipher properties', () => {
    it('should produce same output for same key/IV', () => {
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }

      const engine1 = new ZUCEngine();
      const engine2 = new ZUCEngine();
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      engine1.init(true, params);
      engine2.init(true, params);

      const input = new Uint8Array(100);
      for (let i = 0; i < 100; i++) {
        input[i] = i & 0xff;
      }

      const output1 = new Uint8Array(100);
      const output2 = new Uint8Array(100);

      engine1.processBytes(input, 0, 100, output1, 0);
      engine2.processBytes(input, 0, 100, output2, 0);

      expect(output1).toEqual(output2);
    });

    it('should encrypt and decrypt correctly', () => {
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i * 2;
        iv[i] = i * 3;
      }

      const plaintext = new Uint8Array(100);
      for (let i = 0; i < 100; i++) {
        plaintext[i] = i & 0xff;
      }

      // Encrypt
      const encEngine = new ZUCEngine();
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      encEngine.init(true, params);

      const ciphertext = new Uint8Array(100);
      encEngine.processBytes(plaintext, 0, 100, ciphertext, 0);

      // Decrypt
      const decEngine = new ZUCEngine();
      decEngine.init(false, params);

      const decrypted = new Uint8Array(100);
      decEngine.processBytes(ciphertext, 0, 100, decrypted, 0);

      expect(decrypted).toEqual(plaintext);
    });

    it('should produce different output for different keys', () => {
      const key1 = new Uint8Array(16).fill(1);
      const key2 = new Uint8Array(16).fill(2);
      const iv = new Uint8Array(16).fill(0);

      const engine1 = new ZUCEngine();
      const engine2 = new ZUCEngine();

      engine1.init(true, new ParametersWithIV(new KeyParameter(key1), iv));
      engine2.init(true, new ParametersWithIV(new KeyParameter(key2), iv));

      const input = new Uint8Array(32);
      const output1 = new Uint8Array(32);
      const output2 = new Uint8Array(32);

      engine1.processBytes(input, 0, 32, output1, 0);
      engine2.processBytes(input, 0, 32, output2, 0);

      expect(output1).not.toEqual(output2);
    });

    it('should produce different output for different IVs', () => {
      const key = new Uint8Array(16).fill(1);
      const iv1 = new Uint8Array(16).fill(1);
      const iv2 = new Uint8Array(16).fill(2);

      const engine1 = new ZUCEngine();
      const engine2 = new ZUCEngine();

      engine1.init(true, new ParametersWithIV(new KeyParameter(key), iv1));
      engine2.init(true, new ParametersWithIV(new KeyParameter(key), iv2));

      const input = new Uint8Array(32);
      const output1 = new Uint8Array(32);
      const output2 = new Uint8Array(32);

      engine1.processBytes(input, 0, 32, output1, 0);
      engine2.processBytes(input, 0, 32, output2, 0);

      expect(output1).not.toEqual(output2);
    });
  });

  describe('Reset functionality', () => {
    it('should reset to initial state', () => {
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }

      const engine = new ZUCEngine();
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      engine.init(true, params);

      const input = new Uint8Array(32);
      const output1 = new Uint8Array(32);
      const output2 = new Uint8Array(32);

      engine.processBytes(input, 0, 32, output1, 0);

      engine.reset();

      engine.processBytes(input, 0, 32, output2, 0);

      expect(output1).toEqual(output2);
    });
  });

  describe('Byte-by-byte processing', () => {
    it('should produce same output for returnByte and processBytes', () => {
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }

      const input = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        input[i] = i;
      }

      // Process with processBytes
      const engine1 = new ZUCEngine();
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      engine1.init(true, params);
      const output1 = new Uint8Array(32);
      engine1.processBytes(input, 0, 32, output1, 0);

      // Process with returnByte
      const engine2 = new ZUCEngine();
      engine2.init(true, params);
      const output2 = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        output2[i] = engine2.returnByte(input[i]);
      }

      expect(output1).toEqual(output2);
    });
  });

  describe('Error handling', () => {
    it('should throw error when not initialized', () => {
      const engine = new ZUCEngine();
      const input = new Uint8Array(16);
      const output = new Uint8Array(16);

      expect(() => engine.processBytes(input, 0, 16, output, 0)).toThrow(
        'ZUC not initialized'
      );
    });

    it('should throw error for input buffer too short', () => {
      const engine = new ZUCEngine();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      engine.init(true, params);

      const input = new Uint8Array(10);
      const output = new Uint8Array(20);

      expect(() => engine.processBytes(input, 0, 15, output, 0)).toThrow(
        'input buffer too short'
      );
    });

    it('should throw error for output buffer too short', () => {
      const engine = new ZUCEngine();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      engine.init(true, params);

      const input = new Uint8Array(20);
      const output = new Uint8Array(10);

      expect(() => engine.processBytes(input, 0, 15, output, 0)).toThrow(
        'output buffer too short'
      );
    });
  });
});
