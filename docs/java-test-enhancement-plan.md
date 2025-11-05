# Java测试增强方案：参数化与随机化测试

## 目标

增强 GraalVM 集成测试的覆盖率和可靠性，通过参数化测试和随机化测试验证：
1. 多种输入数据组合的正确性
2. 边界条件和极端情况的处理
3. 大规模随机测试的一致性
4. 性能基准测试

## 当前测试状态分析

### 现有测试文件
- `SM3DigestInteropTest.java` - SM3哈希跨语言验证
- `SM2SignatureInteropTest.java` - SM2签名跨语言验证
- `SM2EncryptionInteropTest.java` - SM2加密跨语言验证
- `BaseGraalVMTest.java` - 基础测试类

### 当前测试特点
- ✅ 基本功能验证
- ✅ 标准测试向量
- ✅ 跨语言互操作性验证
- ❌ 缺少参数化测试
- ❌ 缺少大规模随机测试
- ❌ 缺少边界条件全面测试
- ❌ 缺少性能基准测试

## 增强方案设计

### 1. 参数化测试框架 (JUnit 5 @ParameterizedTest)

#### 1.1 SM3 参数化测试

**测试类**: `SM3ParameterizedTest.java`

**测试维度**:
```java
@ParameterizedTest
@MethodSource("provideMessageSizes")
void testSM3WithVariousMessageSizes(int size, String description)

@ParameterizedTest
@ValueSource(strings = {"", "a", "abc", "message digest", "abcd".repeat(16)})
void testSM3StandardInputs(String input)

@ParameterizedTest
@CsvSource({
    "'', 1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b",
    "'a', 623476ac18f65a2909e43c7fec61b49c7e764a91a18ccb82f1917a29c86c5e88",
    "'abc', 66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0"
})
void testSM3KnownVectors(String input, String expectedHash)

@ParameterizedTest
@EnumSource(CharacterSet.class)
void testSM3CharacterSets(CharacterSet charset)
```

**测试场景**:
- 空字符串、单字符、短消息、长消息
- ASCII、UTF-8、中文、表情符号
- 消息大小：0B, 1B, 55B, 56B, 64B, 1KB, 10KB, 1MB
- 增量更新：单次 vs 多次 update()
- 并发哈希计算

#### 1.2 SM2 签名参数化测试

**测试类**: `SM2SignatureParameterizedTest.java`

**测试维度**:
```java
@ParameterizedTest
@MethodSource("provideKeyPairs")
void testSM2SignatureWithMultipleKeyPairs(KeyPairTestData keyPair)

@ParameterizedTest
@ValueSource(ints = {0, 1, 32, 100, 1000, 10000})
void testSM2SignatureWithVariousMessageLengths(int length)

@ParameterizedTest
@CsvSource({
    "Hello SM2, UTF-8",
    "SM2签名测试, UTF-8",
    "🔐🔑📝, UTF-8",
    "Binary message, ISO-8859-1"
})
void testSM2SignatureWithDifferentEncodings(String message, String encoding)

@ParameterizedTest
@MethodSource("provideUserIds")
void testSM2SignatureWithDifferentUserIds(byte[] userId)
```

**测试场景**:
- 多个随机生成的密钥对
- 不同长度的消息（包括空消息、极长消息）
- 不同的 userId（空、默认、自定义）
- 不同字符编码
- 签名格式变体（DER、Raw）

#### 1.3 SM2 加密参数化测试

**测试类**: `SM2EncryptionParameterizedTest.java`

**测试维度**:
```java
@ParameterizedTest
@MethodSource("provideMessageSizes")
void testSM2EncryptionWithVariousMessageSizes(int size)

@ParameterizedTest
@ValueSource(strings = {"C1C3C2", "C1C2C3"})
void testSM2EncryptionModes(String mode)

@ParameterizedTest
@MethodSource("provideKeyPairs")
void testSM2EncryptionWithMultipleKeyPairs(KeyPairTestData keyPair)

@RepeatedTest(100)
void testSM2EncryptionConsistency()
```

