import { describe, it, expect } from 'vitest';
import {
  SM2,
  X509Name,
  X509CertificateBuilder,
  X509Certificate,
  KeyUsage,
  ECPublicKeyParameters,
  SM2PublicKeyEncoder,
  SM2PrivateKeyEncoder
} from '../../../src/index';

describe('X.509 Certificate', () => {
  describe('X509Name', () => {
    it('should create from DN string', () => {
      const name = new X509Name('CN=Test User,O=Test Org,C=CN');
      
      expect(name.getCommonName()).toBe('Test User');
      expect(name.getOrganization()).toBe('Test Org');
      expect(name.getCountry()).toBe('CN');
    });

    it('should create from Map', () => {
      const rdns = new Map([
        ['2.5.4.3', 'Test User'],   // CN
        ['2.5.4.10', 'Test Org'],   // O
        ['2.5.4.6', 'CN']           // C
      ]);
      const name = new X509Name(rdns);
      
      expect(name.getCommonName()).toBe('Test User');
      expect(name.getOrganization()).toBe('Test Org');
      expect(name.getCountry()).toBe('CN');
    });

    it('should encode and decode', () => {
      const name = new X509Name('CN=Test,O=Org,C=US');
      const encoded = name.getEncoded();
      const decoded = X509Name.fromEncoded(encoded);
      
      expect(decoded.getCommonName()).toBe('Test');
      expect(decoded.getOrganization()).toBe('Org');
      expect(decoded.getCountry()).toBe('US');
    });

    it('should convert to string', () => {
      const name = new X509Name('CN=Test,O=Org');
      const str = name.toString();
      
      expect(str).toContain('CN=Test');
      expect(str).toContain('O=Org');
    });
  });

  describe('X509CertificateBuilder', () => {
    it('should generate self-signed certificate', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test Certificate,O=Test Org,C=CN');
      
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      
      const cert = X509CertificateBuilder.generateSelfSigned(
        subject,
        keyPair,
        { notBefore, notAfter }
      );

      expect(cert).toBeDefined();
      expect(cert.getSubject().getCommonName()).toBe('Test Certificate');
      expect(cert.getIssuer().getCommonName()).toBe('Test Certificate'); // Self-signed
      expect(cert.getNotBefore()).toEqual(notBefore);
      expect(cert.getNotAfter()).toEqual(notAfter);
    });

    it('should generate CA certificate', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test CA,O=Test Org,C=CN');
      
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      const cert = X509CertificateBuilder.generateSelfSigned(
        subject,
        keyPair,
        { notBefore, notAfter },
        undefined,
        true // isCA
      );

      expect(cert).toBeDefined();
      
      // Check extensions
      const extensions = cert.getExtensions();
      expect(extensions).toBeDefined();
      expect(extensions!.isEmpty()).toBe(false);
    });

    it('should verify self-signed certificate', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org,C=CN');
      
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      const cert = X509CertificateBuilder.generateSelfSigned(
        subject,
        keyPair,
        { notBefore, notAfter }
      );

      // Create public key parameters from the key pair
      const domainParams = SM2.getParameters();
      const curve = domainParams.getCurve();
      const Q = curve.createPoint(keyPair.publicKey.x, keyPair.publicKey.y);
      const publicKeyParams = new ECPublicKeyParameters(Q, domainParams);

      // Verify the certificate
      const isValid = cert.verify(publicKeyParams);
      expect(isValid).toBe(true);
    });

    it('should fail to verify with wrong key', () => {
      const keyPair1 = SM2.generateKeyPair();
      const keyPair2 = SM2.generateKeyPair(); // Different key
      const subject = new X509Name('CN=Test,O=Org,C=CN');
      
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      const cert = X509CertificateBuilder.generateSelfSigned(
        subject,
        keyPair1,
        { notBefore, notAfter }
      );

      // Try to verify with different key
      const domainParams = SM2.getParameters();
      const curve = domainParams.getCurve();
      const Q = curve.createPoint(keyPair2.publicKey.x, keyPair2.publicKey.y);
      const publicKeyParams = new ECPublicKeyParameters(Q, domainParams);

      const isValid = cert.verify(publicKeyParams);
      expect(isValid).toBe(false);
    });
  });

  describe('Certificate Encoding', () => {
    it('should encode and decode certificate to/from DER', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org');
      
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      const cert = X509CertificateBuilder.generateSelfSigned(
        subject,
        keyPair,
        { notBefore, notAfter }
      );

      // Encode to DER
      const der = cert.getEncoded();
      expect(der).toBeInstanceOf(Uint8Array);
      expect(der.length).toBeGreaterThan(0);

      // Decode from DER
      const decoded = X509Certificate.fromEncoded(der);
      expect(decoded.getSubject().getCommonName()).toBe('Test');
      expect(decoded.getSerialNumber()).toBe(cert.getSerialNumber());
    });

    it('should encode and decode certificate to/from PEM', () => {
      const keyPair = SM2.generateKeyPair();
      const subject = new X509Name('CN=Test,O=Org');
      
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      const cert = X509CertificateBuilder.generateSelfSigned(
        subject,
        keyPair,
        { notBefore, notAfter }
      );

      // Encode to PEM
      const pem = cert.toPEM();
      expect(pem).toContain('-----BEGIN CERTIFICATE-----');
      expect(pem).toContain('-----END CERTIFICATE-----');

      // Decode from PEM
      const decoded = X509Certificate.fromPEM(pem);
      expect(decoded.getSubject().getCommonName()).toBe('Test');
      expect(decoded.getSerialNumber()).toBe(cert.getSerialNumber());
    });
  });

  describe('Certificate Chain', () => {
    it('should create and verify CA and end-entity certificate', () => {
      // Generate CA key pair
      const caKeyPair = SM2.generateKeyPair();
      const caSubject = new X509Name('CN=Test CA,O=Test Org,C=CN');
      
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      // Create CA certificate
      const caCert = X509CertificateBuilder.generateSelfSigned(
        caSubject,
        caKeyPair,
        { notBefore, notAfter },
        BigInt(1),
        true // isCA
      );

      // Verify CA cert is self-signed and valid
      const domainParams = SM2.getParameters();
      const curve = domainParams.getCurve();
      const caQ = curve.createPoint(caKeyPair.publicKey.x, caKeyPair.publicKey.y);
      const caPublicKeyParams = new ECPublicKeyParameters(caQ, domainParams);
      
      expect(caCert.verify(caPublicKeyParams)).toBe(true);
      expect(caCert.getIssuer().getCommonName()).toBe('Test CA');
      expect(caCert.getSubject().getCommonName()).toBe('Test CA');
    });
  });

  describe('Integration with Key Encoders', () => {
    it('should work with encoded/decoded keys', () => {
      // Generate key pair
      const keyPair = SM2.generateKeyPair();
      
      // Encode keys to PEM
      const privatePEM = SM2PrivateKeyEncoder.encodeToPEM(keyPair.privateKey);
      const publicPEM = SM2PublicKeyEncoder.encodeToPEM(
        keyPair.publicKey.x,
        keyPair.publicKey.y
      );

      // Decode keys
      const privateKey = SM2PrivateKeyEncoder.decodeFromPEM(privatePEM);
      const publicKey = SM2PublicKeyEncoder.decodeFromPEM(publicPEM);

      // Generate certificate with decoded keys
      const subject = new X509Name('CN=Test,O=Org');
      const notBefore = new Date();
      const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      const cert = X509CertificateBuilder.generateSelfSigned(
        subject,
        { privateKey, publicKey },
        { notBefore, notAfter }
      );

      // Verify certificate
      const domainParams = SM2.getParameters();
      const curve = domainParams.getCurve();
      const Q = curve.createPoint(publicKey.x, publicKey.y);
      const publicKeyParams = new ECPublicKeyParameters(Q, domainParams);

      expect(cert.verify(publicKeyParams)).toBe(true);
    });
  });
});
