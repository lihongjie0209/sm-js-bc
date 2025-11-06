/**
 * API Compatibility Tests
 * 
 * Tests to verify the API consistency improvements match Bouncy Castle Java API
 */

import { describe, it, expect } from 'vitest';
import { SM3Digest } from '../../../src/crypto/digests/SM3Digest';
import { SM2Engine, SM2Mode } from '../../../src/crypto/engines/SM2Engine';
import { SM2Signer } from '../../../src/crypto/signers/SM2Signer';
import { ECPrivateKeyParameters } from '../../../src/crypto/params/ECPrivateKeyParameters';
import { ECPublicKeyParameters } from '../../../src/crypto/params/ECPublicKeyParameters';
import { ParametersWithRandom } from '../../../src/crypto/params/ParametersWithRandom';
import { SM2 } from '../../../src/crypto/SM2';
import { SecureRandom } from '../../../src/util/SecureRandom';
// Ensure ECPoint factory is registered
import '../../../src/math/ec/ECPoint';

describe('API Compatibility - Bouncy Castle Java Interface Consistency', () => {
  describe('SM3Digest.reset() - Method Overload', () => {
    it('should support reset() with no parameters', () => {
      const digest = new SM3Digest();
      const data = new TextEncoder().encode('test data');
      
      digest.updateArray(data, 0, data.length);
      
      // Call reset with no parameters
      digest.reset();
      
      // Verify digest is reset to initial state
      const hash1 = new Uint8Array(digest.getDigestSize());
      digest.doFinal(hash1, 0);
      
      // Create a fresh digest for comparison
      const digest2 = new SM3Digest();
      const hash2 = new Uint8Array(digest2.getDigestSize());
      digest2.doFinal(hash2, 0);
      
      expect(Buffer.from(hash1).toString('hex')).toBe(Buffer.from(hash2).toString('hex'));
    });

    it('should support reset(Memoable) to restore state', () => {
      const digest1 = new SM3Digest();
      const data1 = new TextEncoder().encode('first part');
      digest1.updateArray(data1, 0, data1.length);
      
      // Save state
      const savedState = digest1.copy();
      
      // Continue with digest1
      const data2 = new TextEncoder().encode('second part');
      digest1.updateArray(data2, 0, data2.length);
      const hash1 = new Uint8Array(digest1.getDigestSize());
      digest1.doFinal(hash1, 0);
      
      // Create new digest and restore to saved state
      const digest2 = new SM3Digest();
      digest2.reset(savedState);
      digest2.updateArray(data2, 0, data2.length);
      const hash2 = new Uint8Array(digest2.getDigestSize());
      digest2.doFinal(hash2, 0);
      
      // Both should produce same result
      expect(Buffer.from(hash1).toString('hex')).toBe(Buffer.from(hash2).toString('hex'));
    });
  });

  describe('SM2Engine.Mode - Static Namespace Alias', () => {
    it('should support SM2Engine.Mode.C1C2C3 (Java-style access)', () => {
      // Test that we can access Mode as a static property
      expect(SM2Engine.Mode).toBeDefined();
      expect(SM2Engine.Mode.C1C2C3).toBe('C1C2C3');
      expect(SM2Engine.Mode.C1C3C2).toBe('C1C3C2');
    });

    it('should create engine with SM2Engine.Mode enum', () => {
      // Create engine using Java-style API
      const engine1 = new SM2Engine(SM2Engine.Mode.C1C2C3);
      expect(engine1).toBeDefined();
      
      const engine2 = new SM2Engine(SM2Engine.Mode.C1C3C2);
      expect(engine2).toBeDefined();
      
      // Also verify backward compatibility with SM2Mode
      const engine3 = new SM2Engine(SM2Mode.C1C2C3);
      expect(engine3).toBeDefined();
    });

    it('should encrypt/decrypt with different modes using static enum', () => {
      const keyPair = SM2.generateKeyPair();
      const domainParams = SM2.getParameters();
      
      const publicKey = new ECPublicKeyParameters(
        domainParams.getCurve().createPoint(keyPair.publicKey.x, keyPair.publicKey.y),
        domainParams
      );
      
      const privateKey = new ECPrivateKeyParameters(keyPair.privateKey, domainParams);
      
      // Test with C1C2C3 mode using static enum
      const engine1 = new SM2Engine(SM2Engine.Mode.C1C2C3);
      engine1.init(true, new ParametersWithRandom(publicKey, new SecureRandom()));
      
      const plaintext = new TextEncoder().encode('Test message');
      const ciphertext = engine1.processBlock(plaintext, 0, plaintext.length);
      
      // Decrypt
      const engine2 = new SM2Engine(SM2Engine.Mode.C1C2C3);
      engine2.init(false, privateKey);
      const decrypted = engine2.processBlock(ciphertext, 0, ciphertext.length);
      
      expect(new TextDecoder().decode(decrypted)).toBe('Test message');
    });
  });

  describe('SM2Signer - Protected Methods', () => {
    it('should have createBasePointMultiplier method available for subclassing', () => {
      const signer = new SM2Signer();
      
      // Verify the method exists and is callable
      // @ts-ignore - accessing protected method for testing
      const multiplier = signer.createBasePointMultiplier();
      expect(multiplier).toBeDefined();
    });

    it('should have calculateE method available for subclassing', () => {
      const signer = new SM2Signer();
      const n = 0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123n;
      const message = new Uint8Array([1, 2, 3, 4]);
      
      // Verify the method exists and returns expected type
      // @ts-ignore - accessing protected method for testing
      const e = signer.calculateE(n, message);
      expect(typeof e).toBe('bigint');
      expect(e >= 0n).toBe(true);
      expect(e < n).toBe(true);
    });

    it('should work with standard signing flow (integration test)', () => {
      const keyPair = SM2.generateKeyPair();
      const message = new TextEncoder().encode('Test message for signing');
      
      // Sign
      const signature = SM2.sign(message, keyPair.privateKey);
      expect(signature).toBeInstanceOf(Uint8Array);
      
      // Verify
      const isValid = SM2.verify(message, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });

  describe('Type Compatibility', () => {
    it('should correctly map byte[] to Uint8Array', () => {
      const digest = new SM3Digest();
      const input: Uint8Array = new TextEncoder().encode('test');
      const output: Uint8Array = new Uint8Array(digest.getDigestSize());
      
      // These operations should work without type errors
      digest.updateArray(input, 0, input.length);
      const size: number = digest.doFinal(output, 0);
      
      expect(size).toBe(32);
      expect(output).toBeInstanceOf(Uint8Array);
    });

    it('should correctly map BigInteger to bigint', () => {
      const keyPair = SM2.generateKeyPair();
      
      // Private key should be bigint
      expect(typeof keyPair.privateKey).toBe('bigint');
      
      // Public key coordinates should be bigint
      expect(typeof keyPair.publicKey.x).toBe('bigint');
      expect(typeof keyPair.publicKey.y).toBe('bigint');
    });

    it('should correctly map boolean types', () => {
      const engine = new SM2Engine();
      const keyPair = SM2.generateKeyPair();
      const domainParams = SM2.getParameters();
      
      const publicKey = new ECPublicKeyParameters(
        domainParams.getCurve().createPoint(keyPair.publicKey.x, keyPair.publicKey.y),
        domainParams
      );
      
      // init should accept boolean
      const forEncryption: boolean = true;
      engine.init(forEncryption, new ParametersWithRandom(publicKey, new SecureRandom()));
      
      // No error means type is correct
      expect(true).toBe(true);
    });
  });

  describe('API Method Naming Consistency', () => {
    it('SM3Digest should have getAlgorithmName() not algorithmName getter', () => {
      const digest = new SM3Digest();
      
      // Java-style method call
      const name: string = digest.getAlgorithmName();
      expect(name).toBe('SM3');
      
      // TypeScript property style should NOT exist
      // @ts-ignore
      expect(digest.algorithmName).toBeUndefined();
    });

    it('SM3Digest should have getDigestSize() not digestSize getter', () => {
      const digest = new SM3Digest();
      
      // Java-style method call
      const size: number = digest.getDigestSize();
      expect(size).toBe(32);
      
      // TypeScript property style should NOT exist
      // @ts-ignore
      expect(digest.digestSize).toBeUndefined();
    });

    it('SM3Digest should have getByteLength() not byteLength getter', () => {
      const digest = new SM3Digest();
      
      // Java-style method call
      const length: number = digest.getByteLength();
      expect(length).toBe(64);
    });
  });
});
