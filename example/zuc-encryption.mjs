/**
 * ZUC Stream Cipher Example
 * 
 * Demonstrates the usage of ZUC-128 and ZUC-256 stream ciphers
 * and ZUC-MAC for integrity protection.
 * 
 * ZUC is a stream cipher designed for 3GPP LTE/5G mobile communications,
 * providing both confidentiality (encryption) and integrity protection.
 * 
 * Standards:
 * - GM/T 0001-2012: ZUC Stream Cipher Algorithm
 * - 3GPP TS 35.221: 128-EEA3 & 128-EIA3 (LTE)
 * - 3GPP TS 35.222: 256-EEA3 & 256-EIA3 (5G)
 */

import { 
  ZUCEngine, 
  Zuc256Engine,
  Zuc128Mac, 
  Zuc256Mac,
  KeyParameter, 
  ParametersWithIV 
} from '../dist/index.js';

console.log('='.repeat(70));
console.log('ZUC Stream Cipher Example');
console.log('='.repeat(70));
console.log();

// ============================================================================
// Example 1: ZUC-128 Basic Encryption
// ============================================================================

console.log('1. ZUC-128 Basic Encryption/Decryption');
console.log('-'.repeat(70));

// Generate key and IV (in production, use secure random generation)
const key128 = new Uint8Array(16); // 128-bit key
const iv128 = new Uint8Array(16);  // 128-bit IV

// For demonstration, use simple values
for (let i = 0; i < 16; i++) {
  key128[i] = i;
  iv128[i] = i + 16;
}

// Initialize ZUC-128 engine
const zuc128 = new ZUCEngine();
const params128 = new ParametersWithIV(new KeyParameter(key128), iv128);
zuc128.init(true, params128);

// Encrypt plaintext
const plaintext = new TextEncoder().encode('Hello, ZUC Stream Cipher!');
const ciphertext = new Uint8Array(plaintext.length);
zuc128.processBytes(plaintext, 0, plaintext.length, ciphertext, 0);

console.log('Plaintext:', new TextDecoder().decode(plaintext));
console.log('Plaintext (hex):', Buffer.from(plaintext).toString('hex'));
console.log('Ciphertext (hex):', Buffer.from(ciphertext).toString('hex'));

// Decrypt ciphertext (reinitialize with same key/IV)
zuc128.reset();
const decrypted = new Uint8Array(ciphertext.length);
zuc128.processBytes(ciphertext, 0, ciphertext.length, decrypted, 0);

console.log('Decrypted:', new TextDecoder().decode(decrypted));
console.log('Match:', new TextDecoder().decode(plaintext) === new TextDecoder().decode(decrypted));
console.log();

// ============================================================================
// Example 2: ZUC-256 Enhanced Security
// ============================================================================

console.log('2. ZUC-256 Enhanced Security');
console.log('-'.repeat(70));

// ZUC-256 uses 256-bit key and 184-bit IV for enhanced security
const key256 = new Uint8Array(32); // 256-bit key
const iv256 = new Uint8Array(23);  // 184-bit IV (23 bytes)

// Initialize with different patterns
for (let i = 0; i < 32; i++) {
  key256[i] = i;
}
for (let i = 0; i < 23; i++) {
  iv256[i] = i + 32;
}

// Initialize ZUC-256 engine
const zuc256 = new Zuc256Engine();
const params256 = new ParametersWithIV(new KeyParameter(key256), iv256);
zuc256.init(true, params256);

// Encrypt with ZUC-256
const plaintext2 = new TextEncoder().encode('ZUC-256 provides enhanced security for 5G!');
const ciphertext2 = new Uint8Array(plaintext2.length);
zuc256.processBytes(plaintext2, 0, plaintext2.length, ciphertext2, 0);

console.log('Plaintext:', new TextDecoder().decode(plaintext2));
console.log('Ciphertext (hex):', Buffer.from(ciphertext2).toString('hex'));

