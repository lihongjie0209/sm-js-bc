import { StreamCipher } from '../StreamCipher';
import { CipherParameters } from '../CipherParameters';
import { KeyParameter } from '../params/KeyParameter';
import { ParametersWithIV } from '../params/ParametersWithIV';
import { DataLengthException } from '../../exceptions/DataLengthException';

/**
 * ZUC-128 Stream Cipher Engine
 * 
 * ZUC is a stream cipher algorithm designed for use in 3GPP confidentiality 
 * and integrity algorithms 128-EEA3 and 128-EIA3.
 * 
 * 标准: GM/T 0001-2012, 3GPP TS 35.221
 * 参考: org.bouncycastle.crypto.engines.ZucEngine
 */
export class ZUCEngine implements StreamCipher {
  // S-Box S0
  private static readonly S0: Uint8Array = new Uint8Array([
    0x3e, 0x72, 0x5b, 0x47, 0xca, 0xe0, 0x00, 0x33, 0x04, 0xd1, 0x54, 0x98, 0x09, 0xb9, 0x6d, 0xcb,
    0x7b, 0x1b, 0xf9, 0x32, 0xaf, 0x9d, 0x6a, 0xa5, 0xb8, 0x2d, 0xfc, 0x1d, 0x08, 0x53, 0x03, 0x90,
    0x4d, 0x4e, 0x84, 0x99, 0xe4, 0xce, 0xd9, 0x91, 0xdd, 0xb6, 0x85, 0x48, 0x8b, 0x29, 0x6e, 0xac,
    0xcd, 0xc1, 0xf8, 0x1e, 0x73, 0x43, 0x69, 0xc6, 0xb5, 0xbd, 0xfd, 0x39, 0x63, 0x20, 0xd4, 0x38,
    0x76, 0x7d, 0xb2, 0xa7, 0xcf, 0xed, 0x57, 0xc5, 0xf3, 0x2c, 0xbb, 0x14, 0x21, 0x06, 0x55, 0x9b,
    0xe3, 0xef, 0x5e, 0x31, 0x4f, 0x7f, 0x5a, 0xa4, 0x0d, 0x82, 0x51, 0x49, 0x5f, 0xba, 0x58, 0x1c,
    0x4a, 0x16, 0xd5, 0x17, 0xa8, 0x92, 0x24, 0x1f, 0x8c, 0xff, 0xd8, 0xae, 0x2e, 0x01, 0xd3, 0xad,
    0x3b, 0x4b, 0xda, 0x46, 0xeb, 0xc9, 0xde, 0x9a, 0x8f, 0x87, 0xd7, 0x3a, 0x80, 0x6f, 0x2f, 0xc8,
    0xb1, 0xb4, 0x37, 0xf7, 0x0a, 0x22, 0x13, 0x28, 0x7c, 0xcc, 0x3c, 0x89, 0xc7, 0xc3, 0x96, 0x56,
    0x07, 0xbf, 0x7e, 0xf0, 0x0b, 0x2b, 0x97, 0x52, 0x35, 0x41, 0x79, 0x61, 0xa6, 0x4c, 0x10, 0xfe,
    0xbc, 0x26, 0x95, 0x88, 0x8a, 0xb0, 0xa3, 0xfb, 0xc0, 0x18, 0x94, 0xf2, 0xe1, 0xe5, 0xe9, 0x5d,
    0xd0, 0xdc, 0x11, 0x66, 0x64, 0x5c, 0xec, 0x59, 0x42, 0x75, 0x12, 0xf5, 0x74, 0x9c, 0xaa, 0x23,
    0x0e, 0x86, 0xab, 0xbe, 0x2a, 0x02, 0xe7, 0x67, 0xe6, 0x44, 0xa2, 0x6c, 0xc2, 0x93, 0x9f, 0xf1,
    0xf6, 0xfa, 0x36, 0xd2, 0x50, 0x68, 0x9e, 0x62, 0x71, 0x15, 0x3d, 0xd6, 0x40, 0xc4, 0xe2, 0x0f,
    0x8e, 0x83, 0x77, 0x6b, 0x25, 0x05, 0x3f, 0x0c, 0x30, 0xea, 0x70, 0xb7, 0xa1, 0xe8, 0xa9, 0x65,
    0x8d, 0x27, 0x1a, 0xdb, 0x81, 0xb3, 0xa0, 0xf4, 0x45, 0x7a, 0x19, 0xdf, 0xee, 0x78, 0x34, 0x60
  ]);

