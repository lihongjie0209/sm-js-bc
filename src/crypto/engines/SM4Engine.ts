import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../CipherParameters';
import { KeyParameter } from '../params/KeyParameter';
import { DataLengthException } from '../../exceptions/DataLengthException';
import { Pack } from '../../util/Pack';

/**
 * SM4 Block Cipher - SM4 is a 128 bit block cipher with a 128 bit key.
 * 
 * The implementation here is based on the document https://eprint.iacr.org/2008/329.pdf
 * by Whitfield Diffie and George Ledin, which is a translation of Prof. LU Shu-wang's original standard.
 * 
 * 标准: GB/T 32907-2016
 * 参考: org.bouncycastle.crypto.engines.SM4Engine
 */
export class SM4Engine implements BlockCipher {
  private static readonly BLOCK_SIZE = 16;

  // S盒 - 用于非线性变换
  private static readonly Sbox: Uint8Array = new Uint8Array([
    0xd6, 0x90, 0xe9, 0xfe, 0xcc, 0xe1, 0x3d, 0xb7, 0x16, 0xb6, 0x14, 0xc2, 0x28, 0xfb, 0x2c, 0x05,
    0x2b, 0x67, 0x9a, 0x76, 0x2a, 0xbe, 0x04, 0xc3, 0xaa, 0x44, 0x13, 0x26, 0x49, 0x86, 0x06, 0x99,
    0x9c, 0x42, 0x50, 0xf4, 0x91, 0xef, 0x98, 0x7a, 0x33, 0x54, 0x0b, 0x43, 0xed, 0xcf, 0xac, 0x62,
    0xe4, 0xb3, 0x1c, 0xa9, 0xc9, 0x08, 0xe8, 0x95, 0x80, 0xdf, 0x94, 0xfa, 0x75, 0x8f, 0x3f, 0xa6,
    0x47, 0x07, 0xa7, 0xfc, 0xf3, 0x73, 0x17, 0xba, 0x83, 0x59, 0x3c, 0x19, 0xe6, 0x85, 0x4f, 0xa8,
    0x68, 0x6b, 0x81, 0xb2, 0x71, 0x64, 0xda, 0x8b, 0xf8, 0xeb, 0x0f, 0x4b, 0x70, 0x56, 0x9d, 0x35,
    0x1e, 0x24, 0x0e, 0x5e, 0x63, 0x58, 0xd1, 0xa2, 0x25, 0x22, 0x7c, 0x3b, 0x01, 0x21, 0x78, 0x87,
    0xd4, 0x00, 0x46, 0x57, 0x9f, 0xd3, 0x27, 0x52, 0x4c, 0x36, 0x02, 0xe7, 0xa0, 0xc4, 0xc8, 0x9e,
    0xea, 0xbf, 0x8a, 0xd2, 0x40, 0xc7, 0x38, 0xb5, 0xa3, 0xf7, 0xf2, 0xce, 0xf9, 0x61, 0x15, 0xa1,
    0xe0, 0xae, 0x5d, 0xa4, 0x9b, 0x34, 0x1a, 0x55, 0xad, 0x93, 0x32, 0x30, 0xf5, 0x8c, 0xb1, 0xe3,
    0x1d, 0xf6, 0xe2, 0x2e, 0x82, 0x66, 0xca, 0x60, 0xc0, 0x29, 0x23, 0xab, 0x0d, 0x53, 0x4e, 0x6f,
    0xd5, 0xdb, 0x37, 0x45, 0xde, 0xfd, 0x8e, 0x2f, 0x03, 0xff, 0x6a, 0x72, 0x6d, 0x6c, 0x5b, 0x51,
    0x8d, 0x1b, 0xaf, 0x92, 0xbb, 0xdd, 0xbc, 0x7f, 0x11, 0xd9, 0x5c, 0x41, 0x1f, 0x10, 0x5a, 0xd8,
    0x0a, 0xc1, 0x31, 0x88, 0xa5, 0xcd, 0x7b, 0xbd, 0x2d, 0x74, 0xd0, 0x12, 0xb8, 0xe5, 0xb4, 0xb0,
    0x89, 0x69, 0x97, 0x4a, 0x0c, 0x96, 0x77, 0x7e, 0x65, 0xb9, 0xf1, 0x09, 0xc5, 0x6e, 0xc6, 0x84,
    0x18, 0xf0, 0x7d, 0xec, 0x3a, 0xdc, 0x4d, 0x20, 0x79, 0xee, 0x5f, 0x3e, 0xd7, 0xcb, 0x39, 0x48
  ]);

