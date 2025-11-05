import { BlockCipher } from '../BlockCipher';
import { CipherParameters } from '../params/CipherParameters';
import { BlockCipherPadding } from './BlockCipherPadding';
import { DataLengthException } from '../../exceptions/DataLengthException';
import { InvalidCipherTextException } from '../../exceptions/InvalidCipherTextException';

/**
 * 带填充的缓冲块密码
 * 
 * 此类包装一个BlockCipher并应用填充，使其能够处理任意长度的数据。
 * 
 * 参考: org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher
 */
export class PaddedBufferedBlockCipher {
  private cipher: BlockCipher;
  private padding: BlockCipherPadding;
  private buf: Uint8Array;
  private bufOff: number;
  private forEncryption: boolean;

  /**
   * 构造函数
   * 
   * @param cipher - 底层块密码
   * @param padding - 填充方案
   */
  constructor(cipher: BlockCipher, padding: BlockCipherPadding) {
    this.cipher = cipher;
    this.padding = padding;
    this.buf = new Uint8Array(cipher.getBlockSize());
    this.bufOff = 0;
    this.forEncryption = false;
  }

  /**
   * 获取底层密码
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
    this.forEncryption = encrypting;
    this.reset();
    this.cipher.init(encrypting, params);
  }

  /**
   * 返回块大小
   */
  public getBlockSize(): number {
    return this.cipher.getBlockSize();
  }

  /**
   * 获取输出大小
   * 
   * @param length - 输入长度
   * @returns 输出将需要的字节数
   */
  public getOutputSize(length: number): number {
    const total = length + this.bufOff;
    const leftOver = total % this.buf.length;

    if (leftOver === 0) {
      if (this.forEncryption) {
        return total + this.buf.length;
      }
      return total;
    }

    return total - leftOver + this.buf.length;
  }

  /**
   * 获取可更新输出大小
   * 
   * @param length - 输入长度
   * @returns 更新时将产生的字节数
   */
  public getUpdateOutputSize(length: number): number {
    const total = length + this.bufOff;
    const leftOver = total % this.buf.length;
    return total - leftOver;
  }

  /**
   * 处理一个字节
   * 
   * @param input - 输入字节
   * @param output - 输出缓冲区
   * @param outOff - 输出偏移量
   * @returns 写入输出的字节数
   */
  public processByte(input: number, output: Uint8Array, outOff: number): number {
    let resultLen = 0;

    this.buf[this.bufOff++] = input;

    if (this.bufOff === this.buf.length) {
      resultLen = this.cipher.processBlock(this.buf, 0, output, outOff);
      this.bufOff = 0;
    }

    return resultLen;
  }

  /**
   * 处理字节数组
   * 
   * @param input - 输入数据
   * @param inOff - 输入偏移量
   * @param length - 要处理的字节数
   * @param output - 输出缓冲区
   * @param outOff - 输出偏移量
   * @returns 写入输出的字节数
   */
  public processBytes(
    input: Uint8Array,
    inOff: number,
    length: number,
    output: Uint8Array,
    outOff: number
  ): number {
    if (length < 0) {
      throw new Error('Cannot have a negative input length');
    }

    const blockSize = this.getBlockSize();
    const gapLen = this.buf.length - this.bufOff;

    if (length > gapLen) {
      this.buf.set(input.subarray(inOff, inOff + gapLen), this.bufOff);

      let resultLen = this.cipher.processBlock(this.buf, 0, output, outOff);

      this.bufOff = 0;
      length -= gapLen;
      inOff += gapLen;

      while (length > this.buf.length) {
        resultLen += this.cipher.processBlock(input, inOff, output, outOff + resultLen);

        length -= blockSize;
        inOff += blockSize;
      }

      this.buf.set(input.subarray(inOff, inOff + length), this.bufOff);

      this.bufOff += length;

      return resultLen;
    } else {
      this.buf.set(input.subarray(inOff, inOff + length), this.bufOff);

      this.bufOff += length;

      return 0;
    }
  }

  /**
   * 完成处理
   * 
   * @param output - 输出缓冲区
   * @param outOff - 输出偏移量
   * @returns 写入输出的字节数
   */
  public doFinal(output: Uint8Array, outOff: number): number {
    const blockSize = this.cipher.getBlockSize();
    let resultLen = 0;

    if (this.forEncryption) {
      if (this.bufOff === blockSize) {
        if (outOff + 2 * blockSize > output.length) {
          this.reset();
          throw new DataLengthException('output buffer too short');
        }

        resultLen = this.cipher.processBlock(this.buf, 0, output, outOff);
        this.bufOff = 0;
      }

      this.padding.addPadding(this.buf, this.bufOff);

      resultLen += this.cipher.processBlock(this.buf, 0, output, outOff + resultLen);

      this.reset();
    } else {
      if (this.bufOff === blockSize) {
        resultLen = this.cipher.processBlock(this.buf, 0, this.buf, 0);
        this.bufOff = 0;
      } else {
        this.reset();
        throw new DataLengthException('last block incomplete in decryption');
      }

      let count: number;
      try {
        count = this.padding.padCount(this.buf);

        resultLen -= count;

        output.set(this.buf.subarray(0, resultLen), outOff);
      } catch (e) {
        this.reset();
        if (e instanceof Error) {
          throw new InvalidCipherTextException(e.message);
        }
        throw e;
      } finally {
        this.reset();
      }
    }

    return resultLen;
  }

  /**
   * 重置密码到初始状态
   */
  public reset(): void {
    this.buf.fill(0);
    this.bufOff = 0;

    this.cipher.reset();
  }
}