// Decrypt
zuc256.reset();
const decrypted2 = new Uint8Array(ciphertext2.length);
zuc256.processBytes(ciphertext2, 0, ciphertext2.length, decrypted2, 0);

console.log('Decrypted:', new TextDecoder().decode(decrypted2));
console.log('Match:', new TextDecoder().decode(plaintext2) === new TextDecoder().decode(decrypted2));
console.log();

// ============================================================================
// Example 3: ZUC-128 MAC (128-EIA3) - Integrity Protection
// ============================================================================

console.log('3. ZUC-128 MAC (128-EIA3) for Integrity Protection');
console.log('-'.repeat(70));

// Initialize ZUC-128 MAC
const macKey = new Uint8Array(16);
const macIV = new Uint8Array(16);

for (let i = 0; i < 16; i++) {
  macKey[i] = i * 2;
  macIV[i] = i * 2 + 1;
}

const mac128 = new Zuc128Mac();
const macParams = new ParametersWithIV(new KeyParameter(macKey), macIV);
mac128.init(macParams);

// Compute MAC for a message
const message = new TextEncoder().encode('This message needs integrity protection');
mac128.updateArray(message, 0, message.length);

const tag = new Uint8Array(4); // 32-bit MAC tag
mac128.doFinal(tag, 0);

console.log('Message:', new TextDecoder().decode(message));
console.log('MAC Tag (hex):', Buffer.from(tag).toString('hex'));
console.log('MAC Size:', mac128.getMacSize(), 'bytes (32 bits)');
console.log();

// Verify MAC (compute again with same key/IV)
mac128.reset();
mac128.updateArray(message, 0, message.length);
const tag2 = new Uint8Array(4);
mac128.doFinal(tag2, 0);

console.log('Verification Tag (hex):', Buffer.from(tag2).toString('hex'));
console.log('Tags match:', Buffer.from(tag).equals(Buffer.from(tag2)));
console.log();

// ============================================================================
// Example 4: ZUC-256 MAC with Configurable Length
// ============================================================================

console.log('4. ZUC-256 MAC with Configurable MAC Length');
console.log('-'.repeat(70));

// ZUC-256 MAC supports 32, 64, or 128-bit MAC lengths
const mac256Key = new Uint8Array(32);
const mac256IV = new Uint8Array(23);

for (let i = 0; i < 32; i++) {
  mac256Key[i] = i;
}
for (let i = 0; i < 23; i++) {
  mac256IV[i] = i + 32;
}

// Try different MAC lengths
const macLengths = [32, 64, 128]; // bits

for (const macBits of macLengths) {
  const mac256 = new Zuc256Mac(macBits);
  const mac256Params = new ParametersWithIV(new KeyParameter(mac256Key), mac256IV);
  mac256.init(mac256Params);
  
  const message2 = new TextEncoder().encode('ZUC-256 MAC for 5G security');
  mac256.updateArray(message2, 0, message2.length);
  
  const tagBytes = macBits / 8;
  const tag256 = new Uint8Array(tagBytes);
  mac256.doFinal(tag256, 0);
  
  console.log(`${macBits}-bit MAC:`, Buffer.from(tag256).toString('hex'));
}
console.log();

// ============================================================================
// Example 5: Stream Cipher Properties
// ============================================================================

console.log('5. Stream Cipher Properties');
console.log('-'.repeat(70));

// Demonstrate stream cipher properties
const testKey = new Uint8Array(16);
const testIV = new Uint8Array(16);
testKey.fill(0x42);
testIV.fill(0x24);

const zuc = new ZUCEngine();
const testParams = new ParametersWithIV(new KeyParameter(testKey), testIV);

// Property 1: Same key/IV produces same keystream
zuc.init(true, testParams);
const testData1 = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
const output1 = new Uint8Array(4);
zuc.processBytes(testData1, 0, 4, output1, 0);

