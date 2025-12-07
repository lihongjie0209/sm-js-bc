import { describe, it, expect } from 'vitest';
import {
  SM2,
  X509Name,
  PKCS10CertificationRequestBuilder,
  PKCS10CertificationRequest,
  SubjectPublicKeyInfo,
  AlgorithmIdentifier,
  GMObjectIdentifiers
} from '../../../src/index';

describe('PKCS#10 Certificate Signing Request', () => {
  describe('PKCS10CertificationRequestBuilder', () => {
    it('should generate a CSR', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test CSR,O=Test Org,C=CN');

      const csr = PKCS10CertificationRequestBuilder.generate(subject, keyPair);

      expect(csr).toBeDefined();
      expect(csr.getSubject().getCommonName()).toBe('Test CSR');
    });

    it('should verify CSR signature', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org');

      const csr = PKCS10CertificationRequestBuilder.generate(subject, keyPair);

      // Verify the CSR signature
      const isValid = csr.verify();
      expect(isValid).toBe(true);
    });

    it('should encode and decode CSR to/from DER', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org');

      const csr = PKCS10CertificationRequestBuilder.generate(subject, keyPair);

      // Encode to DER
      const der = csr.getEncoded();
      expect(der).toBeInstanceOf(Uint8Array);
      expect(der.length).toBeGreaterThan(0);

      // Decode from DER
      const decoded = PKCS10CertificationRequest.fromEncoded(der);
      expect(decoded.getSubject().getCommonName()).toBe('Test');
    });

    it('should encode and decode CSR to/from PEM', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org');

      const csr = PKCS10CertificationRequestBuilder.generate(subject, keyPair);

      // Encode to PEM
      const pem = csr.toPEM();
      expect(pem).toContain('-----BEGIN CERTIFICATE REQUEST-----');
      expect(pem).toContain('-----END CERTIFICATE REQUEST-----');

      // Decode from PEM
      const decoded = PKCS10CertificationRequest.fromPEM(pem);
      expect(decoded.getSubject().getCommonName()).toBe('Test');
      expect(decoded.verify()).toBe(true);
    });

    it('should use builder pattern', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Builder Test,O=Org');

      const algorithm = new AlgorithmIdentifier(GMObjectIdentifiers.sm2);
      const publicKeyBytes = new Uint8Array(65);
      publicKeyBytes[0] = 0x04;
      // Simplified - in real use, would include actual coordinates
      const spki = new SubjectPublicKeyInfo(algorithm, publicKeyBytes);

      const builder = new PKCS10CertificationRequestBuilder()
        .setSubject(subject)
        .setPublicKey(spki);

      expect(() => builder.build(keyPair.privateKey)).not.toThrow();
    });
  });

  describe('CSR Validation', () => {
    it('should extract public key from CSR', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org');

      const csr = PKCS10CertificationRequestBuilder.generate(subject, keyPair);

      const spki = csr.getSubjectPublicKeyInfo();
      expect(spki).toBeDefined();
      expect(spki.getPublicKey().length).toBe(65);
      expect(spki.getPublicKey()[0]).toBe(0x04); // Uncompressed point
    });

    it('should get signature algorithm', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org');

      const csr = PKCS10CertificationRequestBuilder.generate(subject, keyPair);

      const sigAlg = csr.getSignatureAlgorithm();
      expect(sigAlg.getAlgorithm().equals(GMObjectIdentifiers.sm2_with_sm3)).toBe(true);
    });
  });

  describe('CSR Round-trip', () => {
    it('should maintain data through encode/decode cycles', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Round Trip,O=Test Org,C=CN');

      const csr1 = PKCS10CertificationRequestBuilder.generate(subject, keyPair);

      // PEM round-trip
      const pem = csr1.toPEM();
      const csr2 = PKCS10CertificationRequest.fromPEM(pem);

      expect(csr2.getSubject().getCommonName()).toBe('Round Trip');
      expect(csr2.getSubject().getOrganization()).toBe('Test Org');
      expect(csr2.getSubject().getCountry()).toBe('CN');
      expect(csr2.verify()).toBe(true);
    });
  });
});
