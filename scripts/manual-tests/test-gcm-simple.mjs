import { SM4Engine, GCMBlockCipher, AEADParameters, KeyParameter } from '../../dist/index.mjs';

// 16字节明文
const plaintext = new Uint8Array(16);
for (let i = 0; i < 16; i++) {
  plaintext[i] = i;
}

console.log('明文:', Array.from(plaintext));

// 密钥和nonce
const key = new Uint8Array(16);
for (let i = 0; i < 16; i++) {
  key[i] = i;
}

const nonce = new Uint8Array(12);
for (let i = 0; i < 12; i++) {
  nonce[i] = i;
}

// 加密
const encCipher = new GCMBlockCipher(new SM4Engine());
const params = new AEADParameters(new KeyParameter(key), 128, nonce);
encCipher.init(true, params);

const ciphertext = new Uint8Array(encCipher.getOutputSize(16));
const encLen = encCipher.processBytes(plaintext, 0, 16, ciphertext, 0);
console.log('加密 processBytes 返回:', encLen);

const finalLen = encCipher.doFinal(ciphertext, encLen);
console.log('加密 doFinal 返回:', finalLen);
console.log('总密文长度:', encLen + finalLen);

// 解密
const decCipher = new GCMBlockCipher(new SM4Engine());
decCipher.init(false, params);

const totalLen = encLen + finalLen;
const decrypted = new Uint8Array(decCipher.getOutputSize(totalLen));

console.log('\n解密输入长度:', totalLen);
const decLen = decCipher.processBytes(ciphertext, 0, totalLen, decrypted, 0);
console.log('解密 processBytes 返回:', decLen);

const decFinalLen = decCipher.doFinal(decrypted, decLen);
console.log('解密 doFinal 返回:', decFinalLen);

console.log('\n解密结果:', Array.from(decrypted.subarray(0, decLen + decFinalLen)));
console.log('期待结果:', Array.from(plaintext));
console.log('匹配:', decrypted.subarray(0, 16).every((v, i) => v === plaintext[i]));
