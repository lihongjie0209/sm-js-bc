# 测试策略文档

## 测试方案概述

为确保 TypeScript 实现与 bc-java 完全一致，采用多层次的测试策略。

## 1. 与 Java 代码对比测试方案

### 方案 A: 通过 Java CLI 工具对比（推荐）

#### 优点
- ✅ 简单直接，不需要复杂的 JNI 或跨语言调用
- ✅ 易于调试和维护
- ✅ 可以在 CI/CD 中轻松集成
- ✅ 测试数据格式清晰（JSON）

#### 实现步骤

##### 1.1 创建 Java 测试工具
在 `data/bc-java` 中创建一个简单的命令行工具：

```java
// TestVectorGenerator.java
public class TestVectorGenerator {
    public static void main(String[] args) {
        String operation = args[0]; // "sm3-hash", "sm2-sign", "sm2-encrypt"
        String input = args[1];      // 输入数据（hex或base64）
        
        switch(operation) {
            case "sm3-hash":
                generateSM3TestVector(input);
                break;
            case "sm2-sign":
                generateSM2SignTestVector(input);
                break;
            case "sm2-encrypt":
                generateSM2EncryptTestVector(input);
                break;
        }
    }
    
    private static void generateSM3TestVector(String input) {
        SM3Digest digest = new SM3Digest();
        byte[] data = Hex.decode(input);
        digest.update(data, 0, data.length);
        byte[] output = new byte[digest.getDigestSize()];
        digest.doFinal(output, 0);
        
        // 输出 JSON 格式
        System.out.println(String.format(
            "{\"input\":\"%s\",\"output\":\"%s\"}",
            input, Hex.toHexString(output)
        ));
    }
}
```

##### 1.2 TypeScript 测试中调用 Java 工具

```typescript
// test/utils/java-bridge.ts
import { execSync } from 'child_process';
import * as path from 'path';

export class JavaBridge {
  private javaToolPath: string;
  
  constructor() {
    this.javaToolPath = path.join(__dirname, '../../data/bc-java/build');
  }
  
  /**
   * 调用 Java 实现生成测试向量
   */
  generateTestVector(operation: string, input: string): any {
    const command = `java -cp "${this.javaToolPath}/*" TestVectorGenerator ${operation} ${input}`;
    const result = execSync(command, { encoding: 'utf-8' });
    return JSON.parse(result);
  }
  
  /**
   * 测试 SM3 哈希
   */
  sm3Hash(input: Uint8Array): Uint8Array {
    const inputHex = Buffer.from(input).toString('hex');
    const result = this.generateTestVector('sm3-hash', inputHex);
    return Buffer.from(result.output, 'hex');
  }
  
  /**
   * 测试 SM2 签名
   */
  sm2Sign(message: Uint8Array, privateKey: string): {
    r: string;
    s: string;
  } {
    const data = {
      message: Buffer.from(message).toString('hex'),
      privateKey: privateKey
    };
    const result = this.generateTestVector('sm2-sign', JSON.stringify(data));
    return result;
  }
}
```

##### 1.3 编写对比测试

```typescript
// test/crypto/digests/SM3Digest.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SM3Digest } from '../../../src/crypto/digests/SM3Digest';
import { JavaBridge } from '../../utils/java-bridge';

describe('SM3Digest - Java Comparison', () => {
  let javaBridge: JavaBridge;
  
  beforeAll(() => {
    javaBridge = new JavaBridge();
  });
  
  it('should produce same hash as bc-java for empty input', () => {
    const input = new Uint8Array(0);
    
    // TypeScript 实现
    const tsDigest = new SM3Digest();
    tsDigest.update(input, 0, 0);
    const tsOutput = new Uint8Array(tsDigest.getDigestSize());
    tsDigest.doFinal(tsOutput, 0);
    
    // Java 实现
    const javaOutput = javaBridge.sm3Hash(input);
    
    // 对比结果
    expect(tsOutput).toEqual(javaOutput);
  });
  
  it('should produce same hash as bc-java for various inputs', () => {
    const testCases = [
      'abc',
      'abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
      'The quick brown fox jumps over the lazy dog',
      '中文测试',
    ];
    
    for (const testCase of testCases) {
      const input = new TextEncoder().encode(testCase);
      
      const tsDigest = new SM3Digest();
      tsDigest.update(input, 0, input.length);
      const tsOutput = new Uint8Array(tsDigest.getDigestSize());
      tsDigest.doFinal(tsOutput, 0);
      
      const javaOutput = javaBridge.sm3Hash(input);
      
      expect(tsOutput).toEqual(javaOutput);
    }
  });
});
```

