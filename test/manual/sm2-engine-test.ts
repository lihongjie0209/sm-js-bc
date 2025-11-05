/**
 * SM2Engine manual test - Basic functionality verification
 */

import {
  SM2,
  SM2Engine,
  SM2Mode,
  ECPublicKeyParameters,
  ECPrivateKeyParameters,
  ParametersWithRandom,
  SecureRandom,
  BigIntegers
} from '../../src/index';

/**
 * Generate a key pair for testing.
 */
function generateKeyPair() {
  const domainParams = SM2.getParameters();
  const n = SM2.getN();
  const G = SM2.getG();
  
  // Generate random private key d
  const random = new SecureRandom();
  let d: bigint;
  do {
    d = BigIntegers.createRandomBigInteger(256, random);
  } while (d === 0n || d >= n);
  
  // Compute public key Q = dG
  const Q = G.multiply(d).normalize();
  
  return {
    privateKey: new ECPrivateKeyParameters(d, domainParams),
    publicKey: new ECPublicKeyParameters(Q, domainParams)
  };
}

/**
 * Test SM2 encryption and decryption.
 */
function testSM2EncryptionDecryption() {
  console.log('=== SM2 Encryption/Decryption Test ===\n');
  
  // Generate key pair
  console.log('Generating key pair...');
  const keyPair = generateKeyPair();
  console.log('✓ Key pair generated\n');
  
  // Test message
  const message = 'Hello, SM2!';
  const messageBytes = new TextEncoder().encode(message);
  console.log('Message:', message);
  console.log('Message bytes:', Array.from(messageBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('');
  
  // Test both modes
  for (const mode of [SM2Mode.C1C2C3, SM2Mode.C1C3C2]) {
    console.log(`--- Testing mode: ${mode} ---`);
    
    // Encrypt
    const encryptEngine = new SM2Engine(mode);
    const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
    encryptEngine.init(true, encryptParams);
    
    const ciphertext = encryptEngine.processBlock(messageBytes, 0, messageBytes.length);
    console.log('Ciphertext length:', ciphertext.length);
    console.log('Ciphertext (first 32 bytes):', 
      Array.from(ciphertext.slice(0, 32)).map((b: number) => b.toString(16).padStart(2, '0')).join(' '));
    
    // Decrypt
    const decryptEngine = new SM2Engine(mode);
    decryptEngine.init(false, keyPair.privateKey);
    
    const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
    const decryptedMessage = new TextDecoder().decode(decrypted);
    
    console.log('Decrypted message:', decryptedMessage);
    console.log('Match:', decryptedMessage === message ? '✓ PASS' : '✗ FAIL');
    console.log('');
  }
}

/**
 * Test with different message lengths.
 */
function testDifferentLengths() {
  console.log('=== Testing Different Message Lengths ===\n');
  
  const keyPair = generateKeyPair();
  const engine = new SM2Engine();
  
  const testCases = [
    '',
    'A',
    'Short message',
    'This is a longer message that spans multiple blocks to test the KDF properly.',
    'A'.repeat(1000) // 1KB message
  ];
  
  for (const testMessage of testCases) {
    const messageBytes = new TextEncoder().encode(testMessage);
    
    // Encrypt
    const encryptEngine = new SM2Engine();
    const encryptParams = new ParametersWithRandom(keyPair.publicKey, new SecureRandom());
    encryptEngine.init(true, encryptParams);
    const ciphertext = encryptEngine.processBlock(messageBytes, 0, messageBytes.length);
    
    // Decrypt
    const decryptEngine = new SM2Engine();
    decryptEngine.init(false, keyPair.privateKey);
    const decrypted = decryptEngine.processBlock(ciphertext, 0, ciphertext.length);
    const decryptedMessage = new TextDecoder().decode(decrypted);
    
    const pass = decryptedMessage === testMessage;
    console.log(`Length ${messageBytes.length}: ${pass ? '✓ PASS' : '✗ FAIL'}`);
    
    if (!pass) {
      console.log('  Expected:', testMessage.substring(0, 50));
      console.log('  Got:', decryptedMessage.substring(0, 50));
    }
  }
  console.log('');
}

/**
 * Run all tests.
 */
function runTests() {
  try {
    testSM2EncryptionDecryption();
    testDifferentLengths();
    
    console.log('=== All Tests Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run tests
runTests();
