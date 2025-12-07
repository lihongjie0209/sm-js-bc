import { describe, it, expect } from 'vitest';
import { PemObject, PemReader, PemWriter } from '../../../src/index';

describe('PEM Format', () => {
  describe('PemObject', () => {
    it('should create PEM object', () => {
      const content = new Uint8Array([1, 2, 3, 4]);
      const headers = new Map([['Key', 'Value']]);
      const pem = new PemObject('TEST', headers, content);

      expect(pem.getType()).toBe('TEST');
      expect(pem.getContent()).toEqual(content);
      expect(pem.getHeaders().get('Key')).toBe('Value');
    });
  });

  describe('PemWriter', () => {
    it('should write simple PEM object', () => {
      const content = new Uint8Array([1, 2, 3, 4]);
      const pem = new PemObject('TEST', new Map(), content);
      const output = PemWriter.writeObject(pem);

      expect(output).toContain('-----BEGIN TEST-----');
      expect(output).toContain('-----END TEST-----');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should write PEM with headers', () => {
      const content = new Uint8Array([1, 2, 3, 4]);
      const headers = new Map([
        ['Proc-Type', '4,ENCRYPTED'],
        ['DEK-Info', 'AES-256-CBC,0123456789ABCDEF']
      ]);
      const pem = new PemObject('ENCRYPTED PRIVATE KEY', headers, content);
      const output = PemWriter.writeObject(pem);

      expect(output).toContain('-----BEGIN ENCRYPTED PRIVATE KEY-----');
      expect(output).toContain('Proc-Type: 4,ENCRYPTED');
      expect(output).toContain('DEK-Info: AES-256-CBC,0123456789ABCDEF');
      expect(output).toContain('-----END ENCRYPTED PRIVATE KEY-----');
    });

    it('should break long base64 lines', () => {
      // Create content that will produce > 64 chars of base64
      const content = new Uint8Array(100).fill(0xaa);
      const pem = new PemObject('TEST', new Map(), content);
      const output = PemWriter.writeObject(pem);

      const lines = output.split('\n').filter(l => l.length > 0);
      // Should have multiple content lines
      const contentLines = lines.filter(l => 
        !l.startsWith('-----') && !l.includes(':')
      );
      
      expect(contentLines.length).toBeGreaterThan(1);
      // Each line should be <= 64 chars
      for (const line of contentLines) {
        expect(line.length).toBeLessThanOrEqual(64);
      }
    });
  });

  describe('PemReader', () => {
    it('should read simple PEM object', () => {
      const pemText = `-----BEGIN TEST-----
AQIDBA==
-----END TEST-----
`;
      const reader = new PemReader(pemText);
      const pem = reader.readPemObject();

      expect(pem).not.toBeNull();
      expect(pem!.getType()).toBe('TEST');
      expect(pem!.getContent()).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    it('should read PEM with headers', () => {
      const pemText = `-----BEGIN ENCRYPTED PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-256-CBC,0123456789ABCDEF

AQIDBA==
-----END ENCRYPTED PRIVATE KEY-----
`;
      const reader = new PemReader(pemText);
      const pem = reader.readPemObject();

      expect(pem).not.toBeNull();
      expect(pem!.getType()).toBe('ENCRYPTED PRIVATE KEY');
      expect(pem!.getHeaders().get('Proc-Type')).toBe('4,ENCRYPTED');
      expect(pem!.getHeaders().get('DEK-Info')).toBe('AES-256-CBC,0123456789ABCDEF');
    });

    it('should read multi-line base64', () => {
      const pemText = `-----BEGIN TEST-----
AQIDBAUG
BwgJCgsM
DQ4PEBES
-----END TEST-----
`;
      const reader = new PemReader(pemText);
      const pem = reader.readPemObject();

      expect(pem).not.toBeNull();
      expect(pem!.getContent().length).toBeGreaterThan(0);
    });

    it('should read multiple PEM objects', () => {
      const pemText = `-----BEGIN FIRST-----
AQIDBA==
-----END FIRST-----
-----BEGIN SECOND-----
BQYHCA==
-----END SECOND-----
`;
      const reader = new PemReader(pemText);
      const objects = reader.readAllPemObjects();

      expect(objects.length).toBe(2);
      expect(objects[0].getType()).toBe('FIRST');
      expect(objects[1].getType()).toBe('SECOND');
    });

    it('should handle PEM with extra whitespace', () => {
      const pemText = `
-----BEGIN TEST-----

AQIDBA==

-----END TEST-----

`;
      const reader = new PemReader(pemText);
      const pem = reader.readPemObject();

      expect(pem).not.toBeNull();
      expect(pem!.getType()).toBe('TEST');
    });
  });

  describe('PEM Round-trip', () => {
    it('should write and read back identical data', () => {
      const originalContent = new Uint8Array(50).map((_, i) => i);
      const originalPem = new PemObject('TEST DATA', new Map(), originalContent);
      
      const written = PemWriter.writeObject(originalPem);
      const reader = new PemReader(written);
      const readPem = reader.readPemObject();

      expect(readPem).not.toBeNull();
      expect(readPem!.getType()).toBe('TEST DATA');
      expect(readPem!.getContent()).toEqual(originalContent);
    });

    it('should preserve headers in round-trip', () => {
      const headers = new Map([
        ['Header1', 'Value1'],
        ['Header2', 'Value2']
      ]);
      const originalPem = new PemObject('TEST', headers, new Uint8Array([1, 2, 3]));
      
      const written = PemWriter.writeObject(originalPem);
      const reader = new PemReader(written);
      const readPem = reader.readPemObject();

      expect(readPem).not.toBeNull();
      expect(readPem!.getHeaders().get('Header1')).toBe('Value1');
      expect(readPem!.getHeaders().get('Header2')).toBe('Value2');
    });
  });
});
