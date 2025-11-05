import { CipherParameters } from '../CipherParameters';

/**
 * Cipher parameters with an initialization vector.
 * 
 * 参考: org.bouncycastle.crypto.params.ParametersWithIV
 */
export class ParametersWithIV implements CipherParameters {
  private readonly parameters: CipherParameters;
  private readonly iv: Uint8Array;

  /**
   * Create parameters with IV.
   * 
   * @param parameters - the underlying parameters
   * @param iv - the initialization vector
   */
  constructor(parameters: CipherParameters, iv: Uint8Array) {
    this.parameters = parameters;
    this.iv = new Uint8Array(iv);
  }

  /**
   * Get the initialization vector.
   * 
   * @returns the IV
   */
  public getIV(): Uint8Array {
    return this.iv;
  }

  /**
   * Get the underlying parameters.
   * 
   * @returns the parameters
   */
  public getParameters(): CipherParameters {
    return this.parameters;
  }
}
