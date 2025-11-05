import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../CipherParameters';
import { ParametersWithIV } from '../params/ParametersWithIV';
import { DataLengthException } from '../../exceptions/DataLengthException';

/**
 * Cipher Block Chaining (CBC) mode.
 * 
 * 参考: org.bouncycastle.crypto.modes.CBCBlockCipher
 */
export class CBCBlockCipher implements BlockCipher {
  private readonly cipher: BlockCipher;
  private readonly blockSize: number;
  
  private IV: Uint8Array;
  private cbcV: Uint8Array;
  private cbcNextV: Uint8Array;
  
  private encrypting: boolean = false;

  /**
   * Basic constructor.
   * 
   * @param cipher - the block cipher to be used as the basis of chaining
   */
  constructor(cipher: BlockCipher) {
    this.cipher = cipher;
    this.blockSize = cipher.getBlockSize();
    
    this.IV = new Uint8Array(this.blockSize);
    this.cbcV = new Uint8Array(this.blockSize);
    this.cbcNextV = new Uint8Array(this.blockSize);
  }

  /**
   * Return the underlying block cipher that we are wrapping.
   * 
   * @returns the underlying block cipher
   */
  public getUnderlyingCipher(): BlockCipher {
    return this.cipher;
  }

  /**
   * Initialize the cipher and, possibly, the initialization vector (IV).
   * If an IV isn't passed as part of the parameter, the IV will be all zeros.
   * 
   * @param forEncryption - true for encryption, false for decryption
   * @param params - the key and other data required by the cipher
   */
  public init(forEncryption: boolean, params: CipherParameters): void {
    const oldEncrypting = this.encrypting;
    this.encrypting = forEncryption;

    if (params instanceof ParametersWithIV) {
      const iv = params.getIV();

      if (iv.length !== this.blockSize) {
        throw new Error(
          'initialization vector must be the same length as block size'
        );
      }

      this.IV.set(iv);
      params = params.getParameters();
    } else {
      this.IV.fill(0);
    }

    this.reset();

    // If null it's an IV changed only (key is to be reused)
    if (params !== null) {
      this.cipher.init(forEncryption, params);
    } else if (oldEncrypting !== forEncryption) {
      throw new Error(
        'cannot change encrypting state without providing key'
      );
    }
  }

  /**
   * Return the algorithm name and mode.
   * 
   * @returns the name of the underlying algorithm followed by "/CBC"
   */
  public getAlgorithmName(): string {
    return this.cipher.getAlgorithmName() + '/CBC';
  }

  /**
   * Return the block size of the underlying cipher.
   * 
   * @returns the block size
   */
  public getBlockSize(): number {
    return this.cipher.getBlockSize();
  }

  /**
   * Process one block of input from the array in and write it to the out array.
   * 
   * @param input - the array containing the input data
   * @param inOff - offset into the in array the data starts at
   * @param output - the array the output data will be copied into
   * @param outOff - the offset into the out array the output will start at
   * @returns the number of bytes processed and produced
   */
  public processBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number {
    return this.encrypting
      ? this.encryptBlock(input, inOff, output, outOff)
      : this.decryptBlock(input, inOff, output, outOff);
  }

  /**
   * Reset the chaining vector back to the IV and reset the underlying cipher.
   */
  public reset(): void {
    this.cbcV.set(this.IV);
    this.cbcNextV.fill(0);
    this.cipher.reset();
  }

  /**
   * Do the appropriate chaining step for CBC mode encryption.
   * 
   * @param input - the array containing the data to be encrypted
   * @param inOff - offset into the in array the data starts at
   * @param output - the array the encrypted data will be copied into
   * @param outOff - the offset into the out array the output will start at
   * @returns the number of bytes processed and produced
   */
  private encryptBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (inOff + this.blockSize > input.length) {
      throw new DataLengthException('input buffer too short');
    }

    // XOR the cbcV and the input, then encrypt the cbcV
    for (let i = 0; i < this.blockSize; i++) {
      this.cbcV[i] ^= input[inOff + i];
    }

    const length = this.cipher.processBlock(this.cbcV, 0, output, outOff);

    // Copy ciphertext to cbcV
    this.cbcV.set(output.subarray(outOff, outOff + this.cbcV.length));

    return length;
  }

  /**
   * Do the appropriate chaining step for CBC mode decryption.
   * 
   * @param input - the array containing the data to be decrypted
   * @param inOff - offset into the in array the data starts at
   * @param output - the array the decrypted data will be copied into
   * @param outOff - the offset into the out array the output will start at
   * @returns the number of bytes processed and produced
   */
  private decryptBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (inOff + this.blockSize > input.length) {
      throw new DataLengthException('input buffer too short');
    }

    this.cbcNextV.set(input.subarray(inOff, inOff + this.blockSize));

    const length = this.cipher.processBlock(input, inOff, output, outOff);

    // XOR the cbcV and the output
    for (let i = 0; i < this.blockSize; i++) {
      output[outOff + i] ^= this.cbcV[i];
    }

    // Swap the back up buffer into next position
    const tmp = this.cbcV;
    this.cbcV = this.cbcNextV;
    this.cbcNextV = tmp;

    return length;
  }
}
