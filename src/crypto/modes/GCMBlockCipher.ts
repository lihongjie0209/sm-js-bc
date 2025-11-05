import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../CipherParameters';
import { DataLengthException } from '../../exceptions/DataLengthException';
import { InvalidCipherTextException } from '../../exceptions/InvalidCipherTextException';
import { AEADParameters } from '../params/AEADParameters';
import { KeyParameter } from '../params/KeyParameter';
import { ParametersWithIV } from '../params/ParametersWithIV';
import { GCMUtil } from './gcm/GCMUtil';
import { Pack } from '../../util/Pack';
import { Arrays } from '../../util/Arrays';

/**
 * Implements Galois/Counter Mode (GCM) as detailed in NIST Special Publication 800-38D.
 * 
 * GCM is an AEAD (Authenticated Encryption with Associated Data) mode that provides:
 * - Confidentiality (encryption)
 * - Authenticity (authentication tag)
 * - Optional additional authenticated data (AAD) - data that is authenticated but not encrypted
 * 
 * Key features:
 * - Based on CTR mode for encryption
 * - Uses Galois field multiplication for authentication
 * - Produces an authentication tag to verify integrity
 * - Supports variable-length nonces (12 bytes recommended)
 * - Supports variable-length authentication tags (96-128 bits recommended)
 * 
 * @see BouncyCastle GCMBlockCipher.java
 * @see NIST SP 800-38D
 */
export class GCMBlockCipher implements BlockCipher {
  private static readonly BLOCK_SIZE = 16;
  
  private cipher: BlockCipher;
  
  // Initialization state
  private forEncryption: boolean = false;
  private initialised: boolean = false;
  private macSize: number = 16;
  private nonce: Uint8Array | null = null;
  private associatedText: Uint8Array | null = null;
  
  // GCM state
  private H: Uint8Array;           // Hash subkey (E(K, 0^128))
  private J0: Uint8Array;          // Initial counter block
  private counter: Uint8Array;     // Current counter
  private S: Uint8Array;           // Authentication state
  private S_at: Uint8Array;        // AAD authentication state
  
  // Buffering
  private bufBlock: Uint8Array;
  private bufOff: number = 0;
  private totalLength: bigint = 0n;
  
  // AAD processing
  private atBlock: Uint8Array;
  private atBlockPos: number = 0;
  private atLength: bigint = 0n;
  
  // Final state
  private macBlock: Uint8Array | null = null;
  private ciphertextBuffer: Uint8Array = new Uint8Array(0);  // For decryption: buffer all ciphertext+MAC
  private ciphertextBufferLength: number = 0;  // Actual length of buffered data
  
  /**
   * Create a GCM mode cipher.
   * 
   * @param cipher - The block cipher (must have 16-byte block size)
   */
  constructor(cipher: BlockCipher) {
    if (cipher.getBlockSize() !== GCMBlockCipher.BLOCK_SIZE) {
      throw new Error(`cipher required with a block size of ${GCMBlockCipher.BLOCK_SIZE}`);
    }
    
    this.cipher = cipher;
    this.H = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.J0 = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.counter = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.S = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.S_at = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.bufBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.atBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
  }
  
  /**
   * Get the underlying cipher.
   */
  getUnderlyingCipher(): BlockCipher {
    return this.cipher;
  }
  
  /**
   * Get the algorithm name.
   */
  getAlgorithmName(): string {
    return `${this.cipher.getAlgorithmName()}/GCM`;
  }
  
  /**
   * Get the block size (always 16 bytes for GCM).
   */
  getBlockSize(): number {
    return GCMBlockCipher.BLOCK_SIZE;
  }
  
