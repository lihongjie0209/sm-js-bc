import { GeneralDigest } from './GeneralDigest';
import { Memoable } from '../Memoable';
import { Pack } from '../../util/Pack';

/**
 * SM3 密码杂凑算法实现
 * 
 * 标准: GB/T 32905-2016
 * 参考: org.bouncycastle.crypto.digests.SM3Digest
 */
export class SM3Digest extends GeneralDigest {
  private static readonly DIGEST_LENGTH = 32;
  private static readonly BLOCK_SIZE = 64;

  // 初始值 IV
  private static readonly IV: number[] = [
    0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
    0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e
  ];

  // 常量 T（需要循环左移）
  private static readonly T: number[] = (() => {
    const T = new Array(64);
    // T[0..15]: 0x79cc4519 循环左移 i 位
    for (let i = 0; i < 16; i++) {
      const t = 0x79cc4519;
      T[i] = ((t << i) | (t >>> (32 - i))) | 0;
    }
    // T[16..63]: 0x7a879d8a 循环左移 (i % 32) 位
    for (let i = 16; i < 64; i++) {
      const n = i % 32;
      const t = 0x7a879d8a;
      T[i] = ((t << n) | (t >>> (32 - n))) | 0;
    }
    return T;
  })();

  private V: number[] = new Array(8);
  private X: number[] = new Array(68);
  private xOff: number = 0;

  constructor();
  constructor(digest: SM3Digest);
  constructor(digest?: SM3Digest) {
    super(digest);
    if (digest) {
      this.copyInSM3(digest);
    } else {
      this.resetState();
    }
  }

  public getAlgorithmName(): string {
    return 'SM3';
  }

  public getDigestSize(): number {
    return SM3Digest.DIGEST_LENGTH;
  }

  public getByteLength(): number {
    return SM3Digest.BLOCK_SIZE;
  }

  public doFinal(out: Uint8Array, outOffset: number): number {
    this.finish();

    for (let i = 0; i < 8; i++) {
      Pack.intToBigEndian(this.V[i], out, outOffset + i * 4);
    }

    this.reset();

    return SM3Digest.DIGEST_LENGTH;
  }

  public reset(): void {
    super.reset();
    this.resetState();
  }

  protected resetState(): void {
    this.V = [...SM3Digest.IV];
    this.xOff = 0;
    this.X.fill(0);
  }

  protected processWord(input: Uint8Array, offset: number): void {
    this.X[this.xOff] = Pack.bigEndianToInt(input, offset);
    this.xOff++;

    if (this.xOff >= 16) {
      this.processBlock();
    }
  }

  protected processLength(bitLength: bigint): void {
    if (this.xOff > 14) {
      // xOff == 15 -> 无法在尾部放入 64 位长度字段
      this.X[this.xOff] = 0; // 填充 0
      this.xOff++;
      this.processBlock();
    }
    
    // 用 0 填充直到倒数第二个槽位
    while (this.xOff < 14) {
      this.X[this.xOff] = 0;
      this.xOff++;
    }

    // 存储输入数据长度（以比特为单位）
    this.X[this.xOff++] = Number(bitLength >> 32n);
    this.X[this.xOff++] = Number(bitLength & 0xffffffffn);
  }