### 方案 B: 使用预生成的测试向量文件

如果不想在测试时动态调用 Java，可以预先生成测试向量。

#### 实现步骤

##### 2.1 批量生成测试向量

```java
// GenerateAllTestVectors.java
public class GenerateAllTestVectors {
    public static void main(String[] args) throws Exception {
        JSONObject allVectors = new JSONObject();
        
        // SM3 测试向量
        allVectors.put("sm3", generateSM3Vectors());
        
        // SM2 签名测试向量
        allVectors.put("sm2-sign", generateSM2SignVectors());
        
        // SM2 加密测试向量
        allVectors.put("sm2-encrypt", generateSM2EncryptVectors());
        
        // 输出到文件
        Files.write(
            Paths.get("test/test-vectors/bc-java-vectors.json"),
            allVectors.toString(2).getBytes()
        );
    }
    
    private static JSONArray generateSM3Vectors() {
        JSONArray vectors = new JSONArray();
        
        String[] inputs = {
            "",
            "616263", // "abc"
            "61626364616263646162636461626364...", // 长字符串
        };
        
        for (String input : inputs) {
            SM3Digest digest = new SM3Digest();
            byte[] data = Hex.decode(input);
            digest.update(data, 0, data.length);
            byte[] output = new byte[digest.getDigestSize()];
            digest.doFinal(output, 0);
            
            JSONObject vector = new JSONObject();
            vector.put("input", input);
            vector.put("output", Hex.toHexString(output));
            vectors.put(vector);
        }
        
        return vectors;
    }
}
```

##### 2.2 在 TypeScript 中使用预生成的向量

```typescript
// test/crypto/digests/SM3Digest.vectors.test.ts
import { describe, it, expect } from 'vitest';
import { SM3Digest } from '../../../src/crypto/digests/SM3Digest';
import testVectors from '../../test-vectors/bc-java-vectors.json';

describe('SM3Digest - Test Vectors', () => {
  it('should match all bc-java test vectors', () => {
    for (const vector of testVectors.sm3) {
      const input = Buffer.from(vector.input, 'hex');
      const expectedOutput = Buffer.from(vector.output, 'hex');
      
      const digest = new SM3Digest();
      digest.update(input, 0, input.length);
      const output = new Uint8Array(digest.getDigestSize());
      digest.doFinal(output, 0);
      
      expect(Buffer.from(output)).toEqual(expectedOutput);
    }
  });
});
```

### 方案 C: 使用 GraalVM (高级方案)

如果需要更深度的集成，可以使用 GraalVM 来在 Node.js 中直接调用 Java 代码。

#### 优点
- ✅ 真正的跨语言调用
- ✅ 可以直接使用 Java 对象

#### 缺点
- ❌ 配置复杂
- ❌ 需要 GraalVM 环境
- ❌ 增加测试环境复杂度

## 2. 标准测试向量验证

### 2.1 国密标准测试向量

```typescript
// test/test-vectors/gm-standard-vectors.ts
/**
 * GM/T 0003-2012 SM2 标准测试向量
 * GM/T 0004-2012 SM3 标准测试向量
 */
export const GM_STANDARD_VECTORS = {
  sm3: [
    {
      // GB/T 32905-2016 示例 1
      input: '616263',
      output: '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0'
    },
    {
      // GB/T 32905-2016 示例 2  
      input: '61626364616263646162636461626364616263646162636461626364616263646162636461626364616263646162636461626364616263646162636461626364',
      output: 'debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732'
    }
  ],
  sm2: {
    // SM2 标准测试向量
  }
};
```

## 3. 完整测试策略