  /**
   * Initialize the cipher.
   * 
   * @param forEncryption - True for encryption, false for decryption
   * @param params - AEADParameters or ParametersWithIV
   */
  init(forEncryption: boolean, params: CipherParameters): void {
    this.forEncryption = forEncryption;
    this.macBlock = null;
    this.initialised = true;
    
    let keyParam: KeyParameter;
    let newNonce: Uint8Array;
    
    if (params instanceof AEADParameters) {
      const aeadParams = params as AEADParameters;
      newNonce = aeadParams.getNonce();
      this.associatedText = aeadParams.getAssociatedText();
      
      const macSizeBits = aeadParams.getMacSize();
      if (macSizeBits < 32 || macSizeBits > 128 || macSizeBits % 8 !== 0) {
        throw new Error(`Invalid value for MAC size: ${macSizeBits}`);
      }
      
      this.macSize = macSizeBits / 8;
      keyParam = aeadParams.getKey();
    } else if (params instanceof ParametersWithIV) {
      const ivParams = params as ParametersWithIV;
      newNonce = ivParams.getIV();
      this.associatedText = null;
      this.macSize = 16;
      keyParam = ivParams.getParameters() as KeyParameter;
    } else {
      throw new Error('invalid parameters passed to GCM');
    }
    
    const bufLength = forEncryption 
      ? GCMBlockCipher.BLOCK_SIZE 
      : GCMBlockCipher.BLOCK_SIZE + this.macSize;
    this.bufBlock = new Uint8Array(bufLength);
    
    if (!newNonce || newNonce.length < 1) {
      throw new Error('IV must be at least 1 byte');
    }
    
    this.nonce = newNonce;
    
    // Initialize cipher and compute H = E(K, 0)
    this.cipher.init(true, keyParam);
    this.H.fill(0);
    this.cipher.processBlock(this.H, 0, this.H, 0);
    
    // Compute J0 from nonce
    this.J0.fill(0);
    if (newNonce.length === 12) {
      // Standard case: 96-bit nonce
      this.J0.set(newNonce, 0);
      this.J0[15] = 0x01;
    } else {
      // Non-standard: hash the nonce
      this.gHash(this.J0, newNonce);
      const lenBlock = new Uint8Array(16);
      Pack.longToBigEndian(BigInt(newNonce.length) * 8n, lenBlock, 8);
      this.gHashBlock(this.J0, lenBlock);
    }
    
    // Initialize state
    this.S.fill(0);
    this.S_at.fill(0);
    this.atBlock.fill(0);
    this.atBlockPos = 0;
    this.atLength = 0n;
    this.counter.set(this.J0);
    this.bufOff = 0;
    this.totalLength = 0n;
    
    // Process AAD if provided
    if (this.associatedText) {
      this.processAADBytes(this.associatedText, 0, this.associatedText.length);
    }
  }
  
  /**
   * Process additional authenticated data (AAD).
   */
  processAADBytes(aad: Uint8Array, offset: number, length: number): void {
    this.checkStatus();
    
    let inOff = offset;
    let len = length;
    
    // Fill partial block
    if (this.atBlockPos > 0) {
      const available = GCMBlockCipher.BLOCK_SIZE - this.atBlockPos;
      if (len < available) {
        this.atBlock.set(aad.subarray(inOff, inOff + len), this.atBlockPos);
        this.atBlockPos += len;
        return;
      }
      
      this.atBlock.set(aad.subarray(inOff, inOff + available), this.atBlockPos);
      this.gHashBlock(this.S_at, this.atBlock);
      this.atLength += BigInt(GCMBlockCipher.BLOCK_SIZE);
      inOff += available;
      len -= available;
      this.atBlockPos = 0;
    }
    
    // Process complete blocks
    while (len >= GCMBlockCipher.BLOCK_SIZE) {
      this.gHashBlock(this.S_at, aad.subarray(inOff, inOff + GCMBlockCipher.BLOCK_SIZE));
      this.atLength += BigInt(GCMBlockCipher.BLOCK_SIZE);
      inOff += GCMBlockCipher.BLOCK_SIZE;
      len -= GCMBlockCipher.BLOCK_SIZE;
    }
    
    // Buffer remaining bytes
    if (len > 0) {
      this.atBlock.set(aad.subarray(inOff, inOff + len), 0);
      this.atBlockPos = len;
    }
  }
  
