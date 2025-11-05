# SM2/SM3 TypeScript 实现计划

## 项目概述

基于 Bouncy Castle Java (bc-java) 实现 SM2 和 SM3 算法的 TypeScript 版本。

### 技术栈
- **语言**: TypeScript
- **构建工具**: tsdown
- **目标**: 纯 TypeScript 实现，不依赖 Java API

## 核心算法模块

### 1. SM3 消息摘要算法

#### 1.1 核心类
- **SM3Digest** - SM3 摘要算法主类
  - 继承自 GeneralDigest
  - 256位(32字节)输出
  - 基于 SHA-256 设计思想

#### 1.2 关键特性
- 分组长度: 512位 (64字节)
- 输出长度: 256位 (32字节)  
- 初始化向量: 8个32位字
- 压缩函数: 64轮迭代
- 布尔函数: FF0/FF1, GG0/GG1
- 置换函数: P0, P1
- 常量: T[64] 数组

#### 1.3 依赖项
```
SM3Digest
  ├── GeneralDigest (抽象基类)
  │   ├── ExtendedDigest (接口)
  │   └── Memoable (接口)
  └── Pack (字节序转换工具)
```

### 2. SM2 椭圆曲线算法

#### 2.1 核心类

##### SM2Signer - 数字签名
- **功能**: SM2 数字签名生成与验证
- **依赖算法**: SM3Digest (默认)
- **密钥类型**: ECPrivateKeyParameters, ECPublicKeyParameters

##### SM2Engine - 公钥加密
- **功能**: SM2 公钥加密与解密
- **模式**: C1C2C3 (默认) 或 C1C3C2
- **依赖算法**: SM3Digest (默认), KDF

##### SM2KeyExchange - 密钥交换
- **功能**: SM2 密钥协商协议
- **依赖算法**: SM3Digest (默认)

#### 2.2 依赖项
```
SM2Signer
  ├── Signer (接口)
  ├── ECConstants (接口)
  ├── SM3Digest
  ├── DSAEncoding (接口)
  │   └── StandardDSAEncoding
  ├── DSAKCalculator
  │   └── RandomDSAKCalculator
  ├── ECDomainParameters
  ├── ECPoint
  ├── ECMultiplier
  │   └── FixedPointCombMultiplier
  └── ECAlgorithms

SM2Engine
  ├── SM3Digest
  ├── ECDomainParameters
  ├── ECPoint
  ├── ECMultiplier
  │   └── FixedPointCombMultiplier
  ├── ECFieldElement
  └── BigInteger

SM2KeyExchange
  ├── SM3Digest
  ├── ECDomainParameters
  ├── ECPoint
  └── ECFieldElement
```

## 基础设施模块

### 3. 摘要算法基础设施

#### 3.1 接口定义
```typescript
// Digest - 摘要算法基础接口
interface Digest {
  getAlgorithmName(): string;
  getDigestSize(): number;
  update(input: number): void;
  update(input: Uint8Array, offset: number, length: number): void;
  doFinal(output: Uint8Array, offset: number): number;
  reset(): void;
}

// ExtendedDigest - 扩展摘要接口
interface ExtendedDigest extends Digest {
  getByteLength(): number;
}

// Memoable - 可记忆状态接口
interface Memoable {
  copy(): Memoable;
  reset(other: Memoable): void;
}
```

#### 3.2 抽象基类
```typescript
// GeneralDigest - MD4家族摘要算法基类
abstract class GeneralDigest implements ExtendedDigest, Memoable {
  protected abstract processWord(input: Uint8Array, offset: number): void;
  protected abstract processLength(bitLength: bigint): void;
  protected abstract processBlock(): void;
  // ... 其他方法
}
```

### 4. 椭圆曲线基础设施

#### 4.1 数学库
```
math/
  ├── ec/
  │   ├── ECPoint.ts - 椭圆曲线点
  │   ├── ECCurve.ts - 椭圆曲线
  │   ├── ECFieldElement.ts - 有限域元素
  │   ├── ECMultiplier.ts - 点乘法器接口
  │   ├── FixedPointCombMultiplier.ts - 固定点组合乘法器
  │   ├── ECAlgorithms.ts - EC算法工具
  │   └── ECConstants.ts - EC常量
  └── field/
      ├── FiniteField.ts - 有限域
      └── PrimeField.ts - 素数域
```

#### 4.2 参数类
```
crypto/params/
  ├── ECDomainParameters.ts - EC域参数
  ├── ECKeyParameters.ts - EC密钥参数基类
  ├── ECPrivateKeyParameters.ts - EC私钥参数
  ├── ECPublicKeyParameters.ts - EC公钥参数
  ├── ParametersWithRandom.ts - 带随机数的参数
  └── ParametersWithID.ts - 带ID的参数
```

