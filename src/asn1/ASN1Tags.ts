/**
 * ASN.1 tag constants
 * 
 * Matches org.bouncycastle.asn1.BERTags
 */
export class ASN1Tags {
  static readonly BOOLEAN = 0x01;
  static readonly INTEGER = 0x02;
  static readonly BIT_STRING = 0x03;
  static readonly OCTET_STRING = 0x04;
  static readonly NULL = 0x05;
  static readonly OBJECT_IDENTIFIER = 0x06;
  static readonly EXTERNAL = 0x08;
  static readonly ENUMERATED = 0x0a;
  static readonly SEQUENCE = 0x10;
  static readonly SEQUENCE_OF = 0x10;
  static readonly SET = 0x11;
  static readonly SET_OF = 0x11;

  static readonly UTF8_STRING = 0x0c;
  static readonly PRINTABLE_STRING = 0x13;
  static readonly T61_STRING = 0x14;
  static readonly IA5_STRING = 0x16;
  static readonly UTC_TIME = 0x17;
  static readonly GENERALIZED_TIME = 0x18;
  static readonly GRAPHIC_STRING = 0x19;
  static readonly VISIBLE_STRING = 0x1a;
  static readonly GENERAL_STRING = 0x1b;
  static readonly UNIVERSAL_STRING = 0x1c;
  static readonly BMP_STRING = 0x1e;

  static readonly CONSTRUCTED = 0x20;
  static readonly APPLICATION = 0x40;
  static readonly TAGGED = 0x80;
}