  /**
   * Process a block of data.
   */
  processBlock(input: Uint8Array, inOff: number, output: Uint8Array, outOff: number): number {
    throw new Error('processBlock not supported for GCM mode (use processBytes and doFinal)');
  }
  
  /**
   * Process bytes of data.
   */
  processBytes(input: Uint8Array, inOff: number, len: number, output: Uint8Array, outOff: number): number {
    this.checkStatus();
    
    if (inOff + len > input.length) {
      throw new DataLengthException('Input buffer too short');
    }
    
    let resultLen = 0;
    
    if (this.forEncryption) {
      // Encryption mode: process blocks immediately
      resultLen = this.encryptBytes(input, inOff, len, output, outOff);
    } else {
      // Decryption mode: buffer all data for MAC verification in doFinal
      // For AEAD security, we must verify MAC before outputting any plaintext
      
      // Expand buffer if needed
      const newLength = this.ciphertextBufferLength + len;
      if (newLength > this.ciphertextBuffer.length) {
        const newBuffer = new Uint8Array(Math.max(newLength, this.ciphertextBuffer.length * 2));
        newBuffer.set(this.ciphertextBuffer.subarray(0, this.ciphertextBufferLength));
        this.ciphertextBuffer = newBuffer;
      }
      
      // Copy data to buffer
      this.ciphertextBuffer.set(input.subarray(inOff, inOff + len), this.ciphertextBufferLength);
      this.ciphertextBufferLength += len;
      
      resultLen = 0;  // No output until doFinal verifies MAC
    }
    
    return resultLen;
  }
  
  /**
   * Complete processing and generate/verify authentication tag.
   */
  doFinal(output: Uint8Array, outOff: number): number {
    this.checkStatus();
    
    if (this.forEncryption) {
      return this.encryptDoFinal(output, outOff);
    } else {
      return this.decryptDoFinal(output, outOff);
    }
  }
  
  /**
   * Reset the cipher to initial state.
   */
  reset(): void {
    this.S.fill(0);
    this.S_at.fill(0);
    this.atBlock.fill(0);
    this.atBlockPos = 0;
    this.atLength = 0n;
    
    if (this.J0) {
      this.counter.set(this.J0);
    }
    
    this.bufOff = 0;
    this.totalLength = 0n;
    this.macBlock = null;
    this.ciphertextBufferLength = 0;  // Clear decryption buffer (reuse allocated memory)
    
    if (this.associatedText) {
      this.processAADBytes(this.associatedText, 0, this.associatedText.length);
    }
    
    this.cipher.reset();
  }
  
  /**
   * Get the authentication tag (MAC).
   */
  getMac(): Uint8Array {
    if (!this.macBlock) {
      return new Uint8Array(this.macSize);
    }
    return new Uint8Array(this.macBlock);
  }
  
  /**
   * Get the output size for the given input length.
   */
  getOutputSize(len: number): number {
    const totalData = len + this.bufOff;
    
    if (this.forEncryption) {
      return totalData + this.macSize;
    }
    
    return totalData < this.macSize ? 0 : totalData - this.macSize;
  }
  
  // Private helper methods
  
  private checkStatus(): void {
    if (!this.initialised) {
      throw new Error('GCM cipher not initialised');
    }
  }
  
  private encryptBytes(input: Uint8Array, inOff: number, len: number, output: Uint8Array, outOff: number): number {
    let processed = 0;
    
    for (let i = 0; i < len; i++) {
      this.bufBlock[this.bufOff++] = input[inOff + i];
      
      if (this.bufOff === GCMBlockCipher.BLOCK_SIZE) {
        this.encryptBlock(this.bufBlock, output, outOff + processed);
        processed += GCMBlockCipher.BLOCK_SIZE;
        this.bufOff = 0;
      }
    }
    
    return processed;
  }
  