### 3.1 测试层次

```
测试金字塔
    ┌─────────────────┐
    │  集成测试 (10%)  │  - 完整流程测试
    ├─────────────────┤
    │  对比测试 (30%)  │  - 与 Java 对比
    │                 │  - 与标准向量对比
    ├─────────────────┤
    │  单元测试 (60%)  │  - 每个类/方法
    │                 │  - 边界条件
    │                 │  - 异常情况
    └─────────────────┘
```

### 3.2 测试文件组织

```
test/
├── unit/                          # 单元测试
│   ├── crypto/
│   │   ├── digests/
│   │   │   ├── SM3Digest.test.ts
│   │   │   └── GeneralDigest.test.ts
│   │   ├── signers/
│   │   │   └── SM2Signer.test.ts
│   │   └── engines/
│   │       └── SM2Engine.test.ts
│   ├── math/
│   │   └── ec/
│   │       ├── ECPoint.test.ts
│   │       └── ECCurve.test.ts
│   └── util/
│       ├── BigIntegers.test.ts
│       └── Pack.test.ts
├── comparison/                    # 与 Java 对比测试
│   ├── SM3Digest.java.test.ts
│   ├── SM2Signer.java.test.ts
│   └── SM2Engine.java.test.ts
├── vectors/                       # 标准向量测试
│   ├── SM3Digest.vectors.test.ts
│   └── SM2.vectors.test.ts
├── integration/                   # 集成测试
│   ├── sm2-full-flow.test.ts
│   └── sm3-full-flow.test.ts
├── performance/                   # 性能测试
│   ├── sm3-benchmark.test.ts
│   └── sm2-benchmark.test.ts
├── utils/
│   ├── java-bridge.ts            # Java 调用桥接
│   └── test-helpers.ts           # 测试辅助函数
└── test-vectors/
    ├── bc-java-vectors.json      # bc-java 生成的测试向量
    └── gm-standard-vectors.json  # 国密标准测试向量
```

## 4. CI/CD 集成

### 4.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true  # 包含 bc-java 子模块
      
      # 设置 Java 环境（用于生成测试向量）
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      # 编译 Java 测试工具
      - name: Build Java Test Tools
        run: |
          cd data/bc-java
          ./gradlew :test:jar
          cd ../..
      
      # 设置 Node.js 环境
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      # 安装依赖
      - name: Install dependencies
        run: npm ci
      
      # 运行测试
      - name: Run tests
        run: npm test
      
      # 生成覆盖率报告
      - name: Coverage
        run: npm run test:coverage
      
      # 上传覆盖率
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 5. 测试命令

### 5.1 package.json 脚本

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run test/unit",
    "test:comparison": "vitest run test/comparison",
    "test:vectors": "vitest run test/vectors",
    "test:integration": "vitest run test/integration",
    "test:perf": "vitest run test/performance",
    "java:build": "cd data/bc-java && ./gradlew :test:jar",
    "java:vectors": "node scripts/generate-test-vectors.js"
  }
}
```

### 5.2 生成测试向量脚本

```javascript
// scripts/generate-test-vectors.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating test vectors from bc-java...');

// 确保 Java 工具已编译
execSync('npm run java:build', { stdio: 'inherit' });

// 运行 Java 工具生成测试向量
const javaClassPath = path.join(__dirname, '../data/bc-java/test/build/libs/*');
const outputPath = path.join(__dirname, '../test/test-vectors/bc-java-vectors.json');

const command = `java -cp "${javaClassPath}" GenerateAllTestVectors ${outputPath}`;
execSync(command, { stdio: 'inherit' });

