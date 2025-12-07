# sm-js-bc 与 bc-java 功能对比及规划

## 📊 项目概述

本文档对比了 sm-js-bc 当前实现与 Bouncy Castle Java (bc-java) 在国密算法方面的功能差异，并规划后续实现路线图。

## ✅ 已实现功能

### SM2 - 椭圆曲线公钥密码算法

| 功能 | bc-java 包路径 | sm-js-bc 状态 | 说明 |
|------|---------------|---------------|------|
| SM2 数字签名 | `org.bouncycastle.crypto.signers.SM2Signer` | ✅ 已实现 | 完整实现，包含标准 DSA 编码 |
| SM2 公钥加密 | `org.bouncycastle.crypto.engines.SM2Engine` | ✅ 已实现 | 支持 C1C2C3 和 C1C3C2 模式 |
| SM2 密钥交换 | `org.bouncycastle.crypto.agreement.SM2KeyExchange` | ✅ 已实现 | 完整的 ECDH 协议 |
| SM2 密钥对生成 | `org.bouncycastle.crypto.generators` | ✅ 已实现 | 基于安全随机数 |
| SM2 曲线参数 | `org.bouncycastle.asn1.gm.GMNamedCurves` | ✅ 已实现 | 标准 SM2 曲线 |

### SM3 - 密码杂凑算法

| 功能 | bc-java 包路径 | sm-js-bc 状态 | 说明 |
|------|---------------|---------------|------|
| SM3 消息摘要 | `org.bouncycastle.crypto.digests.SM3Digest` | ✅ 已实现 | 256 位输出 |
| 增量更新 | `update()` 方法 | ✅ 已实现 | 支持分段哈希 |
| 状态复制 | `Memoable` 接口 | ✅ 已实现 | 支持状态保存和恢复 |

### SM4 - 分组密码算法

| 功能 | bc-java 包路径 | sm-js-bc 状态 | 说明 |
|------|---------------|---------------|------|
| SM4 引擎 | `org.bouncycastle.crypto.engines.SM4Engine` | ✅ 已实现 | 128 位密钥，16 字节块 |
| ECB 模式 | `org.bouncycastle.crypto.modes.ECBBlockCipher` | ✅ 已实现 | 电子密码本模式 |
| CBC 模式 | `org.bouncycastle.crypto.modes.CBCBlockCipher` | ✅ 已实现 | 密码分组链接模式 |
| CTR 模式 | `org.bouncycastle.crypto.modes.SICBlockCipher` | ✅ 已实现 | 计数器模式 |
| GCM 模式 | `org.bouncycastle.crypto.modes.GCMBlockCipher` | ✅ 已实现 | 伽罗瓦/计数器模式（AEAD） |
| CFB 模式 | `org.bouncycastle.crypto.modes.CFBBlockCipher` | ✅ 已实现 | 密文反馈模式 |
| OFB 模式 | `org.bouncycastle.crypto.modes.OFBBlockCipher` | ✅ 已实现 | 输出反馈模式 |
| PKCS7 填充 | `org.bouncycastle.crypto.paddings.PKCS7Padding` | ✅ 已实现 | 标准 PKCS#7 填充 |
| 零字节填充 | `org.bouncycastle.crypto.paddings.ZeroBytePadding` | ✅ 已实现 | 零填充 |

### 基础设施

| 功能 | bc-java 包路径 | sm-js-bc 状态 | 说明 |
|------|---------------|---------------|------|
| 椭圆曲线数学 | `org.bouncycastle.math.ec.*` | ✅ 已实现 | ECPoint, ECCurve, ECFieldElement |
| 大整数运算 | `org.bouncycastle.util.BigIntegers` | ✅ 已实现 | 基于 BigInt |
| 字节序转换 | `org.bouncycastle.util.Pack` | ✅ 已实现 | Pack 工具类 |
| 数组操作 | `org.bouncycastle.util.Arrays` | ✅ 已实现 | Arrays 工具类 |
| 安全随机数 | `java.security.SecureRandom` | ✅ 已实现 | 基于 Web Crypto API |
| 参数类 | `org.bouncycastle.crypto.params.*` | ✅ 已实现 | 完整的参数体系 |
| 异常处理 | `org.bouncycastle.crypto.*Exception` | ✅ 已实现 | CryptoException 体系 |

