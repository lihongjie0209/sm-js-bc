import { CipherParameters } from './CipherParameters';

/**
 * Stream cipher engines are expected to conform to this interface.
 * 
 * 参考: org.bouncycastle.crypto.StreamCipher
 */
export interface StreamCipher {
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
   * Encrypt/decrypt a single byte.
   * 
   * @param input - the byte to process.
   * @returns the processed byte.
   * @throws Error if the cipher isn't initialized.
   */
  returnByte(input: number): number;

  /**
   * Process a block of bytes from in putting the result into out.
   * 
   * @param input - the input byte array.
   * @param inOff - the offset into the input array where the data starts.
   * @param len - the number of bytes to be processed.
   * @param output - the output buffer the processed bytes go into.
   * @param outOff - the offset into the output byte array the processed data starts at.
   * @returns the number of bytes produced.
   * @throws DataLengthException if the output buffer is too small.
   */
  processBytes(
    input: Uint8Array,
    inOff: number,
    len: number,
    output: Uint8Array,
    outOff: number
  ): number;

  /**
   * Reset the cipher to the same state as it was after the last init (if there was one).
   */
  reset(): void;
}