  private encryptBlock(block: Uint8Array, output: Uint8Array, outOff: number): void {
    // Initialize cipher state if this is the first block
    if (this.totalLength === 0n) {
      this.initCipher();
    }
    
    // Increment counter
    GCMUtil.increment(this.counter);
    
    // Encrypt counter
    const counterBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.cipher.processBlock(this.counter, 0, counterBlock, 0);
    
    // XOR with plaintext
    const ciphertext = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    for (let i = 0; i < GCMBlockCipher.BLOCK_SIZE; i++) {
      ciphertext[i] = block[i] ^ counterBlock[i];
    }
    
    // Update authentication hash with ciphertext
    this.gHashBlock(this.S, ciphertext);
    this.totalLength += BigInt(GCMBlockCipher.BLOCK_SIZE);
    
    // Output ciphertext
    output.set(ciphertext, outOff);
  }
  
  private encryptDoFinal(output: Uint8Array, outOff: number): number {
    // Initialize cipher state if not done yet (for empty or block-aligned data)
    if (this.totalLength === 0n) {
      this.initCipher();
    }
    
    let resultLen = 0;
    
    // Process any remaining bytes
    if (this.bufOff > 0) {
      // Increment counter
      GCMUtil.increment(this.counter);
      
      // Encrypt counter
      const counterBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
      this.cipher.processBlock(this.counter, 0, counterBlock, 0);
      
      // XOR with plaintext (partial block)
      const ciphertext = new Uint8Array(this.bufOff);
      for (let i = 0; i < this.bufOff; i++) {
        ciphertext[i] = this.bufBlock[i] ^ counterBlock[i];
      }
      
      // Update authentication hash (pad to block size)
      const paddedCiphertext = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
      paddedCiphertext.set(ciphertext, 0);
      this.gHashBlock(this.S, paddedCiphertext);
      this.totalLength += BigInt(this.bufOff);
      
      // Output ciphertext
      output.set(ciphertext, outOff);
      resultLen = this.bufOff;
    }
    
    // Hash the lengths
    const lenBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    Pack.longToBigEndian(this.atLength * 8n, lenBlock, 0);
    Pack.longToBigEndian(this.totalLength * 8n, lenBlock, 8);
    this.gHashBlock(this.S, lenBlock);
    
    // Compute tag: T = GCTR_K(J0, S)
    const tag = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.cipher.processBlock(this.J0, 0, tag, 0);
    GCMUtil.xor(tag, this.S);
    
    // Output tag (truncated to macSize)
    this.macBlock = new Uint8Array(this.macSize);
    this.macBlock.set(tag.subarray(0, this.macSize), 0);
    output.set(this.macBlock, outOff + resultLen);
    
    resultLen += this.macSize;
    this.reset();
    
    return resultLen;
  }
  
  private bufferBytes(input: Uint8Array, inOff: number, len: number): void {
    for (let i = 0; i < len; i++) {
      this.bufBlock[this.bufOff++] = input[inOff + i];
    }
  }
  
  private initCipher(): void {
    // Finalize AAD processing
    if (this.atBlockPos > 0) {
      this.gHashBlock(this.S_at, this.atBlock);
      this.atLength += BigInt(this.atBlockPos);
    }
    
    // Initialize S with AAD hash
    if (this.atLength > 0n) {
      this.S.set(this.S_at);
    }
  }
  