  // S-Box S1
  private static readonly S1: Uint8Array = new Uint8Array([
    0x55, 0xc2, 0x63, 0x71, 0x3b, 0xc8, 0x47, 0x86, 0x9f, 0x3c, 0xda, 0x5b, 0x29, 0xaa, 0xfd, 0x77,
    0x8c, 0xc5, 0x94, 0x0c, 0xa6, 0x1a, 0x13, 0x00, 0xe3, 0xa8, 0x16, 0x72, 0x40, 0xf9, 0xf8, 0x42,
    0x44, 0x26, 0x68, 0x96, 0x81, 0xd9, 0x45, 0x3e, 0x10, 0x76, 0xc6, 0xa7, 0x8b, 0x39, 0x43, 0xe1,
    0x3a, 0xb5, 0x56, 0x2a, 0xc0, 0x6d, 0xb3, 0x05, 0x22, 0x66, 0xbf, 0xdc, 0x0b, 0xfa, 0x62, 0x48,
    0xdd, 0x20, 0x11, 0x06, 0x36, 0xc9, 0xc1, 0xcf, 0xf6, 0x27, 0x52, 0xbb, 0x69, 0xf5, 0xd4, 0x87,
    0x7f, 0x84, 0x4c, 0xd2, 0x9c, 0x57, 0xa4, 0xbc, 0x4f, 0x9a, 0xdf, 0xfe, 0xd6, 0x8d, 0x7a, 0xeb,
    0x2b, 0x53, 0xd8, 0x5c, 0xa1, 0x14, 0x17, 0xfb, 0x23, 0xd5, 0x7d, 0x30, 0x67, 0x73, 0x08, 0x09,
    0xee, 0xb7, 0x70, 0x3f, 0x61, 0xb2, 0x19, 0x8e, 0x4e, 0xe5, 0x4b, 0x93, 0x8f, 0x5d, 0xdb, 0xa9,
    0xad, 0xf1, 0xae, 0x2e, 0xcb, 0x0d, 0xfc, 0xf4, 0x2d, 0x46, 0x6e, 0x1d, 0x97, 0xe8, 0xd1, 0xe9,
    0x4d, 0x37, 0xa5, 0x75, 0x5e, 0x83, 0x9e, 0xab, 0x82, 0x9d, 0xb9, 0x1c, 0xe0, 0xcd, 0x49, 0x89,
    0x01, 0xb6, 0xbd, 0x58, 0x24, 0xa2, 0x5f, 0x38, 0x78, 0x99, 0x15, 0x90, 0x50, 0xb8, 0x95, 0xe4,
    0xd0, 0x91, 0xc7, 0xce, 0xed, 0x0f, 0xb4, 0x6f, 0xa0, 0xcc, 0xf0, 0x02, 0x4a, 0x79, 0xc3, 0xde,
    0xa3, 0xef, 0xea, 0x51, 0xe6, 0x6b, 0x18, 0xec, 0x1b, 0x2c, 0x80, 0xf7, 0x74, 0xe7, 0xff, 0x21,
    0x5a, 0x6a, 0x54, 0x1e, 0x41, 0x31, 0x92, 0x35, 0xc4, 0x33, 0x07, 0x0a, 0xba, 0x7e, 0x0e, 0x34,
    0x88, 0xb1, 0x98, 0x7c, 0xf3, 0x3d, 0x60, 0x6c, 0x7b, 0xca, 0xd3, 0x1f, 0x32, 0x65, 0x04, 0x28,
    0x64, 0xbe, 0x85, 0x9b, 0x2f, 0x59, 0x8a, 0xd7, 0xb0, 0x25, 0xac, 0xaf, 0x12, 0x03, 0xe2, 0xf2
  ]);

  // LFSR - 16 cells of 31 bits each
  private readonly LFSR: Uint32Array = new Uint32Array(16);

  // Registers R1 and R2
  private R1: number = 0;
  private R2: number = 0;

  // Key stream buffer
  private readonly keyStream: Uint32Array = new Uint32Array(2);
  private keyStreamIndex: number = 0;

