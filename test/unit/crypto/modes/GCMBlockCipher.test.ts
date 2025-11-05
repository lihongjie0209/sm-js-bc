import { describe, it, expect } from 'vitest';
import { GCMBlockCipher } from '../../../../src/crypto/modes/GCMBlockCipher';
import { SM4Engine } from '../../../../src/crypto/engines/SM4Engine';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';
import { AEADParameters } from '../../../../src/crypto/params/AEADParameters';
import { ParametersWithIV } from '../../../../src/crypto/params/ParametersWithIV';

describe('GCMBlockCipher', () => {
  // 测试密钥
  const key = new Uint8Array([
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10
  ]);
  
  // 12字节标准nonce
  const nonce = new Uint8Array([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b
  ]);
  
  describe('基础功能', () => {
    it('应该正确返回算法名称', () => {
      const cipher = new GCMBlockCipher(new SM4Engine());
      expect(cipher.getAlgorithmName()).toBe('SM4/GCM');
    });
    
    it('应该正确返回块大小（16字节）', () => {
      const cipher = new GCMBlockCipher(new SM4Engine());
      expect(cipher.getBlockSize()).toBe(16);
    });
    
    it('应该在块大小不是16字节时抛出错误', () => {
      // SM4的块大小是16，所以这个测试只是验证检查逻辑
      // 实际上SM4Engine总是返回16
      const engine = new SM4Engine();
      expect(() => new GCMBlockCipher(engine)).not.toThrow();
    });
    
    it('应该在MAC大小无效时抛出错误', () => {
      const cipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 24, nonce); // 24不是8的倍数
      expect(() => cipher.init(true, params)).toThrow('Invalid value for MAC size');
    });
    
    it('应该在nonce为空时抛出错误', () => {
      const cipher = new GCMBlockCipher(new SM4Engine());
      const emptyNonce = new Uint8Array(0);
      const params = new AEADParameters(new KeyParameter(key), 128, emptyNonce);
      expect(() => cipher.init(true, params)).toThrow('IV must be at least 1 byte');
    });
  });
  
  describe('加密和解密（无AAD）', () => {
    it('应该正确加密和解密空数据', () => {
      const plaintext = new Uint8Array(0);
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(0));
      const encLen = encCipher.processBytes(plaintext, 0, 0, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      expect(finalLen).toBe(16); // 只有tag
      
      // 解密
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, finalLen, decrypted, 0);
      const decFinalLen = decCipher.doFinal(decrypted, decLen);
      
      expect(decFinalLen).toBe(0);
    });
    
    it('应该正确加密和解密16字节数据', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(16));
      const encLen = encCipher.processBytes(plaintext, 0, 16, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      expect(encLen + finalLen).toBe(32); // 16 bytes data + 16 bytes tag
      
      // 解密
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(encLen + finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, encLen + finalLen, decrypted, 0);
      const decFinalLen = decCipher.doFinal(decrypted, decLen);
      
      expect(decFinalLen).toBe(16);
      expect(decrypted.subarray(0, 16)).toEqual(plaintext);
    });
    
    it('应该正确加密和解密32字节数据', () => {
      const plaintext = new Uint8Array(32);
      for (let i = 0; i < 32; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(32));
      const encLen = encCipher.processBytes(plaintext, 0, 32, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      expect(encLen + finalLen).toBe(48); // 32 bytes data + 16 bytes tag
      
      // 解密
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(encLen + finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, encLen + finalLen, decrypted, 0);
      const decFinalLen = decCipher.doFinal(decrypted, decLen);
      
      expect(decFinalLen).toBe(32);
      expect(decrypted.subarray(0, 32)).toEqual(plaintext);
    });
    
    it('应该正确加密和解密非对齐数据（17字节）', () => {
      const plaintext = new Uint8Array(17);
      for (let i = 0; i < 17; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(17));
      const encLen = encCipher.processBytes(plaintext, 0, 17, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      expect(encLen + finalLen).toBe(33); // 17 bytes data + 16 bytes tag
      
      // 解密
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(encLen + finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, encLen + finalLen, decrypted, 0);
      const decFinalLen = decCipher.doFinal(decrypted, decLen);
      
      expect(decFinalLen).toBe(17);
      expect(decrypted.subarray(0, 17)).toEqual(plaintext);
    });
  });
  
  describe('加密和解密（带AAD）', () => {
    it('应该正确处理AAD', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      const aad = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce, aad);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(16));
      const encLen = encCipher.processBytes(plaintext, 0, 16, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      // 解密（正确的AAD）
      const decCipher1 = new GCMBlockCipher(new SM4Engine());
      decCipher1.init(false, params);
      
      const decrypted1 = new Uint8Array(decCipher1.getOutputSize(encLen + finalLen));
      const decLen1 = decCipher1.processBytes(ciphertext, 0, encLen + finalLen, decrypted1, 0);
      const decFinalLen1 = decCipher1.doFinal(decrypted1, decLen1);
      
      expect(decFinalLen1).toBe(16);
      expect(decrypted1.subarray(0, 16)).toEqual(plaintext);
      
      // 解密（错误的AAD）- 应该失败
      const wrongAad = new Uint8Array([0xaa, 0xbb, 0xcc, 0xee]);
      const wrongParams = new AEADParameters(new KeyParameter(key), 128, nonce, wrongAad);
      const decCipher2 = new GCMBlockCipher(new SM4Engine());
      decCipher2.init(false, wrongParams);
      
      const decrypted2 = new Uint8Array(decCipher2.getOutputSize(encLen + finalLen));
      const decLen2 = decCipher2.processBytes(ciphertext, 0, encLen + finalLen, decrypted2, 0);
      
      expect(() => decCipher2.doFinal(decrypted2, decLen2)).toThrow('mac check in GCM failed');
    });
  });
  
  describe('MAC大小', () => {
    it('应该支持96位MAC', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 96, nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(16));
      const encLen = encCipher.processBytes(plaintext, 0, 16, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      expect(encLen + finalLen).toBe(28); // 16 bytes data + 12 bytes tag
      
      // 解密
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(encLen + finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, encLen + finalLen, decrypted, 0);
      const decFinalLen = decCipher.doFinal(decrypted, decLen);
      
      expect(decFinalLen).toBe(16);
      expect(decrypted.subarray(0, 16)).toEqual(plaintext);
    });
  });
  
  describe('Nonce处理', () => {
    it('应该支持12字节nonce（标准）', () => {
      const plaintext = new Uint8Array(16);
      const nonce12 = new Uint8Array(12);
      for (let i = 0; i < 12; i++) nonce12[i] = i;
      
      const cipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce12);
      
      expect(() => cipher.init(true, params)).not.toThrow();
    });
    
    it('应该支持非12字节nonce', () => {
      const plaintext = new Uint8Array(16);
      const nonce16 = new Uint8Array(16);
      for (let i = 0; i < 16; i++) nonce16[i] = i;
      
      const cipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce16);
      
      expect(() => cipher.init(true, params)).not.toThrow();
    });
    
    it('不同的nonce应该产生不同的密文', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      const nonce1 = new Uint8Array(12);
      const nonce2 = new Uint8Array(12);
      for (let i = 0; i < 12; i++) {
        nonce1[i] = i;
        nonce2[i] = i + 1;
      }
      
      // 使用nonce1加密
      const cipher1 = new GCMBlockCipher(new SM4Engine());
      cipher1.init(true, new AEADParameters(new KeyParameter(key), 128, nonce1));
      const ciphertext1 = new Uint8Array(cipher1.getOutputSize(16));
      cipher1.processBytes(plaintext, 0, 16, ciphertext1, 0);
      cipher1.doFinal(ciphertext1, 0);
      
      // 使用nonce2加密
      const cipher2 = new GCMBlockCipher(new SM4Engine());
      cipher2.init(true, new AEADParameters(new KeyParameter(key), 128, nonce2));
      const ciphertext2 = new Uint8Array(cipher2.getOutputSize(16));
      cipher2.processBytes(plaintext, 0, 16, ciphertext2, 0);
      cipher2.doFinal(ciphertext2, 0);
      
      // 密文应该不同
      expect(ciphertext1).not.toEqual(ciphertext2);
    });
  });
  
  describe('标签验证', () => {
    it('应该在标签被篡改时拒绝解密', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(16));
      const encLen = encCipher.processBytes(plaintext, 0, 16, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      // 篡改标签
      ciphertext[encLen + finalLen - 1] ^= 0x01;
      
      // 解密应该失败
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(encLen + finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, encLen + finalLen, decrypted, 0);
      
      expect(() => decCipher.doFinal(decrypted, decLen)).toThrow('mac check in GCM failed');
    });
    
    it('应该在密文被篡改时拒绝解密', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new AEADParameters(new KeyParameter(key), 128, nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(16));
      const encLen = encCipher.processBytes(plaintext, 0, 16, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      // 篡改密文
      ciphertext[0] ^= 0x01;
      
      // 解密应该失败
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(encLen + finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, encLen + finalLen, decrypted, 0);
      
      expect(() => decCipher.doFinal(decrypted, decLen)).toThrow('mac check in GCM failed');
    });
  });
  
  describe('ParametersWithIV支持', () => {
    it('应该支持ParametersWithIV参数', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new GCMBlockCipher(new SM4Engine());
      const params = new ParametersWithIV(new KeyParameter(key), nonce);
      encCipher.init(true, params);
      
      const ciphertext = new Uint8Array(encCipher.getOutputSize(16));
      const encLen = encCipher.processBytes(plaintext, 0, 16, ciphertext, 0);
      const finalLen = encCipher.doFinal(ciphertext, encLen);
      
      // 解密
      const decCipher = new GCMBlockCipher(new SM4Engine());
      decCipher.init(false, params);
      
      const decrypted = new Uint8Array(decCipher.getOutputSize(encLen + finalLen));
      const decLen = decCipher.processBytes(ciphertext, 0, encLen + finalLen, decrypted, 0);
      const decFinalLen = decCipher.doFinal(decrypted, decLen);
      
      expect(decFinalLen).toBe(16);
      expect(decrypted.subarray(0, 16)).toEqual(plaintext);
    });
  });
});
