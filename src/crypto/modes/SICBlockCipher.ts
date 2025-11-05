import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../CipherParameters';
import { ParametersWithIV } from '../params/ParametersWithIV';
import { DataLengthException } from '../../exceptions/DataLengthException';

/**
 * Segmented Integer Counter (SIC) mode, also known as CTR mode.
 * 
 * 参考: org.bouncycastle.crypto.modes.SICBlockCipher
 */
export class SICBlockCipher implements BlockCipher {
  private readonly cipher: BlockCipher;
  private readonly blockSize: number;

  private IV: Uint8Array;
  private counter: Uint8Array;
  private counterOut: Uint8Array;
  private byteCount: number = 0;

  /**
   * Basic constructor.
   * 
   * @param cipher - the block cipher to be used
   */
  constructor(cipher: BlockCipher) {
    this.cipher = cipher;
    this.blockSize = cipher.getBlockSize();
    this.IV = new Uint8Array(this.blockSize);
    this.counter = new Uint8Array(this.blockSize);
    this.counterOut = new Uint8Array(this.blockSize);
  }

  /**
   * Initialize the cipher.
   * 
   * @param forEncryption - ignored by CTR mode (always encrypts the counter)
   * @param params - the key and IV
   */
  public init(forEncryption: boolean, params: CipherParameters): void {
    if (!(params instanceof ParametersWithIV)) {
      throw new Error('CTR/SIC mode requires ParametersWithIV');
    }

    const ivParam = params as ParametersWithIV;
    this.IV = new Uint8Array(ivParam.getIV());

    if (this.blockSize < this.IV.length) {
      throw new Error(
        `CTR/SIC mode requires IV no greater than: ${this.blockSize} bytes`
      );
    }

    const maxCounterSize = Math.min(8, Math.floor(this.blockSize / 2));

    if (this.blockSize - this.IV.length > maxCounterSize) {
      throw new Error(
        `CTR/SIC mode requires IV of at least: ${this.blockSize - maxCounterSize} bytes`
      );
    }

    // If null it's an IV changed only
    const underlyingParams = ivParam.getParameters();
    if (underlyingParams !== null) {
      this.cipher.init(true, underlyingParams);
    }

    this.reset();
  }

  /**
   * Return the algorithm name and mode.
   * 
   * @returns the name followed by "/SIC"
   */
  public getAlgorithmName(): string {
    return this.cipher.getAlgorithmName() + '/SIC';
  }

  /**
   * Return the block size.
   * 
   * @returns the block size
   */
  public getBlockSize(): number {
    return this.cipher.getBlockSize();
  }

  /**
   * Return the underlying cipher.
   * 
   * @returns the underlying cipher
   */
  public getUnderlyingCipher(): BlockCipher {
    return this.cipher;
  }

  /**
   * Process one block of input.
   * 
   * @param input - input data
   * @param inOff - offset in input
   * @param output - output buffer
   * @param outOff - offset in output
   * @returns number of bytes processed
   */
  public processBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (this.byteCount !== 0) {
      return this.processBytes(input, inOff, this.blockSize, output, outOff);
    }

    if (inOff + this.blockSize > input.length) {
      throw new DataLengthException('input buffer too small');
    }

    if (outOff + this.blockSize > output.length) {
      throw new DataLengthException('output buffer too short');
    }

    // Check counter before using it
    this.checkLastIncrement();

    this.cipher.processBlock(this.counter, 0, this.counterOut, 0);

    for (let i = 0; i < this.blockSize; i++) {
      output[outOff + i] = input[inOff + i] ^ this.counterOut[i];
    }

    this.incrementCounter();

    return this.blockSize;
  }

  /**
   * Process bytes (stream mode).
   * 
   * @param input - input data
   * @param inOff - offset in input
   * @param len - number of bytes to process
   * @param output - output buffer
   * @param outOff - offset in output
   * @returns number of bytes processed
   */
  public processBytes(
    input: Uint8Array,
    inOff: number,
    len: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (inOff + len > input.length) {
      throw new DataLengthException('input buffer too small');
    }

    if (outOff + len > output.length) {
      throw new DataLengthException('output buffer too short');
    }

    for (let i = 0; i < len; i++) {
      let next: number;

      if (this.byteCount === 0) {
        this.checkLastIncrement();
        this.cipher.processBlock(this.counter, 0, this.counterOut, 0);
        next = input[inOff + i] ^ this.counterOut[this.byteCount++];
      } else {
        next = input[inOff + i] ^ this.counterOut[this.byteCount++];
        if (this.byteCount === this.counter.length) {
          this.byteCount = 0;
          this.incrementCounter();
        }
      }

      output[outOff + i] = next;
    }

    return len;
  }

  /**
   * Reset the cipher.
   */
  public reset(): void {
    this.counter.fill(0);
    this.counter.set(this.IV);
    this.cipher.reset();
    this.byteCount = 0;
  }

  /**
   * Check that counter hasn't wrapped around.
   */
  private checkLastIncrement(): void {
    // If the IV is the same as the blocksize we assume the user knows what they are doing
    if (this.IV.length < this.blockSize) {
      if (this.counter[this.IV.length - 1] !== this.IV[this.IV.length - 1]) {
        throw new Error('Counter in CTR/SIC mode out of range');
      }
    }
  }

  /**
   * Increment the counter by 1.
   */
  private incrementCounter(): void {
    let i = this.counter.length;
    while (--i >= 0) {
      if (++this.counter[i] !== 0) {
        break;
      }
    }
  }
}
