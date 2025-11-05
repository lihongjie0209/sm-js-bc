/**
 * Base class for EC key parameters.
 * 
 * Based on: org.bouncycastle.crypto.params.ECKeyParameters
 */

import { AsymmetricKeyParameter } from './AsymmetricKeyParameter';
import { ECDomainParameters } from './ECDomainParameters';

export abstract class ECKeyParameters extends AsymmetricKeyParameter {
  private readonly parameters: ECDomainParameters;

  constructor(privateKey: boolean, parameters: ECDomainParameters) {
    super(privateKey);
    this.parameters = parameters;
  }

  getParameters(): ECDomainParameters {
    return this.parameters;
  }
}
