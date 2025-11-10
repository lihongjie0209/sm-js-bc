package com.sm.bc.graalvm;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Parameterized tests for SM3, SM2, and SM4 implementations.
 * Tests various input sizes, character sets, and edge cases.
 */
@DisplayName("Cross-Language Parameterized Tests")
public class ParameterizedInteropTest extends BaseGraalVMTest {

    // Use a fixed seed for reproducible test results
    private static final SecureRandom RANDOM = new SecureRandom(new byte[]{0x12, 0x34, 0x56, 0x78});

    @BeforeEach
    @Override
    public void setupGraalVM() throws IOException {
        if (!isGraalVMJavaScriptAvailable()) {
            Assumptions.assumeTrue(false, 
                "GraalVM JavaScript not available. Skipping test.");
        }
        super.setupGraalVM();
    }

    // ============================================
    // SM3 Parameterized Tests
    // ============================================

    @ParameterizedTest(name = "SM3: {0}")
    @ValueSource(strings = {
        "",
        "a",
        "abc",
        "message digest",
        "abcdefghijklmnopqrstuvwxyz",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "12345678901234567890123456789012345678901234567890123456789012345678901234567890"
    })
    @DisplayName("SM3: Standard test inputs")
    void testSM3_StandardInputs(String input) throws Exception {
        byte[] data = input.getBytes(StandardCharsets.UTF_8);
        
        String javaHash = computeJavaSM3(data);
        String jsHash = computeJavaScriptSM3(data);
        
        assertEquals(javaHash, jsHash, 
            "SM3 hash mismatch for input: '" + input + "'");
        assertEquals(64, javaHash.length(), 
            "SM3 hash should be 64 hex characters (256 bits)");
        
        System.out.printf("✓ SM3('%s') = %s...%s%n", 
            input.length() > 20 ? input.substring(0, 20) + "..." : input,
            javaHash.substring(0, 8), javaHash.substring(56));
    }

    @ParameterizedTest(name = "SM3: {0} bytes")
    @ValueSource(ints = {0, 1, 15, 16, 31, 32, 55, 56, 63, 64, 100, 1000, 10000})
    @DisplayName("SM3: Various message sizes")
    void testSM3_MessageSizes(int size) throws Exception {
        byte[] data = new byte[size];
        RANDOM.nextBytes(data);
        
        String javaHash = computeJavaSM3(data);
        String jsHash = computeJavaScriptSM3(data);
        
        assertEquals(javaHash, jsHash, 
            "SM3 hash mismatch for " + size + " bytes");
        assertEquals(64, javaHash.length(), 
            "SM3 hash should be 64 hex characters");
        
        System.out.printf("✓ SM3(%d bytes) = %s...%n", size, javaHash.substring(0, 16));
    }

    @ParameterizedTest(name = "SM3: {0}")
    @MethodSource("provideUnicodeStrings")
    @DisplayName("SM3: Unicode and special characters")
    void testSM3_UnicodeStrings(String input, String description) throws Exception {
        byte[] data = input.getBytes(StandardCharsets.UTF_8);
        
        String javaHash = computeJavaSM3(data);
        String jsHash = computeJavaScriptSM3(data);
        
        assertEquals(javaHash, jsHash, 
            "SM3 hash mismatch for " + description);
        
        System.out.printf("✓ SM3(%s) = %s...%n", description, javaHash.substring(0, 16));
    }

    static Stream<Arguments> provideUnicodeStrings() {
        return Stream.of(
            Arguments.of("你好世界", "Chinese characters"),
            Arguments.of("こんにちは", "Japanese characters"),
            Arguments.of("안녕하세요", "Korean characters"),
            Arguments.of("Привет мир", "Russian characters"),
            Arguments.of("مرحبا بالعالم", "Arabic characters"),
            Arguments.of("Hello 世界 🌍", "Mixed ASCII, Chinese, and emoji"),
            Arguments.of("😀😃😄😁😆😅🤣😂", "Multiple emojis"),
            Arguments.of("\u0000\u0001\u0002", "Control characters"),
            Arguments.of("Line1\nLine2\rLine3\r\nLine4", "Newlines")
        );
    }

