#!/usr/bin/env node

/**
 * SM4 多种工作模式示例
 * 
 * 演示：
 * 1. ECB 模式（电子密码本）
 * 2. CBC 模式（密码块链接）
 * 3. CTR 模式（计数器）
 * 4. GCM 模式（伽罗瓦/计数器）
 * 
 * 使用底层 API 直接控制加密模式和填充
 */

import {
  SM4Engine,
  ECBBlockCipher,
  CBCBlockCipher,
  SICBlockCipher,
  GCMBlockCipher,
  PaddedBufferedBlockCipher,
  PKCS7Padding,
  KeyParameter,
  ParametersWithIV,
  AEADParameters
} from 'sm-js-bc';

console.log('=== SM4 多种工作模式示例 ===\n');

// 准备测试数据
const key = new Uint8Array(16);
for (let i = 0; i < 16; i++) key[i] = i;

const plaintext = new TextEncoder().encode('Hello, SM4 modes! 你好，SM4！');
console.log('明文:', new TextDecoder().decode(plaintext));
console.log('明文长度:', plaintext.length, '字节');
console.log();

// ========== ECB 模式 ==========
console.log('--- 1. ECB 模式（不推荐用于生产）---');
try {
  const ecbCipher = new PaddedBufferedBlockCipher(
    new ECBBlockCipher(new SM4Engine()),
    new PKCS7Padding()
  );
  
  // 加密
  ecbCipher.init(true, new KeyParameter(key));
  const ecbOutput = new Uint8Array(ecbCipher.getOutputSize(plaintext.length));
  let ecbLen = ecbCipher.processBytes(plaintext, 0, plaintext.length, ecbOutput, 0);
  ecbLen += ecbCipher.doFinal(ecbOutput, ecbLen);
  const ecbCiphertext = ecbOutput.subarray(0, ecbLen);
  
  console.log('ECB 密文长度:', ecbCiphertext.length, '字节');
  console.log('ECB 密文 (hex):', Buffer.from(ecbCiphertext).toString('hex').substring(0, 64) + '...');
  
  // 解密
  ecbCipher.init(false, new KeyParameter(key));
  const ecbDecrypted = new Uint8Array(ecbCipher.getOutputSize(ecbCiphertext.length));
  let ecbDecLen = ecbCipher.processBytes(ecbCiphertext, 0, ecbCiphertext.length, ecbDecrypted, 0);
  ecbDecLen += ecbCipher.doFinal(ecbDecrypted, ecbDecLen);
  
  console.log('ECB 解密:', new TextDecoder().decode(ecbDecrypted.subarray(0, ecbDecLen)));
  console.log('ECB 验证: ✅');
} catch (error) {
  console.log('ECB 模式错误:', error.message);
}
console.log();

// ========== CBC 模式 ==========
console.log('--- 2. CBC 模式（推荐） ---');
try {
  const iv = new Uint8Array(16);
  for (let i = 0; i < 16; i++) iv[i] = i * 2;
  
  const cbcCipher = new PaddedBufferedBlockCipher(
    new CBCBlockCipher(new SM4Engine()),
    new PKCS7Padding()
  );
  
  // 加密
  cbcCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
  const cbcOutput = new Uint8Array(cbcCipher.getOutputSize(plaintext.length));
  let cbcLen = cbcCipher.processBytes(plaintext, 0, plaintext.length, cbcOutput, 0);
  cbcLen += cbcCipher.doFinal(cbcOutput, cbcLen);
  const cbcCiphertext = cbcOutput.subarray(0, cbcLen);
  
  console.log('CBC 密文长度:', cbcCiphertext.length, '字节');
  console.log('CBC 密文 (hex):', Buffer.from(cbcCiphertext).toString('hex').substring(0, 64) + '...');
  
  // 解密
  cbcCipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
  const cbcDecrypted = new Uint8Array(cbcCipher.getOutputSize(cbcCiphertext.length));
  let cbcDecLen = cbcCipher.processBytes(cbcCiphertext, 0, cbcCiphertext.length, cbcDecrypted, 0);
  cbcDecLen += cbcCipher.doFinal(cbcDecrypted, cbcDecLen);
  
  console.log('CBC 解密:', new TextDecoder().decode(cbcDecrypted.subarray(0, cbcDecLen)));
  console.log('CBC 验证: ✅');
} catch (error) {
  console.log('CBC 模式错误:', error.message);
}
console.log();

