import { ExtendedDigest } from '../ExtendedDigest';
import { Memoable } from '../Memoable';

/**
 * 通用摘要算法的抽象基类
 * 实现了输入缓冲、消息长度计数等通用逻辑
 * 
 * 参考: org.bouncycastle.crypto.digests.GeneralDigest
 */
export abstract class GeneralDigest implements ExtendedDigest, Memoable {
  private static readonly BYTE_LENGTH = 64;

  protected xBuf: Uint8Array;
  protected xBufOff: number;
  protected byteCount: bigint;

  /**
   * 构造函数
   * @param digest 可选的源摘要对象，用于复制状态
   */
  protected constructor(digest?: GeneralDigest) {
    if (digest) {
      this.xBuf = new Uint8Array(digest.xBuf);
      this.xBufOff = digest.xBufOff;
      this.byteCount = digest.byteCount;
    } else {
      this.xBuf = new Uint8Array(4);
      this.xBufOff = 0;
      this.byteCount = 0n;
    }
  }

  public update(input: number): void {
    this.xBuf[this.xBufOff++] = input & 0xff;

    if (this.xBufOff === this.xBuf.length) {
      this.processWord(this.xBuf, 0);
      this.xBufOff = 0;
    }

    this.byteCount += 1n;
  }

  public updateArray(input: Uint8Array, offset: number, length: number): void {
    let inOff = offset;
    const maxLen = Math.max(0, length);

    // 首先填满当前缓冲区
    let i = 0;
    if (this.xBufOff !== 0) {
      while (i < maxLen) {
        this.xBuf[this.xBufOff++] = input[inOff + i++];
        if (this.xBufOff === 4) {
          this.processWord(this.xBuf, 0);
          this.xBufOff = 0;
          break;
        }
      }
    }

    // 处理完整的字
    const limit = ((maxLen - i) & ~3) + i;
    for (; i < limit; i += 4) {
      this.processWord(input, inOff + i);
    }

    // 保存剩余字节到缓冲区
    while (i < maxLen) {
      this.xBuf[this.xBufOff++] = input[inOff + i++];
    }

    this.byteCount += BigInt(maxLen);
  }

  public finish(): void {
    const bitLength = this.byteCount << 3n;

    // 添加填充字节 0x80
    this.update(0x80);

    // 填充到只剩 8 字节的位置
    while (this.xBufOff !== 0) {
      this.update(0);
    }

    this.processLength(bitLength);
    this.processBlock();
  }

  public reset(): void {
    this.byteCount = 0n;
    this.xBufOff = 0;
    this.xBuf.fill(0);
    this.resetState();
  }

  public getByteLength(): number {
    return GeneralDigest.BYTE_LENGTH;
  }

  /**
   * 从另一个 GeneralDigest 复制状态（用于 Memoable）
   */
  protected copyIn(digest: GeneralDigest): void {
    this.xBuf = new Uint8Array(digest.xBuf);
    this.xBufOff = digest.xBufOff;
    this.byteCount = digest.byteCount;
  }

  /**
   * 复制当前对象
   */
  public abstract copy(): Memoable;

  /**
   * 从另一个对象恢复状态
   */
  public abstract resetFromMemoable(other: Memoable): void;

  /**
   * 获取算法名称
   */
  public abstract getAlgorithmName(): string;

  /**
   * 获取摘要长度
   */
  public abstract getDigestSize(): number;

  /**
   * 完成摘要计算
   */
  public abstract doFinal(out: Uint8Array, outOffset: number): number;

  /**
   * 处理一个字（4字节）
   */
  protected abstract processWord(input: Uint8Array, offset: number): void;

  /**
   * 处理消息长度
   */
  protected abstract processLength(bitLength: bigint): void;

  /**
   * 处理一个完整的块
   */
  protected abstract processBlock(): void;

  /**
   * 重置内部状态
   */
  protected abstract resetState(): void;
}