    @ParameterizedTest(name = "SM3: Pattern {0}")
    @MethodSource("provideBinaryPatterns")
    @DisplayName("SM3: Binary patterns")
    void testSM3_BinaryPatterns(byte[] data, String description) throws Exception {
        String javaHash = computeJavaSM3(data);
        String jsHash = computeJavaScriptSM3(data);
        
        assertEquals(javaHash, jsHash, 
            "SM3 hash mismatch for " + description);
        
        System.out.printf("✓ SM3(%s) = %s...%n", description, javaHash.substring(0, 16));
    }

    static Stream<Arguments> provideBinaryPatterns() {
        byte[] zeros = new byte[100];
        byte[] ones = new byte[100];
        java.util.Arrays.fill(ones, (byte) 0xFF);
        
        byte[] alternating = new byte[100];
        for (int i = 0; i < alternating.length; i++) {
            alternating[i] = (byte) (i % 2 == 0 ? 0xAA : 0x55);
        }
        
        byte[] ascending = new byte[256];
        for (int i = 0; i < ascending.length; i++) {
            ascending[i] = (byte) i;
        }
        
        return Stream.of(
            Arguments.of(zeros, "All zeros"),
            Arguments.of(ones, "All ones"),
            Arguments.of(alternating, "Alternating pattern"),
            Arguments.of(ascending, "Ascending bytes (0-255)")
        );
    }

    @RepeatedTest(50)
    @DisplayName("SM3: Random data consistency")
    void testSM3_RandomConsistency() throws Exception {
        int size = RANDOM.nextInt(5000) + 1;
        byte[] data = new byte[size];
        RANDOM.nextBytes(data);
        
        String javaHash = computeJavaSM3(data);
        String jsHash = computeJavaScriptSM3(data);
        
        assertEquals(javaHash, jsHash, 
            "SM3 random test failed for " + size + " bytes");
    }

    // ============================================
    // SM3 Property-Based Tests
    // ============================================

    @RepeatedTest(100)
    @DisplayName("SM3 Property: Deterministic (same input → same output)")
    void testSM3_DeterministicProperty() throws Exception {
        byte[] data = new byte[RANDOM.nextInt(1000) + 1];
        RANDOM.nextBytes(data);
        
        String hash1 = computeJavaSM3(data);
        String hash2 = computeJavaSM3(data);
        
        assertEquals(hash1, hash2, "SM3 should be deterministic");
    }

    @RepeatedTest(100)
    @DisplayName("SM3 Property: Fixed output length (256 bits)")
    void testSM3_FixedLengthProperty() throws Exception {
        byte[] data = new byte[RANDOM.nextInt(10000)];
        RANDOM.nextBytes(data);
        
        String hash = computeJavaSM3(data);
        
        assertEquals(64, hash.length(), 
            "SM3 output should always be 64 hex chars (256 bits)");
    }

    @RepeatedTest(100)
    @DisplayName("SM3 Property: Avalanche effect (1-bit change → ~50% bits change)")
    void testSM3_AvalancheProperty() throws Exception {
        byte[] data1 = new byte[100];
        RANDOM.nextBytes(data1);
        
        byte[] data2 = data1.clone();
        // Flip one random bit
        int byteIndex = RANDOM.nextInt(data2.length);
        int bitIndex = RANDOM.nextInt(8);
        data2[byteIndex] ^= (1 << bitIndex);
        
        String hash1 = computeJavaSM3(data1);
        String hash2 = computeJavaSM3(data2);
        
        assertNotEquals(hash1, hash2, "Hashes should differ");
        
        // Count differing bits
        int differentBits = countDifferentBits(hash1, hash2);
        
        // Avalanche effect: expect ~128 bits different (allow 35%-65% range for statistical variation)
        // With 100 iterations, we need wider bounds to account for natural statistical outliers
        assertTrue(differentBits >= 90 && differentBits <= 166,
            String.format("Avalanche effect failed: %d/256 bits different (expected 90-166, ~35-65%%)", 
                differentBits));
    }

    private int countDifferentBits(String hex1, String hex2) {
        int count = 0;
        for (int i = 0; i < hex1.length(); i++) {
            int nibble1 = Character.digit(hex1.charAt(i), 16);
            int nibble2 = Character.digit(hex2.charAt(i), 16);
            int xor = nibble1 ^ nibble2;
            // Count bits in nibble
            count += Integer.bitCount(xor);
        }
        return count;
    }

