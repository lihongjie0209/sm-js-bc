import { Mac } from '../Mac';
import { Digest } from '../Digest';
import { ExtendedDigest } from '../ExtendedDigest';
import { CipherParameters } from '../params/CipherParameters';
import { KeyParameter } from '../params/KeyParameter';
import { DataLengthException } from '../../exceptions/DataLengthException';

/**
 * HMAC implementation based on a hash function (RFC 2104)
 * 
 * This implementation follows the Bouncy Castle Java design and supports
 * any underlying digest algorithm.
 * 
 * 参考: org.bouncycastle.crypto.macs.HMac
 */
export class HMac implements Mac {
  private static readonly IPAD = 0x36;
  private static readonly OPAD = 0x5C;

  private readonly digest: Digest;
  private readonly digestSize: number;
  private readonly blockLength: number;

  private inputPad: Uint8Array;
  private outputBuf: Uint8Array;

  /**
   * Create an HMAC instance with the given digest
   * 
   * @param digest - the underlying hash function (e.g., SM3Digest)
   */
  constructor(digest: Digest) {
    this.digest = digest;
    this.digestSize = digest.getDigestSize();
    
    // Get the block length from the digest
    // ExtendedDigest provides getByteLength(), fallback to 64 for basic Digest
    if (this.isExtendedDigest(digest)) {
      this.blockLength = digest.getByteLength();
    } else {
      // Default to 64 bytes (SHA-1, SHA-256, SM3)
      this.blockLength = 64;
    }

    this.inputPad = new Uint8Array(this.blockLength);
    this.outputBuf = new Uint8Array(this.blockLength + this.digestSize);
  }

  /**
   * Get the algorithm name
   * 
   * @returns the algorithm name in format "HMac/{digest-name}"
   */
  public getAlgorithmName(): string {
    return `HMac/${this.digest.getAlgorithmName()}`;
  }

  /**
   * Get the MAC size (same as the underlying digest size)
   * 
   * @returns the MAC size in bytes
   */
  public getMacSize(): number {
    return this.digestSize;
  }

  /**
   * Initialize the HMAC with a key
   * 
   * @param params - the key parameter
   * @throws Error if params is not a KeyParameter
   */
  public init(params: CipherParameters): void {
    this.digest.reset();

    if (!(params instanceof KeyParameter)) {
      throw new Error('HMac requires KeyParameter');
    }

    const key = params.getKey();
    let keyLength = key.length;

    // If the key is longer than the block size, hash it first
    if (keyLength > this.blockLength) {
      this.digest.updateArray(key, 0, keyLength);
      this.digest.doFinal(this.inputPad, 0);
      
      keyLength = this.digestSize;
    } else {
      // Copy the key to inputPad
      this.inputPad.set(key.subarray(0, keyLength), 0);
    }

    // Pad the key with zeros if necessary
    this.inputPad.fill(0, keyLength, this.blockLength);

    // Copy inputPad to outputBuf (first blockLength bytes)
    this.outputBuf.set(this.inputPad.subarray(0, this.blockLength), 0);

    // XOR the key with ipad for the input padding
    this.xorPad(this.inputPad, this.blockLength, HMac.IPAD);
    
    // XOR the key with opad for the output padding
    this.xorPad(this.outputBuf, this.blockLength, HMac.OPAD);

    // Initialize the inner hash
    this.digest.updateArray(this.inputPad, 0, this.inputPad.length);
  }

  /**
   * Type guard to check if digest is ExtendedDigest
   * 
   * @param digest - the digest to check
   * @returns true if digest implements ExtendedDigest
   */
  private isExtendedDigest(digest: Digest): digest is ExtendedDigest {
    return 'getByteLength' in digest && typeof (digest as ExtendedDigest).getByteLength === 'function';
  }

  /**
   * XOR a pad with a specific byte value
   * 
   * @param pad - the padding buffer
   * @param len - the length to XOR
   * @param n - the byte value to XOR with
   */
  private xorPad(pad: Uint8Array, len: number, n: number): void {
    for (let i = 0; i < len; i++) {
      pad[i] ^= n;
    }
  }

  /**
   * Update the MAC with a single byte
   * 
   * @param input - the input byte
   */
  public update(input: number): void {
    this.digest.update(input);
  }

  /**
   * Update the MAC with multiple bytes
   * 
   * @param input - the input byte array
   * @param inOff - the offset into the input array
   * @param len - the number of bytes to process
   */
  public updateArray(input: Uint8Array, inOff: number, len: number): void {
    this.digest.updateArray(input, inOff, len);
  }

  /**
   * Complete the MAC calculation
   * 
   * @param out - the output buffer
   * @param outOff - the offset into the output buffer
   * @returns the number of bytes written
   * @throws DataLengthException if the output buffer is too small
   */
  public doFinal(out: Uint8Array, outOff: number): number {
    if (out.length - outOff < this.digestSize) {
      throw new DataLengthException('Output buffer too small');
    }

    // Complete the inner hash: H(K ⊕ ipad || message)
    this.digest.doFinal(this.outputBuf, this.blockLength);

    // Compute the outer hash: H(K ⊕ opad || inner_hash)
    this.digest.updateArray(this.outputBuf, 0, this.blockLength + this.digestSize);
    const result = this.digest.doFinal(out, outOff);

    // Reset for next use
    // Re-initialize the inner hash with the input pad
    this.digest.updateArray(this.inputPad, 0, this.inputPad.length);

    return result;
  }

  /**
   * Reset the MAC to its initialized state
   */
  public reset(): void {
    // Reset the underlying digest
    this.digest.reset();

    // Re-initialize with the input pad (K ⊕ ipad)
    this.digest.updateArray(this.inputPad, 0, this.inputPad.length);
  }
}