**测试场景**:
- 消息大小：1B, 32B, 100B, 1KB, 最大允许大小
- C1C3C2 和 C1C2C3 两种模式
- 多个密钥对
- 重复加密相同消息（验证随机性）

### 2. 随机化测试框架

#### 2.1 基于属性的测试 (Property-Based Testing)

**测试类**: `SM3PropertyBasedTest.java`, `SM2PropertyBasedTest.java`

**测试属性**:

```java
// SM3 属性测试
@RepeatedTest(1000)
void sm3DeterministicProperty() {
    // 属性: 相同输入产生相同输出
    byte[] randomInput = generateRandomBytes(random.nextInt(10000));
    String hash1 = computeSM3(randomInput);
    String hash2 = computeSM3(randomInput);
    assertEquals(hash1, hash2);
}

@RepeatedTest(1000)
void sm3LengthProperty() {
    // 属性: 输出长度总是256位(32字节)
    byte[] randomInput = generateRandomBytes(random.nextInt(10000));
    String hash = computeSM3(randomInput);
    assertEquals(64, hash.length()); // 32 bytes in hex
}

@RepeatedTest(1000)
void sm3AvalancheProperty() {
    // 属性: 单比特变化导致约50%输出变化
    byte[] input = generateRandomBytes(100);
    String hash1 = computeSM3(input);
    
    // 翻转一个随机比特
    int byteIndex = random.nextInt(input.length);
    int bitIndex = random.nextInt(8);
    input[byteIndex] ^= (1 << bitIndex);
    
    String hash2 = computeSM3(input);
    
    int diffBits = countDifferentBits(hash1, hash2);
    // 雪崩效应：40%-60%的比特应该不同
    assertTrue(diffBits >= 102 && diffBits <= 154, // 256 * 0.4 to 0.6
        "Avalanche effect test failed: " + diffBits + " bits different");
}

// SM2 属性测试
@RepeatedTest(500)
void sm2SignatureVerifiabilityProperty() {
    // 属性: 所有合法签名都应该可验证
    KeyPair keyPair = generateRandomKeyPair();
    byte[] message = generateRandomBytes(random.nextInt(1000));
    
    byte[] signature = sign(keyPair.privateKey, message);
    assertTrue(verify(keyPair.publicKey, message, signature));
}

@RepeatedTest(500)
void sm2EncryptionDecryptionProperty() {
    // 属性: 加密后解密应该得到原始消息
    KeyPair keyPair = generateRandomKeyPair();
    byte[] plaintext = generateRandomBytes(random.nextInt(1000) + 1);
    
    byte[] ciphertext = encrypt(keyPair.publicKey, plaintext);
    byte[] decrypted = decrypt(keyPair.privateKey, ciphertext);
    
    assertArrayEquals(plaintext, decrypted);
}
```

#### 2.2 模糊测试 (Fuzz Testing)

**测试类**: `SM3FuzzTest.java`, `SM2FuzzTest.java`

**测试策略**:

```java
@RepeatedTest(5000)
void sm3FuzzTest() {
    // 生成随机输入
    byte[] input = generateFuzzInput();
    
    try {
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        // 验证两个实现产生相同结果
        assertEquals(javaHash, jsHash);
        
        // 验证输出格式正确
        assertTrue(javaHash.matches("[0-9a-f]{64}"));
    } catch (Exception e) {
        // 记录导致异常的输入
        logFuzzFailure(input, e);
        throw e;
    }
}

private byte[] generateFuzzInput() {
    int strategy = random.nextInt(10);
    switch (strategy) {
        case 0: return new byte[0]; // 空输入
        case 1: return new byte[1]; // 单字节
        case 2: return generateAllZeros(random.nextInt(1000));
        case 3: return generateAllOnes(random.nextInt(1000));
        case 4: return generateRepeatingPattern(random.nextInt(1000));
        case 5: return generateRandomBytes(65536); // 大输入
        case 6: return generateUTF8String(random.nextInt(500));
        case 7: return generateInvalidUTF8(random.nextInt(100));
        case 8: return generateBoundaryValues();
        default: return generateRandomBytes(random.nextInt(10000));
    }
}
```