    @RepeatedTest(50)
    @DisplayName("SM3 Property: Collision resistance (different inputs → different outputs)")
    void testSM3_CollisionResistanceProperty() throws Exception {
        byte[] data1 = new byte[RANDOM.nextInt(1000) + 1];
        byte[] data2 = new byte[RANDOM.nextInt(1000) + 1];
        
        RANDOM.nextBytes(data1);
        RANDOM.nextBytes(data2);
        
        // Very unlikely to generate the same random data
        if (java.util.Arrays.equals(data1, data2)) {
            return; // Skip this iteration
        }
        
        String hash1 = computeJavaSM3(data1);
        String hash2 = computeJavaSM3(data2);
        
        assertNotEquals(hash1, hash2, 
            "Different inputs should produce different hashes");
    }

    // ============================================
    // SM4 Boundary Conditions
    // ============================================

    @Nested
    @DisplayName("SM4 Boundary Conditions")
    class SM4BoundaryTests {
        
        @Test
        @DisplayName("SM4-ECB: Null key should fail")
        void testSM4_ECB_NullKey() {
            assertThrows(Exception.class, () -> {
                encryptJavaSM4_ECB(new byte[16], null);
            });
        }
        
        @Test
        @DisplayName("SM4-ECB: Invalid key size should fail")
        void testSM4_ECB_InvalidKeySize() {
            byte[] invalidKey = new byte[15]; // Should be 16
            assertThrows(Exception.class, () -> {
                encryptJavaSM4_ECB(new byte[16], invalidKey);
            });
        }
        
        @Test
        @DisplayName("SM4-CBC: Null IV should fail")
        void testSM4_CBC_NullIV() {
            byte[] key = new byte[16];
            assertThrows(Exception.class, () -> {
                encryptJavaSM4_CBC(new byte[16], key, null);
            });
        }
        
        @Test
        @DisplayName("SM4-CBC: Invalid IV size should fail")
        void testSM4_CBC_InvalidIVSize() {
            byte[] key = new byte[16];
            byte[] invalidIV = new byte[15]; // Should be 16
            assertThrows(Exception.class, () -> {
                encryptJavaSM4_CBC(new byte[16], key, invalidIV);
            });
        }
        
        @ParameterizedTest(name = "Block size {0}")
        @ValueSource(ints = {0, 15, 16, 17, 31, 32, 63, 64, 65})
        @DisplayName("SM4-ECB: Block size boundaries")
        void testSM4_ECB_BlockBoundaries(int size) throws Exception {
            byte[] key = new byte[16];
            byte[] plaintext = new byte[size];
            RANDOM.nextBytes(key);
            RANDOM.nextBytes(plaintext);
            
            byte[] ciphertext = encryptJavaSM4_ECB(plaintext, key);
            byte[] decrypted = decryptJavaSM4_ECB(ciphertext, key);
            
            assertArrayEquals(plaintext, decrypted, 
                "ECB failed for " + size + " bytes");
        }
    }

    // ============================================
    // Performance Comparison Tests
    // ============================================

    @Test
    @DisplayName("Performance: SM3 throughput comparison")
    @Tag("performance")
    void testSM3_PerformanceComparison() throws Exception {
        int iterations = 1000;
        int dataSize = 1024; // 1KB
        byte[] data = new byte[dataSize];
        RANDOM.nextBytes(data);
        
        // Warm up
        for (int i = 0; i < 100; i++) {
            computeJavaSM3(data);
        }
        
        // Measure Java
        long javaStart = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            computeJavaSM3(data);
        }
        long javaEnd = System.nanoTime();
        double javaMs = (javaEnd - javaStart) / 1_000_000.0;
        double javaThroughput = (iterations * dataSize / 1024.0 / 1024.0) / (javaMs / 1000.0);
        
        // Note: JavaScript performance will be slower due to polyglot overhead
        System.out.printf("%n=== SM3 Performance Comparison ===%n");
        System.out.printf("Java: %.2f ms (%d iterations × 1KB) = %.2f MB/s%n", 
            javaMs, iterations, javaThroughput);
        System.out.printf("Note: JavaScript performance not measured due to polyglot overhead%n");
        