console.log(`Test vectors generated at: ${outputPath}`);
```

## 6. 推荐方案（两阶段测试策略）

### 阶段 1: 开发阶段 - JavaScript 自闭环测试

**目标**: 确保 TypeScript 实现内部逻辑正确

#### 测试重点
1. **SM3 哈希**
   - 各种长度输入
   - 边界条件
   - 与标准测试向量对比

2. **SM2 签名/验签闭环**
   ```typescript
   // 闭环测试示例
   const keyPair = generateKeyPair();
   const message = "test message";
   
   // 自己签名，自己验证
   const signature = sm2Signer.sign(message, keyPair.privateKey);
   const isValid = sm2Signer.verify(message, signature, keyPair.publicKey);
   
   expect(isValid).toBe(true);
   ```

3. **SM2 加密/解密闭环**
   ```typescript
   const plaintext = new Uint8Array([1, 2, 3, 4]);
   const ciphertext = sm2Engine.encrypt(plaintext, publicKey);
   const decrypted = sm2Engine.decrypt(ciphertext, privateKey);
   
   expect(decrypted).toEqual(plaintext);
   ```

4. **SM2 密钥交换闭环**
   ```typescript
   // Alice 和 Bob 都是 JS 实现
   const aliceExchange = new SM2KeyExchange();
   const bobExchange = new SM2KeyExchange();
   
   // 模拟完整的密钥协商过程
   const aliceInit = aliceExchange.init(aliceKeyPair);
   const bobInit = bobExchange.init(bobKeyPair);
   
   const aliceSharedKey = aliceExchange.calculateKey(bobInit);
   const bobSharedKey = bobExchange.calculateKey(aliceInit);
   
   expect(aliceSharedKey).toEqual(bobSharedKey);
   ```

#### 优势
- ✅ 快速反馈，不依赖外部工具
- ✅ 易于调试
- ✅ 验证算法内部一致性
- ✅ 适合 TDD 开发模式

### 阶段 2: 完成阶段 - GraalVM 跨语言交互测试

**目标**: 确保与 bc-java 完全兼容，特别是交互场景

#### 为什么选择 GraalVM？

1. **签名场景**: 同样数据每次签名值不同（因为随机数 k）
   - ❌ 简单的等值比较不适用
   - ✅ 需要：JS 签名 → Java 验证
   - ✅ 需要：Java 签名 → JS 验证

2. **密钥交换场景**: 需要双方交互
   - ❌ 无法通过静态测试向量验证
   - ✅ 需要：JS 作为 Alice，Java 作为 Bob 进行密钥协商
   - ✅ 需要：Java 作为 Alice，JS 作为 Bob 进行密钥协商

3. **加密场景**: 每次加密结果不同（因为随机数）
   - ✅ 需要：JS 加密 → Java 解密
   - ✅ 需要：Java 加密 → JS 解密

#### 实现方案

##### 2.1 项目结构

```
sm-js-bc/
├── src/                          # TypeScript 实现
├── dist/                         # 编译后的 JS 文件
├── test/
│   ├── unit/                     # 阶段1：自闭环测试
│   └── graalvm-integration/      # 阶段2：跨语言测试（新增）
│       ├── java/                 # Java 测试项目
│       │   ├── pom.xml
│       │   ├── src/
│       │   │   └── test/java/
│       │   │       ├── SM2SignatureInteropTest.java
│       │   │       ├── SM2EncryptionInteropTest.java
│       │   │       └── SM2KeyExchangeInteropTest.java
│       │   └── js-dist/          # 链接到 ../../dist
│       └── README.md
└── docs/
```

##### 2.2 Java 测试项目配置

```xml
<!-- test/graalvm-integration/java/pom.xml -->
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>org.example</groupId>
    <artifactId>sm-js-bc-interop-test</artifactId>
    <version>1.0.0</version>
    
    <dependencies>
        <!-- Bouncy Castle -->
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk18on</artifactId>
            <version>1.78</version>
        </dependency>
        
        <!-- GraalVM JavaScript Engine -->
        <dependency>
            <groupId>org.graalvm.polyglot</groupId>
            <artifactId>polyglot</artifactId>
            <version>24.0.0</version>
        </dependency>
        <dependency>
            <groupId>org.graalvm.polyglot</groupId>
            <artifactId>js</artifactId>
            <version>24.0.0</version>
            <type>pom</type>
        </dependency>
        
        <!-- JUnit -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

##### 2.3 跨语言签名测试