#### 2.3 压力测试与性能基准

**测试类**: `PerformanceBenchmarkTest.java`

```java
@Test
void sm3ThroughputTest() {
    int iterations = 10000;
    long totalSize = 0;
    long startTime = System.nanoTime();
    
    for (int i = 0; i < iterations; i++) {
        byte[] input = generateRandomBytes(1024); // 1KB messages
        totalSize += input.length;
        computeSM3(input);
    }
    
    long endTime = System.nanoTime();
    double seconds = (endTime - startTime) / 1_000_000_000.0;
    double throughputMBps = (totalSize / (1024.0 * 1024.0)) / seconds;
    
    System.out.printf("SM3 Throughput: %.2f MB/s%n", throughputMBps);
    assertTrue(throughputMBps > 1.0, "Performance too low");
}

@Test
void crossLanguagePerformanceComparison() {
    // 比较Java和JavaScript实现的性能
    measureAndComparePerformance("SM3", 1000);
    measureAndComparePerformance("SM2 Sign", 100);
    measureAndComparePerformance("SM2 Encrypt", 100);
}
```

### 3. 边界条件测试

**测试类**: `BoundaryConditionsTest.java`

```java
@Nested
@DisplayName("SM3 Boundary Conditions")
class SM3BoundaryTests {
    
    @Test void testEmptyInput() { }
    
    @Test void testSingleByteInput() { }
    
    @Test void testBlockSizeMinusOne() { } // 63 bytes
    
    @Test void testExactBlockSize() { } // 64 bytes
    
    @Test void testBlockSizePlusOne() { } // 65 bytes
    
    @Test void testDoubleBlockSize() { } // 128 bytes
    
    @Test void testMaxInt() { } // Integer.MAX_VALUE考虑
    
    @Test void testNullInput() { }
    
    @Test void testIncrementalVsSingleUpdate() { }
}

@Nested
@DisplayName("SM2 Boundary Conditions")
class SM2BoundaryTests {
    
    @Test void testMinimumMessageSize() { }
    
    @Test void testMaximumMessageSize() { }
    
    @Test void testInvalidSignatureLength() { }
    
    @Test void testInvalidPublicKey() { }
    
    @Test void testInvalidPrivateKey() { }
    
    @Test void testSignatureModification() { }
}
```

### 4. 数据生成器工具类

**工具类**: `TestDataGenerator.java`

```java
public class TestDataGenerator {
    
    private static final SecureRandom random = new SecureRandom();
    
    // 随机字节生成
    public static byte[] randomBytes(int length) { }
    
    // 特定模式生成
    public static byte[] zerosPattern(int length) { }
    public static byte[] onesPattern(int length) { }
    public static byte[] alternatingPattern(int length) { }
    public static byte[] repeatingPattern(byte[] pattern, int totalLength) { }
    
    // 字符串生成
    public static String randomAsciiString(int length) { }
    public static String randomUnicodeString(int length) { }
    public static String randomChineseString(int length) { }
    public static String randomEmojiString(int length) { }
    
    // 密钥对生成
    public static KeyPairTestData randomKeyPair() { }
    public static List<KeyPairTestData> generateKeyPairSet(int count) { }
    
    // 边界值生成
    public static byte[] boundaryValue(BoundaryType type) { }
    
    // 测试向量加载
    public static List<TestVector> loadTestVectors(String filename) { }
}
```

### 5. 测试配置与执行策略

#### 5.1 测试分组

```xml
<!-- pom.xml 配置 -->
<profiles>
    <!-- 快速测试：只运行核心功能测试 -->
    <profile>
        <id>quick</id>
        <properties>
            <test.groups>smoke</test.groups>
            <test.iterations>10</test.iterations>
        </properties>
    </profile>
    
    <!-- 标准测试：参数化测试 + 少量随机测试 -->
    <profile>
        <id>standard</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <test.groups>smoke,parameterized</test.groups>
            <test.iterations>100</test.iterations>
        </properties>
    </profile>
    
    <!-- 完整测试：所有测试包括大规模随机测试 -->
    <profile>
        <id>full</id>
        <properties>
            <test.groups>smoke,parameterized,random,performance</test.groups>
            <test.iterations>10000</test.iterations>
        </properties>
    </profile>
    
    <!-- 性能测试 -->
    <profile>
        <id>benchmark</id>
        <properties>
            <test.groups>performance</test.groups>
        </properties>
    </profile>
</profiles>
```

