# 实现者快速入门指南

本指南面向将要实现各个功能模块的开发者或 agent。

## 📋 模块实现优先级

### 🔴 高优先级（立即开始）

#### 1. HMAC-SM3 消息认证码
- **需求文档**: [01-hmac-sm3.md](./requirements/01-hmac-sm3.md)
- **预估工期**: 2.5-3.5 天
- **难度**: ⭐⭐ (中低)
- **依赖**: SM3Digest (已完成)
- **价值**: 基础组件，广泛应用于 JWT、TLS、PBKDF2

**关键任务**:
- [ ] 实现 `Mac` 接口
- [ ] 实现 `HMac` 类（基于 SM3Digest）
- [ ] 处理密钥长度标准化
- [ ] 实现 ipad/opad XOR 运算
- [ ] 编写单元测试
- [ ] 与 bc-java 互操作测试

#### 2. PEM/PKCS#8 密钥格式支持
- **需求文档**: [04-pem-pkcs8-support.md](./requirements/04-pem-pkcs8-support.md)
- **预估工期**: 11-16 天
- **难度**: ⭐⭐⭐⭐ (高)
- **依赖**: 无（需实现 ASN.1）
- **价值**: 密钥交换和存储的标准格式

**关键任务**:
- [ ] 实现 ASN.1 DER 编解码
- [ ] 实现 PEM 读写器
- [ ] 实现 PKCS#8 PrivateKeyInfo
- [ ] 实现 PKCS#8 EncryptedPrivateKeyInfo
- [ ] 实现 SubjectPublicKeyInfo
- [ ] 实现 SM2/SM4 密钥编码器
- [ ] 定义国密算法 OID
- [ ] 与 bc-java/OpenSSL 互操作测试

### 🟠 中高优先级（Phase 2）

#### 3. X.509 证书支持
- **需求文档**: [05-x509-certificate.md](./requirements/05-x509-certificate.md)
- **预估工期**: 13-18 天
- **难度**: ⭐⭐⭐⭐⭐ (很高)
- **依赖**: PEM/PKCS#8, ASN.1
- **价值**: PKI 基础设施，企业应用必需

**关键任务**:
- [ ] 实现 X.509 证书解析
- [ ] 实现 TBSCertificate
- [ ] 实现 X509Name (DN)
- [ ] 实现 X509Extensions
- [ ] 实现证书生成器
- [ ] 实现证书验证（签名、有效期、链）
- [ ] 实现 PKCS#10 CSR
- [ ] 实现自签名证书生成
- [ ] 与 bc-java/OpenSSL 互操作测试

### 🟡 中优先级（Phase 3）

#### 4. ZUC 流密码算法
- **需求文档**: [03-zuc-stream-cipher.md](./requirements/03-zuc-stream-cipher.md)
- **预估工期**: 12-17 天
- **难度**: ⭐⭐⭐⭐ (高)
- **依赖**: 无
- **价值**: 移动通信加密（4G/5G）

**关键任务**:
- [ ] 实现 LFSR（线性反馈移位寄存器）
- [ ] 实现比特重组（BR）
- [ ] 实现非线性函数 F
- [ ] 实现 S 盒和线性变换
- [ ] 实现 ZUC-128 引擎
- [ ] 实现 ZUC-256 引擎
- [ ] 实现 ZUC-128-MAC (EIA3)
- [ ] 实现 ZUC-256-MAC
- [ ] 使用 GM/T 和 3GPP 标准向量测试
- [ ] 与 bc-java 互操作测试

#### 5. SM9 标识密码签名
- **需求文档**: [02-sm9-signature.md](./requirements/02-sm9-signature.md)
- **预估工期**: 14-19 天
- **难度**: ⭐⭐⭐⭐⭐ (很高)
- **依赖**: 无（需实现扩域和双线性对）
- **价值**: 基于身份的签名，无证书 PKI

**关键任务**:
- [ ] 实现 Fp2 扩域运算
- [ ] 实现 Fp4 扩域运算
- [ ] 实现 Fp12 扩域运算
- [ ] 实现双线性对引擎（Ate pairing）
- [ ] 实现 Miller 算法
- [ ] 实现 Final exponentiation
- [ ] 实现 H1/H2 哈希函数
- [ ] 实现 SM9 参数和曲线
- [ ] 实现主密钥生成
- [ ] 实现用户密钥生成
- [ ] 实现 SM9Signer
- [ ] 使用 GM/T 0044 标准向量测试
- [ ] 与 bc-java 互操作测试

## 📖 需求文档结构

每个需求文档包含以下章节：

1. **概述** - 简要说明功能和目标
2. **背景** - 算法/功能的背景知识
3. **功能需求** - 详细的功能描述和 API 设计
   - TypeScript 接口定义
   - 类结构设计
   - 方法签名
   - 代码示例
4. **技术规范** - 标准文档、参数定义
5. **实现要点** - 关键技术点和注意事项
6. **测试要求** - 单元测试、互操作测试、性能测试
7. **依赖项** - 新增和已有依赖
8. **文件结构** - 代码组织结构
9. **参考资料** - 标准文档和参考实现
10. **预估工作量** - 时间估算
11. **验收标准** - 完成标准

## 🔧 开发流程

### 1. 阅读需求文档

