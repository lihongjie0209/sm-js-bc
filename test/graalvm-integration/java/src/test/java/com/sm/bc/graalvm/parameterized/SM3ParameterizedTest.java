package com.sm.bc.graalvm.parameterized;

import com.sm.bc.graalvm.BaseGraalVMTest;
import com.sm.bc.graalvm.utils.TestDataGenerator;
import com.sm.bc.graalvm.utils.TestDataGenerator.SM3TestVector;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * SM3参数化测试类
 * 使用多种输入参数测试SM3哈希算法的正确性和跨语言一致性
 */
@DisplayName("SM3 Parameterized Tests")
public class SM3ParameterizedTest extends BaseGraalVMTest {

    // ==================== 标准测试向量 ====================
    
    @ParameterizedTest(name = "[{index}] {0}")
    @CsvSource({
        "'', 'Empty string'",
        "'a', 'Single char a'",
        "'abc', 'String abc'",
        "'message digest', 'message digest'",
        "'abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd', '64-byte repeated abcd'"
    })
    @DisplayName("Standard test vectors")
    void testStandardVectors(String input, String description) throws Exception {
        System.out.println("Testing: " + description);
        
        // Compute with both implementations
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        // Verify cross-language consistency
        assertEquals(javaHash, jsHash, 
            "Java and JavaScript SM3 outputs differ for: " + description);
        
        System.out.println("  ✓ Both match: " + javaHash.substring(0, 16) + "...");
    }

    // ==================== 消息大小参数化测试 ====================
    
    @ParameterizedTest(name = "[{index}] Message size: {0} bytes")
    @ValueSource(ints = {0, 1, 32, 55, 63, 64, 65, 100, 128, 256, 512, 1000, 4096})
    @DisplayName("Various message sizes")
    void testVariousMessageSizes(int size) throws Exception {
        byte[] message = TestDataGenerator.randomBytes(size);
        
        String javaHash = computeJavaSM3(message);
        String jsHash = computeJavaScriptSM3(message);
        
        assertEquals(javaHash, jsHash,
            "Cross-language consistency failed for size: " + size);
        
        // 验证输出长度
        assertEquals(64, javaHash.length(), 
            "Hash output length should be 64 hex chars (256 bits)");
        
        // 验证输出格式（只包含十六进制字符）
        assertTrue(javaHash.matches("[0-9a-f]{64}"),
            "Hash should be valid hex string");
    }
    
    static Stream<Arguments> provideMessageSizeDescriptions() {
        return Stream.of(
            Arguments.of(0, "Empty message"),
            Arguments.of(1, "Single byte"),
            Arguments.of(63, "Block size - 1"),
            Arguments.of(64, "Exact block size"),
            Arguments.of(65, "Block size + 1"),
            Arguments.of(128, "Double block size"),
            Arguments.of(10000, "Large message (10KB)")
        );
    }
    
    @ParameterizedTest(name = "[{index}] {1} ({0} bytes)")
    @MethodSource("provideMessageSizeDescriptions")
    @DisplayName("Message sizes with descriptions")
    void testMessageSizesWithDescriptions(int size, String description) throws Exception {
        System.out.println("Testing " + description + " (" + size + " bytes)");
        
        byte[] message = TestDataGenerator.randomBytes(size);
        
        String javaHash = computeJavaSM3(message);
        String jsHash = computeJavaScriptSM3(message);
        
        assertEquals(javaHash, jsHash,
            "Failed for " + description);
    }

    // ==================== 字符串类型参数化测试 ====================
    
    @ParameterizedTest(name = "[{index}] {0}")
    @ValueSource(strings = {
        "",
        "a",
        "abc",
        "Hello SM3!",
        "The quick brown fox jumps over the lazy dog",
        "1234567890",
        "!@#$%^&*()_+-=[]{}|;:',.<>?/",
        "SM3哈希算法",
        "日本語テスト",
        "한글 테스트"
    })
    @DisplayName("Various string inputs")
    void testVariousStrings(String input) throws Exception {
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        assertEquals(javaHash, jsHash,
            "Cross-language consistency failed for string: " + input);
    }
    
    @ParameterizedTest(name = "[{index}] {0} encoding")
    @EnumSource(TestEncoding.class)
    @DisplayName("Different character encodings")
    void testDifferentEncodings(TestEncoding encoding) throws Exception {
        String testString = "Hello SM3 测试 テスト 테스트";
        byte[] bytes = encoding.encode(testString);
        
        String javaHash = computeJavaSM3(bytes);
        String jsHash = computeJavaScriptSM3(bytes);
        
        assertEquals(javaHash, jsHash,
            "Failed for encoding: " + encoding);
    }
    
    enum TestEncoding {
        UTF_8 {
            byte[] encode(String s) { return s.getBytes(StandardCharsets.UTF_8); }
        },
        UTF_16 {
            byte[] encode(String s) { return s.getBytes(StandardCharsets.UTF_16); }
        },
        US_ASCII {
            byte[] encode(String s) { 
                // 只保留ASCII字符
                return s.replaceAll("[^\\x00-\\x7F]", "?")
                       .getBytes(StandardCharsets.US_ASCII); 
            }
        };
        
        abstract byte[] encode(String s);
    }

    // ==================== 数据模式参数化测试 ====================
    
