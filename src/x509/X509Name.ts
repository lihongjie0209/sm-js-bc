import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { ASN1ObjectIdentifier } from '../asn1/ASN1ObjectIdentifier';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * X.509 Name (Distinguished Name)
 * 
 * Name ::= CHOICE {
 *   rdnSequence  RDNSequence
 * }
 * 
 * RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
 * 
 * RelativeDistinguishedName ::= SET OF AttributeTypeAndValue
 * 
 * AttributeTypeAndValue ::= SEQUENCE {
 *   type   OBJECT IDENTIFIER,
 *   value  ANY
 * }
 * 
 * Matches org.bouncycastle.asn1.x509.X509Name
 */
export class X509Name extends ASN1Primitive {
  // Standard attribute OIDs
  static readonly CN = new ASN1ObjectIdentifier('2.5.4.3');  // Common Name
  static readonly C = new ASN1ObjectIdentifier('2.5.4.6');   // Country
  static readonly L = new ASN1ObjectIdentifier('2.5.4.7');   // Locality
  static readonly ST = new ASN1ObjectIdentifier('2.5.4.8');  // State or Province
  static readonly O = new ASN1ObjectIdentifier('2.5.4.10');  // Organization
  static readonly OU = new ASN1ObjectIdentifier('2.5.4.11'); // Organizational Unit
  static readonly E = new ASN1ObjectIdentifier('1.2.840.113549.1.9.1'); // Email

  private readonly rdnSequence: Map<string, string>;

  /**
   * Create X509Name from a map of OID to value
   * @param rdns Map of OID string to value string
   */
  constructor(rdns: Map<string, string> | string) {
    super();
    
    if (typeof rdns === 'string') {
      // Parse DN string like "CN=Test,O=Org,C=CN"
      this.rdnSequence = X509Name.parseDNString(rdns);
    } else {
      this.rdnSequence = rdns;
    }
  }

  /**
   * Parse DN string format like "CN=Test,O=Org,C=CN"
   */
  private static parseDNString(dn: string): Map<string, string> {
    const rdns = new Map<string, string>();
    
    // Split by comma (simplified parser, doesn't handle escaped commas)
    const parts = dn.split(',').map(p => p.trim());
    
    for (const part of parts) {
      const [key, ...valueParts] = part.split('=');
      const value = valueParts.join('=').trim();
      
      if (key && value) {
        // Map common names to OIDs
        const oid = X509Name.getOIDForName(key.trim());
        rdns.set(oid, value);
      }
    }
    
    return rdns;
  }

  /**
   * Map common attribute names to OIDs
   */
  private static getOIDForName(name: string): string {
    const nameMap: { [key: string]: string } = {
      'CN': '2.5.4.3',
      'C': '2.5.4.6',
      'L': '2.5.4.7',
      'ST': '2.5.4.8',
      'O': '2.5.4.10',
      'OU': '2.5.4.11',
      'E': '1.2.840.113549.1.9.1',
      'EMAIL': '1.2.840.113549.1.9.1'
    };
    
    return nameMap[name.toUpperCase()] || name;
  }

  /**
   * Get Common Name (CN)
   */
  getCommonName(): string | null {
    return this.rdnSequence.get(X509Name.CN.getId()) || null;
  }

  /**
   * Get Organization (O)
   */
  getOrganization(): string | null {
    return this.rdnSequence.get(X509Name.O.getId()) || null;
  }

  /**
   * Get Country (C)
   */
  getCountry(): string | null {
    return this.rdnSequence.get(X509Name.C.getId()) || null;
  }

  /**
   * Get Organizational Unit (OU)
   */
  getOrganizationalUnit(): string | null {
    return this.rdnSequence.get(X509Name.OU.getId()) || null;
  }

  /**
   * Get State or Province (ST)
   */
  getStateOrProvince(): string | null {
    return this.rdnSequence.get(X509Name.ST.getId()) || null;
  }

