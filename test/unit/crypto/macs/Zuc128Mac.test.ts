import { describe, it, expect } from 'vitest';
import { Zuc128Mac } from '../../../../src/crypto/macs/Zuc128Mac';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';
import { ParametersWithIV } from '../../../../src/crypto/params/ParametersWithIV';

describe('Zuc128Mac', () => {
  describe('Basic functionality', () => {
    it('should have correct algorithm name', () => {
      const mac = new Zuc128Mac();
      expect(mac.getAlgorithmName()).toBe('ZUC-128-MAC');
    });

    it('should have correct MAC size', () => {
      const mac = new Zuc128Mac();
      expect(mac.getMacSize()).toBe(4); // 32 bits = 4 bytes
    });

    it('should require ParametersWithIV', () => {
      const mac = new Zuc128Mac();
      const key = new Uint8Array(16);
      const params = new KeyParameter(key);

      expect(() => mac.init(params)).toThrow('Zuc128Mac requires ParametersWithIV');
    });
  });

  describe('MAC computation', () => {
    it('should compute MAC for empty message', () => {
      const mac = new Zuc128Mac();
      const key = new Uint8Array(16).fill(0);
      const iv = new Uint8Array(16).fill(0);
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      mac.init(params);

      const output = new Uint8Array(4);
      const len = mac.doFinal(output, 0);

      expect(len).toBe(4);
      expect(output.length).toBe(4);
    });

    it('should compute MAC for single byte', () => {
      const mac = new Zuc128Mac();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      mac.init(params);
      mac.update(0x42);

      const output = new Uint8Array(4);
      mac.doFinal(output, 0);

      expect(output.length).toBe(4);
    });

    it('should compute MAC for byte array', () => {
      const mac = new Zuc128Mac();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      mac.init(params);

      const message = new Uint8Array(100);
      for (let i = 0; i < 100; i++) {
        message[i] = i & 0xff;
      }

      mac.updateArray(message, 0, 100);

      const output = new Uint8Array(4);
      mac.doFinal(output, 0);

      expect(output.length).toBe(4);
    });

    it('should produce same MAC for same input', () => {
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }

      const message = new Uint8Array(50);
      for (let i = 0; i < 50; i++) {
        message[i] = i & 0xff;
      }

      const mac1 = new Zuc128Mac();
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      mac1.init(params);
      mac1.updateArray(message, 0, 50);
      const output1 = new Uint8Array(4);
      mac1.doFinal(output1, 0);

      const mac2 = new Zuc128Mac();
      mac2.init(params);
      mac2.updateArray(message, 0, 50);
      const output2 = new Uint8Array(4);
      mac2.doFinal(output2, 0);

      expect(output1).toEqual(output2);
    });

    it('should produce different MACs for different messages', () => {
      const key = new Uint8Array(16).fill(1);
      const iv = new Uint8Array(16).fill(2);
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      const message1 = new Uint8Array(20).fill(1);
      const message2 = new Uint8Array(20).fill(2);

      const mac1 = new Zuc128Mac();
      mac1.init(params);
      mac1.updateArray(message1, 0, 20);
      const output1 = new Uint8Array(4);
      mac1.doFinal(output1, 0);

      const mac2 = new Zuc128Mac();
      mac2.init(params);
      mac2.updateArray(message2, 0, 20);
      const output2 = new Uint8Array(4);
      mac2.doFinal(output2, 0);

      expect(output1).not.toEqual(output2);
    });

    it('should produce different MACs for different keys', () => {
      const key1 = new Uint8Array(16).fill(1);
      const key2 = new Uint8Array(16).fill(2);
      const iv = new Uint8Array(16).fill(0);

      const message = new Uint8Array(20).fill(5);

      const mac1 = new Zuc128Mac();
      mac1.init(new ParametersWithIV(new KeyParameter(key1), iv));
      mac1.updateArray(message, 0, 20);
      const output1 = new Uint8Array(4);
      mac1.doFinal(output1, 0);

      const mac2 = new Zuc128Mac();
      mac2.init(new ParametersWithIV(new KeyParameter(key2), iv));
      mac2.updateArray(message, 0, 20);
      const output2 = new Uint8Array(4);
      mac2.doFinal(output2, 0);

      expect(output1).not.toEqual(output2);
    });
  });

  describe('Reset functionality', () => {
    it('should reset MAC state', () => {
      const mac = new Zuc128Mac();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      const message = new Uint8Array(30);
      for (let i = 0; i < 30; i++) {
        message[i] = i & 0xff;
      }

      mac.init(params);
      mac.updateArray(message, 0, 30);
      const output1 = new Uint8Array(4);
      mac.doFinal(output1, 0);

      // doFinal should reset
      mac.updateArray(message, 0, 30);
      const output2 = new Uint8Array(4);
      mac.doFinal(output2, 0);

      expect(output1).toEqual(output2);
    });

    it('should reset explicitly', () => {
      const mac = new Zuc128Mac();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      const message = new Uint8Array(30);
      for (let i = 0; i < 30; i++) {
        message[i] = i & 0xff;
      }

      mac.init(params);
      mac.updateArray(message, 0, 30);
      const output1 = new Uint8Array(4);
      mac.doFinal(output1, 0);

      mac.init(params);
      mac.updateArray(message, 0, 30);
      const output2 = new Uint8Array(4);
      mac.doFinal(output2, 0);

      expect(output1).toEqual(output2);
    });
  });

  describe('Update modes', () => {
    it('should handle mixed update and updateArray', () => {
      const mac = new Zuc128Mac();
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        key[i] = i;
        iv[i] = i + 16;
      }
      const params = new ParametersWithIV(new KeyParameter(key), iv);

      mac.init(params);
      
      // Update single bytes
      mac.update(1);
      mac.update(2);
      mac.update(3);

      // Update array
      const arr = new Uint8Array([4, 5, 6, 7, 8]);
      mac.updateArray(arr, 0, 5);

      const output = new Uint8Array(4);
      mac.doFinal(output, 0);

      expect(output.length).toBe(4);
    });
  });
});
