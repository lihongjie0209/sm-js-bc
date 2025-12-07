# HMAC-SM3 实现需求

## 概述

实现基于 SM3 的 HMAC（Hash-based Message Authentication Code）算法，参考 Bouncy Castle Java 的实现。

## 背景

HMAC 是一种基于密钥的消息认证码算法，广泛用于数据完整性验证和身份认证。HMAC-SM3 是使用 SM3 作为哈希函数的 HMAC 实现，符合国密标准要求。

## 功能需求

### 1. HMac 类实现

参考：`org.bouncycastle.crypto.macs.HMac`

#### 1.1 接口定义

```typescript
interface Mac {
  /**
   * 初始化 MAC
   * @param params 密钥参数
   */
  init(params: CipherParameters): void;

  /**
   * 获取算法名称
   */
  getAlgorithmName(): string;

  /**
   * 获取 MAC 长度（字节）
   */
  getMacSize(): number;

  /**
   * 更新单个字节
   */
  update(input: number): void;

  /**
   * 批量更新
   */
  update(input: Uint8Array, inOff: number, len: number): void;

  /**
   * 完成计算，输出 MAC
   */
  doFinal(out: Uint8Array, outOff: number): number;

  /**
   * 重置状态
   */
  reset(): void;
}
```

#### 1.2 核心功能

1. **密钥处理**
   - 支持任意长度密钥
   - 密钥长度 > blockSize 时，先用 SM3 哈希
   - 密钥长度 < blockSize 时，补零到 blockSize

2. **HMAC 算法实现**
   - ipad = 0x36 重复 blockSize 次
   - opad = 0x5C 重复 blockSize 次
   - 内层哈希：H((K ⊕ ipad) || message)
   - 外层哈希：H((K ⊕ opad) || 内层哈希结果)

3. **状态管理**
   - 支持增量更新（多次调用 update）
   - 支持重置（reset 方法）
   - 支持状态复制（如果需要 Memoable）

### 2. KeyParameter 支持

参考：`org.bouncycastle.crypto.params.KeyParameter`

已实现，需确保与 HMac 兼容：
- 存储对称密钥
- 提供 getKey() 方法

## 技术规范

### 算法参数

- **Block Size**: 64 字节（SM3 的分组大小）
- **Output Size**: 32 字节（SM3 的输出大小）
- **密钥长度**: 建议 >= 32 字节，无上限

### 标准向量

使用 RFC 2104 和 GM/T 标准的测试向量进行验证。

## 实现要点

### 1. 与 bc-java 保持一致

- 类名：`HMac`（或 `HMACSHA256` 风格命名）
- 方法签名与 bc-java 保持一致
- 算法逻辑完全一致

### 2. 性能优化

- 复用 SM3Digest 实例
- 避免不必要的内存分配
- 缓存 ipad 和 opad XOR 结果

### 3. 错误处理

- 密钥为空时抛出异常
- 输出缓冲区不足时抛出 DataLengthException
- 未初始化时抛出适当异常

## 测试要求

### 1. 单元测试

- [x] 基本功能测试
  - 空消息
  - 短消息（< blockSize）
  - 长消息（> blockSize）
  - 多段更新
- [x] 密钥测试
  - 短密钥
  - 长密钥（> blockSize）
  - 特殊密钥（全 0、全 1）
- [x] 边界测试
  - 最小/最大输入
  - 重复调用 doFinal
  - reset 后重新使用

### 2. 互操作性测试

- [x] 与 bc-java 的 HMac(SM3Digest) 对比
- [x] 使用标准测试向量
- [x] 与其他 HMAC-SM3 实现对比

### 3. 性能测试

- [ ] 不同消息长度的性能
- [ ] 与纯 SM3 的性能对比
- [ ] 内存使用情况

## 依赖项

- `SM3Digest` - 已实现
- `KeyParameter` - 已实现
- `CipherParameters` - 已实现
- `DataLengthException` - 已实现

## 文件结构

```
src/crypto/macs/
  ├── Mac.ts              # Mac 接口定义
  └── HMac.ts             # HMac 实现

test/unit/crypto/macs/
  └── HMac.test.ts        # 单元测试

test/graalvm-integration/java/src/test/java/
  └── HMacInteropTest.java  # 互操作测试
```

## 参考资料

1. **RFC 2104** - HMAC: Keyed-Hashing for Message Authentication
2. **Bouncy Castle Java**
   - `org.bouncycastle.crypto.macs.HMac`
   - `org.bouncycastle.crypto.Mac`
3. **GM/T 标准** - SM3 密码杂凑算法相关文档

## 优先级

**高** - HMAC 是密码学中常用的基础组件，许多高级协议（如 TLS、JWT）都依赖它。

## 预估工作量

- 实现：1-2 天
- 测试：1 天
- 文档：0.5 天
- **总计：2.5-3.5 天**

## 验收标准

- [x] 实现所有 Mac 接口方法
- [x] 通过所有单元测试
- [x] 通过与 bc-java 的互操作测试
- [x] 通过标准测试向量
- [x] 代码覆盖率 > 90%
- [x] 包含完整的 TSDoc 注释
- [x] 更新 README 和 API 文档

## 相关 Issues

- [ ] #TBD - HMAC-SM3 实现

## 后续工作

完成后可以支持：
- PBKDF2-SM3（基于 HMAC-SM3 的密钥派生）
- JWT 签名（使用 HMAC-SM3）
- TLS 握手中的 PRF（伪随机函数）