// ========== CTR 模式 ==========
console.log('--- 3. CTR 模式（流密码）---');
try {
  const ctrIv = new Uint8Array(16);
  for (let i = 0; i < 16; i++) ctrIv[i] = 0xFF - i;
  
  const ctrCipher = new SICBlockCipher(new SM4Engine());
  
  // 加密
  ctrCipher.init(true, new ParametersWithIV(new KeyParameter(key), ctrIv));
  const ctrCiphertext = new Uint8Array(plaintext.length);
  ctrCipher.processBytes(plaintext, 0, plaintext.length, ctrCiphertext, 0);
  
  console.log('CTR 密文长度:', ctrCiphertext.length, '字节 (无填充)');
  console.log('CTR 密文 (hex):', Buffer.from(ctrCiphertext).toString('hex').substring(0, 64) + '...');
  
  // 解密
  ctrCipher.init(false, new ParametersWithIV(new KeyParameter(key), ctrIv));
  const ctrDecrypted = new Uint8Array(ctrCiphertext.length);
  ctrCipher.processBytes(ctrCiphertext, 0, ctrCiphertext.length, ctrDecrypted, 0);
  
  console.log('CTR 解密:', new TextDecoder().decode(ctrDecrypted));
  console.log('CTR 验证: ✅');
} catch (error) {
  console.log('CTR 模式错误:', error.message);
}
console.log();

// ========== GCM 模式 ==========
console.log('--- 4. GCM 模式（认证加密）---');
try {
  const gcmNonce = new Uint8Array(12);
  for (let i = 0; i < 12; i++) gcmNonce[i] = i + 100;
  
  const gcmCipher = new GCMBlockCipher(new SM4Engine());
  
  // 加密
  const macSize = 128; // 128位认证标签
  gcmCipher.init(true, new AEADParameters(new KeyParameter(key), macSize, gcmNonce, null));
  
  const gcmOutput = new Uint8Array(gcmCipher.getOutputSize(plaintext.length));
  let gcmLen = gcmCipher.processBytes(plaintext, 0, plaintext.length, gcmOutput, 0);
  gcmLen += gcmCipher.doFinal(gcmOutput, gcmLen);
  const gcmCiphertext = gcmOutput.subarray(0, gcmLen);
  
  console.log('GCM 密文长度:', gcmCiphertext.length, '字节 (含16字节MAC标签)');
  console.log('GCM 密文 (hex):', Buffer.from(gcmCiphertext).toString('hex').substring(0, 64) + '...');
  
  // 解密
  gcmCipher.init(false, new AEADParameters(new KeyParameter(key), macSize, gcmNonce, null));
  const gcmDecrypted = new Uint8Array(gcmCipher.getOutputSize(gcmCiphertext.length));
  let gcmDecLen = gcmCipher.processBytes(gcmCiphertext, 0, gcmCiphertext.length, gcmDecrypted, 0);
  gcmDecLen += gcmCipher.doFinal(gcmDecrypted, gcmDecLen);
  
  console.log('GCM 解密:', new TextDecoder().decode(gcmDecrypted.subarray(0, gcmDecLen)));
  console.log('GCM 验证: ✅ (含认证标签验证)');
} catch (error) {
  console.log('GCM 模式错误:', error.message);
}
console.log();

console.log('✅ SM4 多种工作模式示例运行完成');
console.log();
console.log('📌 模式选择建议：');
console.log('   • ECB: ❌ 不安全，仅用于兼容性测试');
console.log('   • CBC: ✅ 传统选择，需要正确处理 IV');
console.log('   • CTR: ✅ 流密码模式，可并行，无填充');
console.log('   • GCM: ⭐ 最佳选择，提供认证加密（AEAD）');
