import { ASN1Primitive } from '../asn1/ASN1Encodable';
import { DEREncoder } from '../asn1/DEREncoder';
import { DERDecoder } from '../asn1/DERDecoder';
import { ASN1Tags } from '../asn1/ASN1Tags';

/**
 * Validity
 * 
 * Validity ::= SEQUENCE {
 *   notBefore      Time,
 *   notAfter       Time
 * }
 * 
 * Time ::= CHOICE {
 *   utcTime        UTCTime,
 *   generalTime    GeneralizedTime
 * }
 * 
 * Matches org.bouncycastle.asn1.x509.Validity
 */
export class Validity extends ASN1Primitive {
  constructor(
    public readonly notBefore: Date,
    public readonly notAfter: Date
  ) {
    super();
  }

  /**
   * Check if current time is within validity period
   */
  isValid(date: Date = new Date()): boolean {
    return date >= this.notBefore && date <= this.notAfter;
  }

  /**
   * Get the encoded bytes
   */
  getEncoded(): Uint8Array {
    const notBeforeEncoded = Validity.encodeTime(this.notBefore);
    const notAfterEncoded = Validity.encodeTime(this.notAfter);

    return DEREncoder.encodeSequence(
      ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED,
      [notBeforeEncoded, notAfterEncoded]
    );
  }

  /**
   * Encode a date as UTCTime or GeneralizedTime
   */
  private static encodeTime(date: Date): Uint8Array {
    // Use UTCTime for dates before 2050, GeneralizedTime after
    const year = date.getUTCFullYear();
    
    if (year < 2050) {
      // UTCTime: YYMMDDhhmmssZ
      const yy = (year % 100).toString().padStart(2, '0');
      const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = date.getUTCDate().toString().padStart(2, '0');
      const hh = date.getUTCHours().toString().padStart(2, '0');
      const min = date.getUTCMinutes().toString().padStart(2, '0');
      const ss = date.getUTCSeconds().toString().padStart(2, '0');
      
      const timeStr = `${yy}${mm}${dd}${hh}${min}${ss}Z`;
      const timeBytes = new TextEncoder().encode(timeStr);
      
      return DEREncoder.encodeTLV(ASN1Tags.UTC_TIME, timeBytes);
    } else {
      // GeneralizedTime: YYYYMMDDhhmmssZ
      const yyyy = year.toString();
      const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = date.getUTCDate().toString().padStart(2, '0');
      const hh = date.getUTCHours().toString().padStart(2, '0');
      const min = date.getUTCMinutes().toString().padStart(2, '0');
      const ss = date.getUTCSeconds().toString().padStart(2, '0');
      
      const timeStr = `${yyyy}${mm}${dd}${hh}${min}${ss}Z`;
      const timeBytes = new TextEncoder().encode(timeStr);
      
      return DEREncoder.encodeTLV(ASN1Tags.GENERALIZED_TIME, timeBytes);
    }
  }

  /**
   * Decode time from UTCTime or GeneralizedTime
   */
  private static decodeTime(tag: number, content: Uint8Array): Date {
    const timeStr = new TextDecoder().decode(content);
    
    if (tag === ASN1Tags.UTC_TIME) {
      // UTCTime: YYMMDDhhmmssZ
      const yy = parseInt(timeStr.substring(0, 2));
      const year = yy >= 50 ? 1900 + yy : 2000 + yy;
      const month = parseInt(timeStr.substring(2, 4)) - 1;
      const day = parseInt(timeStr.substring(4, 6));
      const hour = parseInt(timeStr.substring(6, 8));
      const minute = parseInt(timeStr.substring(8, 10));
      const second = parseInt(timeStr.substring(10, 12));
      
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else if (tag === ASN1Tags.GENERALIZED_TIME) {
      // GeneralizedTime: YYYYMMDDhhmmssZ
      const year = parseInt(timeStr.substring(0, 4));
      const month = parseInt(timeStr.substring(4, 6)) - 1;
      const day = parseInt(timeStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(8, 10));
      const minute = parseInt(timeStr.substring(10, 12));
      const second = parseInt(timeStr.substring(12, 14));
      
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      throw new Error(`Invalid time tag: ${tag}`);
    }
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
  static fromEncoded(encoded: Uint8Array): Validity {
    const { tag, content } = DERDecoder.decodeTLV(encoded, 0);
    
    const expectedTag = ASN1Tags.SEQUENCE | ASN1Tags.CONSTRUCTED;
    if (tag !== expectedTag) {
      throw new Error(`Expected SEQUENCE tag (${expectedTag}), got ${tag}`);
    }

    const elements = DERDecoder.decodeSequence(content);
    
    if (elements.length !== 2) {
      throw new Error('Validity must have exactly 2 elements');
    }

    const notBefore = Validity.decodeTime(elements[0].tag, elements[0].content);
    const notAfter = Validity.decodeTime(elements[1].tag, elements[1].content);

    return new Validity(notBefore, notAfter);
  }
}
