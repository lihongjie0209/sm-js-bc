import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../CipherParameters';
import { DataLengthException } from '../../exceptions/DataLengthException';
import { ParametersWithIV } from '../params/ParametersWithIV';

/**
 * Implements Output Feedback (OFB) mode on top of a simple block cipher.
 * 
 * In OFB mode, the block cipher encrypts the previous output to produce the next keystream block.
 * The keystream is then XORed with the plaintext/ciphertext.
 * 
 * Key characteristics:
 * - Encryption and decryption are identical operations (XOR with keystream)
 * - Converts block cipher into stream cipher
 * - Does not propagate errors
 * - Feedback is from encrypted output, not ciphertext
 * 
 * @see BouncyCastle OFBBlockCipher.java
 */
export class OFBBlockCipher implements BlockCipher {
  private byteCount: number;
  private IV: Uint8Array;
  private ofbV: Uint8Array;        // Output feedback register
  private ofbOutV: Uint8Array;     // Encrypted output
  
  private readonly blockSize: number;
  private readonly cipher: BlockCipher;
  
  /**
   * Create an OFB mode cipher.
   * 
   * @param cipher - The block cipher to use as the basis of the feedback mode
   * @param bitBlockSize - The block size in bits (must be multiple of 8, between 8 and cipher block size * 8)
   */
  constructor(cipher: BlockCipher, bitBlockSize: number) {
    const cipherBlockSize = cipher.getBlockSize();
    
    if (bitBlockSize > cipherBlockSize * 8 || bitBlockSize < 8 || bitBlockSize % 8 !== 0) {
      throw new Error(`OFB${bitBlockSize} not supported`);
    }
    
    this.cipher = cipher;
    this.blockSize = bitBlockSize / 8;
    
    this.IV = new Uint8Array(cipherBlockSize);
    this.ofbV = new Uint8Array(cipherBlockSize);
    this.ofbOutV = new Uint8Array(cipherBlockSize);
    
    this.byteCount = 0;
  }
  
  /**
   * Initialize the cipher and possibly the initialization vector (IV).
   * 
   * Note: The encrypting parameter is ignored for OFB mode since encryption
   * and decryption are identical operations.
   * 
   * @param encrypting - Ignored (OFB encryption and decryption are identical)
   * @param params - The parameters (should be ParametersWithIV for first init)
   */
  init(encrypting: boolean, params: CipherParameters): void {
    if (params instanceof ParametersWithIV) {
      const ivParam = params as ParametersWithIV;
      const iv = ivParam.getIV();
      
      if (iv.length < this.IV.length) {
        // Prepend the supplied IV with zeros (per FIPS PUB 81)
        this.IV.fill(0);
        this.IV.set(iv, this.IV.length - iv.length);
      } else {
        this.IV.set(iv.subarray(0, this.IV.length));
      }
      
      this.reset();
      
      // If null, it's an IV change only
      const underlyingParams = ivParam.getParameters();
      if (underlyingParams !== null) {
        // OFB always encrypts the feedback register, regardless of mode
        this.cipher.init(true, underlyingParams);
      }
    } else {
      this.reset();
      
      // If it's null, key is to be reused
      if (params !== null) {
        // OFB always encrypts the feedback register
        this.cipher.init(true, params);
      }
    }
  }
  
  /**
   * Get the algorithm name.
   * 
   * @returns The name of the underlying algorithm followed by "/OFB" and block size in bits
   */
  getAlgorithmName(): string {
    return `${this.cipher.getAlgorithmName()}/OFB${this.blockSize * 8}`;
  }
  
  /**
   * Get the block size in bytes.
   * 
   * @returns The block size in bytes
   */
  getBlockSize(): number {
    return this.blockSize;
  }
  
  /**
   * Process a block of input.
   * 
   * @param input - The input buffer
   * @param inOff - The offset into input where data starts
   * @param output - The output buffer
   * @param outOff - The offset into output where result will be written
   * @returns The number of bytes processed
   */
  processBlock(input: Uint8Array, inOff: number, output: Uint8Array, outOff: number): number {
    this.processBytes(input, inOff, this.blockSize, output, outOff);
    return this.blockSize;
  }
  
  /**
   * Process a stream of bytes.
   * 
   * @param input - The input buffer
   * @param inOff - The offset into input where data starts
   * @param len - The number of bytes to process
   * @param output - The output buffer
   * @param outOff - The offset into output where result will be written
   * @returns The number of bytes processed
   */
  processBytes(input: Uint8Array, inOff: number, len: number, output: Uint8Array, outOff: number): number {
    if (inOff + len > input.length) {
      throw new DataLengthException('input buffer too short');
    }
    
    if (outOff + len > output.length) {
      throw new DataLengthException('output buffer too short');
    }
    
    for (let i = 0; i < len; i++) {
      output[outOff + i] = this.calculateByte(input[inOff + i]);
    }
    
    return len;
  }
  
  /**
   * Reset the feedback register back to the IV and reset the underlying cipher.
   */
  reset(): void {
    this.ofbV.set(this.IV);
    this.byteCount = 0;
    this.cipher.reset();
  }
  
  /**
   * Get the current IV/output feedback register state.
   * 
   * @returns A copy of the current output feedback register
   */
  getCurrentIV(): Uint8Array {
    return new Uint8Array(this.ofbV);
  }
  
  /**
   * Calculate a single output byte.
   * 
   * @param inputByte - The input byte
   * @returns The output byte (XOR of input with keystream)
   */
  private calculateByte(inputByte: number): number {
    // Generate new keystream block if needed
    if (this.byteCount === 0) {
      this.cipher.processBlock(this.ofbV, 0, this.ofbOutV, 0);
    }
    
    // XOR input with keystream
    const outputByte = this.ofbOutV[this.byteCount++] ^ inputByte;
    
    // Update feedback register when block is complete
    if (this.byteCount === this.blockSize) {
      this.byteCount = 0;
      
      // Shift ofbV left by blockSize bytes
      this.ofbV.copyWithin(0, this.blockSize);
      
      // Append the encrypted output to feedback register
      this.ofbV.set(this.ofbOutV.subarray(0, this.blockSize), this.ofbV.length - this.blockSize);
    }
    
    return outputByte;
  }
}