  private decryptDoFinal(output: Uint8Array, outOff: number): number {
    if (this.ciphertextBufferLength < this.macSize) {
      throw new InvalidCipherTextException('data too short');
    }
    
    // Initialize cipher state if not done yet (for empty data case)
    if (this.totalLength === 0n) {
      this.initCipher();
    }
    
    // ciphertextBuffer contains all ciphertext + MAC
    const dataLen = this.ciphertextBufferLength - this.macSize;
    const ciphertext = this.ciphertextBuffer.subarray(0, this.ciphertextBufferLength);
    
    // First, hash all ciphertext blocks for MAC computation
    let pos = 0;
    while (pos + GCMBlockCipher.BLOCK_SIZE <= dataLen) {
      const block = ciphertext.subarray(pos, pos + GCMBlockCipher.BLOCK_SIZE);
      this.gHashBlock(this.S, block);
      this.totalLength += BigInt(GCMBlockCipher.BLOCK_SIZE);
      pos += GCMBlockCipher.BLOCK_SIZE;
    }
    
    // Hash any remaining partial block
    if (pos < dataLen) {
      const paddedBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
      paddedBlock.set(ciphertext.subarray(pos, dataLen), 0);
      this.gHashBlock(this.S, paddedBlock);
      this.totalLength += BigInt(dataLen - pos);
    }
    
    // Extract the received MAC/tag from the buffer
    const receivedTag = ciphertext.subarray(dataLen, this.ciphertextBufferLength);
    
    // Hash the lengths
    const lenBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    Pack.longToBigEndian(this.atLength * 8n, lenBlock, 0);
    Pack.longToBigEndian(this.totalLength * 8n, lenBlock, 8);
    this.gHashBlock(this.S, lenBlock);
    
    // Compute expected tag
    const expectedTag = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
    this.cipher.processBlock(this.J0, 0, expectedTag, 0);
    GCMUtil.xor(expectedTag, this.S);
    
    // Verify tag (constant-time comparison)
    let tagMatch = true;
    for (let i = 0; i < this.macSize; i++) {
      if (expectedTag[i] !== receivedTag[i]) {
        tagMatch = false;
      }
    }
    
    if (!tagMatch) {
      throw new InvalidCipherTextException('mac check in GCM failed');
    }
    
    // MAC verified! Now decrypt all data
    pos = 0;
    while (pos + GCMBlockCipher.BLOCK_SIZE <= dataLen) {
      GCMUtil.increment(this.counter);
      const counterBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
      this.cipher.processBlock(this.counter, 0, counterBlock, 0);
      
      for (let i = 0; i < GCMBlockCipher.BLOCK_SIZE; i++) {
        output[outOff + pos + i] = ciphertext[pos + i] ^ counterBlock[i];
      }
      pos += GCMBlockCipher.BLOCK_SIZE;
    }
    
    // Decrypt any remaining partial block
    if (pos < dataLen) {
      GCMUtil.increment(this.counter);
      const counterBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
      this.cipher.processBlock(this.counter, 0, counterBlock, 0);
      
      for (let i = 0; i < dataLen - pos; i++) {
        output[outOff + pos + i] = ciphertext[pos + i] ^ counterBlock[i];
      }
    }
    
    this.macBlock = new Uint8Array(this.macSize);
    this.macBlock.set(receivedTag, 0);
    
    this.reset();
    return dataLen;
  }
  
  /**
   * GHASH function: multiply and XOR in Galois field.
   */
  private gHashBlock(Y: Uint8Array, X: Uint8Array | Uint8Array): void {
    GCMUtil.xor(Y, X);
    const result = GCMUtil.multiply(Y, this.H);
    Y.set(result);
  }
  
  /**
   * GHASH over multiple blocks.
   */
  private gHash(Y: Uint8Array, data: Uint8Array): void {
    let pos = 0;
    while (pos + GCMBlockCipher.BLOCK_SIZE <= data.length) {
      this.gHashBlock(Y, data.subarray(pos, pos + GCMBlockCipher.BLOCK_SIZE));
      pos += GCMBlockCipher.BLOCK_SIZE;
    }
    
    if (pos < data.length) {
      const paddedBlock = new Uint8Array(GCMBlockCipher.BLOCK_SIZE);
      paddedBlock.set(data.subarray(pos), 0);
      this.gHashBlock(Y, paddedBlock);
    }
  }
}
