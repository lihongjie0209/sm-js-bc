/**
 * Public parameters for SM2 key exchange.
 * 
 * Contains both static and ephemeral public keys for the key agreement protocol.
 */

import type { CipherParameters } from './CipherParameters';
import { ECPublicKeyParameters } from './ECPublicKeyParameters';

/**
 * Public parameters for an SM2 key exchange.
 * In this case the ephemeralPublicKey provides the random point used in the algorithm.
 */
export class SM2KeyExchangePublicParameters implements CipherParameters {
  private readonly staticPublicKey: ECPublicKeyParameters;
  private readonly ephemeralPublicKey: ECPublicKeyParameters;

  /**
   * Create SM2 key exchange public parameters.
   * 
   * @param staticPublicKey The static public key
   * @param ephemeralPublicKey The ephemeral public key
   */
  constructor(
    staticPublicKey: ECPublicKeyParameters,
    ephemeralPublicKey: ECPublicKeyParameters
  ) {
    if (staticPublicKey === null || staticPublicKey === undefined) {
      throw new Error('staticPublicKey cannot be null');
    }
    if (ephemeralPublicKey === null || ephemeralPublicKey === undefined) {
      throw new Error('ephemeralPublicKey cannot be null');
    }
    if (!staticPublicKey.getParameters().equals(ephemeralPublicKey.getParameters())) {
      throw new Error('Static and ephemeral public keys have different domain parameters');
    }

    this.staticPublicKey = staticPublicKey;
    this.ephemeralPublicKey = ephemeralPublicKey;
  }

  /**
   * @returns the static public key
   */
  getStaticPublicKey(): ECPublicKeyParameters {
    return this.staticPublicKey;
  }

  /**
   * @returns the ephemeral public key
   */
  getEphemeralPublicKey(): ECPublicKeyParameters {
    return this.ephemeralPublicKey;
  }
}