仔细阅读对应模块的需求文档，理解：
- 功能目标
- API 设计
- 技术规范
- 测试要求

### 2. 研究参考实现

- **bc-java 源码**: https://github.com/bcgit/bc-java
  - 查找对应的 Java 类
  - 理解算法逻辑
  - 参考测试用例

- **标准文档**: RFC、GM/T 系列
  - 理解标准要求
  - 查找测试向量

### 3. 设计实现方案

- 创建 TypeScript 接口/类
- 设计数据结构
- 规划测试策略
- 考虑性能优化

### 4. 实现代码

**代码规范**:
- 遵循项目的 TypeScript 编码规范
- 使用 ESM 语法（import/export）
- 添加 TSDoc 注释
- 保持与 bc-java 的 API 一致性

**文件组织**:
```
src/crypto/          # 密码学算法
src/math/            # 数学运算
src/util/            # 工具类
src/asn1/            # ASN.1 编解码
src/pkcs/            # PKCS 标准
src/x509/            # X.509 证书
```

### 5. 编写测试

**测试类型**:
- **单元测试** (test/unit/): 纯 TypeScript 测试
  - 功能测试
  - 边界测试
  - 错误处理测试

- **互操作测试** (test/graalvm-integration/): Java ↔ JavaScript
  - 与 bc-java 交叉验证
  - 标准向量测试

**测试框架**: Vitest + JUnit 5

### 6. 运行测试

```bash
# JavaScript 单元测试
npm test

# Java 互操作测试
cd test/graalvm-integration/java
mvn test

# 所有测试
node test-all.mjs
```

### 7. 文档更新

- 更新 README.md（如果有新功能）
- 添加使用示例到 example/ 目录
- 更新 CHANGELOG.md

### 8. 提交 PR

- 清晰的 commit message
- 完整的测试覆盖
- 与 bc-java 互操作验证通过

## 🧪 测试要求

### 单元测试要求

- ✅ 代码覆盖率 > 90%
- ✅ 所有公共 API 都有测试
- ✅ 覆盖边界条件
- ✅ 测试错误处理

### 互操作测试要求

- ✅ 与 bc-java 生成的数据兼容
- ✅ JavaScript 生成 → Java 验证
- ✅ Java 生成 → JavaScript 验证
- ✅ 使用标准测试向量

### 性能测试要求

- ✅ 基准测试（可选，但推荐）
- ✅ 与 bc-java 性能对比
- ✅ 无明显性能瓶颈

## 📚 参考资源

### Bouncy Castle Java
- **GitHub**: https://github.com/bcgit/bc-java
- **文档**: https://www.bouncycastle.org/documentation/documentation-java/

### 国密标准
- GM/T 0003-2012: SM2 算法
- GM/T 0004-2012: SM3 算法
- GM/T 0002-2012: SM4 算法
- GM/T 0044-2016: SM9 算法
- GM/T 0001-2012: ZUC 算法
- GM/T 0009-2012: SM2 使用规范
- GM/T 0015-2012: SM2 证书格式

### 国际标准
- RFC 5280: X.509 证书
- RFC 5208/5958: PKCS#8
- RFC 2104: HMAC
- RFC 7468: PEM 格式
- 3GPP TS 35.221/222: ZUC 规范

### 开发工具
- **TypeScript**: https://www.typescriptlang.org/
- **Vitest**: https://vitest.dev/
- **GraalVM**: https://www.graalvm.org/

## 💡 实现技巧

### 1. 从简单开始

先实现核心功能，再添加优化和错误处理。

### 2. 增量开发

每完成一个小功能就测试，不要等到全部完成。

### 3. 参考 bc-java

遇到疑问时，查看 bc-java 的实现方式。

### 4. 使用标准向量

标准测试向量是验证正确性的最佳方法。

### 5. 性能优化

在功能正确的基础上再考虑性能优化。

### 6. 文档先行

先写文档和接口，再写实现，有助于理清思路。

## ❓ 常见问题

### Q: 如何处理 JavaScript 的 BigInt 限制？

A: JavaScript 的 BigInt 支持任意精度，但位运算是 32 位。使用专门的大整数运算库或手动实现高精度运算。

### Q: 如何确保与 bc-java 的兼容性？

A: 通过 GraalVM 互操作测试，让 Java 和 JavaScript 代码相互验证。

### Q: 测试向量从哪里获取？

A: 
1. 国密标准文档附录
2. bc-java 测试用例
3. 3GPP 规范（ZUC）
4. RFC 文档（HMAC、PKCS#8 等）

### Q: 如何调试跨语言互操作问题？

A: 
1. 打印中间结果对比
2. 使用十六进制查看器检查二进制数据
3. 单步调试两边代码
4. 使用标准向量定位问题

### Q: 性能如何优化？

A:
1. 使用 TypedArray（Uint8Array, Uint32Array）
2. 缓存常用计算结果
3. 使用查找表（如 S 盒）
4. 批量处理数据
5. 避免不必要的内存分配

## 🚀 开始实现

选择一个模块开始：

1. **新手推荐**: HMAC-SM3（难度低，工期短）
2. **有经验**: PEM/PKCS#8（实用性强）
3. **挑战者**: SM9 签名（技术难度高，学习价值大）

**祝编码愉快！**

---

**问题和反馈**: 请在 GitHub Issues 中提出
**文档更新**: 2025-12-07
