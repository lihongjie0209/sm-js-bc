# 测试文档

> SM-JS-BC 测试架构、运行指南和最佳实践

## 📊 测试概览

本项目采用**双重验证策略**：

1. **TypeScript 单元测试** - 使用 Vitest 验证 JavaScript 实现的正确性
2. **Java GraalVM 互操作测试** - 通过 JUnit 5 + GraalVM Polyglot API 确保与 Bouncy Castle Java 的完全兼容

### 测试统计

| 测试类型 | 测试数量 | 状态 | 说明 |
|---------|---------|------|------|
| SM3 参数化测试 | 77 | ✅ | 不同长度、字符集、标准向量 |
| SM3 属性测试 | 720 | ✅ | 72个属性 × 10次迭代 |
| SM3 互操作测试 | 5 | ✅ | Java ↔ JS 一致性 |
| SM2 签名参数化 | 25 | ✅ | 不同消息、密钥对、错误处理 |
| SM2 签名属性 | 100 | ✅ | 10个属性 × 10次迭代 |
| SM2 签名互操作 | 4 | ✅ | Java签名 ↔ JS验证 |
| SM2 加密参数化 | 39 | ✅ | 多种大小、跨语言、边界 |
| SM2 加密属性 | 100 | ✅ | 10个属性 × 10次迭代 |
| SM2 加密互操作 | 4 | ✅ | Java加密 ↔ JS解密 |
| 简化跨语言测试 | 3 | ✅ | SM3 基础互操作 |
| **总计** | **1077** | **✅** | **全部通过** |

## 🏗️ 测试架构

```
test/
├── unit/                          # TypeScript 单元测试
│   ├── crypto/
│   │   ├── digests/
│   │   │   └── SM3Digest.test.ts
│   │   ├── engines/
│   │   │   └── SM2Engine.test.ts
│   │   └── signers/
│   │       └── SM2Signer.test.ts
│   ├── math/
│   │   ├── ec/
│   │   │   ├── ECPoint.test.ts
│   │   │   └── ECCurve.test.ts
│   │   └── raw/
│   └── util/
│       ├── Arrays.test.ts
│       ├── Pack.test.ts
│       └── BigIntegers.test.ts
│
└── graalvm-integration/           # Java GraalVM 互操作测试
    ├── java/
    │   ├── pom.xml                # Maven 构建文件
    │   └── src/
    │       ├── main/java/         # 测试工具类
    │       │   └── com/sm/bc/graalvm/
    │       │       ├── TestDataGenerator.java
    │       │       └── GraalVMUtils.java
    │       └── test/java/         # 测试代码
    │           └── com/sm/bc/graalvm/
    │               ├── base/
    │               │   └── BaseGraalVMTest.java
    │               ├── interop/
    │               │   ├── SimplifiedCrossLanguageTest.java
    │               │   ├── SM3DigestInteropTest.java
    │               │   ├── SM2SignatureInteropTest.java
    │               │   └── SM2EncryptionInteropTest.java
    │               ├── parameterized/
    │               │   ├── SM3ParameterizedTest.java
    │               │   ├── SM2SignatureParameterizedTest.java
    │               │   └── SM2EncryptionParameterizedTest.java
    │               └── property/
    │                   ├── SM3PropertyBasedTest.java
    │                   ├── SM2SignaturePropertyTest.java
    │                   └── SM2EncryptionPropertyTest.java
    │
    ├── BUG_FIX_SUMMARY.md         # 已知问题和修复
    └── INTEGRATION_TEST_RESULTS.md # 测试结果记录
```

## 🚀 快速开始

### 一键运行所有测试

```bash
# 运行所有测试（JavaScript + Java）
node test-all.mjs

# 详细输出模式
node test-all.mjs --verbose

# 仅运行 JavaScript 测试
node test-all.mjs --skip-java

# 仅运行 Java 测试
node test-all.mjs --skip-js
```

### JavaScript 单元测试

```bash
# 运行所有单元测试
npm test

# 监听模式（开发推荐）
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 交互式测试 UI
npm run test:ui
```

### Java GraalVM 互操作测试

