# Java测试增强方案总结

## 核心增强点

### 1. 参数化测试 (JUnit 5 @ParameterizedTest)
- **目标**: 用多组参数自动测试相同逻辑
- **应用场景**:
  - SM3: 不同消息长度、字符集、编码
  - SM2签名: 多个密钥对、消息长度、userId变体
  - SM2加密: 不同消息大小、加密模式(C1C3C2/C1C2C3)

### 2. 随机化测试
- **属性测试**: 验证算法的数学属性
  - SM3: 确定性、输出长度、雪崩效应
  - SM2: 签名可验证性、加密解密往返
- **模糊测试**: 随机输入发现边界问题
  - 空输入、极大输入、特殊字符、畸形数据
- **压力测试**: 大规模重复验证一致性

### 3. 边界条件测试
- 空字符串、单字节
- 块大小边界(63/64/65 bytes)
- 最大消息大小
- 非法输入处理

## 快速实施指南

### 新增测试类结构
```
test/java/com/sm/bc/graalvm/
├── parameterized/
│   ├── SM3ParameterizedTest.java
│   ├── SM2SignatureParameterizedTest.java
│   └── SM2EncryptionParameterizedTest.java
├── random/
│   ├── SM3PropertyBasedTest.java
│   ├── SM2PropertyBasedTest.java
│   └── SM3FuzzTest.java
├── boundary/
│   └── BoundaryConditionsTest.java
├── performance/
│   └── PerformanceBenchmarkTest.java
└── utils/
    └── TestDataGenerator.java
```

### Maven配置增强
```xml
<!-- 添加到 pom.xml -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter-params</artifactId>
    <version>5.10.0</version>
    <scope>test</scope>
</dependency>

<!-- 测试配置 -->
<plugin>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <parallel>classes</parallel>
        <threadCount>4</threadCount>
        <systemPropertyVariables>
            <test.iterations>${test.iterations}</test.iterations>
        </systemPropertyVariables>
    </configuration>
</plugin>
```

### 测试执行模式
```bash
# 快速测试（基本功能，10次迭代）
mvn test -Dtest.iterations=10

# 标准测试（默认，100次迭代）
mvn test

# 完整测试（包括大规模随机测试，10000次迭代）
mvn test -Dtest.iterations=10000

# 性能基准
mvn test -Dtest=PerformanceBenchmarkTest
```

## 关键示例代码

### 参数化测试示例
```java
@ParameterizedTest
@CsvSource({
    "abc, 66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0",
    "a, 623476ac18f65a2909e43c7fec61b49c7e764a91a18ccb82f1917a29c86c5e88"
})
void testSM3KnownVectors(String input, String expectedHash) {
    String javaHash = computeJavaSM3(input);
    String jsHash = computeJavaScriptSM3(input);
    
    assertEquals(expectedHash, javaHash);
    assertEquals(expectedHash, jsHash);
}

@ParameterizedTest
@ValueSource(ints = {0, 1, 32, 64, 100, 1000, 10000})
void testSM2WithVariousMessageSizes(int messageSize) {
    byte[] message = TestDataGenerator.randomBytes(messageSize);
    KeyPair keyPair = TestDataGenerator.randomKeyPair();
    
    byte[] signature = signWithJava(keyPair, message);
    assertTrue(verifyWithJavaScript(keyPair, message, signature));
}
```

### 随机化测试示例
```java
@RepeatedTest(1000)
void sm3CrossLanguageConsistency() {
    // 生成随机输入
    byte[] input = TestDataGenerator.randomBytes(
        random.nextInt(10000)
    );
    
    // 两个实现必须产生相同结果
    String javaHash = computeJavaSM3(input);
    String jsHash = computeJavaScriptSM3(input);
    
    assertEquals(javaHash, jsHash,
        "Cross-language consistency failed for input size: " + input.length);
}

@RepeatedTest(500)
void sm2EncryptDecryptProperty() {
    // 属性：加密后解密应该得到原始消息
    KeyPair keyPair = TestDataGenerator.randomKeyPair();
    byte[] plaintext = TestDataGenerator.randomBytes(
        random.nextInt(1000) + 1
    );
    
    byte[] ciphertext = encryptWithJava(keyPair.publicKey, plaintext);
    byte[] decrypted = decryptWithJavaScript(keyPair.privateKey, ciphertext);
    
    assertArrayEquals(plaintext, decrypted);
}
```

### 边界条件测试示例
```java
@Test
void testSM3EmptyInput() {
    String expected = "1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b";
    assertEquals(expected, computeJavaSM3(""));
    assertEquals(expected, computeJavaScriptSM3(""));
}

@Test
void testSM3BlockBoundaries() {
    // 测试块大小边界：63, 64, 65 bytes
    for (int size : new int[]{63, 64, 65}) {
        byte[] input = TestDataGenerator.randomBytes(size);
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        assertEquals(javaHash, jsHash, "Failed at boundary size: " + size);
    }
}
```

## 预期测试覆盖

| 测试类型 | 测试数量 | 执行时间 | 覆盖场景 |
|---------|---------|---------|---------|
| 参数化测试 | ~100 | 30秒 | 多种输入组合 |
| 随机化测试 | 10,000+ | 2-3分钟 | 大规模一致性验证 |
| 边界条件测试 | ~50 | 10秒 | 极端情况 |
| 性能基准 | ~10 | 1分钟 | 性能监控 |
| **总计** | **10,000+** | **<5分钟** | **全面覆盖** |

## 实施优先级

### P0 (必须，Week 1-2)
- [x] SM3参数化测试（标准向量 + 多种消息大小）
- [x] SM2签名/加密基本参数化测试
- [x] 跨语言随机一致性测试（100-1000次迭代）

### P1 (重要，Week 3)
- [ ] 完整的边界条件测试
- [ ] 属性测试（数学属性验证）
- [ ] 测试数据生成器工具类

### P2 (增强，Week 4)
- [ ] 模糊测试
- [ ] 性能基准测试
- [ ] 测试报告增强
- [ ] CI/CD集成

## 成功标准

✅ **质量指标**
- 参数化测试覆盖 100+ 种参数组合
- 随机测试 10,000 次迭代 100% 通过
- 跨语言一致性 100%

✅ **性能指标**
- 标准测试套件 < 3分钟
- 完整测试套件 < 10分钟
- 性能无显著回归

✅ **可维护性**
- 测试代码结构清晰
- 测试失败信息详细
- 易于添加新测试用例