/**
 * Generate valid SM2 test key pairs
 */

import * as smBc from '../dist/index.mjs';

const { SM2 } = smBc;

console.log('Generating 3 SM2 key pairs for testing...\n');

for (let i = 1; i <= 3; i++) {
  const keyPair = SM2.generateKeyPair();
  
  const privateKeyHex = keyPair.privateKey.toString(16).toUpperCase().padStart(64, '0');
  const publicKeyX = keyPair.publicKey.x.toString(16).toUpperCase().padStart(64, '0');
  const publicKeyY = keyPair.publicKey.y.toString(16).toUpperCase().padStart(64, '0');
  const publicKeyHex = '04' + publicKeyX + publicKeyY;
  
  console.log(`Key Pair ${i}:`);
  console.log(`Private Key: ${privateKeyHex}`);
  console.log(`Public Key:  ${publicKeyHex}`);
  console.log(`Public Key X: ${publicKeyX}`);
  console.log(`Public Key Y: ${publicKeyY}`);
  console.log();
}