```bash
# 进入 Java 测试目录
cd test/graalvm-integration/java

# 运行所有测试
mvn test

# 编译并运行
mvn clean test

# 运行特定测试类
mvn test -Dtest=SM3ParameterizedTest
mvn test -Dtest=SM2SignaturePropertyTest
mvn test -Dtest=SM2EncryptionParameterizedTest

# 运行特定测试方法
mvn test -Dtest=SM3ParameterizedTest#testEmptyInput
```

## 📝 测试类型详解

### 1. 参数化测试 (Parameterized Tests)

使用 JUnit 5 `@ParameterizedTest` 测试各种输入场景。

**示例：SM2 加密参数化测试**

```java
@ParameterizedTest
@MethodSource("simpleMessages")
@DisplayName("测试简单消息加密")
void testSimpleMessages(String message) throws Exception {
    byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
    
    // Java 加密
    byte[] ciphertext = javaEncrypt(plaintext, publicKey);
    
    // Java 解密
    byte[] decrypted = javaDecrypt(ciphertext, privateKey);
    
    assertArrayEquals(plaintext, decrypted);
}

static Stream<String> simpleMessages() {
    return Stream.of(
        "Hello SM2!",
        "Test",
        "a",
        "Short msg",
        "This is a longer message for SM2 encryption test..."
    );
}
```

**优势：**
- 覆盖多种输入场景
- 测试失败时清晰显示具体输入
- 易于扩展新场景

### 2. 属性测试 (Property-Based Tests)

使用 `@RepeatedTest` 验证数学和安全属性。

**示例：SM2 加密属性测试**

```java
@RepeatedTest(ITERATIONS)
@DisplayName("加密/解密往返测试")
void testEncryptionDecryptionRoundtrip() throws Exception {
    // 生成随机密钥对
    AsymmetricCipherKeyPair keyPair = generateKeyPair();
    ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
    ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
    
    // 生成随机明文
    byte[] plaintext = TestDataGenerator.randomBytes(64);
    
    // 加密
    byte[] ciphertext = javaEncrypt(plaintext, publicKey);
    
    // 解密
    byte[] decrypted = javaDecrypt(ciphertext, privateKey);
    
    // 验证往返
    assertArrayEquals(plaintext, decrypted);
}
```

**验证的属性：**

| 属性 | 说明 | 示例测试 |
|-----|------|---------|
| 往返性 | encrypt(decrypt(x)) = x | testEncryptionDecryptionRoundtrip |
| 随机性 | encrypt(x) ≠ encrypt(x) | testCiphertextRandomness |
| 安全性 | decrypt需要正确密钥 | testDecryptionWithWrongKey |
| 完整性 | 修改密文导致解密失败 | testCiphertextModificationDetection |
| 确定性 | decrypt(c) = decrypt(c) | testDecryptionDeterminism |
| 冲突抵抗 | x ≠ y ⇒ encrypt(x) ≠ encrypt(y) | testDifferentPlaintextsDifferentCiphertexts |

### 3. 互操作测试 (Interoperability Tests)

通过 GraalVM Polyglot API 测试 Java ↔ JavaScript 兼容性。

**示例：SM2 签名互操作**

```java
@Test
@DisplayName("Java签名 → JavaScript验证")
void testJavaSignJavaScriptVerify() throws Exception {
    String message = "Hello SM2!";
    
    // Java 签名
    byte[] signature = javaSign(message.getBytes(), privateKey);
    
    // JavaScript 验证
    boolean valid = jsVerify(message, signature, publicKey);
    
    assertTrue(valid, "Java signature should be valid in JavaScript");
}

private boolean jsVerify(String message, byte[] signature, ECPublicKeyParameters publicKey) {
    Value jsVerifyFn = evalJs("""
        (function(message, signatureHex, publicKeyX, publicKeyY) {
            const signer = new SM2Signer();
            const pubKey = new ECPublicKeyParameters(
                curve.createPoint(
                    testUtils.hexToBigInt(publicKeyX),
                    testUtils.hexToBigInt(publicKeyY)
                ),
                domainParams
            );
            signer.init(false, pubKey);
            
            const messageBytes = testUtils.stringToBytes(message);
            signer.update(messageBytes, 0, messageBytes.length);
            
            const sig = testUtils.hexToBytes(signatureHex);
            return signer.verifySignature(sig);
        })
    """);
    
    return jsVerifyFn.execute(
        message,
        Hex.toHexString(signature),
        publicKey.getQ().getAffineXCoord().toBigInteger().toString(16),
        publicKey.getQ().getAffineYCoord().toBigInteger().toString(16)
    ).asBoolean();
}
```

