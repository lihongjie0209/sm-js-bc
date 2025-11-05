# SM-BC GraalVM Integration Tests

This directory contains comprehensive cross-language tests that validate the compatibility between the JavaScript SM-BC library and Java Bouncy Castle cryptographic implementations using GraalVM Polyglot.

## Overview

The test suite provides two approaches for cross-language validation:

### 🚀 **Working Tests (Node.js-based)**
- **SimplifiedCrossLanguageTest**: ✅ Fully functional cross-language testing using Node.js process execution
- **Coverage**: SM3 digest verification, performance comparison, standard test vectors
- **Benefits**: No complex dependencies, works out of the box

### 🔬 **Advanced Tests (GraalVM Polyglot-based)**  
- **SM2/SM3 Interop Tests**: Advanced cross-language testing using GraalVM Polyglot
- **Coverage**: In-memory JavaScript ↔ Java compatibility, performance analysis, integration scenarios
- **Status**: ⚠️ Requires additional GraalVM JavaScript dependency

The test suite verifies:

1. **Cross-Language Compatibility**: JavaScript ↔ Java signature verification, encryption/decryption
2. **Algorithm Correctness**: SM2 (signatures, encryption, key exchange) and SM3 (digest) implementations
3. **Performance Characteristics**: Comparative performance analysis between implementations
4. **Integration Scenarios**: End-to-end secure communication workflows
5. **Error Handling**: Edge cases and invalid input handling

## Prerequisites

### Required Software

1. **Java 17+**: Required for Bouncy Castle and GraalVM
2. **GraalVM 23.1.1+**: For JavaScript execution within Java tests
3. **Maven 3.6+**: For build and dependency management
4. **Built SM-BC Library**: The JavaScript library must be built first

### Build SM-BC Library

Before running the integration tests, ensure the SM-BC JavaScript library is built:

```bash
# From the root project directory
cd d:\code\sm-js-bc
npm install
npm run build
```

This creates the required distribution files in the `dist/` directory:
- `index.cjs` - CommonJS build (used by tests)
- `index.mjs` - ESM build
- `index.js` - IIFE build
- `index.d.ts` - TypeScript declarations

## Test Structure

### Test Classes

1. **`BaseGraalVMTest`**: Base class providing GraalVM setup and utility methods
2. **`SM2SignatureInteropTest`**: Cross-language signature verification tests
3. **`SM2EncryptionInteropTest`**: Cross-language encryption/decryption tests
4. **`SM3DigestInteropTest`**: Cross-language digest algorithm tests
5. **`SM4CipherInteropTest`**: ⭐ **NEW** - Comprehensive SM4 cipher mode tests (ECB, CBC, CTR, GCM)
6. **`ParameterizedInteropTest`**: ⭐ **NEW** - Parameterized and property-based tests
7. **`PerformanceIntegrationTest`**: Performance comparison and integration scenarios

### Test Categories

#### SM2 Signature Tests
- Java sign → JavaScript verify
- JavaScript sign → Java verify
- Key format compatibility
- Edge cases and error handling

#### SM2 Encryption Tests
- Java encrypt → JavaScript decrypt
- JavaScript encrypt → Java decrypt
- Various message sizes
- Error handling for invalid ciphertexts

#### SM3 Digest Tests
- Standard test vector verification
- Cross-implementation verification
- Incremental digest updates
- Binary data handling

#### ⭐ SM4 Cipher Tests (NEW)
- **ECB Mode**: Single/multi-block, various sizes, padding verification
- **CBC Mode**: IV handling, multi-block chaining
- **CTR Mode**: Stream cipher, no padding required
- **GCM Mode**: AEAD (Authenticated Encryption with Associated Data)
  - MAC verification
  - AAD (Additional Authenticated Data) support
  - Tampering detection
- **Cross-Platform**: All modes verified Java ↔ JavaScript
- **Edge Cases**: Empty input, block boundaries, invalid parameters
- **Random Testing**: 100 iterations with random keys/IVs/plaintexts