```java
// SM2SignatureInteropTest.java
package org.example.interop;

import org.bouncycastle.crypto.signers.SM2Signer;
import org.bouncycastle.crypto.params.*;
import org.graalvm.polyglot.*;
import org.junit.jupiter.api.*;
import java.nio.file.*;

public class SM2SignatureInteropTest {
    
    private Context jsContext;
    private Value jsSM2;
    
    @BeforeEach
    public void setup() throws Exception {
        // 初始化 GraalVM Context
        jsContext = Context.newBuilder("js")
            .allowAllAccess(true)
            .build();
        
        // 加载编译后的 JS 文件
        String jsCode = Files.readString(
            Paths.get("js-dist/sm-js-bc.bundle.js")
        );
        jsContext.eval("js", jsCode);
        
        // 获取 JS 中的 SM2 对象
        jsSM2 = jsContext.getBindings("js").getMember("SM2");
    }
    
    @AfterEach
    public void teardown() {
        if (jsContext != null) {
            jsContext.close();
        }
    }
    
    @Test
    @DisplayName("Java 签名 → JS 验证")
    public void testJavaSignJsVerify() throws Exception {
        // 生成密钥对（使用 Java）
        ECKeyPairGenerator keyGen = new ECKeyPairGenerator();
        // ... 生成密钥对
        
        byte[] message = "test message".getBytes();
        
        // Java 签名
        SM2Signer javaSigner = new SM2Signer();
        javaSigner.init(true, privateKeyParams);
        javaSigner.update(message, 0, message.length);
        byte[] signature = javaSigner.generateSignature();
        
        // 将公钥和签名传递给 JS
        Value jsVerifier = jsSM2.getMember("Signer").newInstance();
        Value jsPublicKey = convertToJSPublicKey(publicKey);
        
        // JS 验证
        boolean isValid = jsVerifier.invokeMember(
            "verify",
            message,
            signature,
            jsPublicKey
        ).asBoolean();
        
        Assertions.assertTrue(isValid, "JS should verify Java signature");
    }
    
    @Test
    @DisplayName("JS 签名 → Java 验证")
    public void testJsSignJavaVerify() throws Exception {
        // JS 生成密钥对
        Value jsKeyPair = jsSM2.invokeMember("generateKeyPair");
        Value jsPublicKey = jsKeyPair.getMember("publicKey");
        Value jsPrivateKey = jsKeyPair.getMember("privateKey");
        
        byte[] message = "test message".getBytes();
        
        // JS 签名
        Value jsSigner = jsSM2.getMember("Signer").newInstance();
        Value jsSignature = jsSigner.invokeMember(
            "sign",
            message,
            jsPrivateKey
        );
        byte[] signature = jsSignature.as(byte[].class);
        
        // 转换公钥到 Java 格式
        ECPublicKeyParameters javaPublicKey = convertToJavaPublicKey(jsPublicKey);
        
        // Java 验证
        SM2Signer javaVerifier = new SM2Signer();
        javaVerifier.init(false, javaPublicKey);
        javaVerifier.update(message, 0, message.length);
        boolean isValid = javaVerifier.verifySignature(signature);
        
        Assertions.assertTrue(isValid, "Java should verify JS signature");
    }
    
    private Value convertToJSPublicKey(ECPublicKeyParameters javaKey) {
        // 将 Java 公钥转换为 JS 可用的格式
        // 返回包含 x, y 坐标的 JS 对象
        // ...
    }
    
    private ECPublicKeyParameters convertToJavaPublicKey(Value jsKey) {
        // 将 JS 公钥转换为 Java 格式
        // ...
    }
}
```

##### 2.4 跨语言密钥交换测试