**测试场景：**
- Java 加密 → JavaScript 解密
- JavaScript 加密 → Java 解密
- Java 签名 → JavaScript 验证
- JavaScript 签名 → Java 验证
- 标准测试向量一致性

## 🔧 环境配置

### JavaScript 测试环境

**要求：**
- Node.js >= 20.0.0
- npm >= 10.0.0

**依赖：**
- Vitest - 测试框架
- @vitest/ui - 测试 UI
- TypeScript - 类型支持

**配置文件：** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'test/'],
    },
  },
});
```

### Java 测试环境

**要求：**
- JDK >= 17 (推荐 GraalVM 21+)
- Maven >= 3.8.0

**主要依赖：**

```xml
<dependencies>
    <!-- JUnit 5 -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.1</version>
        <scope>test</scope>
    </dependency>
    
    <!-- GraalVM Polyglot -->
    <dependency>
        <groupId>org.graalvm.polyglot</groupId>
        <artifactId>polyglot</artifactId>
        <version>23.1.1</version>
    </dependency>
    <dependency>
        <groupId>org.graalvm.polyglot</groupId>
        <artifactId>js</artifactId>
        <version>23.1.1</version>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Bouncy Castle -->
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcprov-jdk18on</artifactId>
        <version>1.78.1</version>
    </dependency>
</dependencies>
```

**配置文件：** `pom.xml`

## 📖 编写测试指南

### 添加新的参数化测试

1. 在相应的 `*ParameterizedTest.java` 文件中添加测试方法
2. 使用 `@ParameterizedTest` 和数据源注解
3. 提供清晰的 `@DisplayName`

```java
@ParameterizedTest
@ValueSource(strings = {"short", "medium message", "very long message with lots of text..."})
@DisplayName("测试不同长度的消息")
void testMessageLengths(String message) throws Exception {
    // 测试逻辑
}
```

### 添加新的属性测试

1. 在相应的 `*PropertyTest.java` 文件中添加测试方法
2. 使用 `@RepeatedTest(ITERATIONS)`
3. 在方法内生成随机数据

```java
@RepeatedTest(ITERATIONS)
@DisplayName("验证某个数学属性")
void testSomeProperty() throws Exception {
    // 生成随机输入
    byte[] input = TestDataGenerator.randomBytes(128);
    AsymmetricCipherKeyPair keyPair = generateKeyPair();
    
    // 验证属性
    // ...
}
```

### 添加新的互操作测试

1. 在 `BaseGraalVMTest` 中添加辅助方法（如果需要）
2. 在相应的 `*InteropTest.java` 中编写测试
3. 使用 Polyglot API 调用 JavaScript 代码

```java
@Test
@DisplayName("新的互操作场景")
void testNewInteropScenario() throws Exception {
    // Java 操作
    byte[] javaResult = javaOperation(...);
    
    // JavaScript 操作
    String jsResult = jsOperation(...);
    
    // 验证一致性
    assertEquals(javaResult, jsResult);
}

private String jsOperation(...) {
    Value jsFunc = evalJs("""
        (function(...) {
            // JavaScript 代码
            return result;
        })
    """);
    
    return jsFunc.execute(...).asString();
}
```

## 🎯 测试最佳实践

### 1. 测试命名

- 使用描述性的测试方法名：`testEmptyInputProducesCorrectHash`
- 使用 `@DisplayName` 提供中文说明：`@DisplayName("空输入产生正确哈希")`
- 遵循 `test{What}{Condition}{Expected}` 模式

### 2. 测试独立性

- 每个测试应该独立运行
- 使用 `@BeforeEach` 初始化测试状态
- 不要依赖测试执行顺序

```java
@BeforeEach
void setUp() throws Exception {
    // 为每个测试生成新的密钥对
    keyPair = generateKeyPair();
    publicKey = (ECPublicKeyParameters) keyPair.getPublic();
    privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
}
```

### 3. 断言清晰性

- 提供清晰的断言消息
- 使用合适的断言方法

```java
// ✅ 好的做法
assertArrayEquals(expected, actual, 
    "Decrypted plaintext should match original");