  // Initialization parameters
  private initialized: boolean = false;
  private workingKey: Uint8Array | null = null;
  private workingIV: Uint8Array | null = null;

  /**
   * Initialize the cipher.
   * 
   * @param forEncryption - ignored (stream ciphers are symmetric)
   * @param params - must be ParametersWithIV containing a KeyParameter
   */
  public init(forEncryption: boolean, params: CipherParameters): void {
    let keyParam: KeyParameter;
    let iv: Uint8Array;

    if (params instanceof ParametersWithIV) {
      iv = params.getIV();
      keyParam = params.getParameters() as KeyParameter;
    } else {
      throw new Error('ZUC init parameters must include an IV (use ParametersWithIV)');
    }

    const key = keyParam.getKey();

    if (key.length !== 16) {
      throw new Error('ZUC requires a 128-bit key');
    }

    if (iv.length !== 16) {
      throw new Error('ZUC requires a 128-bit IV');
    }

    this.workingKey = new Uint8Array(key);
    this.workingIV = new Uint8Array(iv);

    this.setKeyAndIV(this.workingKey, this.workingIV);
    this.initialized = true;
  }

  /**
   * Return the algorithm name.
   * 
   * @returns "ZUC-128"
   */
  public getAlgorithmName(): string {
    return 'ZUC-128';
  }

  /**
   * Encrypt/decrypt a single byte.
   * 
   * @param input - the byte to process
   * @returns the processed byte
   */
  public returnByte(input: number): number {
    if (!this.initialized) {
      throw new Error('ZUC not initialized');
    }

    if (this.keyStreamIndex === 0) {
      this.generateKeyStream();
    }

    const out = (input ^ this.getKeyStreamByte()) & 0xff;
    return out;
  }

  /**
   * Process a block of bytes.
   * 
   * @param input - the input byte array
   * @param inOff - the offset into the input array
   * @param len - the number of bytes to process
   * @param output - the output buffer
   * @param outOff - the offset into the output array
   * @returns the number of bytes produced
   */
  public processBytes(
    input: Uint8Array,
    inOff: number,
    len: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (!this.initialized) {
      throw new Error('ZUC not initialized');
    }

    if (inOff + len > input.length) {
      throw new DataLengthException('input buffer too short');
    }

    if (outOff + len > output.length) {
      throw new DataLengthException('output buffer too short');
    }

    for (let i = 0; i < len; i++) {
      if (this.keyStreamIndex === 0) {
        this.generateKeyStream();
      }

      output[outOff + i] = (input[inOff + i] ^ this.getKeyStreamByte()) & 0xff;
    }

    return len;
  }

  /**
   * Reset the cipher.
   */
  public reset(): void {
    if (this.workingKey !== null && this.workingIV !== null) {
      this.setKeyAndIV(this.workingKey, this.workingIV);
    }
    this.initialized = this.workingKey !== null;
  }

  /**
   * Set key and IV, initialize LFSR and discard first 32 words.
   */
  private setKeyAndIV(key: Uint8Array, iv: Uint8Array): void {
    // Load key and IV into LFSR
    // The loading sequence is defined in the ZUC specification
    const d = new Uint8Array([
      0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3f
    ]);

    for (let i = 0; i < 16; i++) {
      this.LFSR[i] = this.makeU31(
        (key[i] << 23) | (d[i] << 8) | iv[i]
      );
    }

    this.R1 = 0;
    this.R2 = 0;
    this.keyStreamIndex = 0;

    // Run 32 iterations in initialization mode
    for (let i = 0; i < 32; i++) {
      const W = this.F();
      this.LFSRWithInitMode(W >>> 1);
    }

    // Generate first keystream word (discard)
    this.F();
    this.LFSRWithWorkMode();
  }

  /**
   * Make a 31-bit value from a 32-bit input by masking the MSB.
   */
  private makeU31(value: number): number {
    return value & 0x7fffffff;
  }

