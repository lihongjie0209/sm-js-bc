# ZUC 流密码算法实现需求

## 概述

实现 ZUC 流密码算法（祖冲之算法），参考 Bouncy Castle Java 的实现。ZUC 是中国商用密码标准算法，主要用于 4G/5G 移动通信加密。

## 背景

ZUC（Zu Chongzhi）算法是一种面向序列的流密码算法，命名源自中国古代数学家祖冲之。该算法被广泛应用于 LTE（4G）和 5G 通信系统中，作为机密性和完整性保护算法。

ZUC 包含两个版本：
- **ZUC-128**: 使用 128 位密钥和 128 位初始化向量
- **ZUC-256**: 使用 256 位密钥和 184 位初始化向量（更高安全性）

## 功能需求

### 1. ZUC-128 引擎

参考：`org.bouncycastle.crypto.engines.ZUCEngine`

#### 1.1 核心结构

```typescript
/**
 * ZUC-128 流密码引擎
 */
class ZUCEngine implements StreamCipher {
  // LFSR (Linear Feedback Shift Register) - 16 个 31 位单元
  private LFSR: Uint32Array;  // [16]
  
  // R1, R2 - 32 位寄存器
  private R1: number;
  private R2: number;
  
  // 密钥流缓冲
  private keyStream: Uint32Array;
  private index: number;
}
```

#### 1.2 接口定义

```typescript
interface StreamCipher {
  /**
   * 获取算法名称
   */
  getAlgorithmName(): string;
  
  /**
   * 初始化引擎
   * @param forEncryption true 为加密，false 为解密
   * @param params 密钥参数（包含 key 和 iv）
   */
  init(forEncryption: boolean, params: CipherParameters): void;
  
  /**
   * 处理单个字节
   */
  returnByte(input: number): number;
  
  /**
   * 批量处理
   */
  processBytes(
    input: Uint8Array, 
    inOff: number, 
    len: number,
    output: Uint8Array, 
    outOff: number
  ): number;
  
  /**
   * 重置状态
   */
  reset(): void;
}
```

#### 1.3 核心算法

##### LFSR 初始化

```typescript
/**
 * 使用密钥和 IV 初始化 LFSR
 * @param key 128 位密钥
 * @param iv 128 位初始化向量
 */
private initializeLFSR(key: Uint8Array, iv: Uint8Array): void {
  // 1. 加载密钥和 IV 到 LFSR
  // 2. 执行 32 次迭代
  // 3. 丢弃前 32 个输出字
}
```

##### LFSR 更新

```typescript
/**
 * LFSR 一步更新
 * 使用本原多项式：x^31 + x^24 + x^23 + x^8 + 1
 */
private LFSRWithInitMode(u: number): void;
private LFSRWithWorkMode(): void;
```

##### 比特重组（BR）

```typescript
/**
 * 比特重组
 * 从 LFSR 中提取 4 个 32 位字
 */
private BitReorganization(): { X0: number, X1: number, X2: number, X3: number };
```

##### 非线性函数（F）

```typescript
/**
 * 非线性函数 F
 * 使用 S 盒和线性变换
 */
private F(X0: number, X1: number, X2: number): number;
```

##### S 盒

```typescript
/**
 * S 盒 S0 和 S1
 * S0: 8×8 → 8, S1: 8×8 → 8
 */
private static readonly S0: Uint8Array;  // [256]
private static readonly S1: Uint8Array;  // [256]
```

##### 线性变换

```typescript
/**
 * L1 和 L2 线性变换
 */
private L1(X: number): number;
private L2(X: number): number;
```

### 2. ZUC-256 引擎

参考：`org.bouncycastle.crypto.engines.Zuc256Engine`

#### 2.1 与 ZUC-128 的区别

```typescript
/**
 * ZUC-256 流密码引擎
 * 主要区别：
 * 1. 密钥长度：256 位（而非 128 位）
 * 2. IV 长度：184 位（而非 128 位）
 * 3. 初始化过程略有不同
 * 4. 更高的安全性
 */
class Zuc256Engine extends ZUCEngine {
  // 重写初始化方法
  init(forEncryption: boolean, params: CipherParameters): void;
}
```

#### 2.2 ZUC-256 特性

- 支持更长的密钥（256 位）
- 支持更长的 MAC 标签（128 位）
- 向后兼容 ZUC-128

### 3. ZUC-MAC (128-EIA3)

参考：`org.bouncycastle.crypto.macs.Zuc128Mac`

#### 3.1 接口定义

```typescript
/**
 * ZUC-128 消息认证码
 * 用于 LTE 的完整性保护
 */
class Zuc128Mac implements Mac {
  /**
   * 初始化 MAC
   * @param params 密钥参数（包含 key 和 iv）
   */
  init(params: CipherParameters): void;
  
  /**
   * 计算 MAC
   */
  doFinal(out: Uint8Array, outOff: number): number;
  
  /**
   * 获取 MAC 长度（32 位 = 4 字节）
   */
  getMacSize(): number;
}
```

#### 3.2 EIA3 算法

```typescript
/**
 * 3GPP EIA3 完整性算法
 * 基于 ZUC 的消息认证
 */
private computeEIA3(
  key: Uint8Array,      // 128 位密钥
  count: number,        // 32 位计数器
  bearer: number,       // 5 位承载标识
  direction: number,    // 1 位方向
  message: Uint8Array   // 消息
): number;  // 返回 32 位 MAC
```

### 4. ZUC-256-MAC

参考：`org.bouncycastle.crypto.macs.Zuc256Mac`

