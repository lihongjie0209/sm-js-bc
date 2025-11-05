import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../CipherParameters';
import { ParametersWithIV } from '../params/ParametersWithIV';
import { DataLengthException } from '../../exceptions/DataLengthException';

/**
 * Implements a Cipher-FeedBack (CFB) mode on top of a simple cipher.
 * 
 * 参考: org.bouncycastle.crypto.modes.CFBBlockCipher
 */
export class CFBBlockCipher implements BlockCipher {
  private readonly cipher: BlockCipher;
  private readonly cipherBlockSize: number;
  private readonly blockSize: number;

  private IV: Uint8Array;
  private cfbV: Uint8Array;
  private cfbOutV: Uint8Array;
  private inBuf: Uint8Array;

  private encrypting: boolean = false;
  private byteCount: number = 0;

  /**
   * Basic constructor.
   * 
   * @param cipher - the block cipher to be used as the basis of the feedback mode
   * @param bitBlockSize - the block size in bits (note: a multiple of 8)
   */
  constructor(cipher: BlockCipher, bitBlockSize: number) {
    const cipherBlockSize = cipher.getBlockSize();

    if (
      bitBlockSize > cipherBlockSize * 8 ||
      bitBlockSize < 8 ||
      bitBlockSize % 8 !== 0
    ) {
      throw new Error(`CFB${bitBlockSize} not supported`);
    }

    this.cipher = cipher;
    this.cipherBlockSize = cipherBlockSize;
    this.blockSize = bitBlockSize / 8;

    this.IV = new Uint8Array(cipherBlockSize);
    this.cfbV = new Uint8Array(cipherBlockSize);
    this.cfbOutV = new Uint8Array(cipherBlockSize);
    this.inBuf = new Uint8Array(this.blockSize);
  }

  /**
   * Initialize the cipher and, possibly, the initialisation vector (IV).
   * If an IV isn't passed as part of the parameter, the IV will be all zeros.
   * An IV which is too short is handled in FIPS compliant fashion.
   * 
   * @param encrypting - if true the cipher is initialised for encryption, if false for decryption
   * @param params - the key and other data required by the cipher
   */
  public init(encrypting: boolean, params: CipherParameters): void {
    this.encrypting = encrypting;

    if (params instanceof ParametersWithIV) {
      const ivParam = params as ParametersWithIV;
      const iv = ivParam.getIV();

      if (iv.length < this.IV.length) {
        // prepend the supplied IV with zeros (per FIPS PUB 81)
        this.IV.fill(0, 0, this.IV.length - iv.length);
        this.IV.set(iv, this.IV.length - iv.length);
      } else {
        this.IV.set(iv.subarray(0, this.IV.length));
      }

      this.reset();

      // if null it's an IV changed only
      const underlyingParams = ivParam.getParameters();
      if (underlyingParams !== null) {
        this.cipher.init(true, underlyingParams);
      }
    } else {
      this.reset();

      // if it's null, key is to be reused
      if (params !== null) {
        this.cipher.init(true, params);
      }
    }
  }

  /**
   * Return the algorithm name and mode.
   * 
   * @returns the name of the underlying algorithm followed by "/CFB" and the block size in bits
   */
  public getAlgorithmName(): string {
    return this.cipher.getAlgorithmName() + '/CFB' + this.blockSize * 8;
  }

  /**
   * Return the block size we are operating at.
   * 
   * @returns the block size we are operating at (in bytes)
   */
  public getBlockSize(): number {
    return this.blockSize;
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
   * Process one block of input from the array in and write it to the out array.
   * 
   * @param input - the array containing the input data
   * @param inOff - offset into the input array the data starts at
   * @param output - the array the output data will be copied into
   * @param outOff - the offset into the output array the output will start at
   * @returns the number of bytes processed and produced
   */
  public processBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number {
    this.processBytes(input, inOff, this.blockSize, output, outOff);
    return this.blockSize;
  }

  /**
   * Process bytes in CFB mode.
   * 
   * @param input - the input data
   * @param inOff - offset into the input array
   * @param len - number of bytes to process
   * @param output - the output buffer
   * @param outOff - offset into the output array
   * @returns the number of bytes processed
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
      output[outOff + i] = this.encrypting
        ? this.encryptByte(input[inOff + i])
        : this.decryptByte(input[inOff + i]);
    }

    return len;
  }

  /**
   * Encrypt a single byte.
   * 
   * @param inputByte - the byte to encrypt
   * @returns the encrypted byte
   */
  private encryptByte(inputByte: number): number {
    if (this.byteCount === 0) {
      this.cipher.processBlock(this.cfbV, 0, this.cfbOutV, 0);
    }

    const rv = this.cfbOutV[this.byteCount] ^ inputByte;
    this.inBuf[this.byteCount++] = rv;

    if (this.byteCount === this.blockSize) {
      this.byteCount = 0;

      // Shift cfbV left by blockSize bytes
      this.cfbV.copyWithin(0, this.blockSize);
      // Copy inBuf to the end of cfbV
      this.cfbV.set(this.inBuf, this.cfbV.length - this.blockSize);
    }

    return rv;
  }

  /**
   * Decrypt a single byte.
   * 
   * @param inputByte - the byte to decrypt
   * @returns the decrypted byte
   */
  private decryptByte(inputByte: number): number {
    if (this.byteCount === 0) {
      this.cipher.processBlock(this.cfbV, 0, this.cfbOutV, 0);
    }

    this.inBuf[this.byteCount] = inputByte;
    const rv = this.cfbOutV[this.byteCount++] ^ inputByte;

    if (this.byteCount === this.blockSize) {
      this.byteCount = 0;

      // Shift cfbV left by blockSize bytes
      this.cfbV.copyWithin(0, this.blockSize);
      // Copy inBuf to the end of cfbV
      this.cfbV.set(this.inBuf, this.cfbV.length - this.blockSize);
    }

    return rv;
  }

  /**
   * Return the current state of the initialisation vector.
   * 
   * @returns current IV
   */
  public getCurrentIV(): Uint8Array {
    return new Uint8Array(this.cfbV);
  }

  /**
   * Reset the chaining vector back to the IV and reset the underlying cipher.
   */
  public reset(): void {
    this.cfbV.set(this.IV);
    this.inBuf.fill(0);
    this.byteCount = 0;

    this.cipher.reset();
  }
}
