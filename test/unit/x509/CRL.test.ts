import { describe, it, expect } from 'vitest';
import {
  SM2,
  X509Name,
  CRLBuilder,
  RevokedCertificate,
  ECPublicKeyParameters
} from '../../../src/index';

describe('Certificate Revocation List (CRL)', () => {
  describe('CRLBuilder', () => {
    it('should create a CRL', () => {
      const keyPair = SM2.generateKeyPair();
      const issuer = new X509Name('CN=Test CA,O=Test Org,C=CN');

      const thisUpdate = new Date();
      const nextUpdate = new Date(thisUpdate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const crl = new CRLBuilder()
        .setIssuer(issuer)
        .setThisUpdate(thisUpdate)
        .setNextUpdate(nextUpdate)
        .build(keyPair.privateKey);

      expect(crl).toBeDefined();
      expect(crl.getIssuer().getCommonName()).toBe('Test CA');
      expect(crl.getThisUpdate()).toEqual(thisUpdate);
      expect(crl.getNextUpdate()).toEqual(nextUpdate);
    });

    it('should add revoked certificates', () => {
      const keyPair = SM2.generateKeyPair();
      const issuer = new X509Name('CN=Test CA,O=Test Org');

      const thisUpdate = new Date();
      const revocationDate = new Date(thisUpdate.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      const crl = new CRLBuilder()
        .setIssuer(issuer)
        .setThisUpdate(thisUpdate)
        .addRevokedCertificate(BigInt(12345), revocationDate)
        .addRevokedCertificate(BigInt(67890), revocationDate)
        .build(keyPair.privateKey);

      const revoked = crl.getRevokedCertificates();
      expect(revoked.length).toBe(2);
      expect(revoked[0].serialNumber).toBe(BigInt(12345));
    });

    it('should check if certificate is revoked', () => {
      const keyPair = SM2.generateKeyPair();
      const issuer = new X509Name('CN=Test CA,O=Org');

      const thisUpdate = new Date();

      const crl = new CRLBuilder()
        .setIssuer(issuer)
        .setThisUpdate(thisUpdate)
        .addRevokedCertificate(BigInt(12345), new Date())
        .build(keyPair.privateKey);

      expect(crl.isRevoked(BigInt(12345))).toBe(true);
      expect(crl.isRevoked(BigInt(99999))).toBe(false);
    });

    it('should verify CRL signature', () => {
      const keyPair = SM2.generateKeyPair();
      const issuer = new X509Name('CN=Test CA,O=Org');

      const crl = new CRLBuilder()
        .setIssuer(issuer)
        .setThisUpdate(new Date())
        .build(keyPair.privateKey);

      // Create public key parameters
      const domainParams = SM2.getParameters();
      const curve = domainParams.getCurve();
      const Q = curve.createPoint(keyPair.publicKey.x, keyPair.publicKey.y);
      const publicKeyParams = new ECPublicKeyParameters(Q, domainParams);

      expect(crl.verify(publicKeyParams)).toBe(true);
    });

    it('should encode CRL to PEM', () => {
      const keyPair = SM2.generateKeyPair();
      const issuer = new X509Name('CN=Test CA,O=Org');

      const crl = new CRLBuilder()
        .setIssuer(issuer)
        .setThisUpdate(new Date())
        .build(keyPair.privateKey);

      const pem = crl.toPEM();
      expect(pem).toContain('-----BEGIN X509 CRL-----');
      expect(pem).toContain('-----END X509 CRL-----');
    });
  });

  describe('RevokedCertificate', () => {
    it('should create revoked certificate entry', () => {
      const serialNumber = BigInt(12345);
      const revocationDate = new Date();

      const revoked = new RevokedCertificate(serialNumber, revocationDate);

      expect(revoked.serialNumber).toBe(serialNumber);
      expect(revoked.revocationDate).toEqual(revocationDate);
    });

    it('should encode revoked certificate', () => {
      const revoked = new RevokedCertificate(BigInt(12345), new Date());
      const encoded = revoked.getEncoded();

      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);
    });
  });
});
