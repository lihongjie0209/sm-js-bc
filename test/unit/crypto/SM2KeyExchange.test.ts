import { describe, it, expect, beforeEach } from 'vitest';
import { SM2KeyExchange } from '../../../src/crypto/agreement/SM2KeyExchange';
import { SM2KeyExchangePrivateParameters } from '../../../src/crypto/params/SM2KeyExchangePrivateParameters';
import { SM2KeyExchangePublicParameters } from '../../../src/crypto/params/SM2KeyExchangePublicParameters';
import { ECDomainParameters } from '../../../src/crypto/params/ECDomainParameters';
import { ECPrivateKeyParameters } from '../../../src/crypto/params/ECPrivateKeyParameters';
import { ECPublicKeyParameters } from '../../../src/crypto/params/ECPublicKeyParameters';
import { ParametersWithID } from '../../../src/crypto/params/ParametersWithID';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { ECPoint } from '../../../src/math/ec/ECPoint';
import { ECConstants } from '../../../src/math/ec/ECConstants';
import { Arrays } from '../../../src/util/Arrays';

// Initialize ECPoint system by importing main module
import '../../../src/index';

describe('SM2KeyExchange', () => {
  // Standard SM2 Curve Parameters
  const SM2_ECC_P = 0x8542D69E4C044F18E8B92435BF6FF7DE457283915C45517D722EDB8B08F1DFC3n;
  const SM2_ECC_A = 0x787968B4FA32C3FD2417842E73BBFEFF2F3C848B6831D7E0EC65228B3937E498n;
  const SM2_ECC_B = 0x63E4C6D3B23B0C849CF84241484BFE48F61D59A5B16BA06E6E12D1DA27C5249An;
  const SM2_ECC_N = 0x8542D69E4C044F18E8B92435BF6FF7DD297720630485628D5AE74EE7C32E79B7n;
  const SM2_ECC_H = ECConstants.ONE;
  const SM2_ECC_GX = 0x421DEBD61B62EAB6746434EBC3CC315E32220B3BADD50BDC4C4E6C147FEDD43Dn;
  const SM2_ECC_GY = 0x0680512BCBB42C07D47349D2153B70C4E5D7FDFCBFA36EA1A85841B9E46E09A2n;

  let curve: ECCurveFp;
  let g: ECPoint;
  let domainParams: ECDomainParameters;

  // Test key pairs from BC Java reference
  let aPriv: ECPrivateKeyParameters;
  let aPub: ECPublicKeyParameters;
  let aePriv: ECPrivateKeyParameters;
  let aePub: ECPublicKeyParameters;
  let bPriv: ECPrivateKeyParameters;
  let bPub: ECPublicKeyParameters;
  let bePriv: ECPrivateKeyParameters;
  let bePub: ECPublicKeyParameters;

  beforeEach(() => {
    // Create the SM2 curve
    curve = new ECCurveFp(SM2_ECC_P, SM2_ECC_A, SM2_ECC_B);
    g = curve.createPoint(SM2_ECC_GX, SM2_ECC_GY);
    domainParams = new ECDomainParameters(curve, g, SM2_ECC_N, SM2_ECC_H);

    // Alice's static key pair
    const aPrivateKey = 0x6FCBA2EF9AE0AB902BC3BDE3FF915D44BA4CC78F88E2F8E7F8996D3B8CCEEDEEn;
    aPriv = new ECPrivateKeyParameters(aPrivateKey, domainParams);
    aPub = new ECPublicKeyParameters(g.multiply(aPrivateKey), domainParams);

    // Alice's ephemeral key pair
    const aePrivateKey = 0x83A2C9C8B96E5AF70BD480B472409A9A327257F1EBB73F5B073354B248668563n;
    aePriv = new ECPrivateKeyParameters(aePrivateKey, domainParams);
    aePub = new ECPublicKeyParameters(g.multiply(aePrivateKey), domainParams);

    // Bob's static key pair
    const bPrivateKey = 0x5E35D7D3F3C54DBAC72E61819E730B019A84208CA3A35E4C2E353DFCCB2A3B53n;
    bPriv = new ECPrivateKeyParameters(bPrivateKey, domainParams);
    bPub = new ECPublicKeyParameters(g.multiply(bPrivateKey), domainParams);

    // Bob's ephemeral key pair
    const bePrivateKey = 0x33FE21940342161C55619C4A0C060293D543C80AF19748CE176D83477DE71C80n;
    bePriv = new ECPrivateKeyParameters(bePrivateKey, domainParams);
    bePub = new ECPublicKeyParameters(g.multiply(bePrivateKey), domainParams);
  });

  describe('Basic Key Exchange Protocol', () => {
    it('should perform basic key exchange from Alice to Bob', () => {
      const exchange = new SM2KeyExchange();
      const aliceUserID = new TextEncoder().encode('ALICE123@YAHOO.COM');
      const bobUserID = new TextEncoder().encode('BILL456@YAHOO.COM');

      // Alice initiates
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      exchange.init(new ParametersWithID(alicePrivParams, aliceUserID));

      // Alice calculates key using Bob's public parameters  
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      const key1 = exchange.calculateKey(128, new ParametersWithID(bobPubParams, bobUserID));

      expect(key1).toHaveLength(16); // 128 bits = 16 bytes
      expect(key1).toBeInstanceOf(Uint8Array);
    });

    it('should perform basic key exchange from Bob to Alice', () => {
      const exchange = new SM2KeyExchange();
      const aliceUserID = new TextEncoder().encode('ALICE123@YAHOO.COM');
      const bobUserID = new TextEncoder().encode('BILL456@YAHOO.COM');

      // Bob responds
      const bobPrivParams = new SM2KeyExchangePrivateParameters(false, bPriv, bePriv);  
      exchange.init(new ParametersWithID(bobPrivParams, bobUserID));

      // Bob calculates key using Alice's public parameters
      const alicePubParams = new SM2KeyExchangePublicParameters(aPub, aePub);
      const key2 = exchange.calculateKey(128, new ParametersWithID(alicePubParams, aliceUserID));

      expect(key2).toHaveLength(16); // 128 bits = 16 bytes
      expect(key2).toBeInstanceOf(Uint8Array);
    });

    it('should produce the same key for both parties', () => {
      const aliceExchange = new SM2KeyExchange();
      const bobExchange = new SM2KeyExchange();

      // Alice initiates key exchange
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      aliceExchange.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      const aliceKey = aliceExchange.calculateKey(128, new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));

      // Bob's exchange
      const bobPrivParams = new SM2KeyExchangePrivateParameters(false, bPriv, bePriv);
      bobExchange.init(new ParametersWithID(bobPrivParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      const alicePubParams = new SM2KeyExchangePublicParameters(aPub, aePub);
      const bobKey = bobExchange.calculateKey(128, new ParametersWithID(alicePubParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));

      // Keys should be identical
      expect(Arrays.areEqual(aliceKey, bobKey)).toBe(true);
    });
  });

  describe('Key Exchange with Confirmation', () => {
    it('should perform key exchange with confirmation from Bob side', () => {
      const exchange = new SM2KeyExchange();
      const bobPrivParams = new SM2KeyExchangePrivateParameters(false, bPriv, bePriv);
      exchange.init(new ParametersWithID(bobPrivParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      
      const alicePubParams = new SM2KeyExchangePublicParameters(aPub, aePub);
      const result = exchange.calculateKeyWithConfirmation(128, null, new ParametersWithID(alicePubParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      
      // Bob is responder, so returns [key, s1, s2]
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(16); // key should be 16 bytes
      expect(result[1]).toHaveLength(32); // s1 should be 32 bytes (SM3 digest)
      expect(result[2]).toHaveLength(32); // s2 should be 32 bytes (SM3 digest)
    });

    it('should perform key exchange with confirmation from Alice side', () => {
      const aliceExchange = new SM2KeyExchange();
      const bobExchange = new SM2KeyExchange();

      // Bob creates confirmation tag first (as responder) 
      const bobPrivParams = new SM2KeyExchangePrivateParameters(false, bPriv, bePriv);
      bobExchange.init(new ParametersWithID(bobPrivParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      const alicePubParams = new SM2KeyExchangePublicParameters(aPub, aePub);
      const bobResult = bobExchange.calculateKeyWithConfirmation(128, null, new ParametersWithID(alicePubParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));

      // Alice responds with confirmation (as initiator)
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      aliceExchange.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      const aliceResult = aliceExchange.calculateKeyWithConfirmation(128, bobResult[1], new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));

      // Bob is responder: returns [key, s1, s2]  
      // Alice is initiator: returns [key, s2]
      expect(bobResult).toHaveLength(3);
      expect(aliceResult).toHaveLength(2);
      
      // Keys should be the same
      expect(Arrays.areEqual(bobResult[0], aliceResult[0])).toBe(true);
    });

    it('should validate confirmation tags match between parties', () => {
      const aliceExchange = new SM2KeyExchange();
      const bobExchange = new SM2KeyExchange();

      // Bob exchange (responder)
      const bobPrivParams = new SM2KeyExchangePrivateParameters(false, bPriv, bePriv);
      bobExchange.init(new ParametersWithID(bobPrivParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      const alicePubParams = new SM2KeyExchangePublicParameters(aPub, aePub);
      const bobResult = bobExchange.calculateKeyWithConfirmation(128, null, new ParametersWithID(alicePubParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));

      // Alice exchange (initiator with Bob's confirmation)
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      aliceExchange.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      const aliceResult = aliceExchange.calculateKeyWithConfirmation(128, bobResult[1], new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));

      // Validate key agreement
      expect(Arrays.areEqual(bobResult[0], aliceResult[0])).toBe(true);
      // Validate confirmation protocol - both should produce same S2 tag
      expect(Arrays.areEqual(bobResult[2], aliceResult[1])).toBe(true); // Bob's S2 should match Alice's S2
    });
  });

  describe('Parameter Validation', () => {
    it('should validate private parameters construction', () => {
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      const bobPrivParams = new SM2KeyExchangePrivateParameters(false, bPriv, bePriv);

      expect(alicePrivParams.isInitiator()).toBe(true);
      expect(bobPrivParams.isInitiator()).toBe(false);
      expect(alicePrivParams.getStaticPrivateKey()).toBe(aPriv);
      expect(alicePrivParams.getEphemeralPrivateKey()).toBe(aePriv);
    });

    it('should validate public parameters construction', () => {
      const alicePubParams = new SM2KeyExchangePublicParameters(aPub, aePub);
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);

      expect(alicePubParams.getStaticPublicKey()).toBe(aPub);
      expect(alicePubParams.getEphemeralPublicKey()).toBe(aePub);
      expect(bobPubParams.getStaticPublicKey()).toBe(bPub);
      expect(bobPubParams.getEphemeralPublicKey()).toBe(bePub);
    });

    it('should handle different key lengths', () => {
      const exchange = new SM2KeyExchange();
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      exchange.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      
      const key64 = exchange.calculateKey(64, new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      const key256 = exchange.calculateKey(256, new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      
      expect(key64).toHaveLength(8);  // 64 bits = 8 bytes
      expect(key256).toHaveLength(32); // 256 bits = 32 bytes
    });
  });

  describe('Error Cases', () => {
    it('should throw error when not initialized', () => {
      const exchange = new SM2KeyExchange();
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      
      expect(() => {
        exchange.calculateKey(128, new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      }).toThrow();
    });

    it('should throw error for invalid key length', () => {
      const exchange = new SM2KeyExchange();
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      exchange.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      
      expect(() => {
        exchange.calculateKey(0, new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      }).toThrow();
    });

    it('should handle empty user IDs', () => {
      const exchange = new SM2KeyExchange();
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      
      // Should not throw for empty user ID
      expect(() => {
        exchange.init(new ParametersWithID(alicePrivParams, new Uint8Array(0)));
      }).not.toThrow();
    });
  });

  describe('Interoperability Tests', () => {
    it('should work with different curve points', () => {
      // Use different curve point for variety
      const altPrivateKey = 0x1234567890ABCDEFn;
      const altPriv = new ECPrivateKeyParameters(altPrivateKey, domainParams);
      const altPub = new ECPublicKeyParameters(g.multiply(altPrivateKey), domainParams);
      
      const exchange = new SM2KeyExchange();
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      exchange.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      
      const altPubParams = new SM2KeyExchangePublicParameters(altPub, bePub);
      const key = exchange.calculateKey(128, new ParametersWithID(altPubParams, new TextEncoder().encode('ALT456@YAHOO.COM')));
      
      expect(key).toHaveLength(16);
      expect(key).toBeInstanceOf(Uint8Array);
    });

    it('should produce different keys for different user IDs', () => {
      const exchange1 = new SM2KeyExchange();
      const exchange2 = new SM2KeyExchange();
      
      const alicePrivParams = new SM2KeyExchangePrivateParameters(true, aPriv, aePriv);
      const bobPubParams = new SM2KeyExchangePublicParameters(bPub, bePub);
      
      exchange1.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE123@YAHOO.COM')));
      const key1 = exchange1.calculateKey(128, new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL456@YAHOO.COM')));
      
      exchange2.init(new ParametersWithID(alicePrivParams, new TextEncoder().encode('ALICE456@YAHOO.COM')));
      const key2 = exchange2.calculateKey(128, new ParametersWithID(bobPubParams, new TextEncoder().encode('BILL789@YAHOO.COM')));
      
      expect(Arrays.areEqual(key1, key2)).toBe(false); // Different user IDs should produce different keys
    });
  });
});