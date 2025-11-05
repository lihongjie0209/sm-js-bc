import { describe, it, expect } from 'vitest';
import { ECKeyParameters } from '../../../../src/crypto/params/ECKeyParameters';
import { ECPublicKeyParameters } from '../../../../src/crypto/params/ECPublicKeyParameters';
import { ECPrivateKeyParameters } from '../../../../src/crypto/params/ECPrivateKeyParameters';
import { SM2 } from '../../../../src/crypto/SM2';
// Import ECPoint to trigger factory registration
import '../../../../src/math/ec/ECPoint';

describe('ECKeyParameters', () => {
  const domainParams = SM2.getParameters();
  const curve = domainParams.getCurve();
  const G = domainParams.getG();
  
  // Test key values
  const testPrivateKey = 123456789n;
  const testPublicPoint = G.multiply(testPrivateKey);

  describe('ECPublicKeyParameters', () => {
    it('should create public key parameters correctly', () => {
      const pubKey = new ECPublicKeyParameters(testPublicPoint, domainParams);
      
      expect(pubKey.getQ()).toBe(testPublicPoint);
      expect(pubKey.getParameters()).toBe(domainParams);
      expect(pubKey.isPrivate()).toBe(false);
    });

    it('should work with SM2 curve points', () => {
      // Use the generator point itself
      const pubKey = new ECPublicKeyParameters(G, domainParams);
      
      expect(pubKey.getQ()).toBe(G);
      expect(pubKey.getParameters().getCurve()).toBe(curve);
      expect(pubKey.isPrivate()).toBe(false);
    });

    it('should handle different points', () => {
      // Test with doubled generator point
      const doubledG = G.twice();
      const pubKey = new ECPublicKeyParameters(doubledG, domainParams);
      
      expect(pubKey.getQ()).toBe(doubledG);
      expect(pubKey.getParameters().getCurve()).toBe(curve);
    });
  });

  describe('ECPrivateKeyParameters', () => {
    it('should create private key parameters correctly', () => {
      const privKey = new ECPrivateKeyParameters(testPrivateKey, domainParams);
      
      expect(privKey.getD()).toBe(testPrivateKey);
      expect(privKey.getParameters()).toBe(domainParams);
      expect(privKey.isPrivate()).toBe(true);
    });

    it('should handle zero private key', () => {
      const privKey = new ECPrivateKeyParameters(0n, domainParams);
      
      expect(privKey.getD()).toBe(0n);
      expect(privKey.isPrivate()).toBe(true);
    });

    it('should handle large private key values', () => {
      const largeKey = domainParams.getN() - 1n; // Maximum valid private key
      const privKey = new ECPrivateKeyParameters(largeKey, domainParams);
      
      expect(privKey.getD()).toBe(largeKey);
      expect(privKey.isPrivate()).toBe(true);
    });

    it('should work with SM2 parameters', () => {
      const sm2PrivKey = 0x59276E27D506861A16680F3AD9C02DCCEF3CC1FA3CDBE4CE6D54B80DEAC1BC21n;
      const privKey = new ECPrivateKeyParameters(sm2PrivKey, domainParams);
      
      expect(privKey.getD()).toBe(sm2PrivKey);
      expect(privKey.getParameters().getN()).toBe(domainParams.getN());
    });
  });

  describe('Key pair consistency', () => {
    it('should maintain consistency between public and private keys', () => {
      const d = 0x59276E27D506861A16680F3AD9C02DCCEF3CC1FA3CDBE4CE6D54B80DEAC1BC21n;
      const Q = G.multiply(d);
      
      const privKey = new ECPrivateKeyParameters(d, domainParams);
      const pubKey = new ECPublicKeyParameters(Q, domainParams);
      
      expect(privKey.getD()).toBe(d);
      expect(pubKey.getQ()).toEqual(Q);
      expect(privKey.getParameters()).toBe(pubKey.getParameters());
    });

    it('should verify key relationship', () => {
      const privKey = new ECPrivateKeyParameters(testPrivateKey, domainParams);
      const expectedPublicPoint = G.multiply(testPrivateKey);
      const pubKey = new ECPublicKeyParameters(expectedPublicPoint, domainParams);
      
      // Both keys should use the same domain parameters
      expect(privKey.getParameters()).toBe(pubKey.getParameters());
      
      // Public key should be derived from private key
      expect(pubKey.getQ()).toEqual(G.multiply(privKey.getD()));
    });
  });

  describe('Parameter inheritance', () => {
    it('should properly inherit from AsymmetricKeyParameter', () => {
      const pubKey = new ECPublicKeyParameters(testPublicPoint, domainParams);
      const privKey = new ECPrivateKeyParameters(testPrivateKey, domainParams);
      
      expect(pubKey.isPrivate()).toBe(false);
      expect(privKey.isPrivate()).toBe(true);
    });

    it('should provide access to domain parameters', () => {
      const pubKey = new ECPublicKeyParameters(testPublicPoint, domainParams);
      const privKey = new ECPrivateKeyParameters(testPrivateKey, domainParams);
      
      expect(pubKey.getParameters()).toBe(domainParams);
      expect(privKey.getParameters()).toBe(domainParams);
      expect(pubKey.getParameters().getCurve()).toBe(curve);
      expect(privKey.getParameters().getCurve()).toBe(curve);
    });
  });
});