  // 系统参数 CK - 用于密钥扩展
  private static readonly CK: Int32Array = new Int32Array([
    0x00070e15, 0x1c232a31, 0x383f464d, 0x545b6269,
    0x70777e85, 0x8c939aa1, 0xa8afb6bd, 0xc4cbd2d9,
    0xe0e7eef5, 0xfc030a11, 0x181f262d, 0x343b4249,
    0x50575e65, 0x6c737a81, 0x888f969d, 0xa4abb2b9,
    0xc0c7ced5, 0xdce3eaf1, 0xf8ff060d, 0x141b2229,
    0x30373e45, 0x4c535a61, 0x686f767d, 0x848b9299,
    0xa0a7aeb5, 0xbcc3cad1, 0xd8dfe6ed, 0xf4fb0209,
    0x10171e25, 0x2c333a41, 0x484f565d, 0x646b7279
  ]);

  // 系统参数 FK - 用于密钥扩展
  private static readonly FK: Int32Array = new Int32Array([
    0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc
  ]);

  // 状态寄存器
  private readonly X: Int32Array = new Int32Array(4);

  // 轮密钥
  private rk: Int32Array | null = null;

  /**
   * Initialize the cipher.
   * 
   * @param forEncryption - true for encryption, false for decryption
   * @param params - the key parameter
   */
  public init(forEncryption: boolean, params: CipherParameters): void {
    if (!(params instanceof KeyParameter)) {
      throw new Error(
        `invalid parameter passed to SM4 init - ${params.constructor.name}`
      );
    }

    const key = params.getKey();
    if (key.length !== 16) {
      throw new Error('SM4 requires a 128 bit key');
    }

    this.rk = this.expandKey(forEncryption, key);
  }

  /**
   * Return the algorithm name.
   * 
   * @returns "SM4"
   */
  public getAlgorithmName(): string {
    return 'SM4';
  }

  /**
   * Return the block size (16 bytes).
   * 
   * @returns 16
   */
  public getBlockSize(): number {
    return SM4Engine.BLOCK_SIZE;
  }

  /**
   * Process one block of data.
   * 
   * @param input - input data
   * @param inOff - offset in input
   * @param output - output buffer
   * @param outOff - offset in output
   * @returns number of bytes processed (16)
   */
  public processBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (this.rk === null) {
      throw new Error('SM4 not initialised');
    }

    if (inOff + SM4Engine.BLOCK_SIZE > input.length) {
      throw new DataLengthException('input buffer too short');
    }

    if (outOff + SM4Engine.BLOCK_SIZE > output.length) {
      throw new DataLengthException('output buffer too short');
    }

    // 读取输入（大端序）
    this.X[0] = Pack.bigEndianToInt(input, inOff);
    this.X[1] = Pack.bigEndianToInt(input, inOff + 4);
    this.X[2] = Pack.bigEndianToInt(input, inOff + 8);
    this.X[3] = Pack.bigEndianToInt(input, inOff + 12);

    // 32 轮迭代
    for (let i = 0; i < 32; i += 4) {
      this.X[0] = this.F0(this.X, this.rk[i]);
      this.X[1] = this.F1(this.X, this.rk[i + 1]);
      this.X[2] = this.F2(this.X, this.rk[i + 2]);
      this.X[3] = this.F3(this.X, this.rk[i + 3]);
    }

    // 反序输出（大端序）
    Pack.intToBigEndian(this.X[3], output, outOff);
    Pack.intToBigEndian(this.X[2], output, outOff + 4);
    Pack.intToBigEndian(this.X[1], output, outOff + 8);
    Pack.intToBigEndian(this.X[0], output, outOff + 12);

