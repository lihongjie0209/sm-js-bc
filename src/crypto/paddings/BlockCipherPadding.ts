/**
 * Block cipher padding interface.
 * 
 * 参考: org.bouncycastle.crypto.paddings.BlockCipherPadding
 */
export interface BlockCipherPadding {
  /**
   * Initialize the padding.
   * 
   * @param random - optional secure random (not used by all paddings)
   */
  init(random?: any): void;

  /**
   * Return the name of the padding.
   * 
   * @returns padding name
   */
  getPaddingName(): string;

  /**
   * Add padding to the block.
   * 
   * @param input - the block to pad
   * @param inOff - offset where to start padding
   * @returns number of bytes added
   */
  addPadding(input: Uint8Array, inOff: number): number;

  /**
   * Return the number of padding bytes in the block.
   * 
   * @param input - the block
   * @returns number of padding bytes
   * @throws Error if padding is invalid
   */
  padCount(input: Uint8Array): number;
}
