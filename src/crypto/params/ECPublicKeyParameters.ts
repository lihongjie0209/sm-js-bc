/**
 * EC public key parameters.
 * 
 * Based on: org.bouncycastle.crypto.params.ECPublicKeyParameters
 */

import { ECKeyParameters } from './ECKeyParameters';
import { ECDomainParameters } from './ECDomainParameters';
import { ECPoint } from '../../math/ec/ECPoint';

export class ECPublicKeyParameters extends ECKeyParameters {
  private readonly Q: ECPoint;

  constructor(Q: ECPoint, parameters: ECDomainParameters) {
    super(false, parameters);
    this.Q = Q;
  }

  getQ(): ECPoint {
    return this.Q;
  }
}
