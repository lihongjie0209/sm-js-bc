/**
 * Debug test for SM2
 */

import { SM2, BigIntegers, SecureRandom } from '../src/index';

console.log('=== SM2 Debug Test ===\n');

// Get SM2 parameters
const params = SM2.getParameters();
const G = SM2.getG();
const n = SM2.getN();

console.log('G point:', G);
console.log('G is infinity?', G.isInfinity());
console.log('G is valid?', G.isValid());
console.log('G encoded:', G.getEncoded(false).slice(0, 10));
console.log('');

// Test point multiplication
console.log('Testing point multiplication...');
const k = 5n;
const kG = G.multiply(k);
console.log('5*G:', kG);
console.log('5*G is infinity?', kG.isInfinity());
console.log('5*G is valid?', kG.isValid());
console.log('5*G encoded:', kG.getEncoded(false).slice(0, 10));
console.log('');

// Test with random k
console.log('Testing with random k...');
const random = new SecureRandom();
const randomK = BigIntegers.createRandomBigInteger(256, random);
console.log('Random k:', randomK.toString(16).substring(0, 32) + '...');
const randomKG = G.multiply(randomK);
console.log('k*G is infinity?', randomKG.isInfinity());
console.log('k*G is valid?', randomKG.isValid());
console.log('k*G encoded length:', randomKG.getEncoded(false).length);
console.log('');

console.log('=== Test Complete ===');