## 📝 待实现功能

### 1. HMAC-SM3 消息认证码

| 项目 | 详情 |
|------|------|
| **bc-java 参考** | `org.bouncycastle.crypto.macs.HMac` |
| **优先级** | 🔴 高 |
| **预估工期** | 2.5-3.5 天 |
| **依赖** | SM3Digest (已实现) |
| **需求文档** | [01-hmac-sm3.md](./requirements/01-hmac-sm3.md) |
| **应用场景** | - JWT 签名<br>- TLS 握手<br>- PBKDF2 密钥派生 |

**关键实现点**:
- 实现 Mac 接口
- 密钥处理（长度标准化）
- ipad/opad XOR 运算
- 支持增量更新

### 2. SM9 标识密码算法

#### 2.1 SM9 签名

| 项目 | 详情 |
|------|------|
| **bc-java 参考** | `org.bouncycastle.crypto.signers.SM9Signer` |
| **优先级** | 🟡 中 |
| **预估工期** | 14-19 天 |
| **依赖** | 扩域运算、双线性对 |
| **需求文档** | [02-sm9-signature.md](./requirements/02-sm9-signature.md) |
| **应用场景** | - 基于身份的签名<br>- 无证书 PKI<br>- 物联网认证 |

**关键实现点**:
- Fp2/Fp4/Fp12 扩域运算
- 双线性对（Ate/Optimal Ate pairing）
- H1/H2 哈希函数
- Miller 算法和 Final exponentiation
- 主密钥和用户密钥生成

#### 2.2 SM9 加密（未包含在当前需求）

| 项目 | 详情 |
|------|------|
| **bc-java 参考** | `org.bouncycastle.crypto.engines.SM9Engine` |
| **优先级** | 🟡 中低 |
| **预估工期** | 10-14 天 |
| **依赖** | SM9 签名基础设施 |
| **应用场景** | - 基于身份的加密<br>- 端到端加密 |

#### 2.3 SM9 密钥交换（未包含在当前需求）

| 项目 | 详情 |
|------|------|
| **bc-java 参考** | `org.bouncycastle.crypto.agreement.SM9KeyAgreement` |
| **优先级** | 🟡 中低 |
| **预估工期** | 8-12 天 |
| **依赖** | SM9 签名基础设施 |
| **应用场景** | - 密钥协商<br>- 会话密钥建立 |

### 3. ZUC 流密码算法

| 项目 | 详情 |
|------|------|
| **bc-java 参考** | `org.bouncycastle.crypto.engines.ZUCEngine`<br>`org.bouncycastle.crypto.macs.Zuc128Mac` |
| **优先级** | 🟡 中 |
| **预估工期** | 12-17 天 |
| **依赖** | 无（纯算法实现） |
| **需求文档** | [03-zuc-stream-cipher.md](./requirements/03-zuc-stream-cipher.md) |
| **应用场景** | - 4G/5G 通信加密<br>- 移动数据保护<br>- 流式数据加密 |

**关键实现点**:
- LFSR（线性反馈移位寄存器）
- 比特重组（BR）
- 非线性函数 F
- S 盒和线性变换
- ZUC-128 和 ZUC-256
- EIA3 MAC 算法

### 4. PEM/PKCS#8 密钥格式支持

| 项目 | 详情 |
|------|------|
| **bc-java 参考** | `org.bouncycastle.util.io.pem.*`<br>`org.bouncycastle.pkcs.*` |
| **优先级** | 🔴 高 |
| **预估工期** | 11-16 天 |
| **依赖** | ASN.1 编解码 |
| **需求文档** | [04-pem-pkcs8-support.md](./requirements/04-pem-pkcs8-support.md) |
| **应用场景** | - 密钥导入/导出<br>- 与其他工具互操作<br>- 密钥存储 |

**关键实现点**:
- PEM 编码/解码（Base64 + 边界标记）
- ASN.1 DER 编解码
- PKCS#8 PrivateKeyInfo
- PKCS#8 EncryptedPrivateKeyInfo
- SubjectPublicKeyInfo
- SM2/SM4 密钥编码器
- 国密算法 OID 定义