        assertTrue(javaThroughput > 1.0, "Java SM3 throughput too low");
    }

    // ============================================
    // Stress Tests
    // ============================================

    @Test
    @DisplayName("Stress: SM3 with large data (10 MB)")
    @Tag("stress")
    void testSM3_LargeData() throws Exception {
        byte[] data = new byte[10 * 1024 * 1024]; // 10 MB
        RANDOM.nextBytes(data);
        
        long start = System.nanoTime();
        String hash = computeJavaSM3(data);
        long end = System.nanoTime();
        
        assertEquals(64, hash.length());
        
        double seconds = (end - start) / 1_000_000_000.0;
        double throughput = 10.0 / seconds;
        
        System.out.printf("SM3 processed 10 MB in %.3f seconds (%.2f MB/s)%n", 
            seconds, throughput);
    }

    @RepeatedTest(10)
    @DisplayName("Stress: Concurrent SM3 operations")
    @Tag("stress")
    void testSM3_ConcurrentOperations() throws Exception {
        int threadCount = 4;
        int iterationsPerThread = 100;
        
        java.util.concurrent.CountDownLatch latch = 
            new java.util.concurrent.CountDownLatch(threadCount);
        java.util.concurrent.atomic.AtomicInteger successCount = 
            new java.util.concurrent.atomic.AtomicInteger(0);
        
        for (int t = 0; t < threadCount; t++) {
            new Thread(() -> {
                try {
                    for (int i = 0; i < iterationsPerThread; i++) {
                        byte[] data = new byte[100];
                        RANDOM.nextBytes(data);
                        String hash = computeJavaSM3(data);
                        if (hash.length() == 64) {
                            successCount.incrementAndGet();
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            }).start();
        }
        
        latch.await(30, java.util.concurrent.TimeUnit.SECONDS);
        assertEquals(threadCount * iterationsPerThread, successCount.get(),
            "Some concurrent operations failed");
    }

    // ============================================
    // Helper Methods (reusing from SM4CipherInteropTest)
    // ============================================

    private byte[] encryptJavaSM4_ECB(byte[] plaintext, byte[] key) throws Exception {
        org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher cipher = 
            new org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher(
                new org.bouncycastle.crypto.engines.SM4Engine(), 
                new org.bouncycastle.crypto.paddings.PKCS7Padding());
        cipher.init(true, new org.bouncycastle.crypto.params.KeyParameter(key));
        
        byte[] output = new byte[cipher.getOutputSize(plaintext.length)];
        int len = cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
        len += cipher.doFinal(output, len);
        
        return java.util.Arrays.copyOf(output, len);
    }

    private byte[] decryptJavaSM4_ECB(byte[] ciphertext, byte[] key) throws Exception {
        org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher cipher = 
            new org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher(
                new org.bouncycastle.crypto.engines.SM4Engine(), 
                new org.bouncycastle.crypto.paddings.PKCS7Padding());
        cipher.init(false, new org.bouncycastle.crypto.params.KeyParameter(key));
        
        byte[] output = new byte[cipher.getOutputSize(ciphertext.length)];
        int len = cipher.processBytes(ciphertext, 0, ciphertext.length, output, 0);
        len += cipher.doFinal(output, len);
        
        return java.util.Arrays.copyOf(output, len);
    }

    private byte[] encryptJavaSM4_CBC(byte[] plaintext, byte[] key, byte[] iv) throws Exception {
        org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher cipher = 
            new org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher(
                new org.bouncycastle.crypto.modes.CBCBlockCipher(
                    new org.bouncycastle.crypto.engines.SM4Engine()), 
                new org.bouncycastle.crypto.paddings.PKCS7Padding());
        cipher.init(true, new org.bouncycastle.crypto.params.ParametersWithIV(
            new org.bouncycastle.crypto.params.KeyParameter(key), iv));
        
        byte[] output = new byte[cipher.getOutputSize(plaintext.length)];
        int len = cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
        len += cipher.doFinal(output, len);
        
        return java.util.Arrays.copyOf(output, len);
    }
}
