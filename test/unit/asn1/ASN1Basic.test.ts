import { describe, it, expect } from 'vitest';
import { 
  ASN1ObjectIdentifier, 
  ASN1Integer, 
  ASN1OctetString, 
  ASN1BitString,
  DEREncoder,
  DERDecoder,
  ASN1Tags
} from '../../../src/index';

describe('ASN.1 Basic Types', () => {
  describe('ASN1ObjectIdentifier', () => {
    it('should encode and decode OID', () => {
      const oid = new ASN1ObjectIdentifier('1.2.840.113549.1.1.1');
      const encoded = oid.getEncoded();
      const decoded = ASN1ObjectIdentifier.fromEncoded(encoded);
      
      expect(decoded.getId()).toBe('1.2.840.113549.1.1.1');
      expect(decoded.equals(oid)).toBe(true);
    });

    it('should encode SM2 OID', () => {
      const oid = new ASN1ObjectIdentifier('1.2.156.10197.1.301');
      const encoded = oid.getEncoded();
      
      expect(encoded[0]).toBe(ASN1Tags.OBJECT_IDENTIFIER);
      
      const decoded = ASN1ObjectIdentifier.fromEncoded(encoded);
      expect(decoded.getId()).toBe('1.2.156.10197.1.301');
    });

    it('should handle SM3 OID', () => {
      const oid = new ASN1ObjectIdentifier('1.2.156.10197.1.401');
      const decoded = ASN1ObjectIdentifier.fromEncoded(oid.getEncoded());
      expect(decoded.getId()).toBe('1.2.156.10197.1.401');
    });
  });

  describe('ASN1Integer', () => {
    it('should encode and decode small integer', () => {
      const integer = new ASN1Integer(42);
      const encoded = integer.getEncoded();
      const decoded = ASN1Integer.fromEncoded(encoded);
      
      expect(decoded.getValue()).toBe(42n);
    });

    it('should encode and decode large integer', () => {
      const value = 0x123456789abcdef0n;
      const integer = new ASN1Integer(value);
      const encoded = integer.getEncoded();
      const decoded = ASN1Integer.fromEncoded(encoded);
      
      expect(decoded.getValue()).toBe(value);
    });

    it('should encode and decode zero', () => {
      const integer = new ASN1Integer(0);
      const encoded = integer.getEncoded();
      const decoded = ASN1Integer.fromEncoded(encoded);
      
      expect(decoded.getValue()).toBe(0n);
    });

    it('should handle bigint values', () => {
      const value = BigInt('18446744073709551615'); // 2^64 - 1
      const integer = new ASN1Integer(value);
      const decoded = ASN1Integer.fromEncoded(integer.getEncoded());
      
      expect(decoded.getValue()).toBe(value);
    });
  });

  describe('ASN1OctetString', () => {
    it('should encode and decode octet string', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const octetString = new ASN1OctetString(data);
      const encoded = octetString.getEncoded();
      const decoded = ASN1OctetString.fromEncoded(encoded);
      
      expect(decoded.getOctets()).toEqual(data);
    });

    it('should handle empty octet string', () => {
      const data = new Uint8Array([]);
      const octetString = new ASN1OctetString(data);
      const decoded = ASN1OctetString.fromEncoded(octetString.getEncoded());
      
      expect(decoded.getOctets()).toEqual(data);
    });

    it('should handle large octet string', () => {
      const data = new Uint8Array(256).fill(0xaa);
      const octetString = new ASN1OctetString(data);
      const decoded = ASN1OctetString.fromEncoded(octetString.getEncoded());
      
      expect(decoded.getOctets()).toEqual(data);
    });
  });

  describe('ASN1BitString', () => {
    it('should encode and decode bit string', () => {
      const data = new Uint8Array([0xff, 0xaa, 0x55]);
      const bitString = new ASN1BitString(data, 0);
      const encoded = bitString.getEncoded();
      const decoded = ASN1BitString.fromEncoded(encoded);
      
      expect(decoded.getBytes()).toEqual(data);
      expect(decoded.getPadBits()).toBe(0);
    });

    it('should handle bit string with unused bits', () => {
      const data = new Uint8Array([0xff]);
      const bitString = new ASN1BitString(data, 3);
      const decoded = ASN1BitString.fromEncoded(bitString.getEncoded());
      
      expect(decoded.getBytes()).toEqual(data);
      expect(decoded.getPadBits()).toBe(3);
    });
  });

  describe('DER Encoder/Decoder', () => {
    it('should encode and decode length', () => {
      // Short form
      const shortEncoded = DEREncoder.encodeLength(127);
      expect(shortEncoded).toEqual(new Uint8Array([127]));
      
      const { length: shortLength } = DERDecoder.decodeLength(shortEncoded, 0);
      expect(shortLength).toBe(127);
      
      // Long form
      const longEncoded = DEREncoder.encodeLength(256);
      expect(longEncoded[0] & 0x80).toBe(0x80); // High bit set
      
      const { length: longLength } = DERDecoder.decodeLength(longEncoded, 0);
      expect(longLength).toBe(256);
    });

    it('should encode and decode OID', () => {
      const oid = '1.2.840.113549';
      const encoded = DEREncoder.encodeOID(oid);
      const decoded = DERDecoder.decodeOID(encoded);
      
      expect(decoded).toBe(oid);
    });

    it('should encode and decode SM2 OID', () => {
      const oid = '1.2.156.10197.1.301';
      const encoded = DEREncoder.encodeOID(oid);
      const decoded = DERDecoder.decodeOID(encoded);
      
      expect(decoded).toBe(oid);
    });

    it('should encode and decode integer', () => {
      const value = 0x12345678n;
      const encoded = DEREncoder.encodeInteger(value);
      const decoded = DERDecoder.decodeInteger(encoded);
      
      expect(decoded).toBe(value);
    });
  });
});