```java
// SM2KeyExchangeInteropTest.java
@Test
@DisplayName("JS 作为 Alice, Java 作为 Bob 的密钥交换")
public void testJsAliceJavaBob() throws Exception {
    // JS Alice 初始化
    Value jsAlice = jsSM2.getMember("KeyExchange").newInstance();
    Value jsAliceInit = jsAlice.invokeMember("init", jsAliceKeyPair, "Alice");
    
    // Java Bob 初始化
    SM2KeyExchange javaBob = new SM2KeyExchange();
    byte[] javaBobInit = javaBob.calculateAgreement(
        bobPrivateKey,
        bobEphemeralPrivateKey,
        alicePublicKey,
        aliceEphemeralPublicKey,
        "Bob".getBytes()
    );
    
    // JS Alice 计算共享密钥
    Value jsSharedKey = jsAlice.invokeMember(
        "calculateKey",
        convertToJSBytes(javaBobInit)
    );
    
    // Java Bob 计算共享密钥
    byte[] javaSharedKey = javaBob.calculateKey(
        convertToJavaBytes(jsAliceInit)
    );
    
    // 比较共享密钥
    Assertions.assertArrayEquals(
        javaSharedKey,
        jsSharedKey.as(byte[].class),
        "Shared keys should match"
    );
}

@Test
@DisplayName("Java 作为 Alice, JS 作为 Bob 的密钥交换")
public void testJavaAliceJsBob() throws Exception {
    // 反向测试
    // ...
}
```

##### 2.5 跨语言加密解密测试

```java
// SM2EncryptionInteropTest.java
@Test
@DisplayName("JS 加密 → Java 解密")
public void testJsEncryptJavaDecrypt() throws Exception {
    byte[] plaintext = "Hello, World!".getBytes();
    
    // JS 加密
    Value jsEngine = jsSM2.getMember("Engine").newInstance();
    Value jsCiphertext = jsEngine.invokeMember(
        "encrypt",
        plaintext,
        jsPublicKey
    );
    byte[] ciphertext = jsCiphertext.as(byte[].class);
    
    // Java 解密
    SM2Engine javaEngine = new SM2Engine();
    javaEngine.init(false, javaPrivateKey);
    byte[] decrypted = javaEngine.processBlock(
        ciphertext, 0, ciphertext.length
    );
    
    Assertions.assertArrayEquals(plaintext, decrypted);
}

@Test
@DisplayName("Java 加密 → JS 解密")
public void testJavaEncryptJsDecrypt() throws Exception {
    byte[] plaintext = "Hello, World!".getBytes();
    
    // Java 加密
    SM2Engine javaEngine = new SM2Engine();
    javaEngine.init(true, new ParametersWithRandom(javaPublicKey));
    byte[] ciphertext = javaEngine.processBlock(
        plaintext, 0, plaintext.length
    );
    
    // JS 解密
    Value jsEngine = jsSM2.getMember("Engine").newInstance();
    Value jsDecrypted = jsEngine.invokeMember(
        "decrypt",
        ciphertext,
        jsPrivateKey
    );
    byte[] decrypted = jsDecrypted.as(byte[].class);
    
    Assertions.assertArrayEquals(plaintext, decrypted);
}
```

#### 测试运行方式

```bash
# 阶段 1: 开发阶段 - 快速迭代
npm test                    # 运行所有 JS 自闭环测试
npm run test:watch          # 监听模式

# 阶段 2: 完成阶段 - 跨语言验证
npm run build              # 编译 TS → JS bundle
npm run test:interop       # 运行 Java 互操作测试

# test:interop 实际执行:
# cd test/graalvm-integration/java
# mvn test
```

#### package.json 配置

```json
{
  "scripts": {
    "build": "tsdown src/index.ts --format cjs,esm --dts",
    "build:bundle": "tsdown src/index.ts --format iife --out dist/sm-js-bc.bundle.js",
    "test": "vitest run test/unit",
    "test:watch": "vitest test/unit",
    "test:interop": "npm run build:bundle && cd test/graalvm-integration/java && mvn test",
    "test:all": "npm test && npm run test:interop"
  }
}
```

### 测试策略对比

| 维度 | 阶段1: 自闭环 | 阶段2: GraalVM |
|------|--------------|---------------|
| **时机** | 开发过程中 | 功能完成后 |
| **速度** | 快（毫秒级） | 慢（需要启动 JVM） |
| **覆盖** | 算法内部逻辑 | 跨语言兼容性 |
| **适用场景** | TDD 开发 | 集成验证 |
| **签名测试** | 自签自验 | Java↔JS 交叉验证 |
| **密钥交换** | JS Alice ↔ JS Bob | JS Alice ↔ Java Bob |
| **加密测试** | 自加自解 | Java↔JS 交叉加解密 |

