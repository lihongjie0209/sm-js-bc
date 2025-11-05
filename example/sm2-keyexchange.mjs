/**
 * SM2 密钥交换示例
 * 演示如何使用 SM2 进行密钥协商（ECDH）
 */

import { 
  SM2, 
  SM2KeyExchange,
  SM2KeyExchangePrivateParameters,
  SM2KeyExchangePublicParameters,
  ECPrivateKeyParameters,
  ECPublicKeyParameters,
  ECDomainParameters
} from 'sm-js-bc';

console.log('=== SM2 密钥交换示例 ===\n');

console.log('场景: Alice 和 Bob 通过 SM2 密钥交换协议协商共享密钥\n');

// 获取SM2域参数
const domainParams = SM2.getParameters();
const curve = domainParams.getCurve();
const g = domainParams.getG();

// 步骤 1: Alice 生成静态密钥对
console.log('步骤 1: Alice 生成静态密钥对');
const aliceStaticKeyPair = SM2.generateKeyPair();
const aliceStaticPriv = new ECPrivateKeyParameters(aliceStaticKeyPair.privateKey, domainParams);
const aliceStaticPubPoint = curve.createPoint(aliceStaticKeyPair.publicKey.x, aliceStaticKeyPair.publicKey.y);
const aliceStaticPub = new ECPublicKeyParameters(aliceStaticPubPoint, domainParams);
console.log('Alice 静态私钥:', aliceStaticKeyPair.privateKey.toString(16).substring(0, 32) + '...');
console.log('Alice 静态公钥 X:', aliceStaticKeyPair.publicKey.x.toString(16).substring(0, 32) + '...');

// 步骤 2: Alice 生成临时密钥对
console.log('\n步骤 2: Alice 生成临时密钥对');
const aliceEphemeralKeyPair = SM2.generateKeyPair();
const aliceEphemeralPriv = new ECPrivateKeyParameters(aliceEphemeralKeyPair.privateKey, domainParams);
const aliceEphemeralPubPoint = curve.createPoint(aliceEphemeralKeyPair.publicKey.x, aliceEphemeralKeyPair.publicKey.y);
const aliceEphemeralPub = new ECPublicKeyParameters(aliceEphemeralPubPoint, domainParams);
console.log('Alice 临时公钥 X:', aliceEphemeralKeyPair.publicKey.x.toString(16).substring(0, 32) + '...');

// 步骤 3: Bob 生成静态密钥对
console.log('\n步骤 3: Bob 生成静态密钥对');
const bobStaticKeyPair = SM2.generateKeyPair();
const bobStaticPriv = new ECPrivateKeyParameters(bobStaticKeyPair.privateKey, domainParams);
const bobStaticPubPoint = curve.createPoint(bobStaticKeyPair.publicKey.x, bobStaticKeyPair.publicKey.y);
const bobStaticPub = new ECPublicKeyParameters(bobStaticPubPoint, domainParams);
console.log('Bob 静态私钥:', bobStaticKeyPair.privateKey.toString(16).substring(0, 32) + '...');
console.log('Bob 静态公钥 X:', bobStaticKeyPair.publicKey.x.toString(16).substring(0, 32) + '...');

// 步骤 4: Bob 生成临时密钥对
console.log('\n步骤 4: Bob 生成临时密钥对');
const bobEphemeralKeyPair = SM2.generateKeyPair();
const bobEphemeralPriv = new ECPrivateKeyParameters(bobEphemeralKeyPair.privateKey, domainParams);
const bobEphemeralPubPoint = curve.createPoint(bobEphemeralKeyPair.publicKey.x, bobEphemeralKeyPair.publicKey.y);
const bobEphemeralPub = new ECPublicKeyParameters(bobEphemeralPubPoint, domainParams);
console.log('Bob 临时公钥 X:', bobEphemeralKeyPair.publicKey.x.toString(16).substring(0, 32) + '...');

// 步骤 5: Alice 初始化密钥交换（作为发起方）
console.log('\n步骤 5: Alice 初始化密钥交换（发起方）');
const aliceExchange = new SM2KeyExchange();
const alicePrivParams = new SM2KeyExchangePrivateParameters(
  true,  // initiator = true (发起方)
  aliceStaticPriv,
  aliceEphemeralPriv
);
aliceExchange.init(alicePrivParams);

