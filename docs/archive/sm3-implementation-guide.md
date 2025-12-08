# SM3 实现指南

## 概述

SM3 是中国国家密码管理局发布的密码杂凑算法标准，输出 256 位（32 字节）的哈希值。

## 实现顺序

### 阶段 1: 基础工具类（必需依赖）

#### 1.1 Pack 工具类
**文件**: `src/util/Pack.ts`

**功能**: 字节序转换（大端序 Big-Endian）

**需要实现的方法**:
```typescript
class Pack {
  // 字节数组 → 32位整数
  static bigEndianToInt(bytes: Uint8Array, offset: number): number
  
  // 32位整数 → 字节数组
  static intToBigEndian(value: number, bytes: Uint8Array, offset: number): void
  
  // 字节数组 → 64位整数
  static bigEndianToLong(bytes: Uint8Array, offset: number): bigint
  
  // 64位整数 → 字节数组
  static longToBigEndian(value: bigint, bytes: Uint8Array, offset: number): void
}
```

**测试要点**:
- 正确的字节序转换
- 边界值测试（0, 最大值, 负数）
- 偏移量正确处理
- 往返转换一致性

---

### 阶段 2: 接口定义

#### 2.1 Memoable 接口
**文件**: `src/util/Memoable.ts`

```typescript
/**
 * 可记忆状态的对象接口
 * 用于保存和恢复对象状态
 */
export interface Memoable {
  /**
   * 创建当前对象的副本
   */
  copy(): Memoable;
  
  /**
   * 从另一个对象恢复状态
   */
  reset(other: Memoable): void;
}
```

#### 2.2 Digest 接口
**文件**: `src/crypto/Digest.ts`

```typescript
/**
 * 消息摘要算法基础接口
 */
export interface Digest {
  /**
   * 获取算法名称
   */
  getAlgorithmName(): string;
  
  /**
   * 获取摘要输出长度（字节）
   */
  getDigestSize(): number;
  
  /**
   * 更新摘要（单字节）
   */
  update(input: number): void;
  
  /**
   * 更新摘要（字节数组）
   */
  updateBytes(input: Uint8Array, offset: number, length: number): void;
  
  /**
   * 完成摘要计算，输出结果
   * @returns 写入的字节数
   */
  doFinal(output: Uint8Array, offset: number): number;
  
  /**
   * 重置摘要状态
   */
  reset(): void;
}
```

#### 2.3 ExtendedDigest 接口
**文件**: `src/crypto/ExtendedDigest.ts`

```typescript
import { Digest } from './Digest';

/**
 * 扩展的消息摘要接口
 */
export interface ExtendedDigest extends Digest {
  /**
   * 获取内部缓冲区长度（字节）
   */
  getByteLength(): number;
}
```

---

### 阶段 3: GeneralDigest 抽象基类

**文件**: `src/crypto/digests/GeneralDigest.ts`

**功能**: MD4 家族摘要算法的通用基类（SM3 基于 SHA-256 设计，属于此家族）

**核心成员**:
```typescript
abstract class GeneralDigest implements ExtendedDigest, Memoable {
  private static readonly BYTE_LENGTH = 64;
  
  private xBuf: Uint8Array = new Uint8Array(4);  // 4字节缓冲区
  private xBufOff: number = 0;                   // 缓冲区偏移
  private byteCount: bigint = 0n;                // 处理的总字节数
  
  // 实现 Digest 接口
  abstract getAlgorithmName(): string;
  abstract getDigestSize(): number;
  
  update(input: number): void {
    // 缓存单字节，凑够 4 字节后处理
  }
  
  updateBytes(input: Uint8Array, offset: number, length: number): void {
    // 批量处理字节
    // 1. 填充当前缓冲区
    // 2. 处理完整的 4 字节块
    // 3. 缓存剩余字节
  }
  
  doFinal(output: Uint8Array, offset: number): number {
    // 1. 完成填充（padding）
    // 2. 处理最后一块
    // 3. 重置状态
  }
  
  reset(): void {
    // 重置所有状态
  }
  
  // 保护方法，由子类实现
  protected abstract processWord(input: Uint8Array, offset: number): void;
  protected abstract processLength(bitLength: bigint): void;
  protected abstract processBlock(): void;
  
  // Memoable 接口
  abstract copy(): Memoable;
  abstract reset(other: Memoable): void;
  
  getByteLength(): number {
    return GeneralDigest.BYTE_LENGTH;
  }
}
```