### 优势总结

#### 阶段 1 优势
- ✅ 开发效率高
- ✅ 问题定位快
- ✅ 适合 CI 持续集成
- ✅ 不需要额外环境配置

#### 阶段 2 优势
- ✅ 真正的互操作性验证
- ✅ 覆盖随机性场景（签名、加密）
- ✅ 覆盖交互场景（密钥交换）
- ✅ 确保与 bc-java 100% 兼容
- ✅ 可以发现序列化/反序列化问题

## 7. 实施路线图

### Phase 1: 基础设施 + 自闭环测试（第 1-2 周）

```
开发内容                    测试内容
├── 异常类                  ├── 异常类单元测试
├── Pack 工具               ├── Pack 单元测试
├── Arrays/Bytes 工具       ├── Arrays/Bytes 单元测试
└── BigIntegers 工具        └── BigIntegers 单元测试
```

**测试命令**: `npm test`  
**目标**: 100% 代码覆盖率

### Phase 2: SM3 实现 + 自闭环测试（第 3 周）

```
开发内容                    测试内容
├── Digest 接口             ├── SM3 单元测试
├── GeneralDigest 基类      ├── SM3 标准向量测试
└── SM3Digest 实现          └── SM3 性能测试
```

**测试类型**:
- ✅ 空字符串、短字符串、长字符串
- ✅ GB/T 32905-2016 标准测试向量
- ✅ 多次调用 update 的场景
- ✅ reset 后重用的场景

**测试命令**: `npm test`

### Phase 3: 椭圆曲线基础 + 自闭环测试（第 4-5 周）

```
开发内容                    测试内容
├── 有限域运算              ├── 有限域单元测试
├── ECFieldElement          ├── ECPoint 单元测试
├── ECPoint                 ├── ECCurve 单元测试
├── ECCurve                 ├── ECMultiplier 单元测试
└── ECMultiplier            └── 点运算正确性测试
```

**测试命令**: `npm test`

### Phase 4: SM2 签名 + 自闭环测试（第 6 周）

```
开发内容                    测试内容
├── DSAEncoding             ├── SM2Signer 单元测试
├── DSAKCalculator          ├── 签名验签闭环测试
└── SM2Signer               ├── 边界条件测试
                            └── 标准测试向量
```

**闭环测试示例**:
```typescript
describe('SM2Signer - Self Test', () => {
  it('should sign and verify correctly', () => {
    const keyPair = generateKeyPair();
    const message = new Uint8Array([1, 2, 3]);
    
    // 签名
    const signature = signer.sign(message, keyPair.privateKey);
    
    // 验签
    const isValid = signer.verify(message, signature, keyPair.publicKey);
    
    expect(isValid).toBe(true);
  });
  
  it('should reject invalid signatures', () => {
    const keyPair = generateKeyPair();
    const message = new Uint8Array([1, 2, 3]);
    const signature = signer.sign(message, keyPair.privateKey);
    
    // 修改签名
    signature[0] ^= 0xFF;
    
    const isValid = signer.verify(message, signature, keyPair.publicKey);
    expect(isValid).toBe(false);
  });
});
```

**测试命令**: `npm test`

### Phase 5: SM2 加密 + 自闭环测试（第 7 周）

```
开发内容                    测试内容
└── SM2Engine               ├── SM2Engine 单元测试
                            ├── 加密解密闭环测试
                            ├── C1C2C3 和 C1C3C2 模式测试
                            └── KDF 正确性测试
```

**闭环测试示例**:
```typescript
describe('SM2Engine - Self Test', () => {
  it('should encrypt and decrypt correctly', () => {
    const keyPair = generateKeyPair();
    const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
    
    // 加密
    const ciphertext = engine.encrypt(plaintext, keyPair.publicKey);
    
    // 解密
    const decrypted = engine.decrypt(ciphertext, keyPair.privateKey);
    
    expect(decrypted).toEqual(plaintext);
  });
});
```

**测试命令**: `npm test`

### Phase 6: SM2 密钥交换 + 自闭环测试（第 8 周）

