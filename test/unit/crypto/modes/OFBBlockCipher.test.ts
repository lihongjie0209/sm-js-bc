import { describe, it, expect } from 'vitest';
import { OFBBlockCipher } from '../../../../src/crypto/modes/OFBBlockCipher';
import { SM4Engine } from '../../../../src/crypto/engines/SM4Engine';
import { KeyParameter } from '../../../../src/crypto/params/KeyParameter';
import { ParametersWithIV } from '../../../../src/crypto/params/ParametersWithIV';

describe('OFBBlockCipher', () => {
  // 测试密钥和IV
  const key = new Uint8Array([
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10
  ]);
  
  const iv = new Uint8Array([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
  ]);
  
  describe('基础功能', () => {
    it('应该正确返回算法名称（OFB128）', () => {
      const cipher = new OFBBlockCipher(new SM4Engine(), 128);
      expect(cipher.getAlgorithmName()).toBe('SM4/OFB128');
    });
    
    it('应该正确返回算法名称（OFB64）', () => {
      const cipher = new OFBBlockCipher(new SM4Engine(), 64);
      expect(cipher.getAlgorithmName()).toBe('SM4/OFB64');
    });
    
    it('应该正确返回块大小（128位 = 16字节）', () => {
      const cipher = new OFBBlockCipher(new SM4Engine(), 128);
      expect(cipher.getBlockSize()).toBe(16);
    });
    
    it('应该正确返回块大小（64位 = 8字节）', () => {
      const cipher = new OFBBlockCipher(new SM4Engine(), 64);
      expect(cipher.getBlockSize()).toBe(8);
    });
    
    it('应该在bitBlockSize不是8的倍数时抛出错误', () => {
      expect(() => new OFBBlockCipher(new SM4Engine(), 100)).toThrow('OFB100 not supported');
    });
    
    it('应该在bitBlockSize小于8时抛出错误', () => {
      expect(() => new OFBBlockCipher(new SM4Engine(), 4)).toThrow('OFB4 not supported');
    });
    
    it('应该在bitBlockSize大于密码块大小时抛出错误', () => {
      expect(() => new OFBBlockCipher(new SM4Engine(), 256)).toThrow('OFB256 not supported');
    });
  });
  
  describe('OFB128 模式加密和解密', () => {
    it('应该正确加密单个块', () => {
      const cipher = new OFBBlockCipher(new SM4Engine(), 128);
      const params = new ParametersWithIV(new KeyParameter(key), iv);
      cipher.init(true, params);
      
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      const ciphertext = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext, 0);
      
      // 密文不应该等于明文
      expect(ciphertext).not.toEqual(plaintext);
    });
    
    it('应该正确完成加密-解密往返（单个块）', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(16);
      encCipher.processBlock(plaintext, 0, ciphertext, 0);
      
      // 解密（使用新实例）
      const decCipher = new OFBBlockCipher(new SM4Engine(), 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(16);
      decCipher.processBlock(ciphertext, 0, decrypted, 0);
      
      expect(decrypted).toEqual(plaintext);
    });
    
    it('应该正确处理多个块', () => {
      const plaintext = new Uint8Array(32);
      for (let i = 0; i < 32; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(32);
      encCipher.processBytes(plaintext, 0, 32, ciphertext, 0);
      
      // 解密
      const decCipher = new OFBBlockCipher(new SM4Engine(), 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(32);
      decCipher.processBytes(ciphertext, 0, 32, decrypted, 0);
      
      expect(decrypted).toEqual(plaintext);
    });
    
    it('加密和解密应该使用相同的操作（OFB特性）', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      // "加密"
      const cipher1 = new OFBBlockCipher(new SM4Engine(), 128);
      cipher1.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const result1 = new Uint8Array(16);
      cipher1.processBlock(plaintext, 0, result1, 0);
      
      // "解密"（应该产生相同的密钥流）
      const cipher2 = new OFBBlockCipher(new SM4Engine(), 128);
      cipher2.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const result2 = new Uint8Array(16);
      cipher2.processBlock(plaintext, 0, result2, 0);
      
      // 两者应该相同（因为OFB模式下加密和解密操作相同）
      expect(result1).toEqual(result2);
    });
  });
  
  describe('OFB64 模式', () => {
    it('应该正确处理8字节块', () => {
      const plaintext = new Uint8Array(8);
      for (let i = 0; i < 8; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 64);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(8);
      encCipher.processBlock(plaintext, 0, ciphertext, 0);
      
      // 解密
      const decCipher = new OFBBlockCipher(new SM4Engine(), 64);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(8);
      decCipher.processBlock(ciphertext, 0, decrypted, 0);
      
      expect(decrypted).toEqual(plaintext);
    });
  });
  
  describe('流式处理', () => {
    it('应该正确处理单字节数据', () => {
      const plaintext = new Uint8Array([0x42]);
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(1);
      encCipher.processBytes(plaintext, 0, 1, ciphertext, 0);
      
      // 解密
      const decCipher = new OFBBlockCipher(new SM4Engine(), 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(1);
      decCipher.processBytes(ciphertext, 0, 1, decrypted, 0);
      
      expect(decrypted).toEqual(plaintext);
    });
    
    it('应该正确处理17字节数据（16+1）', () => {
      const plaintext = new Uint8Array(17);
      for (let i = 0; i < 17; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(17);
      const encLen = encCipher.processBytes(plaintext, 0, 17, ciphertext, 0);
      expect(encLen).toBe(17);
      
      // 解密
      const decCipher = new OFBBlockCipher(new SM4Engine(), 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(17);
      const decLen = decCipher.processBytes(ciphertext, 0, 17, decrypted, 0);
      expect(decLen).toBe(17);
      
      expect(decrypted).toEqual(plaintext);
    });
    
    it('应该正确处理18字节数据（16+2）', () => {
      const plaintext = new Uint8Array(18);
      for (let i = 0; i < 18; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(18);
      encCipher.processBytes(plaintext, 0, 18, ciphertext, 0);
      
      // 解密
      const decCipher = new OFBBlockCipher(new SM4Engine(), 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(18);
      decCipher.processBytes(ciphertext, 0, 18, decrypted, 0);
      
      expect(decrypted).toEqual(plaintext);
    });
    
    it('应该正确处理20字节数据（16+4）', () => {
      const plaintext = new Uint8Array(20);
      for (let i = 0; i < 20; i++) plaintext[i] = i;
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(20);
      encCipher.processBytes(plaintext, 0, 20, ciphertext, 0);
      
      // 解密
      const decCipher = new OFBBlockCipher(new SM4Engine(), 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(20);
      decCipher.processBytes(ciphertext, 0, 20, decrypted, 0);
      
      expect(decrypted).toEqual(plaintext);
    });
    
    it('应该正确处理任意长度数据（33字节）', () => {
      const plaintext = new Uint8Array(33);
      for (let i = 0; i < 33; i++) plaintext[i] = i & 0xff;
      
      // 加密
      const encCipher = new OFBBlockCipher(new SM4Engine(), 128);
      encCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext = new Uint8Array(33);
      encCipher.processBytes(plaintext, 0, 33, ciphertext, 0);
      
      // 解密
      const decCipher = new OFBBlockCipher(new SM4Engine(), 128);
      decCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      const decrypted = new Uint8Array(33);
      decCipher.processBytes(ciphertext, 0, 33, decrypted, 0);
      
      expect(decrypted).toEqual(plaintext);
    });
  });
  
  describe('IV 处理', () => {
    it('应该正确处理短IV（FIPS PUB 81）', () => {
      const shortIV = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      const cipher = new OFBBlockCipher(new SM4Engine(), 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), shortIV));
      
      const ciphertext = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext, 0);
      
      // 应该能够成功处理（IV会被前置零填充）
      expect(ciphertext).not.toEqual(plaintext);
    });
    
    it('应该使用不同的IV产生不同的密文', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      const iv2 = new Uint8Array(16);
      for (let i = 0; i < 16; i++) iv2[i] = 0xff - i;
      
      // 使用第一个IV加密
      const cipher1 = new OFBBlockCipher(new SM4Engine(), 128);
      cipher1.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      const ciphertext1 = new Uint8Array(16);
      cipher1.processBlock(plaintext, 0, ciphertext1, 0);
      
      // 使用第二个IV加密
      const cipher2 = new OFBBlockCipher(new SM4Engine(), 128);
      cipher2.init(true, new ParametersWithIV(new KeyParameter(key), iv2));
      const ciphertext2 = new Uint8Array(16);
      cipher2.processBlock(plaintext, 0, ciphertext2, 0);
      
      // 密文应该不同
      expect(ciphertext1).not.toEqual(ciphertext2);
    });
  });
  
  describe('Reset 功能', () => {
    it('应该能够重置密码器状态', () => {
      const plaintext = new Uint8Array(16);
      for (let i = 0; i < 16; i++) plaintext[i] = i;
      
      const cipher = new OFBBlockCipher(new SM4Engine(), 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      
      // 第一次加密
      const ciphertext1 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext1, 0);
      
      // 重置并再次加密
      cipher.reset();
      const ciphertext2 = new Uint8Array(16);
      cipher.processBlock(plaintext, 0, ciphertext2, 0);
      
      // 两次加密结果应该相同
      expect(ciphertext1).toEqual(ciphertext2);
    });
  });
  
  describe('getCurrentIV', () => {
    it('应该返回当前的输出反馈寄存器状态', () => {
      const cipher = new OFBBlockCipher(new SM4Engine(), 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      
      const currentIV = cipher.getCurrentIV();
      expect(currentIV).toEqual(iv);
    });
    
    it('返回的IV应该是副本，修改不应影响内部状态', () => {
      const cipher = new OFBBlockCipher(new SM4Engine(), 128);
      cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      
      const currentIV = cipher.getCurrentIV();
      currentIV[0] = 0xff;
      
      const currentIV2 = cipher.getCurrentIV();
      expect(currentIV2[0]).toBe(iv[0]); // 应该还是原来的值
    });
  });
});