  /**
   * Get Locality (L)
   */
  getLocality(): string | null {
    return this.rdnSequence.get(X509Name.L.getId()) || null;
  }

  /**
   * Get Email address
   */
  getEmail(): string | null {
    return this.rdnSequence.get(X509Name.E.getId()) || null;
  }

  /**
   * Get all RDNs
   */
  getRDNs(): Map<string, string> {
    return new Map(this.rdnSequence);
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    // Build RDNSequence
    const rdns: Uint8Array[] = [];

    for (const [oidStr, value] of this.rdnSequence) {
      // Build AttributeTypeAndValue
      const oid = new ASN1ObjectIdentifier(oidStr);
      const valueEncoded = DEREncoder.encodeTLV(
        ASN1Tags.UTF8_STRING,
        new TextEncoder().encode(value)
      );

      const attrTypeAndValue = DEREncoder.encodeSequence(
        ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
        [oid.getEncoded(), valueEncoded]
      );

      // Build RelativeDistinguishedName (SET OF)
      const rdn = DEREncoder.encodeTLV(
        ASN1Tags.SET | ASN1Tags.CONSTRUCTED,
        attrTypeAndValue
      );

      rdns.push(rdn);
    }

    // Build RDNSequence (SEQUENCE OF)
    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      rdns
    );
  }

  /**
   * Get the tag
   */
  getTag(): number {
    return ASN1Tags.SEQUENCE;
  }

  /**
   * Check if this is constructed
   */
  isConstructed(): boolean {
    return true;
  }

  /**
   * Get encoded length
   */
  getEncodedLength(): number {
    return this.getEncoded().length;
  }

  /**
   * Decode from encoded bytes
   */
  static fromEncoded(encoded: Uint8Array): X509Name {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const rdns = new Map<string, string>();
    const rdnElements = DERDecoder.decodeSequence(content);

    for (const rdnElement of rdnElements) {
      // Decode SET OF AttributeTypeAndValue
      const setContent = rdnElement.content;
      const attrElements = DERDecoder.decodeSequence(setContent);

      for (const attrElement of attrElements) {
        // Decode AttributeTypeAndValue SEQUENCE
        const attrContent = attrElement.content;
        const attrParts = DERDecoder.decodeSequence(attrContent);

        if (attrParts.length >= 2) {
          const oid = DERDecoder.decodeOID(attrParts[0].content);
          
          // Decode value (could be various string types)
          let value: string;
          if (attrParts[1].tag === ASN1Tags.UTF8_STRING) {
            value = DERDecoder.decodeUTF8String(attrParts[1].content);
          } else if (attrParts[1].tag === ASN1Tags.PRINTABLE_STRING) {
            value = DERDecoder.decodePrintableString(attrParts[1].content);
          } else if (attrParts[1].tag === ASN1Tags.IA5_STRING) {
            value = DERDecoder.decodeIA5String(attrParts[1].content);
          } else {
            // Fall back to UTF-8 decode
            value = DERDecoder.decodeUTF8String(attrParts[1].content);
          }

          rdns.set(oid, value);
        }
      }
    }

    return new X509Name(rdns);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    const parts: string[] = [];
    
    const nameMap: { [key: string]: string } = {
      '2.5.4.3': 'CN',
      '2.5.4.6': 'C',
      '2.5.4.7': 'L',
      '2.5.4.8': 'ST',
      '2.5.4.10': 'O',
      '2.5.4.11': 'OU',
      '1.2.840.113549.1.9.1': 'E'
    };

    for (const [oid, value] of this.rdnSequence) {
      const name = nameMap[oid] || oid;
      parts.push(`${name}=${value}`);
    }

    return parts.join(', ');
  }

  /**
   * Check equality
   */
  equals(other: X509Name): boolean {
    if (this.rdnSequence.size !== other.rdnSequence.size) {
      return false;
    }

    for (const [oid, value] of this.rdnSequence) {
      if (other.rdnSequence.get(oid) !== value) {
        return false;
      }
    }

    return true;
  }
}
