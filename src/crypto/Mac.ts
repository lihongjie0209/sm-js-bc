import { CipherParameters } from './params/CipherParameters';

/**
 * MAC (Message Authentication Code) interface
 * 
 * 参考: org.bouncycastle.crypto.Mac
 */
export interface Mac {
  /**
   * Initialize the MAC with the given parameters
   * 
   * @param params - the cipher parameters (typically KeyParameter)
   */
  init(params: CipherParameters): void;

  /**
   * Return the algorithm name
   * 
   * @returns the algorithm name
   */
  getAlgorithmName(): string;

  /**
   * Return the size (in bytes) of the MAC
   * 
   * @returns the MAC size in bytes
   */
  getMacSize(): number;

  /**
   * Add a single byte to the MAC calculation
   * 
   * @param input - the byte to add
   */
  update(input: number): void;

  /**
   * Add multiple bytes to the MAC calculation
   * 
   * @param input - the byte array containing the data
   * @param inOff - the offset into the input array where the data starts
   * @param len - the length of the data to add
   */
  updateArray(input: Uint8Array, inOff: number, len: number): void;

  /**
   * Complete the MAC calculation and write the result to the output array
   * 
   * @param out - the output array to write the MAC to
   * @param outOff - the offset into the output array to start writing
   * @returns the number of bytes written
   */
  doFinal(out: Uint8Array, outOff: number): number;

  /**
   * Reset the MAC to its initial state
   */
  reset(): void;
}
