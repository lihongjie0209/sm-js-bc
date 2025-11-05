import { describe, it, expect, beforeAll } from 'vitest';
import { SM2 } from '../../../src/crypto/SM2';
// Ensure ECPoint factory is registered
import '../../../src/math/ec/ECPoint';
import { SecureRandom } from '../../../src/util/SecureRandom';

describe('SM2 Static Methods', () => {
  describe('getParameters()', () => {
    it('should return consistent domain parameters', () => {
      const params1 = SM2.getParameters();
      const params2 = SM2.getParameters();
      
      expect(params1).toBe(params2); // Same instance
      expect(params1.getCurve()).toBeDefined();
      expect(params1.getG()).toBeDefined();
      expect(params1.getN()).toBeDefined();
      expect(params1.getH()).toBeDefined();
    });

    it('should have correct curve parameters', () => {
      const params = SM2.getParameters();
      const curve = params.getCurve();
      
      // Verify SM2 curve equation: y² = x³ + ax + b
      expect(curve.getA().toBigInteger()).toBe(0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFCn);
      expect(curve.getB().toBigInteger()).toBe(0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93n);
    });

    it('should have correct base point', () => {
      const params = SM2.getParameters();
      const G = params.getG();
      
      expect(G.getAffineXCoord().toBigInteger()).toBe(0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7n);
      expect(G.getAffineYCoord().toBigInteger()).toBe(0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0n);
    });
  });

  describe('getCurve()', () => {
    it('should return the curve from domain parameters', () => {
      const curve = SM2.getCurve();
      const paramsCurve = SM2.getParameters().getCurve();
      
      expect(curve).toBe(paramsCurve);
    });
  });

  describe('generateKeyPair()', () => {
    it('should generate valid key pairs', () => {
      const keyPair = SM2.generateKeyPair();
      
      expect(keyPair).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.publicKey.x).toBeDefined();
      expect(keyPair.publicKey.y).toBeDefined();
      
      // Private key should be a valid scalar
      expect(typeof keyPair.privateKey).toBe('bigint');
      expect(keyPair.privateKey > 0n).toBe(true);
      expect(keyPair.privateKey < SM2.getParameters().getN()).toBe(true);
    });

    it('should generate different key pairs', () => {
      const keyPair1 = SM2.generateKeyPair();
      const keyPair2 = SM2.generateKeyPair();
      
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
      expect(keyPair1.publicKey.x).not.toBe(keyPair2.publicKey.x);
      expect(keyPair1.publicKey.y).not.toBe(keyPair2.publicKey.y);
    });

    it('should generate public key on curve', () => {
      const keyPair = SM2.generateKeyPair();
      const curve = SM2.getCurve();
      
      // Verify public key is on curve
      const point = curve.createPoint(keyPair.publicKey.x, keyPair.publicKey.y);
      expect(point.isValid()).toBe(true);
    });
  });

  describe('encrypt()', () => {
    it('should encrypt string messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Hello SM2!';
      
      const ciphertext = SM2.encrypt(message, keyPair.publicKey.x, keyPair.publicKey.y);
      
      expect(ciphertext).toBeDefined();
      expect(ciphertext.length).toBeGreaterThan(0);
      expect(ciphertext.length).toBeGreaterThan(message.length); // Ciphertext is longer
    });

    it('should encrypt Uint8Array messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      
      const ciphertext = SM2.encrypt(message, keyPair.publicKey.x, keyPair.publicKey.y);
      
      expect(ciphertext).toBeDefined();
      expect(ciphertext.length).toBeGreaterThan(message.length);
    });

    it('should handle public key object format', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Test message';
      
      const ciphertext = SM2.encrypt(message, keyPair.publicKey);
      
      expect(ciphertext).toBeDefined();
      expect(ciphertext.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid public key format', () => {
      expect(() => {
        SM2.encrypt('test', 123 as any); // Invalid format
      }).toThrow('Invalid public key format');
    });

    it('should handle empty messages', () => {
      const keyPair = SM2.generateKeyPair();
      
      // SM2 engine doesn't support truly empty messages (length 0)
      // This is expected behavior according to the specification
      expect(() => {
        SM2.encrypt('', keyPair.publicKey);
      }).toThrow('input buffer too short');
      
      expect(() => {
        SM2.encrypt(new Uint8Array([]), keyPair.publicKey);
      }).toThrow('input buffer too short');
    });

    it('should handle large messages', () => {
      const keyPair = SM2.generateKeyPair();
      const largeMessage = 'A'.repeat(1000);
      
      const ciphertext = SM2.encrypt(largeMessage, keyPair.publicKey);
      
      expect(ciphertext).toBeDefined();
      expect(ciphertext.length).toBeGreaterThan(1000);
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Hello SM2 Decryption!';
      
      const ciphertext = SM2.encrypt(message, keyPair.publicKey);
      const decrypted = SM2.decrypt(ciphertext, keyPair.privateKey);
      
      expect(decrypted).toBeDefined();
      expect(new TextDecoder().decode(decrypted)).toBe(message);
    });

    it('should handle binary data', () => {
      const keyPair = SM2.generateKeyPair();
      const message = new Uint8Array([0, 1, 2, 3, 255, 128, 64]);
      
      const ciphertext = SM2.encrypt(message, keyPair.publicKey);
      const decrypted = SM2.decrypt(ciphertext, keyPair.privateKey);
      
      expect(decrypted).toEqual(message);
    });

    it('should handle empty messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = '';
      
      // SM2 engine doesn't support empty messages - this is expected behavior
      expect(() => {
        SM2.encrypt(message, keyPair.publicKey);
      }).toThrow('input buffer too short');
      
      // Since encryption fails, we can't test decryption of empty messages
      // This is correct according to SM2 specification
    });

    it('should fail with wrong private key', () => {
      const keyPair1 = SM2.generateKeyPair();
      const keyPair2 = SM2.generateKeyPair();
      const message = 'Secret message';
      
      const ciphertext = SM2.encrypt(message, keyPair1.publicKey);
      
      expect(() => {
        SM2.decrypt(ciphertext, keyPair2.privateKey);
      }).toThrow();
    });

    it('should fail with corrupted ciphertext', () => {
      const keyPair = SM2.generateKeyPair();
      const corruptedCiphertext = new Uint8Array([1, 2, 3, 4, 5]); // Too short
      
      expect(() => {
        SM2.decrypt(corruptedCiphertext, keyPair.privateKey);
      }).toThrow();
    });
  });

  describe('sign()', () => {
    it('should sign string messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Hello SM2 Signature!';
      
      const signature = SM2.sign(message, keyPair.privateKey);
      
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
      expect(signature.length).toBeGreaterThan(64); // DER encoded signature
    });

    it('should sign Uint8Array messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      
      const signature = SM2.sign(message, keyPair.privateKey);
      
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should produce different signatures for same message', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Same message';
      
      const signature1 = SM2.sign(message, keyPair.privateKey);
      const signature2 = SM2.sign(message, keyPair.privateKey);
      
      // Due to randomness in k, signatures should be different
      expect(signature1).not.toEqual(signature2);
    });

    it('should handle empty messages', () => {
      const keyPair = SM2.generateKeyPair();
      
      const signature1 = SM2.sign('', keyPair.privateKey);
      const signature2 = SM2.sign(new Uint8Array([]), keyPair.privateKey);
      
      expect(signature1).toBeDefined();
      expect(signature2).toBeDefined();
    });

    it('should handle large messages', () => {
      const keyPair = SM2.generateKeyPair();
      const largeMessage = 'B'.repeat(10000);
      
      const signature = SM2.sign(largeMessage, keyPair.privateKey);
      
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('verify()', () => {
    it('should verify valid signatures', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Verify this message';
      
      const signature = SM2.sign(message, keyPair.privateKey);
      const isValid = SM2.verify(message, signature, keyPair.publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should verify signatures with separate x,y coordinates', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Test verification';
      
      const signature = SM2.sign(message, keyPair.privateKey);
      const isValid = SM2.verify(message, signature, keyPair.publicKey.x, keyPair.publicKey.y);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Original message';
      const tamperedMessage = 'Tampered message';
      
      const signature = SM2.sign(message, keyPair.privateKey);
      const isValid = SM2.verify(tamperedMessage, signature, keyPair.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject signatures with wrong public key', () => {
      const keyPair1 = SM2.generateKeyPair();
      const keyPair2 = SM2.generateKeyPair();
      const message = 'Test message';
      
      const signature = SM2.sign(message, keyPair1.privateKey);
      const isValid = SM2.verify(message, signature, keyPair2.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should handle corrupted signatures', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Test message';
      const corruptedSignature = new Uint8Array([1, 2, 3, 4, 5]);
      
      const isValid = SM2.verify(message, corruptedSignature, keyPair.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should handle binary messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = new Uint8Array([0, 1, 255, 128, 64]);
      
      const signature = SM2.sign(message, keyPair.privateKey);
      const isValid = SM2.verify(message, signature, keyPair.publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should throw error for invalid public key format', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Test message';
      const signature = SM2.sign(message, keyPair.privateKey);
      
      expect(() => {
        SM2.verify(message, signature, 'invalid' as any);
      }).toThrow('Invalid public key format');
    });

    it('should handle empty messages', () => {
      const keyPair = SM2.generateKeyPair();
      const message = '';
      
      const signature = SM2.sign(message, keyPair.privateKey);
      const isValid = SM2.verify(message, signature, keyPair.publicKey);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle multiple operations with same key pair', () => {
      const keyPair = SM2.generateKeyPair();
      const messages = ['msg1', 'msg2', 'msg3'];
      
      // Multiple encryptions
      const ciphertexts = messages.map(msg => SM2.encrypt(msg, keyPair.publicKey));
      const decrypted = ciphertexts.map(ct => new TextDecoder().decode(SM2.decrypt(ct, keyPair.privateKey)));
      expect(decrypted).toEqual(messages);
      
      // Multiple signatures
      const signatures = messages.map(msg => SM2.sign(msg, keyPair.privateKey));
      const verifications = signatures.map((sig, i) => SM2.verify(messages[i], sig, keyPair.publicKey));
      expect(verifications).toEqual([true, true, true]);
    });

    it('should handle extreme message sizes', () => {
      const keyPair = SM2.generateKeyPair();
      
      // Very small message
      const smallMsg = 'a';
      const smallCiphertext = SM2.encrypt(smallMsg, keyPair.publicKey);
      const smallDecrypted = new TextDecoder().decode(SM2.decrypt(smallCiphertext, keyPair.privateKey));
      expect(smallDecrypted).toBe(smallMsg);
      
      const smallSignature = SM2.sign(smallMsg, keyPair.privateKey);
      expect(SM2.verify(smallMsg, smallSignature, keyPair.publicKey)).toBe(true);
      
      // Larger message (but not huge to keep test fast)
      const largeMsg = 'x'.repeat(500);
      const largeCiphertext = SM2.encrypt(largeMsg, keyPair.publicKey);
      const largeDecrypted = new TextDecoder().decode(SM2.decrypt(largeCiphertext, keyPair.privateKey));
      expect(largeDecrypted).toBe(largeMsg);
      
      const largeSignature = SM2.sign(largeMsg, keyPair.privateKey);
      expect(SM2.verify(largeMsg, largeSignature, keyPair.publicKey)).toBe(true);
    });

    it('should handle special byte values', () => {
      const keyPair = SM2.generateKeyPair();
      const specialBytes = new Uint8Array([0, 1, 127, 128, 255]);
      
      const ciphertext = SM2.encrypt(specialBytes, keyPair.publicKey);
      const decrypted = SM2.decrypt(ciphertext, keyPair.privateKey);
      expect(decrypted).toEqual(specialBytes);
      
      const signature = SM2.sign(specialBytes, keyPair.privateKey);
      expect(SM2.verify(specialBytes, signature, keyPair.publicKey)).toBe(true);
    });

    it('should be deterministic for domain parameters', () => {
      // Multiple calls should return exact same parameters
      const params1 = SM2.getParameters();
      const params2 = SM2.getParameters();
      const params3 = SM2.getParameters();
      
      expect(params1).toBe(params2);
      expect(params2).toBe(params3);
      
      const curve1 = SM2.getCurve();
      const curve2 = SM2.getCurve();
      
      expect(curve1).toBe(curve2);
    });
  });

  describe('Cross-compatibility Tests', () => {
    it('should maintain consistency between encrypt/decrypt and sign/verify', () => {
      const keyPair = SM2.generateKeyPair();
      const message = 'Cross-compatibility test message';
      
      // Test both string and binary forms
      const stringMessage = message;
      const binaryMessage = new TextEncoder().encode(message);
      
      // Encryption/Decryption
      const ciphertext1 = SM2.encrypt(stringMessage, keyPair.publicKey);
      const ciphertext2 = SM2.encrypt(binaryMessage, keyPair.publicKey);
      
      const decrypted1 = new TextDecoder().decode(SM2.decrypt(ciphertext1, keyPair.privateKey));
      const decrypted2 = new TextDecoder().decode(SM2.decrypt(ciphertext2, keyPair.privateKey));
      
      expect(decrypted1).toBe(message);
      expect(decrypted2).toBe(message);
      
      // Signing/Verification
      const signature1 = SM2.sign(stringMessage, keyPair.privateKey);
      const signature2 = SM2.sign(binaryMessage, keyPair.privateKey);
      
      expect(SM2.verify(stringMessage, signature1, keyPair.publicKey)).toBe(true);
      expect(SM2.verify(binaryMessage, signature2, keyPair.publicKey)).toBe(true);
      
      // Cross-verify (string signature with binary message and vice versa)
      expect(SM2.verify(binaryMessage, signature1, keyPair.publicKey)).toBe(true);
      expect(SM2.verify(stringMessage, signature2, keyPair.publicKey)).toBe(true);
    });
  });
});