// ❌ 避免
assertTrue(Arrays.equals(expected, actual));
```

### 4. 测试数据生成

- 对于属性测试，使用真随机数据
- 对于参数化测试，使用精心挑选的案例
- 包含边界条件和特殊值

```java
// 属性测试：真随机
byte[] randomData = TestDataGenerator.randomBytes(256);

// 参数化测试：特定案例
static Stream<Arguments> testCases() {
    return Stream.of(
        Arguments.of("", "empty string"),
        Arguments.of("a", "single char"),
        Arguments.of("SM2加密", "Unicode"),
        Arguments.of(new String(new byte[10000]), "large input")
    );
}
```

### 5. 错误处理测试

- 测试预期的异常
- 验证错误消息

```java
@Test
@DisplayName("无效密文应抛出异常")
void testInvalidCiphertext() {
    byte[] invalidCiphertext = new byte[10]; // 太短
    
    assertThrows(InvalidCipherTextException.class, () -> {
        javaDecrypt(invalidCiphertext, privateKey);
    }, "Invalid ciphertext should throw InvalidCipherTextException");
}
```

### 6. 性能考虑

- 属性测试的迭代次数平衡（通常 10 次）
- 避免在测试中进行不必要的计算
- 大数据测试单独标记

```java
private static final int ITERATIONS = 10; // 属性测试迭代次数

@Test
@Tag("slow")
@DisplayName("大数据性能测试")
void testLargeData() {
    // 10MB 数据测试
}
```

## 🐛 调试测试

### 查看详细输出

```bash
# Maven 详细模式
mvn test -X

# 运行单个测试
mvn test -Dtest=SM2EncryptionPropertyTest#testEncryptionDecryptionRoundtrip

# 查看 GraalVM 日志
mvn test -Dpolyglot.log.file=graalvm.log
```

### 常见问题

#### GraalVM 警告

```
[engine] WARNING: The polyglot engine uses a fallback runtime...
```

**解决方法：** 使用 GraalVM 并启用 JVMCI

```bash
export JAVA_HOME=/path/to/graalvm
java -XX:+EnableJVMCI -jar ...
```

#### 测试超时

**解决方法：** 增加超时时间

```java
@Test
@Timeout(value = 30, unit = TimeUnit.SECONDS)
void testSlowOperation() {
    // ...
}
```

#### 跨语言数据格式问题

**解决方法：** 使用统一的数据转换工具

```java
// 使用 testUtils 进行数据转换
String hex = Hex.toHexString(bytes);
Value jsBytes = evalJs("testUtils.hexToBytes('" + hex + "')");
```

## 📈 测试覆盖率

### 查看覆盖率

```bash
# JavaScript 覆盖率
npm run test:coverage

# 打开覆盖率报告
open coverage/index.html
```

### 目标

- **总体覆盖率**: >90%
- **关键算法**: 100%
  - SM3Digest
  - SM2Signer
  - SM2Engine
  - ECPoint
  - ECCurve

## 🔄 持续集成

### GitHub Actions (TODO)

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Setup GraalVM
        uses: graalvm/setup-graalvm@v1
        with:
          version: 'latest'
          java-version: '21'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run JavaScript tests
        run: npm test
      
      - name: Run Java tests
        run: |
          cd test/graalvm-integration/java
          mvn test
```

## 📚 相关资源

- [JUnit 5 用户指南](https://junit.org/junit5/docs/current/user-guide/)
- [GraalVM Polyglot 文档](https://www.graalvm.org/latest/reference-manual/polyglot-programming/)
- [Vitest 文档](https://vitest.dev/)
- [Bouncy Castle 文档](https://www.bouncycastle.org/documentation.html)

## 🎉 测试成就

- ✅ **1077 个测试全部通过**
- ✅ **完整的跨语言兼容性验证**
- ✅ **涵盖所有 SM 算法（SM3、SM2 签名、SM2 加密）**
- ✅ **参数化 + 属性 + 互操作三重测试保障**
- ✅ **零失败、零错误、零跳过**

---

如有疑问或建议，欢迎在 [Issues](../../issues) 中讨论！
