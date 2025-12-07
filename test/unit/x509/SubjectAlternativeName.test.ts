import { describe, it, expect } from 'vitest';
import {
  SubjectAlternativeName,
  GeneralName,
  GeneralNameType,
  X509Extensions,
  ASN1ObjectIdentifier
} from '../../../src/index';

describe('Subject Alternative Name Extension', () => {
  describe('SubjectAlternativeName', () => {
    it('should add DNS names', () => {
      const san = new SubjectAlternativeName()
        .addDNSName('example.com')
        .addDNSName('www.example.com');

      const names = san.getNames();
      expect(names.length).toBe(2);
      expect(names[0].type).toBe(GeneralNameType.dNSName);
      expect(names[0].value).toBe('example.com');
    });

    it('should add email addresses', () => {
      const san = new SubjectAlternativeName()
        .addEmail('test@example.com')
        .addEmail('admin@example.com');

      const names = san.getNames();
      expect(names.length).toBe(2);
      expect(names[0].type).toBe(GeneralNameType.rfc822Name);
    });

    it('should add URIs', () => {
      const san = new SubjectAlternativeName()
        .addURI('https://example.com')
        .addURI('http://api.example.com');

      const names = san.getNames();
      expect(names.length).toBe(2);
      expect(names[0].type).toBe(GeneralNameType.uniformResourceIdentifier);
    });

    it('should add IP addresses', () => {
      const san = new SubjectAlternativeName()
        .addIPAddress('192.168.1.1')
        .addIPAddress('10.0.0.1');

      const names = san.getNames();
      expect(names.length).toBe(2);
      expect(names[0].type).toBe(GeneralNameType.iPAddress);
    });

    it('should support mixed name types', () => {
      const san = new SubjectAlternativeName()
        .addDNSName('example.com')
        .addEmail('test@example.com')
        .addURI('https://example.com')
        .addIPAddress('192.168.1.1');

      const names = san.getNames();
      expect(names.length).toBe(4);
    });

    it('should encode and decode', () => {
      const san = new SubjectAlternativeName()
        .addDNSName('example.com')
        .addEmail('test@example.com');

      const encoded = san.getEncoded();
      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = SubjectAlternativeName.fromEncoded(encoded);
      const names = decoded.getNames();
      expect(names.length).toBe(2);
    });
  });

  describe('GeneralName', () => {
    it('should create DNS name', () => {
      const name = GeneralName.dNSName('example.com');
      expect(name.type).toBe(GeneralNameType.dNSName);
      expect(name.value).toBe('example.com');
    });

    it('should create email', () => {
      const name = GeneralName.rfc822Name('test@example.com');
      expect(name.type).toBe(GeneralNameType.rfc822Name);
      expect(name.value).toBe('test@example.com');
    });

    it('should create URI', () => {
      const name = GeneralName.uniformResourceIdentifier('https://example.com');
      expect(name.type).toBe(GeneralNameType.uniformResourceIdentifier);
      expect(name.value).toBe('https://example.com');
    });

    it('should create IP address', () => {
      const name = GeneralName.iPAddress('192.168.1.1');
      expect(name.type).toBe(GeneralNameType.iPAddress);
      expect(name.value).toBeInstanceOf(Uint8Array);
    });

    it('should encode general names', () => {
      const name = GeneralName.dNSName('example.com');
      const encoded = name.getEncoded();
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with X509Extensions', () => {
    it('should add SAN as extension', () => {
      const san = new SubjectAlternativeName()
        .addDNSName('example.com')
        .addEmail('test@example.com');

      const extensions = new X509Extensions();
      const sanOID = X509Extensions.SUBJECT_ALT_NAME;
      extensions.addExtension(sanOID, false, san.getEncoded());

      const ext = extensions.getExtension(sanOID);
      expect(ext).not.toBeNull();
      expect(ext!.isCritical()).toBe(false);
    });
  });
});
