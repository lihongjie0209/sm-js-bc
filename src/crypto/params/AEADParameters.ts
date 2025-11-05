import { CipherParameters } from '../CipherParameters';
import { KeyParameter } from './KeyParameter';

/**
 * Parameters for AEAD (Authenticated Encryption with Associated Data) modes.
 * Used with modes like GCM that provide both encryption and authentication.
 * 
 * @see BouncyCastle AEADParameters.java
 */
export class AEADParameters implements CipherParameters {
  private key: KeyParameter;
  private nonce: Uint8Array;
  private macSize: number;
  private associatedText: Uint8Array | null;
  
  /**
   * Create AEAD parameters.
   * 
   * @param key - The cipher key
   * @param macSize - The MAC/tag size in bits (must be multiple of 8)
   * @param nonce - The nonce/IV
   * @param associatedText - Optional additional authenticated data (AAD)
   */
  constructor(
    key: KeyParameter,
    macSize: number,
    nonce: Uint8Array,
    associatedText: Uint8Array | null = null
  ) {
    this.key = key;
    this.nonce = nonce;
    this.macSize = macSize;
    this.associatedText = associatedText;
  }
  
  /**
   * Get the cipher key.
   */
  getKey(): KeyParameter {
    return this.key;
  }
  
  /**
   * Get the MAC size in bits.
   */
  getMacSize(): number {
    return this.macSize;
  }
  
  /**
   * Get the nonce/IV.
   */
  getNonce(): Uint8Array {
    return this.nonce;
  }
  
  /**
   * Get the associated text (additional authenticated data).
   */
  getAssociatedText(): Uint8Array | null {
    return this.associatedText;
  }
}
