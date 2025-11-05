/**
 * SM2 密钥交换示例
 * 演示如何使用 SM2 进行密钥协商（ECDH）
 */

import { SM2, SM2KeyExchange } from 'sm-js-bc';

console.log('=== SM2 密钥交换示例 ===\n');

console.log('场景: Alice 和 Bob 通过 SM2 密钥交换协议协商共享密钥\n');

// 初始方（Alice）
console.log('步骤 1: Alice 生成静态密钥对');
const aliceStatic = SM2.generateKeyPair();
console.log('Alice 静态私钥:', aliceStatic.privateKey.toString(16).substring(0, 32) + '...');
console.log('Alice 静态公钥 X:', aliceStatic.publicKey.x.toString(16).substring(0, 32) + '...');

console.log('\n步骤 2: Alice 初始化密钥交换');
const aliceExchange = new SM2KeyExchange();
aliceExchange.init(aliceStatic.privateKey);

console.log('\n步骤 3: Alice 生成临时密钥对');
const aliceEphemeral = aliceExchange.generateEphemeralKeyPair();
console.log('Alice 临时公钥 X:', aliceEphemeral.publicKey.x.toString(16).substring(0, 32) + '...');

// 响应方（Bob）
console.log('\n步骤 4: Bob 生成静态密钥对');
const bobStatic = SM2.generateKeyPair();
console.log('Bob 静态私钥:', bobStatic.privateKey.toString(16).substring(0, 32) + '...');
console.log('Bob 静态公钥 X:', bobStatic.publicKey.x.toString(16).substring(0, 32) + '...');

console.log('\n步骤 5: Bob 初始化密钥交换');
const bobExchange = new SM2KeyExchange();
bobExchange.init(bobStatic.privateKey);

console.log('\n步骤 6: Bob 生成临时密钥对');
const bobEphemeral = bobExchange.generateEphemeralKeyPair();
console.log('Bob 临时公钥 X:', bobEphemeral.publicKey.x.toString(16).substring(0, 32) + '...');

// Alice 计算共享密钥
console.log('\n步骤 7: Alice 计算共享密钥');
console.log('Alice 使用: Bob的静态公钥 + Bob的临时公钥');
const aliceSharedKey = aliceExchange.calculateKey(
  16,  // 密钥长度（字节）
  bobStatic.publicKey,
  bobEphemeral.publicKey,
  true  // initiator（发起方）
);
console.log('Alice 共享密钥:', Buffer.from(aliceSharedKey).toString('hex'));

// Bob 计算共享密钥
console.log('\n步骤 8: Bob 计算共享密钥');
console.log('Bob 使用: Alice的静态公钥 + Alice的临时公钥');
const bobSharedKey = bobExchange.calculateKey(
  16,  // 密钥长度（字节）
  aliceStatic.publicKey,
  aliceEphemeral.publicKey,
  false  // responder（响应方）
);
console.log('Bob 共享密钥:', Buffer.from(bobSharedKey).toString('hex'));

// 验证密钥一致性
console.log('\n步骤 9: 验证密钥一致性');
const keysMatch = Buffer.from(aliceSharedKey).equals(Buffer.from(bobSharedKey));
console.log('密钥匹配:', keysMatch ? '✅ 成功' : '❌ 失败');

// 生成不同长度的共享密钥
console.log('\n--- 生成不同长度的共享密钥 ---');
const keyLengths = [16, 24, 32]; // 字节

keyLengths.forEach(length => {
  // 重新初始化
  const alice = new SM2KeyExchange();
  alice.init(aliceStatic.privateKey);
  const aliceEph = alice.generateEphemeralKeyPair();
  
  const bob = new SM2KeyExchange();
  bob.init(bobStatic.privateKey);
  const bobEph = bob.generateEphemeralKeyPair();
  
  // 计算共享密钥
  const aliceKey = alice.calculateKey(length, bobStatic.publicKey, bobEph.publicKey, true);
  const bobKey = bob.calculateKey(length, aliceStatic.publicKey, aliceEph.publicKey, false);
  
  console.log(`\n${length * 8}位密钥 (${length}字节):`);
  console.log('Alice:', Buffer.from(aliceKey).toString('hex'));
  console.log('Bob:  ', Buffer.from(bobKey).toString('hex'));
  console.log('匹配:', Buffer.from(aliceKey).equals(Buffer.from(bobKey)) ? '✅' : '❌');
});

console.log('\n✅ SM2 密钥交换示例运行完成');