**关键实现细节**:

1. **update 方法**: 将输入字节缓存到 4 字节缓冲区，满了就调用 `processWord`
2. **finish 方法**: 
   - 添加填充位（0x80）
   - 填充零直到只剩 8 字节
   - 写入消息长度（位数，64位大端序）
3. **processWord**: 读取 4 字节转为 32 位整数

---

### 阶段 4: SM3Digest 实现

**文件**: `src/crypto/digests/SM3Digest.ts`

#### 4.1 常量定义

```typescript
export class SM3Digest extends GeneralDigest {
  private static readonly DIGEST_LENGTH = 32;   // 输出长度：32字节
  private static readonly BLOCK_SIZE = 16;      // 块大小：16个32位字
  
  // 初始化向量 IV
  private static readonly IV = [
    0x7380166F, 0x4914B2B9, 0x172442D7, 0xDA8A0600,
    0xA96F30BC, 0x163138AA, 0xE38DEE4D, 0xB0FB0E4E
  ];
  
  // 常量 T (预计算的循环左移结果)
  private static readonly T = new Int32Array(64);
  
  static {
    // T[0..15] = ROTL(0x79CC4519, j)
    for (let i = 0; i < 16; i++) {
      const t = 0x79CC4519;
      SM3Digest.T[i] = (t << i) | (t >>> (32 - i));
    }
    // T[16..63] = ROTL(0x7A879D8A, j % 32)
    for (let i = 16; i < 64; i++) {
      const n = i % 32;
      const t = 0x7A879D8A;
      SM3Digest.T[i] = (t << n) | (t >>> (32 - n));
    }
  }
}
```

#### 4.2 状态变量

```typescript
private V: Int32Array = new Int32Array(8);      // 8个32位状态字
private inwords: Int32Array = new Int32Array(16); // 输入缓冲区
private xOff: number = 0;                       // 输入偏移
private W: Int32Array = new Int32Array(68);     // 消息扩展数组
```

#### 4.3 辅助函数

```typescript
/**
 * 置换函数 P0
 * P0(X) = X ⊕ (X <<< 9) ⊕ (X <<< 17)
 */
private P0(x: number): number {
  const r9 = ((x << 9) | (x >>> 23));
  const r17 = ((x << 17) | (x >>> 15));
  return x ^ r9 ^ r17;
}

/**
 * 置换函数 P1
 * P1(X) = X ⊕ (X <<< 15) ⊕ (X <<< 23)
 */
private P1(x: number): number {
  const r15 = ((x << 15) | (x >>> 17));
  const r23 = ((x << 23) | (x >>> 9));
  return x ^ r15 ^ r23;
}

/**
 * 布尔函数 FF0 (轮函数 0-15)
 * FF0(X,Y,Z) = X ⊕ Y ⊕ Z
 */
private FF0(x: number, y: number, z: number): number {
  return x ^ y ^ z;
}

/**
 * 布尔函数 FF1 (轮函数 16-63)
 * FF1(X,Y,Z) = (X ∧ Y) ∨ (X ∧ Z) ∨ (Y ∧ Z)
 */
private FF1(x: number, y: number, z: number): number {
  return (x & y) | (x & z) | (y & z);
}

/**
 * 布尔函数 GG0 (轮函数 0-15)
 * GG0(X,Y,Z) = X ⊕ Y ⊕ Z
 */
private GG0(x: number, y: number, z: number): number {
  return x ^ y ^ z;
}

/**
 * 布尔函数 GG1 (轮函数 16-63)
 * GG1(X,Y,Z) = (X ∧ Y) ∨ (¬X ∧ Z)
 */
private GG1(x: number, y: number, z: number): number {
  return (x & y) | ((~x) & z);
}
```

#### 4.4 核心压缩函数

