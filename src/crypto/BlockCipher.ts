import { CipherParameters } from './CipherParameters';

/**
 * Block cipher engines are expected to conform to this interface.
 * 
 * 参考: org.bouncycastle.crypto.BlockCipher
 */
export interface BlockCipher {
  /**
   * Initialize the cipher.
   * 
   * @param forEncryption - if true the cipher is initialized for encryption,
   *                        if false for decryption.
   * @param params - the key and other data required by the cipher.
   * @throws Error if the params argument is inappropriate.
   */
  init(forEncryption: boolean, params: CipherParameters): void;

  /**
   * Return the name of the algorithm the cipher implements.
   * 
   * @returns the name of the algorithm the cipher implements.
   */
  getAlgorithmName(): string;

  /**
   * Return the block size for this cipher (in bytes).
   * 
   * @returns the block size for this cipher in bytes.
   */
  getBlockSize(): number;

  /**
   * Process one block of input from the array in and write it to
   * the out array.
   * 
   * @param input - the array containing the input data.
   * @param inOff - offset into the in array the data starts at.
   * @param output - the array the output data will be copied into.
   * @param outOff - the offset into the out array the output will start at.
   * @returns the number of bytes processed and produced.
   * @throws DataLengthException if there isn't enough data in input, or
   *         space in output.
   * @throws Error if the cipher isn't initialized.
   */
  processBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number;

  /**
   * Reset the cipher. After resetting the cipher is in the same state
   * as it was after the last init (if there was one).
   */
  reset(): void;
}
