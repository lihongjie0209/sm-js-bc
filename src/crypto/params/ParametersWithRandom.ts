/**
 * Wraps cipher parameters with random source.
 * 
 * Based on: org.bouncycastle.crypto.params.ParametersWithRandom
 */

import { CipherParameters } from './CipherParameters';
import { SecureRandom } from '../../util/SecureRandom';

export class ParametersWithRandom implements CipherParameters {
  private readonly parameters: CipherParameters;
  private readonly random: SecureRandom;

  constructor(parameters: CipherParameters, random?: SecureRandom) {
    this.parameters = parameters;
    this.random = random ?? new SecureRandom();
  }

  getParameters(): CipherParameters {
    return this.parameters;
  }

  getRandom(): SecureRandom {
    return this.random;
  }
}