// 步骤 6: Alice 计算共享密钥
console.log('\n步骤 6: Alice 计算共享密钥');
console.log('Alice 使用: Bob的静态公钥 + Bob的临时公钥');
const bobPubParams = new SM2KeyExchangePublicParameters(bobStaticPub, bobEphemeralPub);
const aliceSharedKey = aliceExchange.calculateKey(
  128,  // 密钥长度（位）= 16字节
  bobPubParams
);
console.log('Alice 共享密钥:', Buffer.from(aliceSharedKey).toString('hex'));

// 步骤 7: Bob 初始化密钥交换（作为响应方）
console.log('\n步骤 7: Bob 初始化密钥交换（响应方）');
const bobExchange = new SM2KeyExchange();
const bobPrivParams = new SM2KeyExchangePrivateParameters(
  false,  // initiator = false (响应方)
  bobStaticPriv,
  bobEphemeralPriv
);
bobExchange.init(bobPrivParams);

// 步骤 8: Bob 计算共享密钥
console.log('\n步骤 8: Bob 计算共享密钥');
console.log('Bob 使用: Alice的静态公钥 + Alice的临时公钥');
const alicePubParams = new SM2KeyExchangePublicParameters(aliceStaticPub, aliceEphemeralPub);
const bobSharedKey = bobExchange.calculateKey(
  128,  // 密钥长度（位）= 16字节
  alicePubParams
);
console.log('Bob 共享密钥:', Buffer.from(bobSharedKey).toString('hex'));

// 步骤 9: 验证密钥一致性
console.log('\n步骤 9: 验证密钥一致性');
const keysMatch = Buffer.from(aliceSharedKey).equals(Buffer.from(bobSharedKey));
console.log('密钥匹配:', keysMatch ? '✅ 成功' : '❌ 失败');
console.log('密钥长度:', aliceSharedKey.length, '字节');

// 生成不同长度的共享密钥
console.log('\n--- 生成不同长度的共享密钥 ---');
const keyLengths = [128, 192, 256]; // 位

for (const keyBits of keyLengths) {
  // 重新生成临时密钥对
  const alice2Ephemeral = SM2.generateKeyPair();
  const alice2EphemeralPriv = new ECPrivateKeyParameters(alice2Ephemeral.privateKey, domainParams);
  const alice2EphemeralPubPoint = curve.createPoint(alice2Ephemeral.publicKey.x, alice2Ephemeral.publicKey.y);
  const alice2EphemeralPub = new ECPublicKeyParameters(alice2EphemeralPubPoint, domainParams);
  
  const bob2Ephemeral = SM2.generateKeyPair();
  const bob2EphemeralPriv = new ECPrivateKeyParameters(bob2Ephemeral.privateKey, domainParams);
  const bob2EphemeralPubPoint = curve.createPoint(bob2Ephemeral.publicKey.x, bob2Ephemeral.publicKey.y);
  const bob2EphemeralPub = new ECPublicKeyParameters(bob2EphemeralPubPoint, domainParams);
  
  // Alice 计算密钥
  const aliceEx2 = new SM2KeyExchange();
  const alicePrivParams2 = new SM2KeyExchangePrivateParameters(true, aliceStaticPriv, alice2EphemeralPriv);
  aliceEx2.init(alicePrivParams2);
  const bobPubParams2 = new SM2KeyExchangePublicParameters(bobStaticPub, bob2EphemeralPub);
  const aliceKey = aliceEx2.calculateKey(keyBits, bobPubParams2);
  
  // Bob 计算密钥
  const bobEx2 = new SM2KeyExchange();
  const bobPrivParams2 = new SM2KeyExchangePrivateParameters(false, bobStaticPriv, bob2EphemeralPriv);
  bobEx2.init(bobPrivParams2);
  const alicePubParams2 = new SM2KeyExchangePublicParameters(aliceStaticPub, alice2EphemeralPub);
  const bobKey = bobEx2.calculateKey(keyBits, alicePubParams2);
  
  console.log(`\n${keyBits}位密钥 (${keyBits / 8}字节):`);
  console.log('Alice:', Buffer.from(aliceKey).toString('hex').substring(0, 40) + '...');
  console.log('Bob:  ', Buffer.from(bobKey).toString('hex').substring(0, 40) + '...');
  console.log('匹配:', Buffer.from(aliceKey).equals(Buffer.from(bobKey)) ? '✅' : '❌');
}

console.log('\n✅ SM2 密钥交换示例运行完成');
