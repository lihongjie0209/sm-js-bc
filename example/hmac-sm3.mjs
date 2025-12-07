/**
 * HMAC-SM3 消息认证码示例
 * 演示如何使用 HMac 和 SM3Digest 生成消息认证码
 */

import { HMac, SM3Digest, KeyParameter } from 'sm-js-bc';

console.log('=== HMAC-SM3 消息认证码示例 ===\n');

// 1. 基本 HMAC 计算
console.log('--- 基本 HMAC 计算 ---');
const hmac = new HMac(new SM3Digest());
const key = new TextEncoder().encode('my-secret-key');
const message = new TextEncoder().encode('Hello, HMAC-SM3!');

// 初始化 HMAC 
hmac.init(new KeyParameter(key));

// 更新消息
hmac.updateArray(message, 0, message.length);

// 获取 MAC
const mac = new Uint8Array(hmac.getMacSize());
hmac.doFinal(mac, 0);

console.log('密钥:', 'my-secret-key');
console.log('消息:', 'Hello, HMAC-SM3!');
console.log('HMAC:', Buffer.from(mac).toString('hex'));
console.log('MAC 长度:', mac.length, '字节');

// 2. 分段更新示例
console.log('\n--- 分段更新示例 ---');
const hmac2 = new HMac(new SM3Digest());
hmac2.init(new KeyParameter(key));

const part1 = new TextEncoder().encode('Hello, ');
const part2 = new TextEncoder().encode('HMAC-');
const part3 = new TextEncoder().encode('SM3!');

hmac2.updateArray(part1, 0, part1.length);
hmac2.updateArray(part2, 0, part2.length);
hmac2.updateArray(part3, 0, part3.length);

const mac2 = new Uint8Array(hmac2.getMacSize());
hmac2.doFinal(mac2, 0);

console.log('分段输入: "Hello, " + "HMAC-" + "SM3!"');
console.log('HMAC:', Buffer.from(mac2).toString('hex'));
console.log('结果一致:', Buffer.from(mac).equals(Buffer.from(mac2)));

// 3. 重置和重用
console.log('\n--- 重置和重用示例 ---');
const hmac3 = new HMac(new SM3Digest());
hmac3.init(new KeyParameter(key));

// 计算第一条消息的 MAC
const msg1 = new TextEncoder().encode('first message');
hmac3.updateArray(msg1, 0, msg1.length);
const mac3a = new Uint8Array(hmac3.getMacSize());
hmac3.doFinal(mac3a, 0);

// 自动重置，计算第二条消息的 MAC
const msg2 = new TextEncoder().encode('second message');
hmac3.updateArray(msg2, 0, msg2.length);
const mac3b = new Uint8Array(hmac3.getMacSize());
hmac3.doFinal(mac3b, 0);

console.log('消息 1:', 'first message');
console.log('MAC 1:', Buffer.from(mac3a).toString('hex').substring(0, 32) + '...');
console.log('消息 2:', 'second message');
console.log('MAC 2:', Buffer.from(mac3b).toString('hex').substring(0, 32) + '...');
console.log('MACs 不同:', !Buffer.from(mac3a).equals(Buffer.from(mac3b)));

// 4. 消息验证示例
console.log('\n--- 消息验证示例 ---');
const hmacVerify = new HMac(new SM3Digest());
const verifyKey = new TextEncoder().encode('shared-secret');
const originalMessage = new TextEncoder().encode('This is a secure message');

// 发送方生成 MAC
hmacVerify.init(new KeyParameter(verifyKey));
hmacVerify.updateArray(originalMessage, 0, originalMessage.length);
const originalMac = new Uint8Array(hmacVerify.getMacSize());
hmacVerify.doFinal(originalMac, 0);

console.log('原始消息:', 'This is a secure message');
console.log('生成的 MAC:', Buffer.from(originalMac).toString('hex').substring(0, 32) + '...');

// 接收方验证 MAC
const receivedMessage = new TextEncoder().encode('This is a secure message');
hmacVerify.reset();
hmacVerify.updateArray(receivedMessage, 0, receivedMessage.length);
const verifyMac = new Uint8Array(hmacVerify.getMacSize());
hmacVerify.doFinal(verifyMac, 0);

const isValid = Buffer.from(originalMac).equals(Buffer.from(verifyMac));
console.log('验证结果:', isValid ? '✅ 验证通过' : '❌ 验证失败');

// 5. 不同密钥长度示例
console.log('\n--- 不同密钥长度示例 ---');
const shortKey = new TextEncoder().encode('key');
const longKey = new Uint8Array(128);
longKey.fill(0x42);

const hmacShort = new HMac(new SM3Digest());
hmacShort.init(new KeyParameter(shortKey));
hmacShort.updateArray(message, 0, message.length);
const macShort = new Uint8Array(hmacShort.getMacSize());
hmacShort.doFinal(macShort, 0);

const hmacLong = new HMac(new SM3Digest());
hmacLong.init(new KeyParameter(longKey));
hmacLong.updateArray(message, 0, message.length);
const macLong = new Uint8Array(hmacLong.getMacSize());
hmacLong.doFinal(macLong, 0);

console.log('短密钥 (3 字节):', Buffer.from(macShort).toString('hex').substring(0, 32) + '...');
console.log('长密钥 (128 字节):', Buffer.from(macLong).toString('hex').substring(0, 32) + '...');
console.log('结果不同:', !Buffer.from(macShort).equals(Buffer.from(macLong)));

console.log('\n✅ HMAC-SM3 示例运行完成');
