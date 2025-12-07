import { describe, it, expect } from 'vitest';
import { SM9Signer } from '../../../../src/crypto/signers/SM9Signer';

describe('SM9Signer', () => {
  describe('Basic functionality', () => {
    it('should create signer instance', () => {
      const signer = new SM9Signer();
      expect(signer).toBeDefined();
    });

    it('should have correct algorithm name', () => {
      const signer = new SM9Signer();
      expect(signer.getAlgorithmName()).toBe('SM9');
    });

    it('should throw error when signing without initialization', () => {
      const signer = new SM9Signer();
      const message = new TextEncoder().encode('Hello, SM9!');
      
      expect(() => signer.generateSignature(message)).toThrow(
        'Signer not initialized for signing'
      );
    });

    it('should throw error when verifying without initialization', () => {
      const signer = new SM9Signer();
      const message = new TextEncoder().encode('Hello, SM9!');
      const signature = new Uint8Array(96);
      
      expect(() => signer.verifySignature(message, signature)).toThrow();
    });
  });

  // Note: Full signature generation and verification tests require:
  // - Complete pairing implementation
  // - Master key generation
  // - User key derivation
  // These will be added once pairing engine is complete
});