    return SM4Engine.BLOCK_SIZE;
  }

  /**
   * Reset the cipher.
   */
  public reset(): void {
    // No internal state to reset beyond rk
  }

  /**
   * 循环左移
   * 
   * @param x - 要移位的值
   * @param bits - 移位位数
   * @returns 移位后的值
   */
  private rotateLeft(x: number, bits: number): number {
    return ((x << bits) | (x >>> (32 - bits))) | 0;
  }

  /**
   * 非线性变换 τ (tau)
   * S盒替换
   * 
   * @param A - 输入值
   * @returns 变换后的值
   */
  private tau(A: number): number {
    const b0 = (SM4Engine.Sbox[(A >>> 24) & 0xff] & 0xff) << 24;
    const b1 = (SM4Engine.Sbox[(A >>> 16) & 0xff] & 0xff) << 16;
    const b2 = (SM4Engine.Sbox[(A >>> 8) & 0xff] & 0xff) << 8;
    const b3 = SM4Engine.Sbox[A & 0xff] & 0xff;

    return (b0 | b1 | b2 | b3) | 0;
  }

  /**
   * 线性变换 L' (用于密钥扩展)
   * 
   * @param B - 输入值
   * @returns 变换后的值
   */
  private L_ap(B: number): number {
    return (B ^ this.rotateLeft(B, 13) ^ this.rotateLeft(B, 23)) | 0;
  }

  /**
   * 合成置换 T' (用于密钥扩展)
   * T'(Z) = L'(τ(Z))
   * 
   * @param Z - 输入值
   * @returns 变换后的值
   */
  private T_ap(Z: number): number {
    return this.L_ap(this.tau(Z));
  }

  /**
   * 密钥扩展算法
   * 
   * @param forEncryption - true for encryption, false for decryption
   * @param key - 128位密钥
   * @returns 32个轮密钥
   */
  private expandKey(forEncryption: boolean, key: Uint8Array): Int32Array {
    const rk = new Int32Array(32);
    const MK = new Int32Array(4);

    // 读取主密钥 MK (大端序)
    MK[0] = Pack.bigEndianToInt(key, 0);
    MK[1] = Pack.bigEndianToInt(key, 4);
    MK[2] = Pack.bigEndianToInt(key, 8);
    MK[3] = Pack.bigEndianToInt(key, 12);

    // 初始化 K
    const K = new Int32Array(4);
    K[0] = (MK[0] ^ SM4Engine.FK[0]) | 0;
    K[1] = (MK[1] ^ SM4Engine.FK[1]) | 0;
    K[2] = (MK[2] ^ SM4Engine.FK[2]) | 0;
    K[3] = (MK[3] ^ SM4Engine.FK[3]) | 0;

    if (forEncryption) {
      // 加密：正向生成轮密钥
      rk[0] = (K[0] ^ this.T_ap((K[1] ^ K[2] ^ K[3] ^ SM4Engine.CK[0]) | 0)) | 0;
      rk[1] = (K[1] ^ this.T_ap((K[2] ^ K[3] ^ rk[0] ^ SM4Engine.CK[1]) | 0)) | 0;
      rk[2] = (K[2] ^ this.T_ap((K[3] ^ rk[0] ^ rk[1] ^ SM4Engine.CK[2]) | 0)) | 0;
      rk[3] = (K[3] ^ this.T_ap((rk[0] ^ rk[1] ^ rk[2] ^ SM4Engine.CK[3]) | 0)) | 0;

      for (let i = 4; i < 32; i++) {
        rk[i] = (rk[i - 4] ^ this.T_ap((rk[i - 3] ^ rk[i - 2] ^ rk[i - 1] ^ SM4Engine.CK[i]) | 0)) | 0;
      }
    } else {
      // 解密：反向生成轮密钥
      rk[31] = (K[0] ^ this.T_ap((K[1] ^ K[2] ^ K[3] ^ SM4Engine.CK[0]) | 0)) | 0;
      rk[30] = (K[1] ^ this.T_ap((K[2] ^ K[3] ^ rk[31] ^ SM4Engine.CK[1]) | 0)) | 0;
      rk[29] = (K[2] ^ this.T_ap((K[3] ^ rk[31] ^ rk[30] ^ SM4Engine.CK[2]) | 0)) | 0;
      rk[28] = (K[3] ^ this.T_ap((rk[31] ^ rk[30] ^ rk[29] ^ SM4Engine.CK[3]) | 0)) | 0;

      for (let i = 27; i >= 0; i--) {
        rk[i] = (rk[i + 4] ^ this.T_ap((rk[i + 3] ^ rk[i + 2] ^ rk[i + 1] ^ SM4Engine.CK[31 - i]) | 0)) | 0;
      }
    }

    return rk;
  }

  /**
   * 线性变换 L (用于加密轮函数)
   * 
   * @param B - 输入值
   * @returns 变换后的值
   */
  private L(B: number): number {
    return (
      B ^
      this.rotateLeft(B, 2) ^
      this.rotateLeft(B, 10) ^
      this.rotateLeft(B, 18) ^
      this.rotateLeft(B, 24)
    ) | 0;
  }

  /**
   * 合成置换 T (用于加密轮函数)
   * T(Z) = L(τ(Z))
   * 
   * @param Z - 输入值
   * @returns 变换后的值
   */
  private T(Z: number): number {
    return this.L(this.tau(Z));
  }

  /**
   * 轮函数 F0
   * 
   * @param X - 状态数组
   * @param rk - 轮密钥
   * @returns 新的 X[0]
   */
  private F0(X: Int32Array, rk: number): number {
    return (X[0] ^ this.T((X[1] ^ X[2] ^ X[3] ^ rk) | 0)) | 0;
  }

  /**
   * 轮函数 F1
   * 
   * @param X - 状态数组
   * @param rk - 轮密钥
   * @returns 新的 X[1]
   */
  private F1(X: Int32Array, rk: number): number {
    return (X[1] ^ this.T((X[2] ^ X[3] ^ X[0] ^ rk) | 0)) | 0;
  }

  /**
   * 轮函数 F2
   * 
   * @param X - 状态数组
   * @param rk - 轮密钥
   * @returns 新的 X[2]
   */
  private F2(X: Int32Array, rk: number): number {
    return (X[2] ^ this.T((X[3] ^ X[0] ^ X[1] ^ rk) | 0)) | 0;
  }

  /**
   * 轮函数 F3
   * 
   * @param X - 状态数组
   * @param rk - 轮密钥
   * @returns 新的 X[3]
   */
  private F3(X: Int32Array, rk: number): number {
    return (X[3] ^ this.T((X[0] ^ X[1] ^ X[2] ^ rk) | 0)) | 0;
  }
}
