package com.sm.bc.graalvm.random;

import com.sm.bc.graalvm.BaseGraalVMTest;
import com.sm.bc.graalvm.utils.TestDataGenerator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.RepetitionInfo;

import java.security.SecureRandom;

import static org.junit.jupiter.api.Assertions.*;

/**
 * SM3属性测试类
 * 使用大量随机数据验证SM3算法的数学属性和跨语言一致性
 */
@DisplayName("SM3 Property-Based Tests")
public class SM3PropertyBasedTest extends BaseGraalVMTest {

    private static final SecureRandom random = new SecureRandom();
    private static final int DEFAULT_ITERATIONS = getTestIterations();
    
    /**
     * 从系统属性读取测试迭代次数，默认100次
     */
    private static int getTestIterations() {
        String iterations = System.getProperty("test.iterations", "100");
        try {
            return Integer.parseInt(iterations);
        } catch (NumberFormatException e) {
            return 100;
        }
    }

    // ==================== 属性1: 确定性 ====================
    
    @RepeatedTest(value = 100, name = "Determinism test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Same input always produces same output")
    void testDeterministicProperty(RepetitionInfo repetitionInfo) throws Exception {
        // 生成随机输入
        int size = random.nextInt(10000);
        byte[] input = TestDataGenerator.randomBytes(size);
        
        // 多次计算应该产生相同结果
        String hash1 = computeJavaSM3(input);
        String hash2 = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        assertEquals(hash1, hash2, 
            "Java implementation should be deterministic");
        assertEquals(hash1, jsHash,
            "Cross-language determinism: same input should produce same output");
        
        if (repetitionInfo.getCurrentRepetition() % 10 == 0) {
            System.out.printf("  [%d/%d] Determinism verified for %d-byte input%n",
                repetitionInfo.getCurrentRepetition(),
                repetitionInfo.getTotalRepetitions(),
                size);
        }
    }

    // ==================== 属性2: 输出长度固定 ====================
    
    @RepeatedTest(value = 100, name = "Output length test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Output is always 256 bits (64 hex chars)")
    void testOutputLengthProperty(RepetitionInfo repetitionInfo) throws Exception {
        // 生成任意长度的随机输入
        int size = random.nextInt(100000);
        byte[] input = TestDataGenerator.randomBytes(size);
        
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        // SM3输出固定为256比特 = 32字节 = 64个十六进制字符
        assertEquals(64, javaHash.length(), 
            "Java SM3 output should be 64 hex chars");
        assertEquals(64, jsHash.length(),
            "JavaScript SM3 output should be 64 hex chars");
        
        // 验证是否为有效的十六进制字符串
        assertTrue(javaHash.matches("[0-9a-f]{64}"),
            "Java output should be valid lowercase hex");
        assertTrue(jsHash.matches("[0-9a-f]{64}"),
            "JavaScript output should be valid lowercase hex");
    }

    // ==================== 属性3: 雪崩效应 ====================
    
    @RepeatedTest(value = 50, name = "Avalanche effect test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Single bit flip should change ~50% of output bits")
    void testAvalancheEffect(RepetitionInfo repetitionInfo) throws Exception {
        // 生成随机输入
        int size = 64 + random.nextInt(936); // 64-1000 bytes
        byte[] input = TestDataGenerator.randomBytes(size);
        
        // 计算原始哈希
        String originalHash = computeJavaSM3(input);
        
        // 随机翻转一个比特
        int byteIndex = random.nextInt(input.length);
        int bitIndex = random.nextInt(8);
        input[byteIndex] ^= (1 << bitIndex);
        
        // 计算修改后的哈希
        String modifiedHash = computeJavaSM3(input);
        
        // 计算不同的比特数
        int diffBits = TestDataGenerator.countDifferentBits(originalHash, modifiedHash);
        
        // 雪崩效应：单比特变化应该导致约50%的输出比特变化
        // 256比特的40%-60%: 102-154比特
        assertTrue(diffBits >= 90 && diffBits <= 166,
            String.format("Avalanche effect: expected 90-166 bits different, got %d (%.1f%%)",
                diffBits, (diffBits * 100.0 / 256)));
        
        if (repetitionInfo.getCurrentRepetition() % 10 == 0) {
            System.out.printf("  [%d/%d] Avalanche effect: %d/256 bits different (%.1f%%)%n",
                repetitionInfo.getCurrentRepetition(),
                repetitionInfo.getTotalRepetitions(),
                diffBits, (diffBits * 100.0 / 256));
        }
    }