```typescript
protected processBlock(): void {
  // 1. 消息扩展：生成 68 个字 W[0..67]
  for (let j = 0; j < 16; j++) {
    this.W[j] = this.inwords[j];
  }
  
  for (let j = 16; j < 68; j++) {
    const wj3 = this.W[j - 3];
    const r15 = ((wj3 << 15) | (wj3 >>> 17));
    const wj13 = this.W[j - 13];
    const r7 = ((wj13 << 7) | (wj13 >>> 25));
    this.W[j] = this.P1(this.W[j - 16] ^ this.W[j - 9] ^ r15) ^ r7 ^ this.W[j - 6];
  }
  
  // 2. 初始化工作变量
  let A = this.V[0];
  let B = this.V[1];
  let C = this.V[2];
  let D = this.V[3];
  let E = this.V[4];
  let F = this.V[5];
  let G = this.V[6];
  let H = this.V[7];
  
  // 3. 迭代压缩 (0-15 轮)
  for (let j = 0; j < 16; j++) {
    const a12 = ((A << 12) | (A >>> 20));
    const s1 = (a12 + E + SM3Digest.T[j]) | 0;
    const SS1 = ((s1 << 7) | (s1 >>> 25));
    const SS2 = SS1 ^ a12;
    const Wj = this.W[j];
    const W1j = Wj ^ this.W[j + 4];
    const TT1 = (this.FF0(A, B, C) + D + SS2 + W1j) | 0;
    const TT2 = (this.GG0(E, F, G) + H + SS1 + Wj) | 0;
    
    D = C;
    C = ((B << 9) | (B >>> 23));
    B = A;
    A = TT1;
    H = G;
    G = ((F << 19) | (F >>> 13));
    F = E;
    E = this.P0(TT2);
  }
  
  // 4. 迭代压缩 (16-63 轮)
  for (let j = 16; j < 64; j++) {
    const a12 = ((A << 12) | (A >>> 20));
    const s1 = (a12 + E + SM3Digest.T[j]) | 0;
    const SS1 = ((s1 << 7) | (s1 >>> 25));
    const SS2 = SS1 ^ a12;
    const Wj = this.W[j];
    const W1j = Wj ^ this.W[j + 4];
    const TT1 = (this.FF1(A, B, C) + D + SS2 + W1j) | 0;
    const TT2 = (this.GG1(E, F, G) + H + SS1 + Wj) | 0;
    
    D = C;
    C = ((B << 9) | (B >>> 23));
    B = A;
    A = TT1;
    H = G;
    G = ((F << 19) | (F >>> 13));
    F = E;
    E = this.P0(TT2);
  }
  
  // 5. 更新状态
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
```

#### 4.5 其他必需方法

```typescript
constructor() {
  super();
  this.reset();
}

getAlgorithmName(): string {
  return 'SM3';
}

getDigestSize(): number {
  return SM3Digest.DIGEST_LENGTH;
}

reset(): void {
  super.reset();
  
  // 重置为初始向量
  this.V[0] = 0x7380166F;
  this.V[1] = 0x4914B2B9;
  this.V[2] = 0x172442D7;
  this.V[3] = 0xDA8A0600;
  this.V[4] = 0xA96F30BC;
  this.V[5] = 0x163138AA;
  this.V[6] = 0xE38DEE4D;
  this.V[7] = 0xB0FB0E4E;
  
  this.xOff = 0;
}

doFinal(output: Uint8Array, offset: number): number {
  this.finish();
  
  // 输出 8 个 32 位字（大端序）
  for (let i = 0; i < 8; i++) {
    Pack.intToBigEndian(this.V[i], output, offset + i * 4);
  }
  
  this.reset();
  
  return SM3Digest.DIGEST_LENGTH;
}

protected processWord(input: Uint8Array, offset: number): void {
  this.inwords[this.xOff++] = Pack.bigEndianToInt(input, offset);
  
  if (this.xOff >= 16) {
    this.processBlock();
  }
}

protected processLength(bitLength: bigint): void {
  if (this.xOff > 14) {
    this.inwords[this.xOff] = 0;
    this.xOff++;
    this.processBlock();
  }
  
  // 填充零
  while (this.xOff < 14) {
    this.inwords[this.xOff] = 0;
    this.xOff++;
  }
  
  // 写入长度（64位，大端序）
  this.inwords[this.xOff++] = Number(bitLength >> 32n);
  this.inwords[this.xOff++] = Number(bitLength & 0xffffffffn);
}

// Memoable 实现
copy(): Memoable {
  return new SM3Digest(this);
}

reset(other: Memoable): void {
  const t = other as SM3Digest;
  super.copyIn(t);
  this.copyIn(t);
}

private copyIn(t: SM3Digest): void {
  this.V.set(t.V);
  this.inwords.set(t.inwords);
  this.xOff = t.xOff;
}
```

---

## 测试向量

### GB/T 32905-2016 标准测试向量

#### 示例 1
```typescript
输入: "abc" (616263)
输出: 66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0
```

#### 示例 2  
```typescript
输入: "abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd" (64个字符)
输出: debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732
```