#### 5.2 并行执行

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <parallel>classes</parallel>
        <threadCount>4</threadCount>
        <perCoreThreadCount>true</perCoreThreadCount>
    </configuration>
</plugin>
```

### 6. 测试报告增强

#### 6.1 详细报告生成

```java
@ExtendWith(TestReportExtension.class)
public class SM3ParameterizedTest {
    
    @AfterEach
    void recordTestResult(TestInfo testInfo) {
        // 记录测试结果、执行时间、参数等
        TestReporter.record(testInfo, testResult);
    }
}
```

#### 6.2 统计分析

生成测试报告包含：
- 总测试数量和通过率
- 参数化测试覆盖的参数组合数
- 随机测试发现的问题
- 性能基准数据
- 跨语言一致性统计

## 实施计划

### Phase 1: 基础参数化测试 (Week 1)
1. ✅ 创建 `SM3ParameterizedTest.java`
2. ✅ 创建 `SM2SignatureParameterizedTest.java`
3. ✅ 创建 `SM2EncryptionParameterizedTest.java`
4. ✅ 创建 `TestDataGenerator.java`
5. ✅ 基本参数化测试实现

### Phase 2: 随机化测试 (Week 2)
1. ✅ 创建 `SM3PropertyBasedTest.java`
2. ✅ 创建 `SM2PropertyBasedTest.java`
3. ✅ 实现基于属性的测试
4. ✅ 实现模糊测试
5. ✅ 配置测试迭代次数

### Phase 3: 边界条件与压力测试 (Week 3)
1. ✅ 创建 `BoundaryConditionsTest.java`
2. ✅ 创建 `PerformanceBenchmarkTest.java`
3. ✅ 实现所有边界条件测试
4. ✅ 实现性能基准测试
5. ✅ 配置测试分组和Profile

### Phase 4: 报告与优化 (Week 4)
1. ✅ 实现测试报告扩展
2. ✅ 生成详细的测试统计
3. ✅ 优化测试执行性能
4. ✅ 文档完善
5. ✅ CI/CD集成

## 预期成果

1. **测试覆盖率提升**: 从当前的基本功能测试扩展到全面的参数化和随机化测试
2. **问题发现能力**: 通过大规模随机测试发现边界情况和潜在bug
3. **性能基准**: 建立性能基准数据，监控性能回归
4. **跨语言一致性**: 确保JavaScript和Java实现在各种场景下的一致性
5. **持续验证**: 通过CI/CD自动执行测试，确保代码质量

## 技术依赖

- JUnit 5 (Jupiter) - 参数化测试支持
- JUnit Platform - 测试执行和报告
- Maven Surefire Plugin - 测试执行配置
- Bouncy Castle - Java加密实现
- GraalVM Polyglot - JavaScript互操作
- (可选) JQwik - 高级属性测试框架
- (可选) JMH - Java微基准测试

## 示例命令

```bash
# 运行快速测试
mvn test -P quick

# 运行标准测试（默认）
mvn test

# 运行完整测试
mvn test -P full

# 只运行性能测试
mvn test -P benchmark

# 运行特定测试类
mvn test -Dtest=SM3ParameterizedTest

# 并行执行测试
mvn test -DparallelTests=4
```

## 成功指标

- [ ] 参数化测试覆盖至少100种参数组合
- [ ] 随机测试至少执行10,000次迭代无错误
- [ ] 所有边界条件测试通过
- [ ] 性能基准建立且无显著回归
- [ ] 跨语言一致性达到100%
- [ ] 测试执行时间控制在合理范围（< 5分钟标准模式）