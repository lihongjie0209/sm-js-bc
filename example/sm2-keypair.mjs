/**
 * SM2 密钥对生成示例
 * 演示如何生成 SM2 密钥对
 */

import { SM2 } from 'sm-js-bc';

console.log('=== SM2 密钥对生成示例 ===\n');

// 生成密钥对
const keyPair = SM2.generateKeyPair();

console.log('私钥 (Private Key):');
console.log(keyPair.privateKey.toString(16));
console.log('\n私钥长度:', keyPair.privateKey.toString(16).length, '个十六进制字符');

console.log('\n公钥 (Public Key):');
console.log('X 坐标:', keyPair.publicKey.x.toString(16));
console.log('Y 坐标:', keyPair.publicKey.y.toString(16));
console.log('\n公钥坐标长度:', keyPair.publicKey.x.toString(16).length, '个十六进制字符');

// 生成多个密钥对
console.log('\n--- 生成多个密钥对 ---');
for (let i = 1; i <= 3; i++) {
  const kp = SM2.generateKeyPair();
  console.log(`\n密钥对 ${i}:`);
  console.log('私钥:', kp.privateKey.toString(16).substring(0, 32) + '...');
  console.log('公钥 X:', kp.publicKey.x.toString(16).substring(0, 32) + '...');
  console.log('公钥 Y:', kp.publicKey.y.toString(16).substring(0, 32) + '...');
}

console.log('\n✅ SM2 密钥对生成示例运行完成');
