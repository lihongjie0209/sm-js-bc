/**
 * SM2Signer comprehensive test suite.
 * 
 * Tests the SM2 digital signature algorithm implementation including:
 * - Key initialization and parameter handling
 * - Signature generation and verification
 * - Edge cases and error conditions
 * - Compatibility with GM/T 0003.2-2012 standard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SM2Signer } from '../../../src/crypto/signers/SM2Signer';
import { StandardDSAEncoding } from '../../../src/crypto/signers/StandardDSAEncoding';
import { RandomDSAKCalculator } from '../../../src/crypto/signers/RandomDSAKCalculator';
import { SM3Digest } from '../../../src/crypto/digests/SM3Digest';
import { ECPrivateKeyParameters } from '../../../src/crypto/params/ECPrivateKeyParameters';
import { ECPublicKeyParameters } from '../../../src/crypto/params/ECPublicKeyParameters';
import { ParametersWithRandom } from '../../../src/crypto/params/ParametersWithRandom';
import { ParametersWithID } from '../../../src/crypto/params/ParametersWithID';
import { SM2 } from '../../../src/crypto/SM2';
import { SecureRandom } from '../../../src/util/SecureRandom';
// Import ECPoint to ensure factory registration
import '../../../src/math/ec/ECPoint';

describe('SM2Signer', () => {
  let signer: SM2Signer;
  let sm2Params: any;
  let privateKey: ECPrivateKeyParameters;
  let publicKey: ECPublicKeyParameters;

  beforeEach(() => {
    // Initialize SM2 domain parameters
    sm2Params = SM2.getParameters();
    
    // Generate test key pair
    const d = 0x128B2FA8BD433C6C068C8D803DFF79792A519A55171B1B650C23661D15897263n;
    privateKey = new ECPrivateKeyParameters(d, sm2Params);
    
    // Calculate public key Q = [d]G
    const Q = sm2Params.getG().multiply(d);
    publicKey = new ECPublicKeyParameters(Q, sm2Params);
    
    // Create signer instance
    signer = new SM2Signer();
  });

  describe('Algorithm Name', () => {
    it('should return correct algorithm name', () => {
      expect(signer.getAlgorithmName()).toBe('SM2');
    });
  });

  describe('Initialization', () => {
    it('should initialize for signing with private key', () => {
      expect(() => {
        signer.init(true, privateKey);
      }).not.toThrow();
    });

    it('should initialize for verification with public key', () => {
      expect(() => {
        signer.init(false, publicKey);
      }).not.toThrow();
    });

    it('should initialize with random parameters', () => {
      const random = new SecureRandom();
      const paramsWithRandom = new ParametersWithRandom(privateKey, random);
      
      expect(() => {
        signer.init(true, paramsWithRandom);
      }).not.toThrow();
    });

    it('should initialize with user ID', () => {
      const userID = new TextEncoder().encode('testuser@example.com');
      const paramsWithID = new ParametersWithID(privateKey, userID);
      
      expect(() => {
        signer.init(true, paramsWithID);
      }).not.toThrow();
    });

    it('should throw error when signing with public key', () => {
      expect(() => {
        signer.init(true, publicKey);
      }).toThrow('Signing requires ECPrivateKeyParameters');
    });

    it('should throw error when verifying with private key', () => {
      expect(() => {
        signer.init(false, privateKey);
      }).toThrow('Verification requires ECPublicKeyParameters');
    });
  });

  describe('Standard DSA Encoding', () => {
    it('should encode and decode signature correctly', () => {
      const encoding = StandardDSAEncoding.INSTANCE;
      const n = sm2Params.getN();
      const r = 0x12345678n;
      const s = 0x87654321n;

      const encoded = encoding.encode(n, r, s);
      const [decodedR, decodedS] = encoding.decode(n, encoded);

      expect(decodedR).toBe(r);
      expect(decodedS).toBe(s);
    });

    it('should handle large signature values', () => {
      const encoding = StandardDSAEncoding.INSTANCE;
      const n = sm2Params.getN();
      const r = n - 1n;
      const s = n - 2n;

      const encoded = encoding.encode(n, r, s);
      const [decodedR, decodedS] = encoding.decode(n, encoded);

      expect(decodedR).toBe(r);
      expect(decodedS).toBe(s);
    });

    it('should reject out-of-range values', () => {
      const encoding = StandardDSAEncoding.INSTANCE;
      const n = sm2Params.getN();

      expect(() => {
        encoding.encode(n, 0n, 1n);
      }).toThrow('r component out of range');

      expect(() => {
        encoding.encode(n, 1n, n);
      }).toThrow('s component out of range');
    });
  });

  describe('Message Processing', () => {
    beforeEach(() => {
      signer.init(true, privateKey);
    });

    it('should process single byte updates', () => {
      expect(() => {
        signer.update(0x61); // 'a'
        signer.update(0x62); // 'b'
        signer.update(0x63); // 'c'
      }).not.toThrow();
    });

    it('should process byte array updates', () => {
      const message = new TextEncoder().encode('Hello, SM2!');
      
      expect(() => {
        signer.update(message, 0, message.length);
      }).not.toThrow();
    });

    it('should reset properly', () => {
      const message = new TextEncoder().encode('test message');
      signer.update(message, 0, message.length);
      
      expect(() => {
        signer.reset();
      }).not.toThrow();
    });
  });

  describe('Signature Generation and Verification', () => {
    const testMessage = new TextEncoder().encode('SM2 signature test message');

    it('should generate valid signatures', () => {
      signer.init(true, privateKey);
      signer.update(testMessage, 0, testMessage.length);
      
      const signature = signer.generateSignature();
      
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should verify valid signatures', () => {
      // Generate signature
      signer.init(true, privateKey);
      signer.update(testMessage, 0, testMessage.length);
      const signature = signer.generateSignature();
      
      // Verify signature
      signer.init(false, publicKey);
      signer.update(testMessage, 0, testMessage.length);
      const isValid = signer.verifySignature(signature);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      // Generate signature for different message
      const otherMessage = new TextEncoder().encode('Different message');
      signer.init(true, privateKey);
      signer.update(otherMessage, 0, otherMessage.length);
      const signature = signer.generateSignature();
      
      // Try to verify against original message
      signer.init(false, publicKey);
      signer.update(testMessage, 0, testMessage.length);
      const isValid = signer.verifySignature(signature);
      
      expect(isValid).toBe(false);
    });

    it('should handle corrupted signatures', () => {
      // Generate valid signature
      signer.init(true, privateKey);
      signer.update(testMessage, 0, testMessage.length);
      const signature = signer.generateSignature();
      
      // Corrupt the signature
      signature[signature.length - 1] ^= 0x01;
      
      // Verify corrupted signature
      signer.init(false, publicKey);
      signer.update(testMessage, 0, testMessage.length);
      const isValid = signer.verifySignature(signature);
      
      expect(isValid).toBe(false);
    });
  });

  describe('User ID Handling', () => {
    const customUserID = new TextEncoder().encode('alice@example.com');
    const testMessage = new TextEncoder().encode('Message with custom user ID');

    it('should use custom user ID in signature', () => {
      const paramsWithID = new ParametersWithID(privateKey, customUserID);
      
      signer.init(true, paramsWithID);
      signer.update(testMessage, 0, testMessage.length);
      const signature1 = signer.generateSignature();
      
      // Use default user ID
      signer.init(true, privateKey);
      signer.update(testMessage, 0, testMessage.length);
      const signature2 = signer.generateSignature();
      
      // Signatures should be different due to different Z_A values
      expect(signature1).not.toEqual(signature2);
    });

    it('should verify signature with matching user ID', () => {
      const paramsWithIDPrivate = new ParametersWithID(privateKey, customUserID);
      const paramsWithIDPublic = new ParametersWithID(publicKey, customUserID);
      
      // Sign with custom user ID
      signer.init(true, paramsWithIDPrivate);
      signer.update(testMessage, 0, testMessage.length);
      const signature = signer.generateSignature();
      
      // Verify with same user ID
      signer.init(false, paramsWithIDPublic);
      signer.update(testMessage, 0, testMessage.length);
      const isValid = signer.verifySignature(signature);
      
      expect(isValid).toBe(true);
    });

    it('should reject signature with mismatched user ID', () => {
      const paramsWithID = new ParametersWithID(privateKey, customUserID);
      
      // Sign with custom user ID
      signer.init(true, paramsWithID);
      signer.update(testMessage, 0, testMessage.length);
      const signature = signer.generateSignature();
      
      // Verify with default user ID (different from signing)
      signer.init(false, publicKey);
      signer.update(testMessage, 0, testMessage.length);
      const isValid = signer.verifySignature(signature);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Error Conditions', () => {
    it('should throw error when generating signature without initialization', () => {
      const uninitializedSigner = new SM2Signer();
      
      expect(() => {
        uninitializedSigner.generateSignature();
      }).toThrow('Signer not initialized');
    });

    it('should throw error when verifying signature without initialization', () => {
      const uninitializedSigner = new SM2Signer();
      const dummySignature = new Uint8Array([0x01, 0x02, 0x03]);
      
      expect(() => {
        uninitializedSigner.verifySignature(dummySignature);
      }).toThrow('Signer not properly initialized');
    });

    it('should throw error when generating signature with verification key', () => {
      signer.init(false, publicKey);
      
      expect(() => {
        signer.generateSignature();
      }).toThrow('Signer not initialized for signing');
    });

    it('should throw error when verifying signature with signing key', () => {
      const dummySignature = new Uint8Array([0x01, 0x02, 0x03]);
      signer.init(true, privateKey);
      
      expect(() => {
        signer.verifySignature(dummySignature);
      }).toThrow('Signer not initialized for verification');
    });

    it('should handle malformed signature encoding', () => {
      signer.init(false, publicKey);
      
      const malformedSignature = new Uint8Array([0xFF, 0xFE, 0xFD]);
      const isValid = signer.verifySignature(malformedSignature);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Deterministic Behavior', () => {
    const testMessage = new TextEncoder().encode('Deterministic test message');

    it('should generate different signatures for same message', () => {
      signer.init(true, privateKey);
      
      // Generate first signature
      signer.update(testMessage, 0, testMessage.length);
      const signature1 = signer.generateSignature();
      
      // Generate second signature for same message
      signer.update(testMessage, 0, testMessage.length);
      const signature2 = signer.generateSignature();
      
      // Should be different due to random k values
      expect(signature1).not.toEqual(signature2);
      
      // But both should verify correctly
      signer.init(false, publicKey);
      
      signer.update(testMessage, 0, testMessage.length);
      expect(signer.verifySignature(signature1)).toBe(true);
      
      signer.update(testMessage, 0, testMessage.length);
      expect(signer.verifySignature(signature2)).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty message', () => {
      signer.init(true, privateKey);
      const signature = signer.generateSignature();
      
      signer.init(false, publicKey);
      const isValid = signer.verifySignature(signature);
      
      expect(isValid).toBe(true);
    });

    it('should handle large messages', () => {
      const largeMessage = new Uint8Array(10000);
      for (let i = 0; i < largeMessage.length; i++) {
        largeMessage[i] = i % 256;
      }
      
      signer.init(true, privateKey);
      signer.update(largeMessage, 0, largeMessage.length);
      const signature = signer.generateSignature();
      
      signer.init(false, publicKey);
      signer.update(largeMessage, 0, largeMessage.length);
      const isValid = signer.verifySignature(signature);
      
      expect(isValid).toBe(true);
    });

    it('should handle multiple signature operations', () => {
      const messages = [
        new TextEncoder().encode('Message 1'),
        new TextEncoder().encode('Message 2'),
        new TextEncoder().encode('Message 3')
      ];
      
      const signatures: Uint8Array[] = [];
      
      // Generate multiple signatures
      for (const message of messages) {
        signer.init(true, privateKey);
        signer.update(message, 0, message.length);
        signatures.push(signer.generateSignature());
      }
      
      // Verify all signatures
      for (let i = 0; i < messages.length; i++) {
        signer.init(false, publicKey);
        signer.update(messages[i], 0, messages[i].length);
        expect(signer.verifySignature(signatures[i])).toBe(true);
      }
    });
  });
});