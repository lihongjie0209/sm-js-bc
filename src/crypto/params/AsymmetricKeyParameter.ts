/**
 * Base class for asymmetric key parameters.
 * 
 * Based on: org.bouncycastle.crypto.params.AsymmetricKeyParameter
 */

import { CipherParameters } from './CipherParameters';

export abstract class AsymmetricKeyParameter implements CipherParameters {
  private readonly privateKey: boolean;

  constructor(privateKey: boolean) {
    this.privateKey = privateKey;
  }

  isPrivate(): boolean {
    return this.privateKey;
  }
}