  /**
   * LFSR in initialization mode.
   */
  private LFSRWithInitMode(u: number): void {
    const s16 = this.LFSR[15];
    const s0 = this.LFSR[0];
    
    const v = this.makeU31(
      (s0 << 8) ^ this.mulByPow2(s0, 20) ^ 
      (s16 << 21) ^ this.mulByPow2(s16, 17) ^ 
      this.mulByPow2(s16, 15)
    );
    
    const s16mod = this.makeU31(s16 + u);
    
    // Shift LFSR
    for (let i = 0; i < 15; i++) {
      this.LFSR[i] = this.LFSR[i + 1];
    }
    
    this.LFSR[15] = this.makeU31(v + s16mod);
  }

  /**
   * LFSR in working mode.
   */
  private LFSRWithWorkMode(): void {
    const s16 = this.LFSR[15];
    const s0 = this.LFSR[0];
    
    const v = this.makeU31(
      (s0 << 8) ^ this.mulByPow2(s0, 20) ^ 
      (s16 << 21) ^ this.mulByPow2(s16, 17) ^ 
      this.mulByPow2(s16, 15)
    );
    
    // Shift LFSR
    for (let i = 0; i < 15; i++) {
      this.LFSR[i] = this.LFSR[i + 1];
    }
    
    this.LFSR[15] = this.makeU31(v + s16);
  }

  /**
   * Multiplication by 2^k in GF(2^31-1).
   */
  private mulByPow2(x: number, k: number): number {
    return ((x << k) | (x >>> (31 - k))) & 0x7fffffff;
  }

  /**
   * Bit reorganization.
   */
  private BitReorganization(): number[] {
    const X0 = ((this.LFSR[15] & 0x7fff8000) << 1) | (this.LFSR[14] & 0xffff);
    const X1 = ((this.LFSR[11] & 0xffff) << 16) | (this.LFSR[9] >>> 15);
    const X2 = ((this.LFSR[7] & 0xffff) << 16) | (this.LFSR[5] >>> 15);
    const X3 = ((this.LFSR[2] & 0xffff) << 16) | (this.LFSR[0] >>> 15);

    return [X0, X1, X2, X3];
  }

  /**
   * S-box lookup (combining S0 and S1).
   */
  private S(x: number): number {
    return (
      (ZUCEngine.S0[(x >>> 24) & 0xff] << 24) |
      (ZUCEngine.S1[(x >>> 16) & 0xff] << 16) |
      (ZUCEngine.S0[(x >>> 8) & 0xff] << 8) |
      (ZUCEngine.S1[x & 0xff])
    ) >>> 0;
  }

  /**
   * Linear transformation L1.
   */
  private L1(X: number): number {
    return (X ^ this.ROT(X, 2) ^ this.ROT(X, 10) ^ this.ROT(X, 18) ^ this.ROT(X, 24)) >>> 0;
  }

  /**
   * Linear transformation L2.
   */
  private L2(X: number): number {
    return (X ^ this.ROT(X, 8) ^ this.ROT(X, 14) ^ this.ROT(X, 22) ^ this.ROT(X, 30)) >>> 0;
  }

  /**
   * 32-bit rotation.
   */
  private ROT(x: number, n: number): number {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  /**
   * Nonlinear function F.
   */
  private F(): number {
    const [X0, X1, X2, X3] = this.BitReorganization();

    const W = (X0 ^ this.R1 ^ this.R2) >>> 0;
    const W1 = (this.R1 + X1) >>> 0;
    const W2 = this.R2 ^ X2;

    const u = this.L1((W1 << 16) | (W2 >>> 16));
    const v = this.L2((W2 << 16) | (W1 >>> 16));

    this.R1 = this.S(u);
    this.R2 = this.S(v);

    return W;
  }

  /**
   * Generate key stream words.
   */
  private generateKeyStream(): void {
    const X3_1 = this.BitReorganization()[3];
    this.keyStream[0] = this.F() ^ X3_1;
    this.LFSRWithWorkMode();
    const X3_2 = this.BitReorganization()[3];
    this.keyStream[1] = this.F() ^ X3_2;
    this.LFSRWithWorkMode();
    this.keyStreamIndex = 0;
  }

  /**
   * Get one byte from the key stream buffer.
   */
  private getKeyStreamByte(): number {
    const word = this.keyStream[this.keyStreamIndex >>> 2];
    const byteIndex = 3 - (this.keyStreamIndex & 3);
    this.keyStreamIndex = (this.keyStreamIndex + 1) & 7;
    return (word >>> (byteIndex * 8)) & 0xff;
  }
}