```
开发内容                    测试内容
└── SM2KeyExchange          ├── SM2KeyExchange 单元测试
                            └── 密钥协商闭环测试（JS Alice ↔ JS Bob）
```

**闭环测试示例**:
```typescript
describe('SM2KeyExchange - Self Test', () => {
  it('Alice and Bob should derive same shared key', () => {
    const aliceKeyPair = generateKeyPair();
    const bobKeyPair = generateKeyPair();
    
    // Alice 初始化
    const alice = new SM2KeyExchange();
    const aliceInit = alice.init(aliceKeyPair, 'Alice');
    
    // Bob 初始化
    const bob = new SM2KeyExchange();
    const bobInit = bob.init(bobKeyPair, 'Bob');
    
    // 交换并计算共享密钥
    const aliceSharedKey = alice.calculateKey(bobInit);
    const bobSharedKey = bob.calculateKey(aliceInit);
    
    expect(aliceSharedKey).toEqual(bobSharedKey);
  });
});
```

**测试命令**: `npm test`

### Phase 7: GraalVM 互操作测试（第 9 周）

```
准备工作                    测试内容
├── 打包 JS bundle          ├── Java 签名 → JS 验证
├── 创建 Java 测试项目      ├── JS 签名 → Java 验证
├── 配置 GraalVM            ├── Java 加密 → JS 解密
└── 编写互操作测试          ├── JS 加密 → Java 解密
                            ├── Java Alice ↔ JS Bob 密钥交换
                            └── JS Alice ↔ Java Bob 密钥交换
```

**测试步骤**:
```bash
# 1. 构建 JS bundle
npm run build:bundle

# 2. 运行互操作测试
npm run test:interop

# 3. 查看测试报告
cd test/graalvm-integration/java
mvn surefire-report:report
```

**测试命令**: `npm run test:interop`

### Phase 8: 完善与发布（第 10 周）

```
完善内容                    测试内容
├── 性能优化                ├── 性能基准测试
├── 文档完善                ├── 示例代码验证
├── API 稳定性              ├── 向后兼容性测试
└── 发布准备                └── 完整测试套件运行
```

**最终测试命令**: `npm run test:all`

## 8. CI/CD 集成

### 8.1 开发阶段 CI

```yaml
# .github/workflows/dev-test.yml
name: Development Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

### 8.2 完成阶段 CI

```yaml
# .github/workflows/interop-test.yml
name: Interoperability Tests

on:
  push:
    branches: [main, release/*]

jobs:
  interop-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Setup Java with GraalVM
        uses: graalvm/setup-graalvm@v1
        with:
          java-version: '21'
          distribution: 'graalvm'
          github-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Install Node dependencies
        run: npm ci
      
      - name: Build JS bundle
        run: npm run build:bundle
      
      - name: Run interop tests
        run: npm run test:interop
      
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        with:
          name: interop-test-reports
          path: test/graalvm-integration/java/target/surefire-reports/
```

## 9. 测试覆盖率目标

| 阶段 | 单元测试覆盖率 | 互操作测试 | 标准向量测试 |
|------|--------------|-----------|-------------|
| Phase 1-2 | >95% | - | ✅ |
| Phase 3-6 | >90% | - | ✅ |
| Phase 7 | >90% | ✅ | ✅ |
| Phase 8 | >95% | ✅ | ✅ |

## 10. 下一步行动

### 立即开始（本周）
- [ ] 初始化项目结构
- [ ] 配置 TypeScript + Vitest
- [ ] 实现第一个工具类（Pack）
- [ ] 编写第一个单元测试

### 短期目标（1-2 周）
- [ ] 完成 Phase 1：基础设施
- [ ] 所有工具类 100% 测试覆盖率
- [ ] 建立 CI/CD 流程

### 中期目标（3-6 周）
- [ ] 完成 SM3 实现
- [ ] 完成 SM2 签名实现
- [ ] 所有自闭环测试通过

### 长期目标（7-10 周）
- [ ] 完成所有功能实现
- [ ] GraalVM 互操作测试全部通过
- [ ] 发布 v1.0.0
