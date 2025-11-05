import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../params/CipherParameters';
import { DataLengthException } from '../../exceptions/DataLengthException';

/**
 * ECB (Electronic Codebook) 模式实现
 * 
 * 警告：ECB 模式不安全，不应在生产环境中使用。
 * 相同的明文块总是加密为相同的密文块，这会泄露信息模式。
 * 
 * 此实现仅用于：
 * - 与旧系统的兼容性
 * - 测试和教学目的
 * 
 * 参考: org.bouncycastle.crypto.modes.ECBBlockCipher
 */
export class ECBBlockCipher implements BlockCipher {
  private cipher: BlockCipher;
  private blockSize: number;

  constructor(cipher: BlockCipher) {
    this.cipher = cipher;
    this.blockSize = cipher.getBlockSize();
  }

  /**
   * 返回底层密码
   */
  public getUnderlyingCipher(): BlockCipher {
    return this.cipher;
  }

  /**
   * 初始化密码
   * 
   * @param encrypting - true 表示加密，false 表示解密
   * @param params - 密码参数
   */
  public init(encrypting: boolean, params: CipherParameters): void {
    this.cipher.init(encrypting, params);
  }

  /**
   * 返回算法名称
   */
  public getAlgorithmName(): string {
    return this.cipher.getAlgorithmName() + '/ECB';
  }

  /**
   * 返回块大小（字节）
   */
  public getBlockSize(): number {
    return this.blockSize;
  }

  /**
   * 处理一个数据块
   * 
   * @param input - 输入数据
   * @param inOff - 输入偏移量
   * @param output - 输出缓冲区
   * @param outOff - 输出偏移量
   * @returns 处理的字节数
   */
  public processBlock(
    input: Uint8Array,
    inOff: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (inOff + this.blockSize > input.length) {
      throw new DataLengthException('input buffer too short');
    }

    if (outOff + this.blockSize > output.length) {
      throw new DataLengthException('output buffer too short');
    }

    return this.cipher.processBlock(input, inOff, output, outOff);
  }

  /**
   * 重置密码到初始状态
   */
  public reset(): void {
    this.cipher.reset();
  }
}