### 5. X.509 证书支持

| 项目 | 详情 |
|------|------|
| **bc-java 参考** | `org.bouncycastle.asn1.x509.*`<br>`org.bouncycastle.cert.*` |
| **优先级** | 🟠 中高 |
| **预估工期** | 13-18 天 |
| **依赖** | PEM/PKCS#8, ASN.1 |
| **需求文档** | [05-x509-certificate.md](./requirements/05-x509-certificate.md) |
| **应用场景** | - PKI 基础设施<br>- TLS/SSL<br>- 代码签名<br>- 电子邮件加密 |

**关键实现点**:
- X.509 证书解析（TBSCertificate）
- 证书生成和签名
- 证书验证（签名、有效期、链）
- X.509 扩展（KeyUsage, BasicConstraints 等）
- PKCS#10 CSR（证书请求）
- 自签名证书生成
- GM/T 0015 合规性

## 🗂️ bc-java 其他功能（未纳入当前规划）

以下功能在 bc-java 中存在，但当前未纳入 sm-js-bc 的实现计划：

### 低优先级功能

1. **CRL（证书吊销列表）**
   - `org.bouncycastle.asn1.x509.CRLDistPoint`
   - 需要：X.509 基础

2. **OCSP（在线证书状态协议）**
   - `org.bouncycastle.cert.ocsp.*`
   - 需要：X.509 基础

3. **时间戳协议（TSP）**
   - `org.bouncycastle.tsp.*`
   - 应用：可信时间戳

4. **CMS（加密消息语法）**
   - `org.bouncycastle.cms.*`
   - 应用：S/MIME, 数据封装

5. **TLS 协议**
   - `org.bouncycastle.tls.*`
   - 应用：GMSSL, TLS 1.3

6. **密钥库（Keystore）**
   - JKS, PKCS#12 格式
   - 应用：密钥管理

### 非国密算法（不在范围内）

sm-js-bc 专注于国密算法，不计划实现以下算法：

- RSA 系列
- AES 系列
- SHA 系列
- ECC 非 SM2 曲线（如 secp256k1）
- 其他国际标准算法

## 📅 实施路线图

### Phase 1: 基础增强（优先级：高）
**预计工期**: 13.5-19.5 天

1. **HMAC-SM3** (2.5-3.5天)
   - 实现 Mac 接口
   - HMAC 算法逻辑
   - 与 bc-java 互操作测试

2. **PEM/PKCS#8** (11-16天)
   - PEM 编码/解码
   - ASN.1 基础设施
   - PKCS#8 密钥格式
   - SM2/SM4 密钥编码器

**里程碑**: 完成基础密码学组件和密钥管理

### Phase 2: PKI 支持（优先级：中高）
**预计工期**: 13-18 天

3. **X.509 证书** (13-18天)
   - 证书解析
   - 证书生成
   - 证书验证
   - PKCS#10 CSR

**里程碑**: 支持完整的 PKI 功能

### Phase 3: 高级算法（优先级：中）
**预计工期**: 26-36 天

4. **ZUC 流密码** (12-17天)
   - ZUC-128/256 引擎
   - ZUC-MAC (EIA3)
   - 3GPP 标准向量测试

5. **SM9 签名** (14-19天)
   - 扩域运算（Fp2/Fp4/Fp12）
   - 双线性对引擎
   - SM9 签名器
   - 标准向量测试

**里程碑**: 完成所有主要国密算法

### Phase 4: 生态完善（未来规划）
**预计工期**: TBD

6. **SM9 加密** (10-14天)
7. **SM9 密钥交换** (8-12天)
8. **CRL/OCSP** (待定)
9. **TLS 支持** (待定)
10. **工具和优化** (持续)

## 📊 功能对比总结