#### ⭐ Parameterized Tests (NEW)
- **SM3 Standard Inputs**: Empty, single-char, standard test vectors
- **SM3 Message Sizes**: 0B to 10KB, block boundary testing
- **SM3 Unicode**: Chinese, Japanese, Korean, Arabic, emojis
- **SM3 Binary Patterns**: All zeros, all ones, alternating, ascending
- **SM3 Property-Based**: Deterministic, fixed-length, avalanche effect
- **SM4 Boundary Conditions**: Invalid keys, IVs, block sizes
- **Stress Tests**: Large data (10MB), concurrent operations

#### Performance Tests
- Algorithm performance comparison
- Memory usage patterns
- End-to-end communication scenarios
- Resource cleanup verification
- Throughput measurements (MB/s)

## Test Statistics

### Total Test Count: **300+ tests**

| Test Category | Test Count | Description |
|--------------|------------|-------------|
| SM3 Parameterized | 50+ | Various inputs, sizes, Unicode, patterns |
| SM3 Property-Based | 350+ | Deterministic, avalanche, collision resistance |
| SM3 Random | 50+ | Random data consistency tests |
| SM4 ECB Mode | 15+ | Single/multi-block, various sizes |
| SM4 CBC Mode | 15+ | IV handling, chaining |
| SM4 CTR Mode | 10+ | Stream cipher tests |
| SM4 GCM Mode | 20+ | AEAD, MAC verification, tampering |
| SM4 Random | 100+ | Random consistency tests |
| SM4 Boundary | 10+ | Edge cases, invalid parameters |
| Performance | 5+ | Throughput, stress tests |
| **TOTAL** | **300+** | Comprehensive cross-language validation |

### Test Execution Profiles

1. **Quick Profile** (`-P quick`): ~30 tests, ~10 seconds
   - Core functionality only
   - 10 random iterations per test
   
2. **Standard Profile** (default): ~150 tests, ~1 minute
   - Parameterized tests
   - 100 random iterations per test
   
3. **Full Profile** (`-P full`): 300+ tests, ~5 minutes
   - All tests including stress tests
   - 10,000 random iterations
   
4. **Benchmark Profile** (`-P benchmark`): Performance tests only

## Running Tests

### Quick Start (Recommended)

```bash
cd test/graalvm-integration/java
mvn clean test
```

**Expected Results (Standard Profile):**
- ✅ **150+ tests passing** (SM3, SM4, Parameterized tests)
- ⚠️ **Skipped tests** (GraalVM Polyglot - if not configured)
- ❌ **0 tests failing**

### Running Specific Test Profiles

#### Quick Tests (10 seconds)
```bash
mvn test -P quick
```

#### Standard Tests (1 minute) - Default
```bash
mvn test
# or explicitly:
mvn test -P standard
```

#### Full Tests (5 minutes) - All tests
```bash
mvn test -P full
```

#### Performance Benchmarks Only
```bash
mvn test -P benchmark -Dtest=*Performance*,*Benchmark*
```

### Running Specific Test Classes

#### SM4 Tests Only
```bash
mvn test -Dtest=SM4CipherInteropTest
```

#### Parameterized Tests Only
```bash
mvn test -Dtest=ParameterizedInteropTest
```

#### SM3 Property Tests Only
```bash
mvn test -Dtest=ParameterizedInteropTest#testSM3_*Property
```

#### Skip Slow Tests
```bash
mvn test -Dgroups="!stress,!performance"
```

### Parallel Test Execution

Speed up test execution with parallel threads:

```bash
mvn test -DparallelTests=4
# or
mvn test -Dparallel=classes -DthreadCount=4
```

### Test Categories

#### 🚀 **Working Tests** (Always Available)
```bash
# Node.js-based cross-language validation
mvn test -Dtest=SimplifiedCrossLanguageTest
```

#### 🔬 **Advanced Tests** (Requires GraalVM JS)  
```bash
# These will skip gracefully if GraalVM JS not available
mvn test -Dtest=SM2SignatureInteropTest
mvn test -Dtest=SM2EncryptionInteropTest  
mvn test -Dtest=SM3DigestInteropTest
mvn test -Dtest=PerformanceIntegrationTest
```

### Prerequisites Check

```bash
# Check Java version (should be 17+)
java -version

# Verify SM-BC library is built
ls ../../../dist/index.mjs

# Check Node.js availability (for SimplifiedCrossLanguageTest)
node --version
```

### Run Specific Test Classes

