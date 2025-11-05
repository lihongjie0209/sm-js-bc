/**
 * EC private key parameters.
 * 
 * Based on: org.bouncycastle.crypto.params.ECPrivateKeyParameters
 */

import { ECKeyParameters } from './ECKeyParameters';
import { ECDomainParameters } from './ECDomainParameters';

export class ECPrivateKeyParameters extends ECKeyParameters {
  private readonly d: bigint;

  constructor(d: bigint, parameters: ECDomainParameters) {
    super(true, parameters);
    this.d = d;
  }

  getD(): bigint {
    return this.d;
  }
}
