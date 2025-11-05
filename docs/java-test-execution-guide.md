# Java 集成测试执行指南

## 快速开始

### 1. 前置要求检查

```bash
# Java 版本 (需要 17+)
java -version

# Maven 版本 (需要 3.6+)
mvn -version

# Node.js 版本 (用于构建 SM-BC 库)
node -version
```

### 2. 构建 SM-BC 库

```bash
# 从项目根目录
cd d:\code\sm-js-bc
npm install
npm run build

# 验证构建产物
ls dist/
# 应该看到: index.cjs, index.mjs, index.js, index.d.ts
```

### 3. 运行测试

```bash
# 进入测试目录
cd test/graalvm-integration/java

# 快速测试 (10秒)
./run-quick-tests.sh    # Linux/Mac
run-quick-tests.bat     # Windows

# 或者使用 Maven
mvn test -P quick
```

---

## 测试配置详解

### 配置 1: Quick Profile (快速测试)

**执行时间**: ~10秒  
**测试数量**: ~30个  
**随机迭代**: 10次

```bash
mvn test -P quick
```

**用途**:
- ✅ 开发过程中的快速验证
- ✅ 提交代码前的检查
- ✅ CI/CD 快速反馈

**覆盖范围**:
- SM4 各模式基本测试
- SM3 标准测试向量
- 核心跨语言验证

---

### 配置 2: Standard Profile (标准测试) - 默认

**执行时间**: ~1分钟  
**测试数量**: ~150个  
**随机迭代**: 100次

```bash
mvn test
# 或显式指定
mvn test -P standard
```

**用途**:
- ✅ 日常开发验证
- ✅ Pull Request 检查
- ✅ 完整的功能验证

**覆盖范围**:
- 所有 SM4 模式测试
- SM3 参数化测试
- SM3 属性测试（100次）
- Unicode 和边界测试
- 跨语言一致性验证

**排除**: 压力测试（标记为 `@Tag("stress")`）

---

### 配置 3: Full Profile (完整测试)

**执行时间**: ~5分钟  
**测试数量**: 600+个  
**随机迭代**: 10,000次

```bash
mvn test -P full
```

**用途**:
- ✅ 发布前的完整验证
- ✅ 性能回归检测
- ✅ 压力测试
- ✅ 大规模随机验证

**覆盖范围**:
- 所有标准测试
- 压力测试
- 大数据测试（10MB）
- 并发测试
- 10,000次随机迭代

---

### 配置 4: Benchmark Profile (性能基准)

**执行时间**: ~2分钟  
**测试数量**: ~5个  
**迭代次数**: 1,000次

```bash
mvn test -P benchmark
```

**用途**:
- ✅ 性能基准测试
- ✅ 吞吐量测量
- ✅ 性能对比分析

**输出示例**:
```
=== SM3 Performance Comparison ===
Java: 45.23 ms (1000 iterations × 1KB) = 21.58 MB/s

=== SM4-GCM Performance ===
16-byte plaintext: 2.3ms per operation
32-byte plaintext: 3.1ms per operation

=== Large Data Test ===
SM3 processed 10 MB in 0.463 seconds (21.6 MB/s)
```

---

## 按测试类运行

### SM4 测试

```bash
# 所有 SM4 测试
mvn test -Dtest=SM4CipherInteropTest

# 只测试 ECB 模式
mvn test -Dtest=SM4CipherInteropTest#testSM4_ECB_*

# 只测试 GCM 模式
mvn test -Dtest=SM4CipherInteropTest#testSM4_GCM_*

# 只测试随机一致性
mvn test -Dtest=SM4CipherInteropTest#testSM4_RandomConsistency
```

### SM3 测试

```bash
# 所有参数化测试
mvn test -Dtest=ParameterizedInteropTest

# 只测试标准输入
mvn test -Dtest=ParameterizedInteropTest#testSM3_StandardInputs

# 只测试 Unicode
mvn test -Dtest=ParameterizedInteropTest#testSM3_UnicodeStrings

# 只测试属性（雪崩、确定性等）
mvn test -Dtest=ParameterizedInteropTest#testSM3_*Property
```

### SM2 测试（已有）

```bash
# SM2 签名测试
mvn test -Dtest=SM2SignatureInteropTest

# SM2 加密测试
mvn test -Dtest=SM2EncryptionInteropTest
```

---

## 按标签运行

```bash
# 只运行性能测试
mvn test -Dgroups=performance

# 只运行压力测试
mvn test -Dgroups=stress

# 排除性能和压力测试
mvn test -DexcludedGroups=performance,stress
```

---

## 并行执行

加速测试执行：

```bash
# 使用并行配置
mvn test -P parallel

# 或指定线程数
mvn test -Dparallel=classes -DthreadCount=4

# 自动根据 CPU 核心数
mvn test -Dparallel=classes -DperCoreThreadCount=true
```

---

## 高级用法

### 1. 自定义迭代次数

```bash
# 设置随机测试迭代次数
mvn test -Dtest.iterations=500
```

### 2. 详细输出

```bash
# 显示所有测试名称和结果
mvn test -X

# 只显示失败的测试
mvn test -DtrimStackTrace=true
```

### 3. 失败后继续

```bash
# 即使有测试失败也继续运行
mvn test -Dmaven.test.failure.ignore=true
```

### 4. 重新运行失败的测试

```bash
# 只重新运行上次失败的测试
mvn test -Dsurefire.rerunFailingTestsCount=2
```