### 5. 工具类

#### 5.1 大整数运算
```typescript
// BigIntegers - 大整数工具类
class BigIntegers {
  static asUnsignedByteArray(length: number, value: bigint): Uint8Array;
  static createRandomBigInteger(bitLength: number, random: SecureRandom): bigint;
  static modOddInverse(mod: bigint, value: bigint): bigint;
  // ... 其他方法
}
```

#### 5.2 字节序转换
```typescript
// Pack - 字节打包/解包工具
class Pack {
  static bigEndianToInt(bytes: Uint8Array, offset: number): number;
  static intToBigEndian(value: number, bytes: Uint8Array, offset: number): void;
  static bigEndianToLong(bytes: Uint8Array, offset: number): bigint;
  static longToBigEndian(value: bigint, bytes: Uint8Array, offset: number): void;
}
```

#### 5.3 数组操作
```typescript
// Arrays - 数组工具类
class Arrays {
  static concatenate(...arrays: Uint8Array[]): Uint8Array;
  static fill(array: Uint8Array, value: number): void;
  static areEqual(a: Uint8Array, b: Uint8Array): boolean;
}

// Bytes - 字节操作工具
class Bytes {
  static xorTo(length: number, src: Uint8Array, srcOff: number, 
               dest: Uint8Array, destOff: number): void;
}
```

### 6. 密码学服务

#### 6.1 服务接口
```typescript
// CipherParameters - 密码参数接口
interface CipherParameters {}

// Signer - 签名器接口
interface Signer {
  init(forSigning: boolean, parameters: CipherParameters): void;
  update(input: number): void;
  update(input: Uint8Array, offset: number, length: number): void;
  generateSignature(): Uint8Array;
  verifySignature(signature: Uint8Array): boolean;
  reset(): void;
}
```

#### 6.2 编码格式
```typescript
// DSAEncoding - DSA编码接口
interface DSAEncoding {
  encode(n: bigint, r: bigint, s: bigint): Uint8Array;
  decode(n: bigint, encoding: Uint8Array): [bigint, bigint];
}

// StandardDSAEncoding - 标准DSA编码实现(ASN.1 DER)
class StandardDSAEncoding implements DSAEncoding {
  // 实现ASN.1编码
}
```

#### 6.3 随机数生成
```typescript
// DSAKCalculator - DSA K值计算器接口
interface DSAKCalculator {
  init(n: bigint, random: SecureRandom): void;
  nextK(): bigint;
}

// RandomDSAKCalculator - 随机K值计算器
class RandomDSAKCalculator implements DSAKCalculator {
  // 实现随机K值生成
}

// SecureRandom - 安全随机数生成器
class SecureRandom {
  nextBytes(bytes: Uint8Array): void;
  // 使用 Web Crypto API
}
```

### 7. 异常处理

```typescript
// 异常类定义
class CryptoException extends Error {}
class DataLengthException extends CryptoException {}
class InvalidCipherTextException extends CryptoException {}
```

## 第三方依赖

### 核心依赖

#### 1. 无外部运行时依赖
- **原则**: 纯 TypeScript 实现，不依赖第三方加密库
- **原因**: 完全按照 bc-java 源码一比一复刻

#### 2. 开发依赖

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsdown": "^0.2.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

### 可选依赖（用于测试和验证）

```json
{
  "devDependencies": {
    "@noble/curves": "^1.2.0",
    "@noble/hashes": "^1.3.0"
  }
}
```
- **用途**: 仅用于测试验证结果的正确性
- **不会**: 在生产代码中使用

## 项目结构

