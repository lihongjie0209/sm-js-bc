/**
 * Private parameters for SM2 key exchange.
 * 
 * Contains both static and ephemeral private keys along with their
 * corresponding public points for the key agreement protocol.
 */

import type { CipherParameters } from './CipherParameters';
import { ECPrivateKeyParameters } from './ECPrivateKeyParameters';
import { ECDomainParameters } from './ECDomainParameters';
import { ECPoint } from '../../math/ec/ECPoint';
import { FixedPointCombMultiplier } from '../../math/ec/ECMultiplier';

/**
 * Private parameters for an SM2 key exchange.
 * The ephemeralPrivateKey is used to calculate the random point used in the algorithm.
 */
export class SM2KeyExchangePrivateParameters implements CipherParameters {
  private readonly initiator: boolean;
  private readonly staticPrivateKey: ECPrivateKeyParameters;
  private readonly staticPublicPoint: ECPoint;
  private readonly ephemeralPrivateKey: ECPrivateKeyParameters;
  private readonly ephemeralPublicPoint: ECPoint;

  /**
   * Create SM2 key exchange private parameters.
   * 
   * @param initiator Whether this party is the initiator of the key exchange
   * @param staticPrivateKey The static private key
   * @param ephemeralPrivateKey The ephemeral private key
   */
  constructor(
    initiator: boolean,
    staticPrivateKey: ECPrivateKeyParameters,
    ephemeralPrivateKey: ECPrivateKeyParameters
  ) {
    if (staticPrivateKey === null || staticPrivateKey === undefined) {
      throw new Error('staticPrivateKey cannot be null');
    }
    if (ephemeralPrivateKey === null || ephemeralPrivateKey === undefined) {
      throw new Error('ephemeralPrivateKey cannot be null');
    }

    const parameters = staticPrivateKey.getParameters();
    if (!parameters.equals(ephemeralPrivateKey.getParameters())) {
      throw new Error('Static and ephemeral private keys have different domain parameters');
    }

    const m = new FixedPointCombMultiplier();

    this.initiator = initiator;
    this.staticPrivateKey = staticPrivateKey;
    this.staticPublicPoint = m.multiply(parameters.getG(), staticPrivateKey.getD()).normalize();
    this.ephemeralPrivateKey = ephemeralPrivateKey;
    this.ephemeralPublicPoint = m.multiply(parameters.getG(), ephemeralPrivateKey.getD()).normalize();
  }

  /**
   * @returns true if this party is the initiator
   */
  isInitiator(): boolean {
    return this.initiator;
  }

  /**
   * @returns the static private key
   */
  getStaticPrivateKey(): ECPrivateKeyParameters {
    return this.staticPrivateKey;
  }

  /**
   * @returns the computed static public point
   */
  getStaticPublicPoint(): ECPoint {
    return this.staticPublicPoint;
  }

  /**
   * @returns the ephemeral private key
   */
  getEphemeralPrivateKey(): ECPrivateKeyParameters {
    return this.ephemeralPrivateKey;
  }

  /**
   * @returns the computed ephemeral public point
   */
  getEphemeralPublicPoint(): ECPoint {
    return this.ephemeralPublicPoint;
  }
}