  protected processBlock(): void {
    // 消息扩展：W[0..15] 从 inwords 复制，W[16..67] 计算
    for (let j = 16; j < 68; j++) {
      const wj3 = this.X[j - 3];
      const r15 = ((wj3 << 15) | (wj3 >>> 17)) | 0;
      const wj13 = this.X[j - 13];
      const r7 = ((wj13 << 7) | (wj13 >>> 25)) | 0;
      this.X[j] = (this.P1(this.X[j - 16] ^ this.X[j - 9] ^ r15) ^ r7 ^ this.X[j - 6]) | 0;
    }

    // 压缩函数
    let A = this.V[0];
    let B = this.V[1];
    let C = this.V[2];
    let D = this.V[3];
    let E = this.V[4];
    let F = this.V[5];
    let G = this.V[6];
    let H = this.V[7];

    // 前 16 轮使用 FF0 和 GG0
    for (let j = 0; j < 16; j++) {
      const a12 = ((A << 12) | (A >>> 20)) | 0;
      const s1 = (a12 + E + SM3Digest.T[j]) | 0;
      const SS1 = ((s1 << 7) | (s1 >>> 25)) | 0;
      const SS2 = (SS1 ^ a12) | 0;
      const Wj = this.X[j];
      const W1j = (Wj ^ this.X[j + 4]) | 0;
      const TT1 = (this.FF0(A, B, C) + D + SS2 + W1j) | 0;
      const TT2 = (this.GG0(E, F, G) + H + SS1 + Wj) | 0;
      D = C;
      C = ((B << 9) | (B >>> 23)) | 0;
      B = A;
      A = TT1;
      H = G;
      G = ((F << 19) | (F >>> 13)) | 0;
      F = E;
      E = this.P0(TT2);
    }

    // 后 48 轮使用 FF1 和 GG1
    for (let j = 16; j < 64; j++) {
      const a12 = ((A << 12) | (A >>> 20)) | 0;
      const s1 = (a12 + E + SM3Digest.T[j]) | 0;
      const SS1 = ((s1 << 7) | (s1 >>> 25)) | 0;
      const SS2 = (SS1 ^ a12) | 0;
      const Wj = this.X[j];
      const W1j = (Wj ^ this.X[j + 4]) | 0;
      const TT1 = (this.FF1(A, B, C) + D + SS2 + W1j) | 0;
      const TT2 = (this.GG1(E, F, G) + H + SS1 + Wj) | 0;
      D = C;
      C = ((B << 9) | (B >>> 23)) | 0;
      B = A;
      A = TT1;
      H = G;
      G = ((F << 19) | (F >>> 13)) | 0;
      F = E;
      E = this.P0(TT2);
    }

    // 更新链接变量
    this.V[0] ^= A;
    this.V[1] ^= B;
    this.V[2] ^= C;
    this.V[3] ^= D;
    this.V[4] ^= E;
    this.V[5] ^= F;
    this.V[6] ^= G;
    this.V[7] ^= H;

    this.xOff = 0;
  }

  // 布尔函数 FF0 (用于轮 0-15)
  private FF0(X: number, Y: number, Z: number): number {
    return X ^ Y ^ Z;
  }

  // 布尔函数 FF1 (用于轮 16-63)
  private FF1(X: number, Y: number, Z: number): number {
    return (X & Y) | (X & Z) | (Y & Z);
  }

  // 布尔函数 GG0 (用于轮 0-15)
  private GG0(X: number, Y: number, Z: number): number {
    return X ^ Y ^ Z;
  }

  // 布尔函数 GG1 (用于轮 16-63)
  private GG1(X: number, Y: number, Z: number): number {
    return (X & Y) | (~X & Z);
  }

  // 置换函数 P0
  private P0(X: number): number {
    return X ^ this.rotateLeft(X, 9) ^ this.rotateLeft(X, 17);
  }

  // 置换函数 P1
  private P1(X: number): number {
    return X ^ this.rotateLeft(X, 15) ^ this.rotateLeft(X, 23);
  }

  // 循环左移
  private rotateLeft(x: number, n: number): number {
    return ((x << n) | (x >>> (32 - n))) | 0;
  }

  // Memoable 接口实现
  public copy(): Memoable {
    return new SM3Digest(this);
  }

  public resetFromMemoable(other: Memoable): void {
    if (!(other instanceof SM3Digest)) {
      throw new Error('Cannot reset from different digest type');
    }
    // 复制父类状态
    super.copyIn(other);
    // 复制 SM3 特有状态
    this.copyInSM3(other);
  }

  private copyInSM3(digest: SM3Digest): void {
    this.V = [...digest.V];
    this.X = [...digest.X];
    this.xOff = digest.xOff;
  }
}
