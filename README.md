# SM-JS-BC

> SM2/SM3/SM4 + PKI TypeScript implementation based on Bouncy Castle Java

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

一比一复刻 [Bouncy Castle Java](https://github.com/bcgit/bc-java) 的 SM2、SM3 和 SM4 算法以及 PKI 支持的 TypeScript 实现。

## ✨ 特性

### 密码算法
- 🔐 **SM2** - 椭圆曲线公钥密码算法（数字签名、公钥加密、密钥交换）
- 🔒 **SM3** - 密码杂凑算法（256位消息摘要）
- 🔑 **SM4** - 分组密码算法（128位对称加密，支持多种工作模式）
- 📡 **ZUC** - 祖冲之序列密码算法（支持 ZUC-128/256 及 MAC，用于 3GPP LTE/5G）🆕

### PKI 支持 🆕
- 📜 **X.509 证书** - 证书生成、解析、验证（支持 SM2 签名）
- 🔐 **PKCS#8** - 私钥和公钥编码（PEM/DER 格式）
- 📝 **PKCS#10** - 证书签名请求（CSR）生成和验证
- 📋 **ASN.1** - 完整的 DER 编码/解码支持
- 🏛️ **证书管理** - 自签名证书、CA 证书、证书链验证
- 🔍 **CRL** - 证书吊销列表生成和检查
- 🏷️ **扩展** - 支持 Subject Alternative Names 等高级扩展

### 其他特性
- 🎯 **零运行时依赖** - 纯 TypeScript 实现
- 🔒 **完全兼容** - 与 Bouncy Castle Java 完全互操作
- 📦 **多格式输出** - 支持 CommonJS、ESM 和 IIFE
- 🧪 **双重验证** - 自闭环测试 + GraalVM 跨语言测试
- 📚 **完整文档** - 详细的 API 文档和使用指南
- ✅ **高质量** - >90% 测试覆盖率，777+ 测试用例
- 🌐 **浏览器支持** - 可在浏览器和 Node.js 中使用

## 📦 安装

```bash
npm install sm-js-bc
```

## 🚀 快速开始

> 💡 **提示**: 以下是基础用法示例。想要完整的可运行代码？直接跳转到 [📚 完整示例](#-完整示例) 章节，所有示例都可以直接运行！

以下代码片段展示了各算法的基本用法：

### SM3 哈希

```typescript
import { SM3Digest } from 'sm-js-bc';

const digest = new SM3Digest();
const data = new TextEncoder().encode('Hello, SM3!');
digest.update(data, 0, data.length);

const hash = new Uint8Array(digest.getDigestSize());
digest.doFinal(hash, 0);

console.log('SM3 Hash:', Buffer.from(hash).toString('hex'));
```

📖 **完整示例**: [example/sm3-hash.mjs](./example/sm3-hash.mjs)

### HMAC-SM3 消息认证码

```typescript
import { HMac, SM3Digest, KeyParameter } from 'sm-js-bc';

const hmac = new HMac(new SM3Digest());
const key = new TextEncoder().encode('my-secret-key');
const message = new TextEncoder().encode('Hello, HMAC-SM3!');

hmac.init(new KeyParameter(key));
hmac.updateArray(message, 0, message.length);

const mac = new Uint8Array(hmac.getMacSize());
hmac.doFinal(mac, 0);

console.log('HMAC:', Buffer.from(mac).toString('hex'));
```

📖 **完整示例**: [example/hmac-sm3.mjs](./example/hmac-sm3.mjs)

### SM2 密钥对生成

```typescript
import { SM2 } from 'sm-js-bc';

const keyPair = SM2.generateKeyPair();
console.log('Private key:', keyPair.privateKey.toString(16));
console.log('Public key X:', keyPair.publicKey.x.toString(16));
console.log('Public key Y:', keyPair.publicKey.y.toString(16));
```

📖 **完整示例**: [example/sm2-keypair.mjs](./example/sm2-keypair.mjs)

### SM2 数字签名

```typescript
import { SM2 } from 'sm-js-bc';

const keyPair = SM2.generateKeyPair();

// 签名
const message = 'Hello, SM2!';
const signature = SM2.sign(message, keyPair.privateKey);

// 验签
const isValid = SM2.verify(message, signature, keyPair.publicKey);
console.log('Signature valid:', isValid);
```

📖 **完整示例**: [example/sm2-sign.mjs](./example/sm2-sign.mjs)

### SM2 公钥加密

```typescript
import { SM2 } from 'sm-js-bc';

const keyPair = SM2.generateKeyPair();

// 加密
const plaintext = new TextEncoder().encode('Secret message');
const ciphertext = SM2.encrypt(plaintext, keyPair.publicKey);

// 解密
const decrypted = SM2.decrypt(ciphertext, keyPair.privateKey);
console.log('Decrypted:', new TextDecoder().decode(decrypted));
```

📖 **完整示例**: [example/sm2-encrypt.mjs](./example/sm2-encrypt.mjs)

### SM4 对称加密

```typescript
import { SM4 } from 'sm-js-bc';

// 生成密钥并加密
const key = SM4.generateKey();
const plaintext = new TextEncoder().encode('Hello, SM4!');
const ciphertext = SM4.encrypt(plaintext, key);

// 解密
const decrypted = SM4.decrypt(ciphertext, key);
console.log('Decrypted:', new TextDecoder().decode(decrypted));
```

> ⚠️ **安全提示**: 上述示例使用 ECB 模式，仅用于演示。生产环境请使用 CBC、CTR 或 GCM 模式。

📖 **完整示例**: 
- [example/sm4-ecb-simple.mjs](./example/sm4-ecb-simple.mjs) - 基础加密示例
- [example/sm4-modes.mjs](./example/sm4-modes.mjs) - 多种工作模式（ECB/CBC/CTR/GCM）

### ZUC 流密码 🆕

```typescript
import { ZUCEngine, KeyParameter, ParametersWithIV } from 'sm-js-bc';

// 生成密钥和 IV（在实际应用中应该安全地生成）
const key = new Uint8Array(16); // 128-bit key
const iv = new Uint8Array(16);  // 128-bit IV

// 初始化 ZUC-128
const zuc = new ZUCEngine();
const params = new ParametersWithIV(new KeyParameter(key), iv);
zuc.init(true, params);

// 加密数据
const plaintext = new TextEncoder().encode('Hello, ZUC!');
const ciphertext = new Uint8Array(plaintext.length);
zuc.processBytes(plaintext, 0, plaintext.length, ciphertext, 0);

// 解密（重新初始化使用相同密钥和 IV）
zuc.reset();
const decrypted = new Uint8Array(ciphertext.length);
zuc.processBytes(ciphertext, 0, ciphertext.length, decrypted, 0);

console.log('解密:', new TextDecoder().decode(decrypted));
```

> 📱 **应用场景**: ZUC 是 3GPP 标准的流密码算法，广泛用于 4G/5G 移动通信的数据加密和完整性保护（128-EEA3/128-EIA3）。

### ZUC MAC（消息认证码）🆕

```typescript
import { Zuc128Mac, KeyParameter, ParametersWithIV } from 'sm-js-bc';

// 初始化 ZUC-128 MAC
const key = new Uint8Array(16);
const iv = new Uint8Array(16);
const mac = new Zuc128Mac();

const params = new ParametersWithIV(new KeyParameter(key), iv);
mac.init(params);

// 计算 MAC
const message = new TextEncoder().encode('Hello, ZUC MAC!');
mac.updateArray(message, 0, message.length);

const tag = new Uint8Array(4); // 32-bit MAC
mac.doFinal(tag, 0);

console.log('MAC 标签:', Buffer.from(tag).toString('hex'));
```

> 🔒 **完整性保护**: ZUC MAC 用于 LTE/5G 的完整性保护（128-EIA3），确保消息未被篡改。

### SM2 密钥交换

```typescript
import { 
  SM2, 
  SM2KeyExchange,
  SM2KeyExchangePrivateParameters,
  SM2KeyExchangePublicParameters,
  ECPrivateKeyParameters,
  ECPublicKeyParameters
} from 'sm-js-bc';

// 获取SM2域参数
const domainParams = SM2.getParameters();
const curve = domainParams.getCurve();

// Alice 生成密钥对（静态 + 临时）
const aliceStatic = SM2.generateKeyPair();
const aliceEphemeral = SM2.generateKeyPair();

const aliceStaticPriv = new ECPrivateKeyParameters(aliceStatic.privateKey, domainParams);
const aliceStaticPub = new ECPublicKeyParameters(
  curve.createPoint(aliceStatic.publicKey.x, aliceStatic.publicKey.y), 
  domainParams
);
const aliceEphemeralPriv = new ECPrivateKeyParameters(aliceEphemeral.privateKey, domainParams);
const aliceEphemeralPub = new ECPublicKeyParameters(
  curve.createPoint(aliceEphemeral.publicKey.x, aliceEphemeral.publicKey.y), 
  domainParams
);

// Bob 生成密钥对（静态 + 临时）
const bobStatic = SM2.generateKeyPair();
const bobEphemeral = SM2.generateKeyPair();

const bobStaticPriv = new ECPrivateKeyParameters(bobStatic.privateKey, domainParams);
const bobStaticPub = new ECPublicKeyParameters(
  curve.createPoint(bobStatic.publicKey.x, bobStatic.publicKey.y), 
  domainParams
);
const bobEphemeralPriv = new ECPrivateKeyParameters(bobEphemeral.privateKey, domainParams);
const bobEphemeralPub = new ECPublicKeyParameters(
  curve.createPoint(bobEphemeral.publicKey.x, bobEphemeral.publicKey.y), 
  domainParams
);

// Alice 初始化密钥交换（发起方）
const aliceExchange = new SM2KeyExchange();
const alicePrivParams = new SM2KeyExchangePrivateParameters(
  true,  // initiator
  aliceStaticPriv,
  aliceEphemeralPriv
);
aliceExchange.init(alicePrivParams);

// Alice 计算共享密钥
const bobPubParams = new SM2KeyExchangePublicParameters(bobStaticPub, bobEphemeralPub);
const aliceSharedKey = aliceExchange.calculateKey(128, bobPubParams);

// Bob 初始化密钥交换（响应方）
const bobExchange = new SM2KeyExchange();
const bobPrivParams = new SM2KeyExchangePrivateParameters(
  false,  // responder
  bobStaticPriv,
  bobEphemeralPriv
);
bobExchange.init(bobPrivParams);

// Bob 计算共享密钥
const alicePubParams = new SM2KeyExchangePublicParameters(aliceStaticPub, aliceEphemeralPub);
const bobSharedKey = bobExchange.calculateKey(128, alicePubParams);

// 验证双方密钥一致
console.log('Keys match:', 
  Buffer.from(aliceSharedKey).equals(Buffer.from(bobSharedKey))
);
```

> 💡 **提示**: SM2 密钥交换涉及多个参数类和步骤，建议查看完整示例了解详细用法。

📖 **完整示例**: [example/sm2-keyexchange.mjs](./example/sm2-keyexchange.mjs)

### X.509 证书

```typescript
import { SM2, X509Name, X509CertificateBuilder } from 'sm-js-bc';

// Generate key pair
const keyPair = SM2.generateKeyPair();

// Create certificate
const subject = new X509Name('CN=Test User,O=Test Org,C=CN');
const notBefore = new Date();
const notAfter = new Date(notBefore.getTime() + 365*24*60*60*1000);

const cert = X509CertificateBuilder.generateSelfSigned(
  subject,
  keyPair,
  { notBefore, notAfter }
);

// Export to PEM
const certPEM = cert.toPEM();
console.log(certPEM);

// Verify certificate
const isValid = cert.verify(publicKeyParams);
console.log('Certificate valid:', isValid);
```

📖 **完整示例**: [example/x509-certificate.mjs](./example/x509-certificate.mjs)

---

## 📚 完整示例

所有算法都提供了完整的可运行示例，位于 [`example`](./example) 目录：

| 示例文件 | 说明 | 演示内容 |
|---------|------|---------|
| [sm3-hash.mjs](./example/sm3-hash.mjs) | SM3 哈希计算 | 基本哈希、分段更新、空数据处理 |
| [hmac-sm3.mjs](./example/hmac-sm3.mjs) | HMAC-SM3 消息认证码 | MAC 生成、分段更新、消息验证 |
| [sm2-keypair.mjs](./example/sm2-keypair.mjs) | SM2 密钥对生成 | 生成密钥对、查看公私钥 |
| [sm2-sign.mjs](./example/sm2-sign.mjs) | SM2 数字签名 | 签名、验签、错误验证 |
| [sm2-encrypt.mjs](./example/sm2-encrypt.mjs) | SM2 公钥加密 | 加密、解密、不同长度消息 |
| [sm2-keyexchange.mjs](./example/sm2-keyexchange.mjs) | SM2 密钥交换 | ECDH 协议、密钥协商 |
| [sm4-ecb-simple.mjs](./example/sm4-ecb-simple.mjs) | SM4 基础加密 | ECB 模式、PKCS7 填充 |
| [sm4-modes.mjs](./example/sm4-modes.mjs) | SM4 多种模式 | ECB/CBC/CTR/GCM 对比 |
| [zuc-encryption.mjs](./example/zuc-encryption.mjs) | ZUC 流密码 🆕 | ZUC-128/256 加密、MAC完整性保护 |
| [x509-certificate.mjs](./example/x509-certificate.mjs) | X.509 证书 🆕 | 证书生成、签名、验证、PEM编码 |
| [advanced-pki.mjs](./example/advanced-pki.mjs) | 高级 PKI 🆕 | CSR、SAN、CRL、证书链验证 |

### 🚀 运行示例

```bash
# 进入示例目录
cd example

# 安装依赖
npm install

# 运行单个示例
npm run sm3-hash           # SM3 哈希
npm run hmac-sm3           # HMAC-SM3 消息认证码
npm run sm2-keypair        # SM2 密钥对生成
npm run sm2-sign           # SM2 数字签名
npm run sm2-encrypt        # SM2 公钥加密
npm run sm2-keyexchange    # SM2 密钥交换
npm run sm4-ecb-simple     # SM4 基础加密
npm run sm4-modes          # SM4 多种模式
npm run zuc-encryption     # ZUC 流密码 🆕
npm run x509-certificate   # X.509 证书 🆕
npm run advanced-pki       # 高级 PKI 🆕

# 运行所有示例
npm run all
```

详细说明请查看 [example/README.md](./example/README.md)。

## �📖 文档

详细文档请查看 [docs](./docs) 目录：

- **[文档导航](./docs/README.md)** - 所有文档的入口
- **[需求文档](./docs/需求.md)** - 项目背景和需求
- **[实现计划](./docs/implementation-plan.md)** - 技术架构和实现计划
- **[测试策略](./docs/test-strategy.md)** - 两阶段测试方案详解
- **[快速开始](./docs/getting-started.md)** - 开发环境搭建指南

## 🧪 测试

本项目采用**双重验证策略**，包含 TypeScript 单元测试和 Java GraalVM 跨语言互操作测试，总计 **1077+** 个测试用例，确保代码质量和跨语言兼容性。

### 测试覆盖

#### Java GraalVM 集成测试 (1077 tests)

完整的跨语言互操作测试套件：

| 算法 | 测试类别 | 测试数量 | 说明 |
|------|---------|---------|------|
| **SM3** | 参数化测试 | 77 | 不同长度、字符集、标准向量 |
| | 属性测试 | 720 | 72个属性 × 10次迭代 |
| | 互操作测试 | 5 | Java ↔ JavaScript 一致性 |
| | **小计** | **802** | |
| **SM2 签名** | 参数化测试 | 25 | 不同消息、密钥对、错误处理 |
| | 属性测试 | 100 | 10个属性 × 10次迭代 |
| | 互操作测试 | 4 | Java签名 ↔ JS验证 |
| | **小计** | **125** | |
| **SM2 加密** | 参数化测试 | 39 | 多种大小、跨语言、边界情况 |
| | 属性测试 | 100 | 10个属性 × 10次迭代 |
| | 互操作测试 | 4 | Java加密 ↔ JS解密 |
| | **小计** | **139** | |
| **跨语言测试** | 简化测试 | 3 | SM3 基础互操作 |
| **总计** | | **1077** | **全部通过 ✅** |

#### 测试类型说明

- **参数化测试** - 使用 JUnit 5 `@ParameterizedTest`，覆盖各种输入场景
- **属性测试** - 使用 `@RepeatedTest`，验证数学和安全属性
- **互操作测试** - 通过 GraalVM Polyglot API 确保 Java ↔ JavaScript 完全兼容

### 运行测试

#### 一键运行所有测试

```bash
# 运行所有测试（JavaScript + Java）
node test-all.mjs

# 详细输出模式
node test-all.mjs --verbose

# 仅运行 JavaScript 测试
node test-all.mjs --skip-java

# 仅运行 Java 测试
node test-all.mjs --skip-js

# 查看帮助
node test-all.mjs --help
```

#### JavaScript 单元测试

```bash
# 运行所有单元测试
npm test

# 监听模式
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 测试 UI
npm run test:ui
```

#### Java GraalVM 互操作测试

```bash
# 前置条件：安装 Maven 和 GraalVM (推荐 21+)

# 运行所有 Java 测试
cd test/graalvm-integration/java
mvn test

# 运行特定测试类
mvn test -Dtest=SM3ParameterizedTest
mvn test -Dtest=SM2SignaturePropertyTest
mvn test -Dtest=SM2EncryptionParameterizedTest

# 编译并运行
mvn clean test
```

### 测试环境要求

- **JavaScript 测试**: Node.js >= 20.0.0
- **Java 测试**: 
  - JDK >= 17 (推荐 GraalVM 21+)
  - Maven >= 3.8.0
  - Bouncy Castle >= 1.70

### 测试架构

```
test/
├── unit/                          # TypeScript 单元测试
│   ├── crypto/                    # 密码学算法测试
│   ├── math/                      # 数学库测试
│   └── util/                      # 工具类测试
│
└── graalvm-integration/           # 跨语言互操作测试
    ├── java/                      # Java 测试项目
    │   ├── src/test/java/
    │   │   ├── base/              # 测试基类
    │   │   ├── interop/           # 互操作测试
    │   │   ├── parameterized/     # 参数化测试
    │   │   └── property/          # 属性测试
    │   └── pom.xml                # Maven 配置
    │
    └── BUG_FIX_SUMMARY.md         # 已知问题和修复
```

## 🏗️ 项目结构

```
sm-js-bc/
├── src/                    # 源代码
│   ├── crypto/            # 密码学算法
│   │   ├── digests/       # 摘要算法（SM3）
│   │   ├── engines/       # 加密引擎（SM2）
│   │   ├── signers/       # 签名算法（SM2）
│   │   ├── agreement/     # 密钥交换
│   │   └── params/        # 参数类
│   ├── math/              # 数学运算
│   │   ├── ec/            # 椭圆曲线
│   │   └── field/         # 有限域
│   ├── util/              # 工具类
│   └── exceptions/        # 异常类
├── test/                  # 测试
│   ├── unit/              # 单元测试
│   └── graalvm-integration/ # 互操作测试
├── docs/                  # 文档
└── dist/                  # 编译输出
```

## 🔧 开发

### 环境要求

- Node.js >= 20.0.0
- TypeScript >= 5.3.0
- Java >= 17（仅互操作测试需要，推荐 GraalVM 21+）

### 开发流程

```bash
# 克隆项目
git clone <repository-url>
cd sm-js-bc

# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 运行测试
npm run test:watch

# 构建
npm run build
```

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
test: 测试相关
refactor: 重构
perf: 性能优化
chore: 构建/工具相关
```

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

请确保：
- ✅ 所有测试通过
- ✅ 代码覆盖率 >90%
- ✅ 遵循代码规范
- ✅ 更新相关文档

## 📜 许可证

[MIT License](./LICENSE)

## 🔗 相关链接

- [Bouncy Castle Java](https://github.com/bcgit/bc-java) - 参考实现
- [GM/T 0003-2012](http://www.gmbz.org.cn/) - SM2 标准
- [GM/T 0004-2012](http://www.gmbz.org.cn/) - SM3 标准
- [GraalVM](https://www.graalvm.org/) - 跨语言互操作平台

## 🙏 致谢

- Bouncy Castle 项目提供了优秀的参考实现
- 所有为国密算法标准化做出贡献的专家学者

## ❓ 常见问题

### 为什么要实现这个库？

为了在 JavaScript/TypeScript 生态中提供一个与 Bouncy Castle Java 完全兼容的 SM2/SM3 实现，确保跨语言互操作性。

### 与其他 JavaScript SM2/SM3 库的区别？

- ✅ 基于 Bouncy Castle Java 一比一复刻，保证兼容性
- ✅ 通过 GraalVM 跨语言测试验证互操作性
- ✅ 零运行时依赖，纯 TypeScript 实现
- ✅ 完整的类型定义和文档

### 性能如何？

JavaScript 引擎（V8/Node.js）的性能已经非常接近 JVM。对于加密算法这类计算密集型任务，性能差异在可接受范围内，通常在同一数量级。

### 可以在生产环境使用吗？

项目目前处于开发阶段。建议等到 v1.0.0 正式版发布并经过充分测试后再用于生产环境。

---

**如有问题或建议，欢迎提出 [Issue](../../issues) 或 [Pull Request](../../pulls)！**
