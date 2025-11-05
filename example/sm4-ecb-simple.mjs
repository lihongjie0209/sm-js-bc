#!/usr/bin/env node

/**
 * SM4 ECB 模式简单示例
 * 
 * 演示：
 * 1. 生成随机密钥
 * 2. ECB 模式加密/解密（PKCS7 填充）
 * 3. 处理不同长度的数据
 * 
 * 注意：ECB 模式不安全，仅用于演示和兼容性测试
 */

import { SM4 } from 'sm-js-bc';

console.log('=== SM4 ECB 模式简单示例 ===\n');

// 1. 生成随机密钥
console.log('--- 1. 生成密钥 ---');
const key = SM4.generateKey();
console.log('密钥长度:', key.length, '字节 (128位)');
console.log('密钥 (hex):', Buffer.from(key).toString('hex'));
console.log();

// 2. 加密和解密
console.log('--- 2. 加密/解密 ---');
const plaintext = 'Hello, SM4! 这是一个测试消息。';
const plaintextBytes = new TextEncoder().encode(plaintext);

console.log('明文:', plaintext);
console.log('明文长度:', plaintextBytes.length, '字节');

// 加密（ECB + PKCS7 填充）
const ciphertext = SM4.encrypt(plaintextBytes, key);
console.log('密文长度:', ciphertext.length, '字节');
console.log('密文 (hex):', Buffer.from(ciphertext).toString('hex'));

// 解密
const decrypted = SM4.decrypt(ciphertext, key);
const decryptedText = new TextDecoder().decode(decrypted);

console.log('解密结果:', decryptedText);
console.log('解密成功:', decryptedText === plaintext ? '✅' : '❌');
console.log();

// 3. 不同长度的数据
console.log('--- 3. 不同长度数据 ---');
const testCases = [
  { name: '空数据', data: '' },
  { name: '1 字节', data: 'A' },
  { name: '15 字节', data: 'A'.repeat(15) },
  { name: '16 字节 (1块)', data: 'A'.repeat(16) },
  { name: '17 字节', data: 'A'.repeat(17) },
  { name: '32 字节 (2块)', data: 'A'.repeat(32) },
  { name: '100 字节', data: 'A'.repeat(100) },
];

for (const testCase of testCases) {
  const data = new TextEncoder().encode(testCase.data);
  const encrypted = SM4.encrypt(data, key);
  const decryptedData = SM4.decrypt(encrypted, key);
  const success = Buffer.from(data).equals(Buffer.from(decryptedData));
  
  console.log(`${testCase.name}: ${data.length} → ${encrypted.length} 字节 ${success ? '✅' : '❌'}`);
}
console.log();

// 4. 单块加密（无填充）
console.log('--- 4. 单块加密（16字节，无填充）---');
const block = new Uint8Array(16).fill(0x42); // 16 字节的 'B'
console.log('块数据 (hex):', Buffer.from(block).toString('hex'));

const encryptedBlock = SM4.encryptBlock(block, key);
console.log('加密后 (hex):', Buffer.from(encryptedBlock).toString('hex'));

const decryptedBlock = SM4.decryptBlock(encryptedBlock, key);
console.log('解密后 (hex):', Buffer.from(decryptedBlock).toString('hex'));
console.log('块加密成功:', Buffer.from(block).equals(Buffer.from(decryptedBlock)) ? '✅' : '❌');
console.log();

console.log('✅ SM4 ECB 模式示例运行完成');
console.log();
console.log('⚠️  安全提示：');
console.log('   ECB 模式不提供语义安全性，相同明文块产生相同密文块');
console.log('   仅用于演示和兼容性测试，生产环境请使用 CBC、CTR 或 GCM 模式');
