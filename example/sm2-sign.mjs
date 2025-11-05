/**
 * SM2 数字签名示例
 * 演示如何使用 SM2 进行签名和验签
 */

import { SM2 } from 'sm-js-bc';

console.log('=== SM2 数字签名示例 ===\n');

// 生成密钥对
console.log('步骤 1: 生成密钥对');
const keyPair = SM2.generateKeyPair();
console.log('私钥:', keyPair.privateKey.toString(16).substring(0, 32) + '...');
console.log('公钥 X:', keyPair.publicKey.x.toString(16).substring(0, 32) + '...');

// 签名
console.log('\n步骤 2: 对消息进行签名');
const message = 'Hello, SM2!';
console.log('原始消息:', message);

const signature = SM2.sign(message, keyPair.privateKey);
console.log('签名结果:', Buffer.from(signature).toString('hex'));
console.log('签名长度:', signature.length, '字节');

// 验签
console.log('\n步骤 3: 验证签名');
const isValid = SM2.verify(
  message, 
  signature, 
  keyPair.publicKey
);
console.log('签名验证结果:', isValid ? '✅ 有效' : '❌ 无效');

// 篡改消息后验签
console.log('\n步骤 4: 篡改消息后验签');
const tamperedMessage = 'Hello, SM3!'; // 故意改错
const isValidTampered = SM2.verify(
  tamperedMessage, 
  signature, 
  keyPair.publicKey
);
console.log('篡改消息:', tamperedMessage);
console.log('签名验证结果:', isValidTampered ? '✅ 有效' : '❌ 无效（预期）');

// 不同密钥对验签
console.log('\n步骤 5: 使用不同的公钥验签');
const anotherKeyPair = SM2.generateKeyPair();
const isValidWrongKey = SM2.verify(
  message, 
  signature, 
  anotherKeyPair.publicKey
);
console.log('使用错误的公钥:', isValidWrongKey ? '✅ 有效' : '❌ 无效（预期）');

// 签名不同的消息
console.log('\n步骤 6: 签名多条消息');
const messages = ['Message 1', 'Message 2', 'Message 3'];
messages.forEach((msg, index) => {
  const sig = SM2.sign(msg, keyPair.privateKey);
  const valid = SM2.verify(msg, sig, keyPair.publicKey);
  console.log(`消息 ${index + 1}: "${msg}" -> 签名长度: ${sig.length}字节, 验证: ${valid ? '✅' : '❌'}`);
});

console.log('\n✅ SM2 数字签名示例运行完成');
