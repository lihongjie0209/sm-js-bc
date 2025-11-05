# SM-JS-BC

> SM2/SM3 TypeScript implementation based on Bouncy Castle Java

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

一比一复刻 [Bouncy Castle Java](https://github.com/bcgit/bc-java) 的 SM2 和 SM3 算法的 TypeScript 实现。

## ✨ 特性

- 🎯 **零运行时依赖** - 纯 TypeScript 实现
- 🔒 **完全兼容** - 与 Bouncy Castle Java 完全互操作
- 📦 **多格式输出** - 支持 CommonJS、ESM 和 IIFE
- 🧪 **双重验证** - 自闭环测试 + GraalVM 跨语言测试
- 📚 **完整文档** - 详细的 API 文档和使用指南
- ✅ **高质量** - >90% 测试覆盖率
- 🌐 **浏览器支持** - 可在浏览器和 Node.js 中使用

## 📦 安装

```bash
npm install sm-bc
```

## 🚀 快速开始

### SM3 哈希

```typescript
import { SM3Digest } from 'sm-bc';

// 创建 SM3 摘要实例
const digest = new SM3Digest();

// 更新数据
const data = new TextEncoder().encode('Hello, SM3!');
digest.update(data, 0, data.length);

// 获取哈希值
const hash = new Uint8Array(digest.getDigestSize());
digest.doFinal(hash, 0);

console.log('SM3 Hash:', Buffer.from(hash).toString('hex'));
```

### SM2 密钥对生成

```typescript
import { SM2 } from 'sm-bc';

// 生成密钥对
const keyPair = SM2.generateKeyPair();

console.log('Private key:', keyPair.privateKey.toString(16));
console.log('Public key X:', keyPair.publicKey.x.toString(16));
console.log('Public key Y:', keyPair.publicKey.y.toString(16));
```

### SM2 数字签名

```typescript
import { SM2 } from 'sm-bc';

// 生成密钥对
const keyPair = SM2.generateKeyPair();

// 签名
const message = 'Hello, SM2!';
const signature = SM2.sign(message, keyPair.privateKey);
console.log('Signature:', Buffer.from(signature).toString('hex'));

// 验签
const isValid = SM2.verify(
  message, 
  signature, 
  keyPair.publicKey
);
console.log('Signature valid:', isValid);
```

### SM2 公钥加密

```typescript
import { SM2 } from 'sm-bc';

// 生成密钥对
const keyPair = SM2.generateKeyPair();

// 加密
const plaintext = new TextEncoder().encode('Secret message');
const ciphertext = SM2.encrypt(plaintext, keyPair.publicKey);
console.log('Ciphertext:', Buffer.from(ciphertext).toString('hex'));

// 解密
const decrypted = SM2.decrypt(ciphertext, keyPair.privateKey);
console.log('Decrypted:', new TextDecoder().decode(decrypted));
```

### SM2 密钥交换

```typescript
import { 
  SM2, 
  SM2KeyExchange,
  SM2KeyExchangePrivateParameters,
  SM2KeyExchangePublicParameters,
  ParametersWithID,
  ECPrivateKeyParameters,
  ECPublicKeyParameters
} from 'sm-bc';

// 生成静态密钥对和临时密钥对
const aliceStaticKeyPair = SM2.generateKeyPair();
const aliceEphemeralKeyPair = SM2.generateKeyPair();
const bobStaticKeyPair = SM2.generateKeyPair();
const bobEphemeralKeyPair = SM2.generateKeyPair();

// 获取域参数
const domainParams = SM2.getParameters();

// 创建密钥参数对象
const curve = SM2.getCurve();
const aliceStaticPub = new ECPublicKeyParameters(
  curve.createPoint(aliceStaticKeyPair.publicKey.x, aliceStaticKeyPair.publicKey.y),
  domainParams
);
const aliceStaticPriv = new ECPrivateKeyParameters(aliceStaticKeyPair.privateKey, domainParams);
const aliceEphemeralPub = new ECPublicKeyParameters(
  curve.createPoint(aliceEphemeralKeyPair.publicKey.x, aliceEphemeralKeyPair.publicKey.y),
  domainParams
);
const aliceEphemeralPriv = new ECPrivateKeyParameters(aliceEphemeralKeyPair.privateKey, domainParams);

const bobStaticPub = new ECPublicKeyParameters(
  curve.createPoint(bobStaticKeyPair.publicKey.x, bobStaticKeyPair.publicKey.y),
  domainParams
);
const bobStaticPriv = new ECPrivateKeyParameters(bobStaticKeyPair.privateKey, domainParams);
const bobEphemeralPub = new ECPublicKeyParameters(
  curve.createPoint(bobEphemeralKeyPair.publicKey.x, bobEphemeralKeyPair.publicKey.y),
  domainParams
);
const bobEphemeralPriv = new ECPrivateKeyParameters(bobEphemeralKeyPair.privateKey, domainParams);

// Alice（初始方）计算共享密钥
const aliceExchange = new SM2KeyExchange();
const aliceUserID = new TextEncoder().encode('alice@example.com');
const alicePrivParams = new SM2KeyExchangePrivateParameters(
  true,  // 初始方
  aliceStaticPriv,
  aliceEphemeralPriv
);
aliceExchange.init(new ParametersWithID(alicePrivParams, aliceUserID));

const bobUserID = new TextEncoder().encode('bob@example.com');
const bobPubParams = new SM2KeyExchangePublicParameters(bobStaticPub, bobEphemeralPub);
const aliceSharedKey = aliceExchange.calculateKey(
  128,  // 密钥长度（bits）
  new ParametersWithID(bobPubParams, bobUserID)
);

// Bob（响应方）计算共享密钥
const bobExchange = new SM2KeyExchange();
const bobPrivParams = new SM2KeyExchangePrivateParameters(
  false,  // 响应方
  bobStaticPriv,
  bobEphemeralPriv
);
bobExchange.init(new ParametersWithID(bobPrivParams, bobUserID));

const alicePubParams = new SM2KeyExchangePublicParameters(aliceStaticPub, aliceEphemeralPub);
const bobSharedKey = bobExchange.calculateKey(
  128,  // 密钥长度（bits）
  new ParametersWithID(alicePubParams, aliceUserID)
);

// 验证双方得到相同的共享密钥
console.log('Keys match:', 
  Buffer.from(aliceSharedKey).equals(Buffer.from(bobSharedKey))
);
console.log('Shared key:', Buffer.from(aliceSharedKey).toString('hex'));
```

**注意**：SM2 密钥交换协议较为复杂，需要使用多个参数类。如果您只需要简单的密钥协商，建议使用 ECDH 或其他更简单的协议。

## 📚 API 参考

### SM3Digest

```typescript
class SM3Digest {
  // 创建 SM3 摘要实例
  constructor();
  
  // 更新摘要数据
  update(input: Uint8Array, offset: number, len: number): void;
  
  // 完成摘要计算并返回结果
  doFinal(out: Uint8Array, outOff: number): number;
  
  // 获取摘要输出大小（32 字节）
  getDigestSize(): number;
  
  // 重置摘要状态以供重用
  reset(): void;
}
```

### SM2

```typescript
class SM2 {
  // 生成 SM2 密钥对
  static generateKeyPair(): {
    privateKey: bigint;
    publicKey: { x: bigint; y: bigint };
  };
  
  // 使用私钥签名消息
  static sign(
    message: string | Uint8Array,
    privateKey: bigint
  ): Uint8Array;
  
  // 使用公钥验证签名
  static verify(
    message: string | Uint8Array,
    signature: Uint8Array,
    publicKey: { x: bigint; y: bigint }
  ): boolean;
  
  // 使用公钥加密数据
  static encrypt(
    message: string | Uint8Array,
    publicKey: { x: bigint; y: bigint }
  ): Uint8Array;
  
  // 使用私钥解密数据
  static decrypt(
    ciphertext: Uint8Array,
    privateKey: bigint
  ): Uint8Array;
  
  // 获取 SM2 曲线参数
  static getParameters(): ECDomainParameters;
  static getCurve(): ECCurveFp;
  static getG(): ECPoint;
  static getN(): bigint;
  
  // 验证密钥有效性
  static validatePrivateKey(d: bigint): boolean;
  static validatePublicKey(Q: ECPoint): boolean;
}
```

### SM2KeyExchange

```typescript
class SM2KeyExchange {
  // 创建密钥交换实例
  constructor(digest?: Digest);
  
  // 初始化密钥交换（需要 SM2KeyExchangePrivateParameters）
  init(privParam: CipherParameters): void;
  
  // 计算共享密钥
  calculateKey(
    kLen: number,  // 密钥长度（bits）
    pubParam: CipherParameters  // 对方公钥参数
  ): Uint8Array;
  
  // 带确认标签的密钥计算
  calculateKeyWithConfirmation(
    kLen: number,
    confirmationTag: Uint8Array | null,
    pubParam: CipherParameters
  ): Uint8Array[];
}
```

### 异常类

```typescript
class CryptoException extends Error {}
class DataLengthException extends CryptoException {}
class InvalidCipherTextException extends CryptoException {}
```

## 📖 文档

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

## 🌐 浏览器与 Node.js 使用

### Node.js

```typescript
import { SM2, SM3Digest } from 'sm-bc';
// 直接使用，TextEncoder 和 Buffer 都是内置的
```

### 浏览器（ES Module）

```html
<script type="module">
  import { SM2, SM3Digest } from './node_modules/sm-bc/dist/index.mjs';
  
  // 使用 TextEncoder（浏览器内置）
  const data = new TextEncoder().encode('Hello');
  
  // 注意：浏览器中没有 Buffer，使用 Uint8Array
  const hash = new Uint8Array(32);
  // 转换为十六进制字符串
  const hexString = Array.from(hash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
</script>
```

### 浏览器（通过 CDN）

```html
<script src="https://unpkg.com/sm-bc/dist/index.js"></script>
<script>
  // 全局变量访问
  const { SM2, SM3Digest } = window.smbc;
</script>
```

### 使用打包工具

支持 Webpack、Rollup、Vite 等现代打包工具：

```typescript
// Vite / Webpack / Rollup
import { SM2, SM3Digest } from 'sm-bc';
```

## ❓ 常见问题与技巧

### Q: 为什么要实现这个库？

为了在 JavaScript/TypeScript 生态中提供一个与 Bouncy Castle Java 完全兼容的 SM2/SM3 实现，确保跨语言互操作性。

### Q: 与其他 JavaScript SM2/SM3 库的区别？

- ✅ 基于 Bouncy Castle Java 一比一复刻，保证兼容性
- ✅ 通过 GraalVM 跨语言测试验证互操作性
- ✅ 零运行时依赖，纯 TypeScript 实现
- ✅ 完整的类型定义和文档

### Q: 如何处理大文件的哈希计算？

```typescript
import { SM3Digest } from 'sm-bc';
import * as fs from 'fs';

const digest = new SM3Digest();
const stream = fs.createReadStream('large-file.bin');

stream.on('data', (chunk) => {
  digest.update(chunk, 0, chunk.length);
});

stream.on('end', () => {
  const hash = new Uint8Array(digest.getDigestSize());
  digest.doFinal(hash, 0);
  console.log('Hash:', Buffer.from(hash).toString('hex'));
});
```

### Q: 如何导入/导出密钥？

```typescript
import { SM2 } from 'sm-bc';

// 生成密钥对
const keyPair = SM2.generateKeyPair();

// 导出密钥（保存为十六进制字符串）
const privateKeyHex = keyPair.privateKey.toString(16);
const publicKeyHex = {
  x: keyPair.publicKey.x.toString(16),
  y: keyPair.publicKey.y.toString(16)
};

// 导入密钥（从十六进制字符串）
const importedPrivateKey = BigInt('0x' + privateKeyHex);
const importedPublicKey = {
  x: BigInt('0x' + publicKeyHex.x),
  y: BigInt('0x' + publicKeyHex.y)
};

// 使用导入的密钥
const message = 'test';
const signature = SM2.sign(message, importedPrivateKey);
const valid = SM2.verify(message, signature, importedPublicKey);
```

### Q: 如何处理错误？

```typescript
import { SM2, CryptoException, InvalidCipherTextException } from 'sm-bc';

try {
  const keyPair = SM2.generateKeyPair();
  const encrypted = SM2.encrypt('message', keyPair.publicKey);
  const decrypted = SM2.decrypt(encrypted, keyPair.privateKey);
} catch (error) {
  if (error instanceof InvalidCipherTextException) {
    console.error('解密失败：密文无效或密钥不匹配');
  } else if (error instanceof CryptoException) {
    console.error('加密操作失败：', error.message);
  } else {
    console.error('未知错误：', error);
  }
}
```

### Q: 性能如何？

JavaScript 引擎（V8/Node.js）的性能已经非常接近 JVM。对于加密算法这类计算密集型任务，性能差异在可接受范围内，通常在同一数量级。

### Q: 可以在生产环境使用吗？

项目目前处于开发阶段。建议等到 v1.0.0 正式版发布并经过充分测试后再用于生产环境。

### 💡 使用技巧

1. **重用 Digest 实例**：如果需要计算多个哈希，可以调用 `digest.reset()` 重置状态后重用
2. **密钥验证**：使用 `SM2.validatePrivateKey()` 和 `SM2.validatePublicKey()` 验证密钥有效性
3. **随机数生成**：库内部使用加密安全的随机数生成器，无需额外配置
4. **错误处理**：始终使用 try-catch 包裹加密操作，处理可能的异常
5. **类型安全**：使用 TypeScript 以获得完整的类型检查和 IDE 提示

---

**如有问题或建议，欢迎提出 [Issue](../../issues) 或 [Pull Request](../../pulls)！**