#### 示例 3 (空字符串)
```typescript
输入: "" (空)
输出: 1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b
```

---

## 实施步骤

### 第 1 步：创建项目结构（5分钟）

```bash
mkdir -p src/{crypto/digests,util}
mkdir -p test/unit/{crypto/digests,util}
```

### 第 2 步：实现 Pack 工具类（30分钟）

1. 创建 `src/util/Pack.ts`
2. 实现所有方法
3. 创建 `test/unit/util/Pack.test.ts`
4. 运行测试确保通过

### 第 3 步：定义接口（15分钟）

1. `src/util/Memoable.ts`
2. `src/crypto/Digest.ts`
3. `src/crypto/ExtendedDigest.ts`

### 第 4 步：实现 GeneralDigest（1-2小时）

1. 创建 `src/crypto/digests/GeneralDigest.ts`
2. 实现所有抽象方法
3. 重点测试 `update` 和 `finish` 的填充逻辑

### 第 5 步：实现 SM3Digest（2-3小时）

1. 创建 `src/crypto/digests/SM3Digest.ts`
2. 实现压缩函数 `processBlock`
3. 实现所有辅助函数

### 第 6 步：编写测试（1-2小时）

```typescript
// test/unit/crypto/digests/SM3Digest.test.ts
import { describe, it, expect } from 'vitest';
import { SM3Digest } from '../../../../src/crypto/digests/SM3Digest';

describe('SM3Digest', () => {
  it('should hash empty string correctly', () => {
    const digest = new SM3Digest();
    const output = new Uint8Array(32);
    digest.doFinal(output, 0);
    
    const expected = '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b';
    expect(Buffer.from(output).toString('hex')).toBe(expected);
  });
  
  it('should hash "abc" correctly', () => {
    const digest = new SM3Digest();
    const input = new TextEncoder().encode('abc');
    digest.updateBytes(input, 0, input.length);
    const output = new Uint8Array(32);
    digest.doFinal(output, 0);
    
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    expect(Buffer.from(output).toString('hex')).toBe(expected);
  });
  
  it('should handle multiple updates', () => {
    const digest = new SM3Digest();
    const input1 = new TextEncoder().encode('ab');
    const input2 = new TextEncoder().encode('c');
    
    digest.updateBytes(input1, 0, input1.length);
    digest.updateBytes(input2, 0, input2.length);
    
    const output = new Uint8Array(32);
    digest.doFinal(output, 0);
    
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    expect(Buffer.from(output).toString('hex')).toBe(expected);
  });
  
  it('should be reusable after reset', () => {
    const digest = new SM3Digest();
    const input = new TextEncoder().encode('abc');
    
    // 第一次
    digest.updateBytes(input, 0, input.length);
    const output1 = new Uint8Array(32);
    digest.doFinal(output1, 0);
    
    // 第二次
    digest.updateBytes(input, 0, input.length);
    const output2 = new Uint8Array(32);
    digest.doFinal(output2, 0);
    
    expect(output1).toEqual(output2);
  });
});
```

---

## 常见问题

### Q: JavaScript 的位运算有什么要注意的？

A: JavaScript 的位运算会将数字转为 32 位有符号整数，使用 `| 0` 可以确保结果保持在 32 位范围内。

```typescript
const result = (a + b) | 0;  // 确保是32位整数
```

### Q: 循环左移怎么实现？

A: 使用左移和右移的组合：

```typescript
const rotateLeft = (x: number, n: number): number => {
  return (x << n) | (x >>> (32 - n));
};
```

注意使用无符号右移 `>>>`。

### Q: 如何调试压缩函数？

A: 可以对比 bc-java 的中间值：
1. 在 Java 版本中添加打印语句
2. 在 TypeScript 版本中添加相同的打印
3. 逐步对比每一轮的 A-H 值

---

## 预计时间

- Pack 工具类: 30 分钟
- 接口定义: 15 分钟
- GeneralDigest: 1-2 小时
- SM3Digest: 2-3 小时
- 测试: 1-2 小时
- 调试修复: 1-2 小时

**总计: 6-10 小时**

---

## 成功标准

- [x] 所有标准测试向量通过
- [x] 测试覆盖率 >95%
- [x] 支持多次 update 调用
- [x] 支持 reset 后重用
- [x] Memoable 接口正确实现
- [x] 与 bc-java 输出完全一致

开始编码吧！🚀
