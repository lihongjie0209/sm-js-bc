import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * General Name Types
 */
export enum GeneralNameType {
  otherName = 0,
  rfc822Name = 1,        // Email
  dNSName = 2,           // DNS name
  x400Address = 3,
  directoryName = 4,
  ediPartyName = 5,
  uniformResourceIdentifier = 6,  // URI
  iPAddress = 7,         // IP address
  registeredID = 8
}

/**
 * General Name
 * 
 * GeneralName ::= CHOICE {
 *   otherName                  [0] INSTANCE OF OTHER-NAME,
 *   rfc822Name                 [1] IA5String,
 *   dNSName                    [2] IA5String,
 *   x400Address                [3] ORAddress,
 *   directoryName              [4] Name,
 *   ediPartyName               [5] EDIPartyName,
 *   uniformResourceIdentifier  [6] IA5String,
 *   iPAddress                  [7] OCTET STRING,
 *   registeredID               [8] OBJECT IDENTIFIER
 * }
 */
export class GeneralName {
  constructor(
    public readonly type: GeneralNameType,
    public readonly value: string | Uint8Array
  ) {}

  /**
   * Encode the general name
   */
  getEncoded(): Uint8Array {
    let content: Uint8Array;

    if (typeof this.value === 'string') {
      // String types (DNS, email, URI)
      content = new TextEncoder().encode(this.value);
    } else {
      // Binary types (IP address)
      content = this.value;
    }

    // Use context-specific tag [type]
    return DEREncoder.encodeTLV(0x80 | this.type, content);
  }

  /**
   * Create a DNS name
   */
  static dNSName(name: string): GeneralName {
    return new GeneralName(GeneralNameType.dNSName, name);
  }

  /**
   * Create an email address
   */
  static rfc822Name(email: string): GeneralName {
    return new GeneralName(GeneralNameType.rfc822Name, email);
  }

  /**
   * Create a URI
   */
  static uniformResourceIdentifier(uri: string): GeneralName {
    return new GeneralName(GeneralNameType.uniformResourceIdentifier, uri);
  }

  /**
   * Create an IP address
   */
  static iPAddress(ip: string): GeneralName {
    // Convert IP string to bytes
    const parts = ip.split('.');
    if (parts.length === 4) {
      // IPv4
      const bytes = new Uint8Array(parts.map(p => parseInt(p)));
      return new GeneralName(GeneralNameType.iPAddress, bytes);
    } else {
      throw new Error('Only IPv4 addresses are currently supported');
    }
  }
}

/**
 * Subject Alternative Names Extension
 * 
 * SubjectAltName ::= GeneralNames
 * 
 * GeneralNames ::= SEQUENCE SIZE (1..MAX) OF GeneralName
 * 
 * Matches org.bouncycastle.asn1.x509.GeneralNames
 */
export class SubjectAlternativeName extends ASN1Primitive {
  private names: GeneralName[] = [];

  /**
   * Add a DNS name
   */
  addDNSName(name: string): this {
    this.names.push(GeneralName.dNSName(name));
    return this;
  }

  /**
   * Add an email address
   */
  addEmail(email: string): this {
    this.names.push(GeneralName.rfc822Name(email));
    return this;
  }

  /**
   * Add a URI
   */
  addURI(uri: string): this {
    this.names.push(GeneralName.uniformResourceIdentifier(uri));
    return this;
  }

  /**
   * Add an IP address
   */
  addIPAddress(ip: string): this {
    this.names.push(GeneralName.iPAddress(ip));
    return this;
  }

  /**
   * Add a general name
   */
  addGeneralName(name: GeneralName): this {
    this.names.push(name);
    return this;
  }

  /**
   * Get all names
   */
  getNames(): GeneralName[] {
    return [...this.names];
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const encodedNames = this.names.map(name => name.getEncoded());
    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      encodedNames
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
  static fromEncoded(encoded: Uint8Array): SubjectAlternativeName {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const san = new SubjectAlternativeName();
    const elements = DERDecoder.decodeSequence(content);

    for (const element of elements) {
      const type = element.tag & 0x1f; // Extract the tag number
      const value = element.content;

      if (type === GeneralNameType.dNSName || 
          type === GeneralNameType.rfc822Name || 
          type === GeneralNameType.uniformResourceIdentifier) {
        // String types
        const strValue = new TextDecoder().decode(value);
        san.addGeneralName(new GeneralName(type, strValue));
      } else if (type === GeneralNameType.iPAddress) {
        // IP address - convert bytes to string
        if (value.length === 4) {
          const ipStr = Array.from(value).join('.');
          san.addIPAddress(ipStr);
        }
      }
      // Other types can be added as needed
    }

    return san;
  }
}
