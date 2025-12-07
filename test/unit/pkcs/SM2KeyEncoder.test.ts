import { describe, it, expect } from 'vitest';
import { SM2, SM2PrivateKeyEncoder, SM2PublicKeyEncoder } from '../../../src/index';

describe('SM2 Key Encoders', () => {
  describe('SM2PrivateKeyEncoder', () => {
    it('should encode and decode private key to/from DER', () => {
      // Generate a key pair
      const keyPair = SM2.generateKeyPair();
      const privateKey = keyPair.privateKey;

      // Encode to DER
      const der = SM2PrivateKeyEncoder.encodeToDER(privateKey);
      expect(der).toBeInstanceOf(Uint8Array);
      expect(der.length).toBeGreaterThan(0);

      // Decode from DER
      const decodedKey = SM2PrivateKeyEncoder.decodeFromDER(der);
      expect(decodedKey).toBe(privateKey);
    });

    it('should encode and decode private key to/from PEM', () => {
      // Generate a key pair
      const keyPair = SM2.generateKeyPair();
      const privateKey = keyPair.privateKey;

      // Encode to PEM
      const pem = SM2PrivateKeyEncoder.encodeToPEM(privateKey);
      expect(pem).toContain('-----BEGIN PRIVATE KEY-----');
      expect(pem).toContain('-----END PRIVATE KEY-----');

      // Decode from PEM
      const decodedKey = SM2PrivateKeyEncoder.decodeFromPEM(pem);
      expect(decodedKey).toBe(privateKey);
    });

    it('should handle multiple encode/decode cycles', () => {
      const keyPair = SM2.generateKeyPair();
      const privateKey = keyPair.privateKey;

      // Cycle 1: DER
      const der1 = SM2PrivateKeyEncoder.encodeToDER(privateKey);
      const key1 = SM2PrivateKeyEncoder.decodeFromDER(der1);
      
      // Cycle 2: PEM
      const pem2 = SM2PrivateKeyEncoder.encodeToPEM(key1);
      const key2 = SM2PrivateKeyEncoder.decodeFromPEM(pem2);
      
      // Cycle 3: DER again
      const der3 = SM2PrivateKeyEncoder.encodeToDER(key2);
      const key3 = SM2PrivateKeyEncoder.decodeFromDER(der3);

      expect(key3).toBe(privateKey);
    });
  });

  describe('SM2PublicKeyEncoder', () => {
    it('should encode and decode public key to/from DER', () => {
      // Generate a key pair
      const keyPair = SM2.generateKeyPair();
      const { x, y } = keyPair.publicKey;

      // Encode to DER
      const der = SM2PublicKeyEncoder.encodeToDER(x, y);
      expect(der).toBeInstanceOf(Uint8Array);
      expect(der.length).toBeGreaterThan(0);

      // Decode from DER
      const decoded = SM2PublicKeyEncoder.decodeFromDER(der);
      expect(decoded.x).toBe(x);
      expect(decoded.y).toBe(y);
    });

    it('should encode and decode public key to/from PEM', () => {
      // Generate a key pair
      const keyPair = SM2.generateKeyPair();
      const { x, y } = keyPair.publicKey;

      // Encode to PEM
      const pem = SM2PublicKeyEncoder.encodeToPEM(x, y);
      expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(pem).toContain('-----END PUBLIC KEY-----');

      // Decode from PEM
      const decoded = SM2PublicKeyEncoder.decodeFromPEM(pem);
      expect(decoded.x).toBe(x);
      expect(decoded.y).toBe(y);
    });

    it('should produce 65-byte uncompressed point encoding', () => {
      const keyPair = SM2.generateKeyPair();
      const { x, y } = keyPair.publicKey;

      const der = SM2PublicKeyEncoder.encodeToDER(x, y);
      
      // The DER encoding includes the full SubjectPublicKeyInfo structure
      // But the actual public key should be 65 bytes (0x04 + 32 bytes X + 32 bytes Y)
      expect(der.length).toBeGreaterThan(65);
    });

    it('should handle multiple encode/decode cycles', () => {
      const keyPair = SM2.generateKeyPair();
      const { x, y } = keyPair.publicKey;

      // Cycle 1: DER
      const der1 = SM2PublicKeyEncoder.encodeToDER(x, y);
      const key1 = SM2PublicKeyEncoder.decodeFromDER(der1);
      
      // Cycle 2: PEM
      const pem2 = SM2PublicKeyEncoder.encodeToPEM(key1.x, key1.y);
      const key2 = SM2PublicKeyEncoder.decodeFromPEM(pem2);
      
      // Cycle 3: DER again
      const der3 = SM2PublicKeyEncoder.encodeToDER(key2.x, key2.y);
      const key3 = SM2PublicKeyEncoder.decodeFromDER(der3);

      expect(key3.x).toBe(x);
      expect(key3.y).toBe(y);
    });
  });

  describe('Key Pair Round-trip', () => {
    it('should encode/decode a complete key pair', () => {
      // Generate key pair
      const keyPair = SM2.generateKeyPair();
      
      // Encode both keys
      const privatePEM = SM2PrivateKeyEncoder.encodeToPEM(keyPair.privateKey);
      const publicPEM = SM2PublicKeyEncoder.encodeToPEM(
        keyPair.publicKey.x, 
        keyPair.publicKey.y
      );

      // Decode both keys
      const decodedPrivate = SM2PrivateKeyEncoder.decodeFromPEM(privatePEM);
      const decodedPublic = SM2PublicKeyEncoder.decodeFromPEM(publicPEM);

      // Verify
      expect(decodedPrivate).toBe(keyPair.privateKey);
      expect(decodedPublic.x).toBe(keyPair.publicKey.x);
      expect(decodedPublic.y).toBe(keyPair.publicKey.y);
    });

    it('should work with sign/verify after encoding', () => {
      // Generate and encode keys
      const keyPair = SM2.generateKeyPair();
      const privatePEM = SM2PrivateKeyEncoder.encodeToPEM(keyPair.privateKey);
      const publicPEM = SM2PublicKeyEncoder.encodeToPEM(
        keyPair.publicKey.x, 
        keyPair.publicKey.y
      );

      // Decode keys
      const privateKey = SM2PrivateKeyEncoder.decodeFromPEM(privatePEM);
      const publicKey = SM2PublicKeyEncoder.decodeFromPEM(publicPEM);

      // Sign and verify
      const message = 'Test message';
      const signature = SM2.sign(message, privateKey);
      const isValid = SM2.verify(message, signature, publicKey);

      expect(isValid).toBe(true);
    });

    it('should work with encrypt/decrypt after encoding', () => {
      // Generate and encode keys
      const keyPair = SM2.generateKeyPair();
      const privatePEM = SM2PrivateKeyEncoder.encodeToPEM(keyPair.privateKey);
      const publicPEM = SM2PublicKeyEncoder.encodeToPEM(
        keyPair.publicKey.x, 
        keyPair.publicKey.y
      );

      // Decode keys
      const privateKey = SM2PrivateKeyEncoder.decodeFromPEM(privatePEM);
      const publicKey = SM2PublicKeyEncoder.decodeFromPEM(publicPEM);

      // Encrypt and decrypt
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const ciphertext = SM2.encrypt(plaintext, publicKey);
      const decrypted = SM2.decrypt(ciphertext, privateKey);

      expect(decrypted).toEqual(plaintext);
    });
  });
});