zuc.reset();
const testData2 = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
const output2 = new Uint8Array(4);
zuc.processBytes(testData2, 0, 4, output2, 0);

console.log('Property 1: Deterministic keystream');
console.log('  Output 1:', Buffer.from(output1).toString('hex'));
console.log('  Output 2:', Buffer.from(output2).toString('hex'));
console.log('  Match:', Buffer.from(output1).equals(Buffer.from(output2)));
console.log();

// Property 2: XOR property (plaintext ⊕ keystream = ciphertext)
zuc.reset();
const pt = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
const ct = new Uint8Array(4);
zuc.processBytes(pt, 0, 4, ct, 0);

zuc.reset();
const keystreamBytes = new Uint8Array(4);
const zeros = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
zuc.processBytes(zeros, 0, 4, keystreamBytes, 0);

console.log('Property 2: XOR encryption');
console.log('  Plaintext:', Buffer.from(pt).toString('hex'));
console.log('  Keystream:', Buffer.from(keystreamBytes).toString('hex'));
console.log('  Ciphertext:', Buffer.from(ct).toString('hex'));

// Manual XOR to verify
const manualCt = new Uint8Array(4);
for (let i = 0; i < 4; i++) {
  manualCt[i] = pt[i] ^ keystreamBytes[i];
}
console.log('  Manual XOR:', Buffer.from(manualCt).toString('hex'));
console.log('  Match:', Buffer.from(ct).equals(Buffer.from(manualCt)));
console.log();

// ============================================================================
// Example 6: Security Best Practices
// ============================================================================

console.log('6. Security Best Practices');
console.log('-'.repeat(70));

console.log('⚠️  SECURITY WARNINGS:');
console.log('');
console.log('1. NEVER reuse the same (key, IV) pair');
console.log('   - Each encryption must use a unique IV');
console.log('   - IV can be public, but must never repeat for the same key');
console.log('');
console.log('2. Use cryptographically secure random number generator');
console.log('   - Do NOT use Math.random() for keys or IVs');
console.log('   - Use crypto.getRandomValues() in browser');
console.log('   - Use crypto.randomBytes() in Node.js');
console.log('');
console.log('3. Key management');
console.log('   - Store keys securely (hardware security module, key vault)');
console.log('   - Never hardcode keys in source code');
console.log('   - Rotate keys regularly');
console.log('');
console.log('4. Use MAC for integrity');
console.log('   - Encrypt-then-MAC pattern recommended');
console.log('   - MAC provides authentication and prevents tampering');
console.log('');
console.log('5. ZUC is designed for 3GPP mobile communications');
console.log('   - Widely used in LTE/5G for confidentiality and integrity');
console.log('   - 128-EEA3/128-EIA3 for LTE');
console.log('   - 256-EEA3/256-EIA3 for 5G');
console.log();

// Example of secure key generation (for demonstration)
console.log('Example: Secure Key Generation (Node.js)');
console.log('-'.repeat(70));

import crypto from 'crypto';

const secureKey = crypto.randomBytes(16); // 128-bit key
const secureIV = crypto.randomBytes(16);  // 128-bit IV

console.log('Secure Key (hex):', secureKey.toString('hex'));
console.log('Secure IV (hex):', secureIV.toString('hex'));
console.log();

console.log('='.repeat(70));
console.log('Example completed successfully!');
console.log('='.repeat(70));
console.log();
console.log('📱 Use Cases:');
console.log('  - 3GPP LTE/5G mobile communication encryption');
console.log('  - Real-time data stream encryption');
console.log('  - IoT device communication security');
console.log('  - Any scenario requiring fast stream encryption');
console.log();
console.log('📚 References:');
console.log('  - GM/T 0001-2012: ZUC Stream Cipher Algorithm');
console.log('  - 3GPP TS 35.221: 128-EEA3 & 128-EIA3');
console.log('  - 3GPP TS 35.222: 256-EEA3 & 256-EIA3');
console.log();