```
sm-js-bc/
├── src/
│   ├── crypto/
│   │   ├── digests/
│   │   │   ├── Digest.ts
│   │   │   ├── ExtendedDigest.ts
│   │   │   ├── GeneralDigest.ts
│   │   │   └── SM3Digest.ts
│   │   ├── engines/
│   │   │   └── SM2Engine.ts
│   │   ├── signers/
│   │   │   ├── Signer.ts
│   │   │   ├── DSAEncoding.ts
│   │   │   ├── StandardDSAEncoding.ts
│   │   │   ├── DSAKCalculator.ts
│   │   │   ├── RandomDSAKCalculator.ts
│   │   │   └── SM2Signer.ts
│   │   ├── agreement/
│   │   │   └── SM2KeyExchange.ts
│   │   ├── params/
│   │   │   ├── ECDomainParameters.ts
│   │   │   ├── ECKeyParameters.ts
│   │   │   ├── ECPrivateKeyParameters.ts
│   │   │   ├── ECPublicKeyParameters.ts
│   │   │   ├── ParametersWithRandom.ts
│   │   │   └── ParametersWithID.ts
│   │   └── CipherParameters.ts
│   ├── math/
│   │   ├── ec/
│   │   │   ├── ECPoint.ts
│   │   │   ├── ECCurve.ts
│   │   │   ├── ECFieldElement.ts
│   │   │   ├── ECMultiplier.ts
│   │   │   ├── FixedPointCombMultiplier.ts
│   │   │   ├── ECAlgorithms.ts
│   │   │   └── ECConstants.ts
│   │   └── field/
│   │       ├── FiniteField.ts
│   │       └── PrimeField.ts
│   ├── util/
│   │   ├── BigIntegers.ts
│   │   ├── Pack.ts
│   │   ├── Arrays.ts
│   │   ├── Bytes.ts
│   │   ├── Memoable.ts
│   │   └── SecureRandom.ts
│   ├── exceptions/
│   │   ├── CryptoException.ts
│   │   ├── DataLengthException.ts
│   │   └── InvalidCipherTextException.ts
│   └── index.ts
├── test/
│   ├── crypto/
│   │   ├── digests/
│   │   │   └── SM3Digest.test.ts
│   │   ├── engines/
│   │   │   └── SM2Engine.test.ts
│   │   └── signers/
│   │       └── SM2Signer.test.ts
│   └── test-vectors/
│       ├── sm2-test-vectors.json
│       └── sm3-test-vectors.json
├── docs/
│   ├── 需求.md
│   ├── implementation-plan.md
│   └── api-reference.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## 实现优先级

### Phase 1: 基础设施 (第1-2周)
1. ✅ 异常类
2. ✅ 工具类 (Pack, Arrays, Bytes, BigIntegers)
3. ✅ 接口定义 (Digest, Memoable, CipherParameters)
4. ✅ SecureRandom

### Phase 2: SM3 实现 (第3周)
1. ✅ GeneralDigest 抽象类
2. ✅ SM3Digest 核心算法
3. ✅ SM3 单元测试

### Phase 3: 椭圆曲线基础 (第4-5周)
1. ✅ 有限域运算 (FiniteField, PrimeField)
2. ✅ ECFieldElement
3. ✅ ECPoint
4. ✅ ECCurve
5. ✅ ECMultiplier & FixedPointCombMultiplier
6. ✅ ECAlgorithms
7. ✅ EC参数类

### Phase 4: SM2 签名 (第6周)
1. ✅ DSAEncoding & StandardDSAEncoding
2. ✅ DSAKCalculator & RandomDSAKCalculator
3. ✅ SM2Signer 实现
4. ✅ SM2 签名测试

### Phase 5: SM2 加密 (第7周)
1. ✅ SM2Engine 实现
2. ✅ KDF 密钥派生
3. ✅ SM2 加密测试

### Phase 6: SM2 密钥交换 (第8周)
1. ✅ SM2KeyExchange 实现
2. ✅ SM2 密钥交换测试

### Phase 7: 集成与优化 (第9-10周)
1. ✅ 完整集成测试
2. ✅ 性能优化
3. ✅ 文档完善
4. ✅ 发布准备

## 代码规范

### 命名规范
- **类名**: PascalCase (与 Java 一致)
- **方法名**: camelCase (与 Java 一致)
- **常量**: UPPER_SNAKE_CASE (与 Java 一致)
- **私有成员**: 不使用下划线前缀 (TypeScript private 关键字)

### 注释规范
- 保留 bc-java 的所有注释
- 翻译关键算法注释为中英文双语
- 添加 TypeScript 特定的类型注释

### 类型规范
- 使用严格类型检查
- 所有公共 API 必须有完整类型定义
- 避免使用 `any` 类型

## 测试策略

### 单元测试
- 每个核心类都有对应的测试文件
- 测试覆盖率目标: >90%

### 测试向量
- 使用 bc-java 的测试向量
- 使用 GM/T 标准测试向量
- 与其他实现交叉验证

### 性能测试
- 基准测试主要算法性能
- 与 bc-java 性能对比

## 文档要求

### API 文档
- 所有公共类和方法必须有 TSDoc 注释
- 提供使用示例

### 算法文档
- 详细说明 SM2/SM3 算法原理
- 提供标准文档引用

## 质量保证

### 代码审查
- 每个 PR 需要 code review
- 确保与 bc-java 实现一致

### 持续集成
- 自动运行测试
- 代码质量检查
- 类型检查

### 安全审计
- 常量时间比较
- 安全的随机数生成
- 内存清理

## 发布计划

### v0.1.0-alpha (Phase 3 完成)
- SM3 完整实现
- 基础工具类

### v0.2.0-beta (Phase 5 完成)
- SM2 签名实现
- SM2 加密实现

### v1.0.0 (Phase 7 完成)
- 完整功能
- 完整测试
- 完整文档