```bash
# Run only signature tests
mvn test -Dtest=SM2SignatureInteropTest

# Run only encryption tests
mvn test -Dtest=SM2EncryptionInteropTest

# Run only digest tests
mvn test -Dtest=SM3DigestInteropTest

# Run only performance tests
mvn test -Dtest=PerformanceIntegrationTest
```

### Run with GraalVM Profile

For optimal performance with GraalVM:

```bash
mvn test -Pgraalvm
```

### Verbose Output

For detailed logging and debugging:

```bash
mvn test -Dorg.slf4j.simpleLogger.defaultLogLevel=DEBUG
```

## Test Configuration

### Environment Variables

- `SM_BC_DIST_PATH`: Path to SM-BC distribution files (default: `../../../../dist`)
- `GRAALVM_POLYGLOT_TIMEOUT`: Timeout for JavaScript operations (default: 30 seconds)

### JVM Arguments

The tests automatically configure necessary JVM arguments for GraalVM:

```bash
--add-opens=java.base/java.lang=ALL-UNNAMED
--add-opens=java.base/java.util=ALL-UNNAMED
```

## Expected Output

### Successful Test Run

```
[INFO] Running com.sm.bc.graalvm.SM2SignatureInteropTest

=== Testing Java Sign → JavaScript Verify ===
Java signature length: 64 bytes
Java signature (hex): 3045022100...
✓ Java signature successfully verified by JavaScript

=== Testing JavaScript Sign → Java Verify ===
JavaScript signature length: 64 bytes
JavaScript signature (hex): 3046022100...
✓ JavaScript signature successfully verified by Java

[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0

=== SM3 Digest Performance Comparison ===
Testing 100 bytes message (100 iterations)...
  Java time:       45 ms (0.45 ms/op)
  JavaScript time: 123 ms (1.23 ms/op)
  Ratio (JS/Java): 2.73x
✓ Performance tests completed
```

### Performance Benchmarks

Typical performance ratios (JavaScript/Java):
- **SM3 Digest**: 2-5x slower
- **SM2 Signatures**: 5-15x slower
- **SM2 Encryption**: 3-10x slower

Performance varies based on:
- JVM warmup state
- GraalVM optimization level
- Message/key sizes
- System resources

## Troubleshooting

### Common Issues

1. **SM-BC Library Not Found**
   ```
   Error: SM-BC library not found at: .../dist/index.cjs
   ```
   **Solution**: Run `npm run build` from the project root

2. **GraalVM JavaScript Engine Issues**
   ```
   Error: No language for id js found
   ```
   **Solution**: Ensure GraalVM with JavaScript support is installed

3. **Memory Issues**
   ```
   OutOfMemoryError during tests
   ```
   **Solution**: Increase JVM heap size: `-Xmx2G`

4. **Timeout Errors**
   ```
   JavaScript operation timed out
   ```
   **Solution**: Increase timeout or check for infinite loops

### Debug Mode

Enable detailed debugging:

```bash
mvn test -Dorg.slf4j.simpleLogger.defaultLogLevel=DEBUG \
         -Dpolyglot.js.allowAllAccess=true \
         -Dpolyglot.js.experimentalForeignObjectPrototype=true
```

### Dependency Issues

If Maven dependency resolution fails:

```bash
# Clear local repository and re-download
rm -rf ~/.m2/repository/org/bouncycastle
rm -rf ~/.m2/repository/org/graalvm
mvn clean install
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: GraalVM Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup GraalVM
        uses: graalvm/setup-graalvm@v1
        with:
          version: '23.1.1'
          java-version: '17'
          components: 'js'
          
      - name: Build SM-BC Library
        run: |
          npm install
          npm run build
          
      - name: Run Integration Tests
        run: |
          cd test/graalvm-integration/java
          mvn clean test
```

## Contributing

When adding new tests:

1. Extend appropriate base test class
2. Follow existing naming conventions
3. Include both success and failure scenarios
4. Add performance considerations for crypto operations
5. Update this README if new dependencies are required

## Dependencies

- **JUnit 5**: Test framework
- **Bouncy Castle 1.77**: Java cryptographic library
- **GraalVM Polyglot 23.1.1**: JavaScript execution engine
- **Jackson 2.15.2**: JSON processing
- **SLF4J**: Logging framework