import { SM4Engine, GCMBlockCipher, AEADParameters, KeyParameter } from '../../dist/index.mjs'

// Simple test for 32-byte encryption/decryption
const key = new Uint8Array(16)
for (let i = 0; i < 16; i++) key[i] = i

const nonce = new Uint8Array(12)
for (let i = 0; i < 12; i++) nonce[i] = i

const plaintext = new Uint8Array(32)
for (let i = 0; i < 32; i++) plaintext[i] = i

console.log('Key:', Array.from(key).map(b => b.toString(16).padStart(2, '0')).join(' '))
console.log('Nonce:', Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join(' '))
console.log('Plaintext:', Array.from(plaintext).map(b => b.toString(16).padStart(2, '0')).join(' '))

// Encrypt
const encCipher = new GCMBlockCipher(new SM4Engine())
const encParams = new AEADParameters(new KeyParameter(key), 128, nonce, null)
encCipher.init(true, encParams)

const ciphertext = new Uint8Array(encCipher.getOutputSize(plaintext.length))
let encLen = encCipher.processBytes(plaintext, 0, plaintext.length, ciphertext, 0)
encLen += encCipher.doFinal(ciphertext, encLen)

console.log('\nCiphertext+Tag:', Array.from(ciphertext).map(b => b.toString(16).padStart(2, '0')).join(' '))
console.log('Expected length:', plaintext.length + 16, 'Actual:', encLen)

// Decrypt
const decCipher = new GCMBlockCipher(new SM4Engine())
const decParams = new AEADParameters(new KeyParameter(key), 128, nonce, null)
decCipher.init(false, decParams)

try {
  const decrypted = new Uint8Array(decCipher.getOutputSize(ciphertext.length))
  let decLen = decCipher.processBytes(ciphertext, 0, ciphertext.length, decrypted, 0)
  decLen += decCipher.doFinal(decrypted, decLen)
  
  console.log('\nDecrypted:', Array.from(decrypted.subarray(0, decLen)).map(b => b.toString(16).padStart(2, '0')).join(' '))
  console.log('Match:', decrypted.subarray(0, decLen).every((b, i) => b === plaintext[i]))
} catch (e) {
  console.error('\nDecryption failed:', e.message)
}