```typescript
/**
 * ZUC-256 消息认证码
 * 支持 32/64/128 位 MAC 长度
 */
class Zuc256Mac implements Mac {
  constructor(macBits: number = 128) {
    // macBits 可以是 32, 64, 或 128
  }
  
  getMacSize(): number {
    // 返回 macBits / 8
  }
}
```

## 技术规范

### 算法参数

#### ZUC-128

- **密钥长度**: 128 位（16 字节）
- **IV 长度**: 128 位（16 字节）
- **LFSR 大小**: 16 个 31 位单元
- **输出**: 32 位密钥字流

#### ZUC-256

- **密钥长度**: 256 位（32 字节）
- **IV 长度**: 184 位（23 字节）
- **MAC 长度**: 32/64/128 位

### 标准向量

使用以下标准的测试向量：
- **GM/T 0001-2012** - ZUC 算法标准
- **3GPP TS 35.221** - Specification of the 3GPP Confidentiality and Integrity Algorithms 128-EEA3 & 128-EIA3
- **3GPP TS 35.222** - Specification of the 3GPP Confidentiality and Integrity Algorithms 256-EEA3 & 256-EIA3

## 实现要点

### 1. 与 bc-java 保持一致

- 类名和方法与 bc-java 保持一致
- 算法流程完全一致
- 位运算操作保持一致

### 2. 性能优化

- 使用查找表（S 盒）
- 批量处理密钥流
- 避免不必要的数组复制
- 使用 TypedArray 提高性能

### 3. 安全考虑

- IV 不应重复使用
- 密钥流不应泄露
- 清理敏感数据

### 4. 特殊处理

- **大端序/小端序**: 注意字节序转换
- **位操作**: JavaScript 的位运算是 32 位有符号整数
- **31 位单元**: LFSR 使用 31 位单元，需要正确处理

## 测试要求

### 1. 单元测试

- [ ] LFSR 初始化测试
- [ ] LFSR 更新测试
- [ ] 比特重组测试
- [ ] S 盒测试
- [ ] 线性变换测试
- [ ] F 函数测试
- [ ] 密钥流生成测试
- [ ] 加密/解密测试
- [ ] MAC 计算测试
- [ ] 边界条件测试

### 2. 互操作性测试

- [ ] 与 bc-java 的 ZUCEngine 对比
- [ ] 使用 GM/T 0001-2012 标准向量
- [ ] 使用 3GPP 测试向量
- [ ] 交叉验证（JS 加密 → Java 解密）

### 3. 性能测试

- [ ] 不同数据长度的加密性能
- [ ] 与 SM4 的性能对比
- [ ] MAC 计算性能

## 依赖项

### 新增依赖

无，纯算法实现

### 已有依赖

- `KeyParameter` - 密钥参数
- `ParametersWithIV` - 带 IV 的参数
- `DataLengthException` - 异常处理

## 文件结构

```
src/crypto/engines/
  ├── ZUCEngine.ts         # ZUC-128 引擎
  └── Zuc256Engine.ts      # ZUC-256 引擎

src/crypto/macs/
  ├── Zuc128Mac.ts         # ZUC-128-MAC (EIA3)
  └── Zuc256Mac.ts         # ZUC-256-MAC

src/crypto/
  └── StreamCipher.ts      # 流密码接口

test/unit/crypto/engines/
  ├── ZUCEngine.test.ts
  └── Zuc256Engine.test.ts

test/unit/crypto/macs/
  ├── Zuc128Mac.test.ts
  └── Zuc256Mac.test.ts

test/graalvm-integration/java/src/test/java/
  ├── ZUCEngineInteropTest.java
  └── ZucMacInteropTest.java
```

## 参考资料

1. **GM/T 0001-2012** - ZUC 序列密码算法
2. **3GPP TS 35.221** - 128-EEA3 & 128-EIA3
3. **3GPP TS 35.222** - 256-EEA3 & 256-EIA3
4. **Bouncy Castle Java**
   - `org.bouncycastle.crypto.engines.ZUCEngine`
   - `org.bouncycastle.crypto.engines.Zuc256Engine`
   - `org.bouncycastle.crypto.macs.Zuc128Mac`
   - `org.bouncycastle.crypto.macs.Zuc256Mac`
5. **学术论文**
   - "The ZUC-256 Stream Cipher"
   - "ZUC: A New Stream Cipher"

## 优先级

**中** - ZUC 主要用于移动通信领域，在通用加密场景中使用较少。

## 预估工作量

- ZUC-128 引擎：4-5 天
- ZUC-256 引擎：2-3 天
- ZUC MAC：2-3 天
- 测试：3-4 天
- 文档：1-2 天
- **总计：12-17 天**

## 验收标准

- [ ] 实现 ZUC-128 和 ZUC-256 引擎
- [ ] 实现 ZUC-128-MAC 和 ZUC-256-MAC
- [ ] 通过所有单元测试
- [ ] 通过与 bc-java 的互操作测试
- [ ] 通过 GM/T 和 3GPP 标准向量
- [ ] 代码覆盖率 > 90%
- [ ] 包含完整的 TSDoc 注释
- [ ] 更新 README 和 API 文档
- [ ] 性能达到可接受水平

## 相关 Issues

- [ ] #TBD - ZUC-128 流密码实现
- [ ] #TBD - ZUC-256 流密码实现
- [ ] #TBD - ZUC-MAC 实现

## 后续工作

完成后可以支持：
- 3GPP 移动通信加密
- LTE/5G 数据加密和完整性保护
- 流密码应用场景
