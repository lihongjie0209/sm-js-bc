/**
 * SM2 公钥加密示例
 * 演示如何使用 SM2 进行加密和解密
 */

import { SM2 } from 'sm-js-bc';

console.log('=== SM2 公钥加密示例 ===\n');

// 生成密钥对
console.log('步骤 1: 生成密钥对');
const keyPair = SM2.generateKeyPair();
console.log('公钥 X:', keyPair.publicKey.x.toString(16).substring(0, 32) + '...');
console.log('私钥:', keyPair.privateKey.toString(16).substring(0, 32) + '...');

// 加密
console.log('\n步骤 2: 使用公钥加密消息');
const plaintext = new TextEncoder().encode('Secret message');
console.log('明文:', new TextDecoder().decode(plaintext));
console.log('明文长度:', plaintext.length, '字节');

const ciphertext = SM2.encrypt(plaintext, keyPair.publicKey);
console.log('密文:', Buffer.from(ciphertext).toString('hex'));
console.log('密文长度:', ciphertext.length, '字节');

// 解密
console.log('\n步骤 3: 使用私钥解密消息');
const decrypted = SM2.decrypt(ciphertext, keyPair.privateKey);
console.log('解密结果:', new TextDecoder().decode(decrypted));
console.log('解密成功:', new TextDecoder().decode(decrypted) === new TextDecoder().decode(plaintext) ? '✅' : '❌');

// 加密不同长度的消息
console.log('\n步骤 4: 加密不同长度的消息');
const testMessages = [
  'A',                    // 1 字节
  'Hello',               // 5 字节
  'This is a longer message for testing SM2 encryption!', // 54 字节
  '中文消息测试',         // UTF-8 多字节字符
];

testMessages.forEach((msg, index) => {
  const plain = new TextEncoder().encode(msg);
  const cipher = SM2.encrypt(plain, keyPair.publicKey);
  const dec = SM2.decrypt(cipher, keyPair.privateKey);
  const success = new TextDecoder().decode(dec) === msg;
  
  console.log(`\n测试 ${index + 1}:`);
  console.log(`原文: "${msg}"`);
  console.log(`明文长度: ${plain.length}字节, 密文长度: ${cipher.length}字节`);
  console.log(`解密结果: ${success ? '✅ 成功' : '❌ 失败'}`);
});

// 使用错误的私钥解密
console.log('\n步骤 5: 使用错误的私钥解密');
const anotherKeyPair = SM2.generateKeyPair();
try {
  const wrongDecrypted = SM2.decrypt(ciphertext, anotherKeyPair.privateKey);
  console.log('使用错误私钥解密:', new TextDecoder().decode(wrongDecrypted));
} catch (error) {
  console.log('使用错误私钥解密: ❌ 失败（预期）');
  console.log('错误信息:', error.message);
}

console.log('\n✅ SM2 公钥加密示例运行完成');
