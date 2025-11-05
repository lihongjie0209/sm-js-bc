/**
 * Parameters wrapper that includes a user ID.
 * 
 * This class wraps cipher parameters and associates them with a user ID,
 * which is commonly used in SM2 signatures for calculating the Z_A value.
 * 
 * Based on: Bouncy Castle pattern for parameter wrapping
 */

import { CipherParameters } from './CipherParameters';

/**
 * Cipher parameters with associated user ID.
 */
export class ParametersWithID implements CipherParameters {
  private readonly parameters: CipherParameters;
  private readonly id: Uint8Array;

  /**
   * Create parameters with user ID.
   * 
   * @param parameters - the underlying cipher parameters
   * @param id - user ID bytes
   */
  constructor(parameters: CipherParameters, id: Uint8Array) {
    this.parameters = parameters;
    this.id = new Uint8Array(id); // Make a copy
  }

  /**
   * Get the underlying parameters.
   */
  getParameters(): CipherParameters {
    return this.parameters;
  }

  /**
   * Get the user ID.
   */
  getID(): Uint8Array {
    return new Uint8Array(this.id); // Return a copy
  }
}