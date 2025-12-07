import { ECCurveFp } from '../../math/ec/ECCurve';
import { ECPointFp } from '../../math/ec/ECPoint';
import { Fp2Element } from '../../math/ec/Fp2Element';
import { ECPointFp2 } from '../../math/ec/ECPointFp2';

/**
 * SM9 Curve Parameters
 * 
 * Implements the BN (Barreto-Naehrig) curve parameters specified in GM/T 0044-2016.
 * SM9 uses a pairing-friendly elliptic curve for identity-based cryptography.
 * 
 * The curve equation is: y^2 = x^3 + b (a = 0)
 * 
 * 参考: GM/T 0044-2016, org.bouncycastle.crypto.params.SM9Parameters
 */
export class SM9Parameters {
  /**
   * Prime modulus p (256-bit)
   * p = 0xB640000002A3A6F1D603AB4FF58EC74521F2934B1A7AEEDBE56F9B27E351457D
   */
  static readonly P = BigInt(
    '0xB640000002A3A6F1D603AB4FF58EC74521F2934B1A7AEEDBE56F9B27E351457D'
  );

  /**
   * Curve parameter a (a = 0 for SM9)
   */
  static readonly A = 0n;

  /**
   * Curve parameter b for E(Fp)
   * b = 5
   */
  static readonly B = 5n;

  /**
   * Order of the curve (number of points)
   * N = 0xB640000002A3A6F1D603AB4FF58EC74449F2934B18EA8BEEE56EE19CD69ECF25
   */
  static readonly N = BigInt(
    '0xB640000002A3A6F1D603AB4FF58EC74449F2934B18EA8BEEE56EE19CD69ECF25'
  );

  /**
   * Trace of Frobenius
   * t = 0x600000004870BBF0
   */
  static readonly TRACE = BigInt('0x600000004870BBF0');

  /**
   * Embedding degree (k = 12)
   */
  static readonly EMBEDDING_DEGREE = 12;

  /**
   * Generator P1 on E(Fp) - used for signing
   * P1 = (x1, y1)
   */
  static readonly P1_X = BigInt(
    '0x93DE051D62BF718FF5ED0704487D01D6E1E4086909DC3280E8C4E4817C66DDDD'
  );
  
  static readonly P1_Y = BigInt(
    '0x21FE8DDA4F21E607631065125C395BBC1C1C00CBFA6024350C464CD70A3EA616'
  );

  /**
   * Generator P2 on E'(Fp2) - used for encryption and key exchange
   * P2 = (x2, y2) where x2, y2 ∈ Fp2
   * 
   * x2 = (x2_0, x2_1) where x2 = x2_0 + x2_1 * u
   * y2 = (y2_0, y2_1) where y2 = y2_0 + y2_1 * u
   */
  static readonly P2_X0 = BigInt(
    '0x85AEF3D078640C98597B6027B441A01FF1DD2C190F5E93C454806C11D8806141'
  );
  
  static readonly P2_X1 = BigInt(
    '0x37227552092D58628D415A9E52D5D9D66B88E64E1D7B8E8E0A3E3C8B1C8E6EE2'
  );
  
  static readonly P2_Y0 = BigInt(
    '0x17509B092E845C1266BA0D262CBEE6ED0736A96FA347C8BD856DC76B84EBEB96'
  );
  
  static readonly P2_Y1 = BigInt(
    '0xA7CF28D519BE3DA65F3170153D278FF247EFBA98A71A08116215BBA5C999A7C7'
  );

  /**
   * Hash function identifier for signing (hid = 0x01)
   */
  static readonly HID_SIGN = 0x01;

  /**
   * Hash function identifier for encryption (hid = 0x02)
   */
  static readonly HID_ENC = 0x02;

  /**
   * Hash function identifier for key exchange (hid = 0x03)
   */
  static readonly HID_EXCH = 0x03;

  /**
   * Get the SM9 curve E(Fp): y^2 = x^3 + 5
   */
  static getCurve(): ECCurveFp {
    return new ECCurveFp(SM9Parameters.P, SM9Parameters.A, SM9Parameters.B, SM9Parameters.N, 1n);
  }

  /**
   * Get generator P1 on E(Fp)
   */
  static getP1(): ECPointFp {
    const curve = SM9Parameters.getCurve();
    return curve.createPoint(SM9Parameters.P1_X, SM9Parameters.P1_Y) as ECPointFp;
  }

  /**
   * Get generator P2 on E'(Fp2) as Fp2 coordinates
   * Returns {x, y} where x and y are Fp2 elements
   */
  static getP2Coordinates(): { x: Fp2Element; y: Fp2Element } {
    const x = new Fp2Element(SM9Parameters.P2_X0, SM9Parameters.P2_X1, SM9Parameters.P);
    const y = new Fp2Element(SM9Parameters.P2_Y0, SM9Parameters.P2_Y1, SM9Parameters.P);
    return { x, y };
  }

  /**
   * Get generator P2 on E'(Fp2) as ECPointFp2
   */
  static getP2(): ECPointFp2 {
    const coords = SM9Parameters.getP2Coordinates();
    return ECPointFp2.fromAffine(coords.x, coords.y, SM9Parameters.P);
  }

  /**
   * Beta constant for twist curve
   * β^2 = -2 in Fp
   */
  static readonly BETA = BigInt(
    '0x6C648DE5DC0A3F2CF55ACC93EE0BAF159F9D411806DC5177F5B21FD3DA24D011'
  );

  /**
   * Alpha constants for pairing
   * Used in line function evaluations
   */
  static readonly ALPHA_0 = BigInt(
    '0x3F23EA58E5720BDB843C6CFA9C08674947C5C86E0DDD04EDA91D8354377B698B'
  );

  static readonly ALPHA_1 = BigInt(
    '0xF300000002A3A6F2780272354F8B78F4D5FC11967BE65334'
  );
}

/**
 * Convenience class for SM9 domain parameters
 */
export class SM9DomainParameters {
  private readonly curve: ECCurveFp;
  private readonly g1: ECPointFp;
  private readonly g1Coords: { x: Fp2Element; y: Fp2Element };

  constructor() {
    this.curve = SM9Parameters.getCurve();
    this.g1 = SM9Parameters.getP1();
    this.g1Coords = SM9Parameters.getP2Coordinates();
  }

  getCurve(): ECCurveFp {
    return this.curve;
  }

  getG1(): ECPointFp {
    return this.g1;
  }

  getG2Coordinates(): { x: Fp2Element; y: Fp2Element } {
    return this.g1Coords;
  }

  getN(): bigint {
    return SM9Parameters.N;
  }

  getP(): bigint {
    return SM9Parameters.P;
  }
}