| 类别 | bc-java | sm-js-bc | 差距 |
|------|---------|----------|------|
| **SM2 算法** | ✅ 完整 | ✅ 完整 | 无 |
| **SM3 算法** | ✅ 完整 | ✅ 基础 | HMAC |
| **SM4 算法** | ✅ 完整 | ✅ 完整 | 无 |
| **SM9 算法** | ✅ 完整 | ❌ 未实现 | 签名/加密/密钥交换 |
| **ZUC 算法** | ✅ 完整 | ❌ 未实现 | ZUC-128/256 + MAC |
| **密钥格式** | ✅ 完整 | ❌ 未实现 | PEM/PKCS#8 |
| **证书支持** | ✅ 完整 | ❌ 未实现 | X.509/CSR |
| **基础设施** | ✅ 完整 | ✅ 完整 | 无 |

### 完成度评估

- **核心算法**: 75% (3/4)
  - ✅ SM2: 100%
  - ✅ SM3: 80% (缺 HMAC)
  - ✅ SM4: 100%
  - ❌ SM9: 0%
  - ❌ ZUC: 0%

- **基础设施**: 60% (3/5)
  - ✅ 椭圆曲线数学: 100%
  - ✅ 工具类: 100%
  - ✅ 参数类: 100%
  - ❌ 密钥格式: 0%
  - ❌ 证书支持: 0%

- **总体完成度**: ~68%

## 🎯 目标设定

### 短期目标（1-2 个月）
- ✅ 完成 HMAC-SM3
- ✅ 完成 PEM/PKCS#8 支持
- 达成 ~75% 完成度

### 中期目标（3-4 个月）
- ✅ 完成 X.509 证书支持
- ✅ 完成 ZUC 流密码
- 达成 ~85% 完成度

### 长期目标（5-6 个月）
- ✅ 完成 SM9 签名
- ⏭️ 启动 SM9 加密和密钥交换
- 达成 ~95% 完成度

## 📈 价值分析

### 高价值功能（应优先实现）
1. **HMAC-SM3** - 基础组件，广泛应用
2. **PEM/PKCS#8** - 互操作性必需
3. **X.509** - PKI 基础，企业应用

### 中等价值功能
4. **ZUC** - 特定领域（移动通信）
5. **SM9** - 新兴技术，应用较少

### 低价值功能（可延后）
- CRL/OCSP - 复杂度高，应用场景有限
- TLS - 可使用现有库配合
- 其他非核心功能

## 🤝 贡献方式

### 如何参与

每个功能模块将创建独立的 PR，包含：
1. **需求说明** - 详细的功能需求文档
2. **接口设计** - TypeScript 接口定义
3. **实现计划** - 技术方案和实现步骤
4. **测试要求** - 单元测试和互操作测试

实现工作将由其他 agent 或开发者完成。

### PR 创建清单

- [ ] Phase 1.1: HMAC-SM3 实现
- [ ] Phase 1.2: PEM/PKCS#8 支持
- [ ] Phase 2: X.509 证书支持
- [ ] Phase 3.1: ZUC 流密码
- [ ] Phase 3.2: SM9 签名算法

## 📚 参考资源

### Bouncy Castle Java
- **GitHub**: https://github.com/bcgit/bc-java
- **文档**: https://www.bouncycastle.org/documentation/documentation-java/
- **下载**: https://www.bouncycastle.org/download/bouncy-castle-java/

### 国密标准
- **GM/T 0003-2012**: SM2 椭圆曲线公钥密码算法
- **GM/T 0004-2012**: SM3 密码杂凑算法
- **GM/T 0002-2012**: SM4 分组密码算法
- **GM/T 0044-2016**: SM9 标识密码算法
- **GM/T 0001-2012**: ZUC 序列密码算法
- **GM/T 0009-2012**: SM2 密码算法使用规范
- **GM/T 0015-2012**: SM2 数字证书格式规范

### 国际标准
- **RFC 5280**: X.509 Certificate Profile
- **RFC 5208**: PKCS #8
- **RFC 2104**: HMAC
- **3GPP TS 35.221/222**: ZUC/EIA3 规范

## 📝 变更日志

### 2025-12-07
- 创建功能对比和规划文档
- 完成 5 个需求文档
  - HMAC-SM3
  - SM9 签名
  - ZUC 流密码
  - PEM/PKCS#8
  - X.509 证书
- 制定实施路线图

---

**文档维护者**: lihongjie0209
**最后更新**: 2025-12-07