### 5. 生成测试报告

```bash
# 运行测试并生成 HTML 报告
mvn surefire-report:report

# 报告位置: target/site/surefire-report.html
```

---

## 故障排查

### 问题 1: GraalVM JavaScript 不可用

**症状**:
```
⚠️ Tests skipped: GraalVM JavaScript not available
```

**解决方案**:
- 这是正常的！这些是高级测试。
- 基础测试（SimplifiedCrossLanguageTest）使用 Node.js，会正常运行。
- 如果需要 GraalVM 测试，请安装 GraalVM。

### 问题 2: SM-BC 库未构建

**症状**:
```
RuntimeException: SM-BC library not found at: ../../../dist/index.cjs
```

**解决方案**:
```bash
cd ../../../
npm install
npm run build
cd test/graalvm-integration/java
```

### 问题 3: Java 版本过低

**症状**:
```
Error: Java 17+ required. Current version: 11
```

**解决方案**:
- 安装 Java 17 或更高版本
- 设置 `JAVA_HOME` 环境变量

### 问题 4: Maven 内存不足

**症状**:
```
java.lang.OutOfMemoryError: Java heap space
```

**解决方案**:
```bash
# 设置环境变量
export MAVEN_OPTS="-Xmx2g"  # Linux/Mac
set MAVEN_OPTS=-Xmx2g       # Windows

# 或在 pom.xml 中配置
```

### 问题 5: 测试超时

**症状**:
```
Test timeout after 60000ms
```

**解决方案**:
```bash
# 增加超时时间
mvn test -Dsurefire.timeout=300
```

---

## 持续集成 (CI/CD)

### GitHub Actions 示例

```yaml
name: Java Integration Tests

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
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Build SM-BC Library
        run: |
          npm install
          npm run build
      
      - name: Run Quick Tests
        run: |
          cd test/graalvm-integration/java
          mvn test -P quick
      
      - name: Run Standard Tests
        run: |
          cd test/graalvm-integration/java
          mvn test
```

### GitLab CI 示例

```yaml
test:
  image: maven:3.9-eclipse-temurin-17
  
  before_script:
    - apt-get update && apt-get install -y nodejs npm
    - npm install
    - npm run build
  
  script:
    - cd test/graalvm-integration/java
    - mvn test -P standard
  
  artifacts:
    reports:
      junit:
        - test/graalvm-integration/java/target/surefire-reports/*.xml
```

---

## 测试结果解读

### 成功输出示例

```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.sm.bc.graalvm.SM4CipherInteropTest
✓ ECB Empty input: plaintext=0 bytes, ciphertext=16 bytes
✓ ECB Single block: plaintext=16 bytes, ciphertext=32 bytes
✓ CBC Multi-block: plaintext=44 bytes, ciphertext=48 bytes
✓ GCM Single block: plaintext=16 bytes, ciphertext=32 bytes (with MAC)
✓ GCM MAC verification correctly detects tampering
[INFO] Tests run: 25, Failures: 0, Errors: 0, Skipped: 0

[INFO] Running com.sm.bc.graalvm.ParameterizedInteropTest
✓ SM3('abc') = 66c7f0f4...4ba8e0
✓ SM3(Chinese characters) = 8f24b0a5...
✓ SM3(100 bytes) = a3c4f7e2...
[INFO] Tests run: 120, Failures: 0, Errors: 0, Skipped: 0

[INFO] -------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] -------------------------------------------------------
```

### 测试统计

```
Tests run: 150
Passed: 150 ✅
Failed: 0
Errors: 0
Skipped: 0

Time elapsed: 62.345 sec
```

---

## 性能基准参考

### 典型性能（参考）

| 操作 | 吞吐量 | 延迟 |
|------|--------|------|
| SM3 (1KB) | 20-25 MB/s | <1ms |
| SM4-ECB (1KB) | 15-20 MB/s | <1ms |
| SM4-CBC (1KB) | 15-20 MB/s | <1ms |
| SM4-GCM (1KB) | 10-15 MB/s | 1-2ms |
| SM2 签名 | 100-200 ops/s | 5-10ms |
| SM2 加密 | 100-200 ops/s | 5-10ms |

*注：实际性能取决于硬件配置*

---

## 最佳实践

### 开发流程

1. **编码阶段**: 运行 `mvn test -P quick`（10秒）
2. **提交前**: 运行 `mvn test`（1分钟）
3. **PR Review**: 运行 `mvn test -P full`（5分钟）
4. **发布前**: 运行 `mvn test -P full -P benchmark`

### 测试优先级

```
优先级 1（必须通过）:
  - SM4 各模式基本测试
  - SM3 标准测试向量
  - 跨语言一致性

优先级 2（建议通过）:
  - 参数化测试
  - 属性测试
  - 边界条件

优先级 3（可选）:
  - 压力测试
  - 大数据测试
  - 性能基准
```

---

## 总结

```bash
# 日常开发 - 快速验证
mvn test -P quick

# 完整验证 - 标准测试
mvn test

# 发布前 - 全面测试
mvn test -P full

# 性能分析 - 基准测试
mvn test -P benchmark

# 特定测试 - 按需运行
mvn test -Dtest=SM4CipherInteropTest
```

**测试覆盖**: 600+ 个测试  
**执行时间**: 10秒 - 5分钟  
**成功率目标**: 100% ✅