    @ParameterizedTest(name = "[{index}] {0}")
    @EnumSource(DataPattern.class)
    @DisplayName("Different data patterns")
    void testDataPatterns(DataPattern pattern) throws Exception {
        System.out.println("Testing pattern: " + pattern);
        
        byte[] data = pattern.generate(128);
        
        String javaHash = computeJavaSM3(data);
        String jsHash = computeJavaScriptSM3(data);
        
        assertEquals(javaHash, jsHash,
            "Failed for pattern: " + pattern);
    }
    
    enum DataPattern {
        ALL_ZEROS {
            byte[] generate(int size) { return TestDataGenerator.zerosPattern(size); }
        },
        ALL_ONES {
            byte[] generate(int size) { return TestDataGenerator.onesPattern(size); }
        },
        ALTERNATING {
            byte[] generate(int size) { return TestDataGenerator.alternatingPattern(size); }
        },
        RANDOM {
            byte[] generate(int size) { return TestDataGenerator.randomBytes(size); }
        },
        SEQUENTIAL {
            byte[] generate(int size) {
                byte[] bytes = new byte[size];
                for (int i = 0; i < size; i++) {
                    bytes[i] = (byte) (i & 0xFF);
                }
                return bytes;
            }
        };
        
        abstract byte[] generate(int size);
    }

    // ==================== 重复字符测试 ====================
    
    @ParameterizedTest(name = "[{index}] Repeat '{0}' {1} times")
    @CsvSource({
        "a, 1",
        "a, 10",
        "a, 100",
        "a, 1000",
        "abc, 1",
        "abc, 10",
        "abc, 100",
        "test, 50",
        "SM3, 100"
    })
    @DisplayName("Repeated strings")
    void testRepeatedStrings(String str, int times) throws Exception {
        String input = str.repeat(times);
        
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        assertEquals(javaHash, jsHash,
            "Failed for '" + str + "' repeated " + times + " times");
    }

    // ==================== 增量更新测试 ====================
    
    @ParameterizedTest(name = "[{index}] Split into {0} parts")
    @ValueSource(ints = {1, 2, 3, 5, 10, 20})
    @DisplayName("Incremental update vs single update")
    void testIncrementalUpdate(int parts) throws Exception {
        String message = "This is a test message for incremental SM3 digest updates";
        
        // 单次完整计算
        String completeHash = computeJavaSM3(message);
        
        // 分段增量计算
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        int chunkSize = messageBytes.length / parts;
        
        org.bouncycastle.crypto.digests.SM3Digest digest = 
            new org.bouncycastle.crypto.digests.SM3Digest();
        
        int offset = 0;
        for (int i = 0; i < parts; i++) {
            int length = (i == parts - 1) 
                ? (messageBytes.length - offset) 
                : chunkSize;
            digest.update(messageBytes, offset, length);
            offset += length;
        }
        
        byte[] hashBytes = new byte[digest.getDigestSize()];
        digest.doFinal(hashBytes, 0);
        String incrementalHash = TestDataGenerator.bytesToHex(hashBytes);
        
        assertEquals(completeHash, incrementalHash,
            "Incremental hash doesn't match complete hash (split into " + parts + " parts)");
    }

    // ==================== 边界条件测试 ====================
    
    @ParameterizedTest(name = "[{index}] {0}")
    @EnumSource(TestDataGenerator.BoundaryType.class)
    @DisplayName("Boundary conditions")
    void testBoundaryConditions(TestDataGenerator.BoundaryType boundaryType) throws Exception {
        System.out.println("Testing boundary: " + boundaryType);
        
        byte[] data = TestDataGenerator.boundaryValue(boundaryType);
        
        String javaHash = computeJavaSM3(data);
        String jsHash = computeJavaScriptSM3(data);
        
        assertEquals(javaHash, jsHash,
            "Failed for boundary type: " + boundaryType);
        
        // 验证输出格式
        assertEquals(64, javaHash.length());
        assertTrue(javaHash.matches("[0-9a-f]{64}"));
    }

    // ==================== Unicode和特殊字符测试 ====================
    
    @ParameterizedTest(name = "[{index}] Unicode length: {0}")
    @ValueSource(ints = {1, 10, 50, 100})
    @DisplayName("Random Unicode strings")
    void testRandomUnicodeStrings(int length) throws Exception {
        String unicodeString = TestDataGenerator.randomUnicodeString(length);
        
        String javaHash = computeJavaSM3(unicodeString);
        String jsHash = computeJavaScriptSM3(unicodeString);
        
        assertEquals(javaHash, jsHash,
            "Failed for Unicode string of length: " + length);
    }
    
    @Test
    @DisplayName("Emoji characters")
    void testEmojiCharacters() throws Exception {
        String emojiString = "🔐🔑📝📄🔒🔓";
        
        String javaHash = computeJavaSM3(emojiString);
        String jsHash = computeJavaScriptSM3(emojiString);
        
        assertEquals(javaHash, jsHash,
            "Failed for emoji string");
        
        System.out.println("Emoji test passed: " + emojiString);
    }

    // ==================== 确定性测试 ====================
    
    @ParameterizedTest(name = "[{index}] Iteration {0}")
    @ValueSource(ints = {1, 2, 3, 4, 5})
    @DisplayName("Deterministic output (same input produces same output)")
    void testDeterminism(int iteration) throws Exception {
        String input = "Test determinism iteration " + iteration;
        
        String hash1 = computeJavaSM3(input);
        String hash2 = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        assertEquals(hash1, hash2, 
            "Same input should produce same output (Java)");
        assertEquals(hash1, jsHash,
            "Cross-language determinism check");
    }
}
