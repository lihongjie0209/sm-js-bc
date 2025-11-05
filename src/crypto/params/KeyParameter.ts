import { CipherParameters } from '../CipherParameters';

/**
 * KeyParameter class for holding a symmetric key.
 * 
 * 参考: org.bouncycastle.crypto.params.KeyParameter
 */
export class KeyParameter implements CipherParameters {
  private readonly key: Uint8Array;

  /**
   * Create a KeyParameter from a byte array.
   * 
   * @param key - the key data
   */
  constructor(key: Uint8Array) {
    this.key = new Uint8Array(key);
  }

  /**
   * Return the key data.
   * 
   * @returns the key bytes
   */
  public getKey(): Uint8Array {
    return this.key;
  }
}
