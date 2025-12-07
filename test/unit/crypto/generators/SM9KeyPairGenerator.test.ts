import { describe, it, expect } from 'vitest';
import { SM9KeyPairGenerator } from '../../../../src/crypto/generators/SM9KeyPairGenerator';
import { SM9Parameters } from '../../../../src/crypto/params/SM9Parameters';
// Ensure ECPoint factory is registered
import '../../../../src/math/ec/ECPoint';

describe('SM9KeyPairGenerator', () => {
  describe('Master key generation', () => {
    it('should generate valid master key pair', () => {
      const keyPair = SM9KeyPairGenerator.generateSignMasterKeyPair();

      expect(keyPair.masterSecretKey).toBeGreaterThan(0n);
      expect(keyPair.masterSecretKey).toBeLessThan(SM9Parameters.N);
      expect(keyPair.masterPublicKey).toBeDefined();
      expect(keyPair.masterPublicKey.isInfinity()).toBe(false);
    });

    it('should generate different keys each time', () => {
      const keyPair1 = SM9KeyPairGenerator.generateSignMasterKeyPair();
      const keyPair2 = SM9KeyPairGenerator.generateSignMasterKeyPair();

      expect(keyPair1.masterSecretKey).not.toBe(keyPair2.masterSecretKey);
    });

    it('should have master public key as ks * P2', () => {
      const keyPair = SM9KeyPairGenerator.generateSignMasterKeyPair();
      const p2 = SM9Parameters.getP2();

      // Verify Ppub-s = ks * P2
      const computed = p2.multiply(keyPair.masterSecretKey);
      expect(computed.equals(keyPair.masterPublicKey)).toBe(true);
    });
  });

  describe('User key generation', () => {
    it('should generate user signing key', () => {
      const masterKeyPair = SM9KeyPairGenerator.generateSignMasterKeyPair();
      const userId = 'alice@example.com';

      const userKey = SM9KeyPairGenerator.generateUserSignKey(
        userId,
        masterKeyPair.masterSecretKey
      );

      expect(userKey.userId).toBe(userId);
      expect(userKey.privateKey).toBeDefined();
      expect(userKey.privateKey.isInfinity()).toBe(false);
    });

    it('should generate same key for same user ID', () => {
      const masterKeyPair = SM9KeyPairGenerator.generateSignMasterKeyPair();
      const userId = 'alice@example.com';

      const userKey1 = SM9KeyPairGenerator.generateUserSignKey(
        userId,
        masterKeyPair.masterSecretKey
      );
      const userKey2 = SM9KeyPairGenerator.generateUserSignKey(
        userId,
        masterKeyPair.masterSecretKey
      );

      expect(userKey1.privateKey.equals(userKey2.privateKey)).toBe(true);
    });

    it('should generate keys for different users', () => {
      const masterKeyPair = SM9KeyPairGenerator.generateSignMasterKeyPair();

      const userKey1 = SM9KeyPairGenerator.generateUserSignKey(
        'alice@example.com',
        masterKeyPair.masterSecretKey
      );
      const userKey2 = SM9KeyPairGenerator.generateUserSignKey(
        'bob@example.com',
        masterKeyPair.masterSecretKey
      );

      // Both keys should be valid
      expect(userKey1.privateKey.isInfinity()).toBe(false);
      expect(userKey2.privateKey.isInfinity()).toBe(false);
    });

    it('should generate different keys for different master keys', () => {
      const masterKeyPair1 = SM9KeyPairGenerator.generateSignMasterKeyPair();
      const masterKeyPair2 = SM9KeyPairGenerator.generateSignMasterKeyPair();
      const userId = 'alice@example.com';

      const userKey1 = SM9KeyPairGenerator.generateUserSignKey(
        userId,
        masterKeyPair1.masterSecretKey
      );
      const userKey2 = SM9KeyPairGenerator.generateUserSignKey(
        userId,
        masterKeyPair2.masterSecretKey
      );

      expect(userKey1.privateKey.equals(userKey2.privateKey)).toBe(false);
    });
  });
});
