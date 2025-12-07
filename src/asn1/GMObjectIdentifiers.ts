import { ASN1ObjectIdentifier } from './ASN1ObjectIdentifier';

/**
 * Object Identifiers for Chinese GM (GuoMi) cryptographic algorithms
 * 
 * Matches org.bouncycastle.asn1.gm.GMObjectIdentifiers
 */
export class GMObjectIdentifiers {
  // Base OID for Chinese cryptographic algorithms
  // 1.2.156.10197.1
  private static readonly gm_base = '1.2.156.10197.1';

  // SM2 Elliptic Curve
  // 1.2.156.10197.1.301
  static readonly sm2 = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.301`);

  // SM2 with SM3 Signature
  // 1.2.156.10197.1.501
  static readonly sm2_with_sm3 = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.501`);

  // SM3 Hash Algorithm
  // 1.2.156.10197.1.401
  static readonly sm3 = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.401`);

  // SM4 Block Cipher
  // 1.2.156.10197.1.104
  static readonly sm4 = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.104`);

  // SM4 CBC Mode
  // 1.2.156.10197.1.104.2
  static readonly sm4_cbc = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.104.2`);

  // SM4 ECB Mode
  // 1.2.156.10197.1.104.1
  static readonly sm4_ecb = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.104.1`);

  // SM4 OFB Mode
  // 1.2.156.10197.1.104.3
  static readonly sm4_ofb = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.104.3`);

  // SM4 CFB Mode
  // 1.2.156.10197.1.104.5
  static readonly sm4_cfb = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.104.5`);

  // SM4 CTR Mode
  // 1.2.156.10197.1.104.7
  static readonly sm4_ctr = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.104.7`);

  // SM4 GCM Mode
  // 1.2.156.10197.1.104.8
  static readonly sm4_gcm = new ASN1ObjectIdentifier(`${GMObjectIdentifiers.gm_base}.104.8`);
}