    // ==================== 属性4: 跨语言一致性 ====================
    
    @RepeatedTest(value = 200, name = "Cross-language test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Java and JavaScript implementations produce identical results")
    void testCrossLanguageConsistency(RepetitionInfo repetitionInfo) throws Exception {
        // 生成各种长度的随机输入
        int size = random.nextInt(50000);
        byte[] input = TestDataGenerator.randomBytes(size);
        
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        assertEquals(javaHash, jsHash,
            String.format("Cross-language consistency failed for %d-byte input", size));
        
        if (repetitionInfo.getCurrentRepetition() % 50 == 0) {
            System.out.printf("  [%d/%d] Cross-language consistency verified (input size: %d bytes)%n",
                repetitionInfo.getCurrentRepetition(),
                repetitionInfo.getTotalRepetitions(),
                size);
        }
    }

    // ==================== 属性5: 抗碰撞性（基本检查）====================
    
    @RepeatedTest(value = 100, name = "Collision resistance test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Different inputs produce different outputs (basic check)")
    void testCollisionResistance(RepetitionInfo repetitionInfo) throws Exception {
        // 生成两个不同的随机输入
        int size = 64 + random.nextInt(936);
        byte[] input1 = TestDataGenerator.randomBytes(size);
        byte[] input2 = TestDataGenerator.randomBytes(size);
        
        String hash1 = computeJavaSM3(input1);
        String hash2 = computeJavaSM3(input2);
        
        // 不同的输入应该产生不同的输出
        // 注意：这不是完整的抗碰撞性测试，只是基本检查
        assertNotEquals(hash1, hash2,
            "Different random inputs should produce different outputs");
    }

    // ==================== 属性6: 增量更新等价性 ====================
    
    @RepeatedTest(value = 50, name = "Incremental update test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Incremental updates produce same result as single update")
    void testIncrementalUpdateEquivalence(RepetitionInfo repetitionInfo) throws Exception {
        // 生成随机消息
        int totalSize = 100 + random.nextInt(9900); // 100-10000 bytes
        byte[] message = TestDataGenerator.randomBytes(totalSize);
        
        // 单次完整计算
        String completeHash = computeJavaSM3(message);
        
        // 随机分段增量计算
        int numParts = 2 + random.nextInt(19); // 2-20个分段
        org.bouncycastle.crypto.digests.SM3Digest digest = 
            new org.bouncycastle.crypto.digests.SM3Digest();
        
        int offset = 0;
        for (int i = 0; i < numParts; i++) {
            int remaining = totalSize - offset;
            int chunkSize = (i == numParts - 1) 
                ? remaining 
                : random.nextInt(remaining / (numParts - i)) + 1;
            
            digest.update(message, offset, chunkSize);
            offset += chunkSize;
        }
        
        byte[] hashBytes = new byte[digest.getDigestSize()];
        digest.doFinal(hashBytes, 0);
        String incrementalHash = TestDataGenerator.bytesToHex(hashBytes);
        
        assertEquals(completeHash, incrementalHash,
            String.format("Incremental hash (split into %d parts) should match complete hash", numParts));
    }

    // ==================== 属性7: 空输入处理 ====================
    
    @RepeatedTest(value = 10, name = "Empty input test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Empty input produces consistent known hash")
    void testEmptyInputConsistency() throws Exception {
        String expectedHash = "1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b";
        
        String javaHash = computeJavaSM3(new byte[0]);
        String jsHash = computeJavaScriptSM3(new byte[0]);
        
        assertEquals(expectedHash, javaHash, 
            "Java empty input hash should match standard");
        assertEquals(expectedHash, jsHash,
            "JavaScript empty input hash should match standard");
    }

    // ==================== 属性8: 大数据处理 ====================
    
    @RepeatedTest(value = 20, name = "Large data test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Can handle large inputs consistently")
    void testLargeDataHandling(RepetitionInfo repetitionInfo) throws Exception {
        // 测试较大的输入（1MB到10MB）
        int size = 1_000_000 + random.nextInt(9_000_000);
        byte[] largeInput = TestDataGenerator.randomBytes(size);
        
        String javaHash = computeJavaSM3(largeInput);
        String jsHash = computeJavaScriptSM3(largeInput);
        
        assertEquals(javaHash, jsHash,
            String.format("Large data consistency failed for %.2f MB", size / 1_000_000.0));
        
        if (repetitionInfo.getCurrentRepetition() % 5 == 0) {
            System.out.printf("  [%d/%d] Large data test passed: %.2f MB%n",
                repetitionInfo.getCurrentRepetition(),
                repetitionInfo.getTotalRepetitions(),
                size / 1_000_000.0);
        }
    }

    // ==================== 属性9: 特殊模式数据 ====================
    
    @RepeatedTest(value = 30, name = "Special pattern test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Special patterns are handled correctly")
    void testSpecialPatterns(RepetitionInfo repetitionInfo) throws Exception {
        int size = 64 + random.nextInt(936);
        
        // 随机选择特殊模式
        byte[] input;
        int patternType = random.nextInt(5);
        switch (patternType) {
            case 0: input = TestDataGenerator.zerosPattern(size); break;
            case 1: input = TestDataGenerator.onesPattern(size); break;
            case 2: input = TestDataGenerator.alternatingPattern(size); break;
            case 3: 
                // 重复模式
                byte[] pattern = TestDataGenerator.randomBytes(random.nextInt(16) + 1);
                input = TestDataGenerator.repeatingPattern(pattern, size);
                break;
            default: input = TestDataGenerator.randomBytes(size); break;
        }
        
        String javaHash = computeJavaSM3(input);
        String jsHash = computeJavaScriptSM3(input);
        
        assertEquals(javaHash, jsHash,
            "Special pattern consistency failed");
    }

    // ==================== 属性10: Unicode一致性 ====================
    
    @RepeatedTest(value = 50, name = "Unicode test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Property: Unicode strings are handled consistently")
    void testUnicodeConsistency(RepetitionInfo repetitionInfo) throws Exception {
        // 生成随机Unicode字符串
        int length = 1 + random.nextInt(500);
        int type = random.nextInt(3);
        
        String unicodeString;
        switch (type) {
            case 0: unicodeString = TestDataGenerator.randomUnicodeString(length); break;
            case 1: unicodeString = TestDataGenerator.randomChineseString(length); break;
            default: unicodeString = TestDataGenerator.randomAsciiString(length); break;
        }
        
        String javaHash = computeJavaSM3(unicodeString);
        String jsHash = computeJavaScriptSM3(unicodeString);
        
        assertEquals(javaHash, jsHash,
            "Unicode string consistency failed");
    }

    // ==================== 综合压力测试 ====================
    
    @RepeatedTest(value = 10, name = "Comprehensive stress test {currentRepetition}/{totalRepetitions}")
    @DisplayName("Comprehensive random test covering various scenarios")
    void comprehensiveStressTest(RepetitionInfo repetitionInfo) throws Exception {
        System.out.printf("Running comprehensive test %d/%d...%n",
            repetitionInfo.getCurrentRepetition(),
            repetitionInfo.getTotalRepetitions());
        
        int totalTests = 100;
        int passed = 0;
        
        for (int i = 0; i < totalTests; i++) {
            try {
                // 随机选择测试场景
                int scenario = random.nextInt(10);
                byte[] input;
                
                switch (scenario) {
                    case 0: input = new byte[0]; break; // 空
                    case 1: input = TestDataGenerator.randomBytes(1); break; // 单字节
                    case 2: input = TestDataGenerator.randomBytes(63); break; // 边界-1
                    case 3: input = TestDataGenerator.randomBytes(64); break; // 边界
                    case 4: input = TestDataGenerator.randomBytes(65); break; // 边界+1
                    case 5: input = TestDataGenerator.zerosPattern(random.nextInt(1000)); break;
                    case 6: input = TestDataGenerator.onesPattern(random.nextInt(1000)); break;
                    case 7: input = TestDataGenerator.randomUnicodeString(random.nextInt(100)).getBytes(); break;
                    case 8: input = TestDataGenerator.randomBytes(random.nextInt(10000)); break;
                    default: input = TestDataGenerator.randomBytes(random.nextInt(100000)); break;
                }
                
                String javaHash = computeJavaSM3(input);
                String jsHash = computeJavaScriptSM3(input);
                
                assertEquals(javaHash, jsHash);
                passed++;
            } catch (Exception e) {
                System.err.println("  Test failed: " + e.getMessage());
            }
        }
        
        System.out.printf("  Passed: %d/%d (%.1f%%)%n", 
            passed, totalTests, (passed * 100.0 / totalTests));
        
        assertTrue(passed == totalTests, 
            "All comprehensive tests should pass");
    }
}
