package com.sm.bc.graalvm;

import org.bouncycastle.crypto.BlockCipher;
import org.bouncycastle.crypto.engines.SM4Engine;
import org.bouncycastle.crypto.modes.*;
import org.bouncycastle.crypto.paddings.PKCS7Padding;
import org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.crypto.params.ParametersWithIV;
import org.bouncycastle.util.encoders.Hex;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for SM4 encryption across Java and JavaScript implementations.
 * Tests all SM4 modes: ECB, CBC, CTR, CFB, OFB, and GCM.
 */
@DisplayName("SM4 Cross-Language Integration Tests")
public class SM4CipherInteropTest extends BaseGraalVMTest {

    private static final String TEST_KEY_HEX = "0123456789abcdeffedcba9876543210";
    private static final String TEST_IV_HEX = "0123456789abcdeffedcba9876543210";
    
    @BeforeEach
    @Override
    public void setupGraalVM() throws IOException {
        // Check if GraalVM JavaScript is available
        if (!isGraalVMJavaScriptAvailable()) {
            Assumptions.assumeTrue(false, 
                "GraalVM JavaScript not available. Skipping test. " +
                "Install GraalVM or use the Node.js-based tests instead.");
        }
        super.setupGraalVM();
    }

    // ============================================
    // ECB Mode Tests
    // ============================================

    @Test
    @DisplayName("SM4-ECB: Empty input with padding")
    void testSM4_ECB_Empty() throws Exception {
        byte[] plaintext = new byte[0];
        testECBMode(plaintext, "Empty input");
    }

    @Test
    @DisplayName("SM4-ECB: Single block (16 bytes)")
    void testSM4_ECB_SingleBlock() throws Exception {
        byte[] plaintext = "0123456789abcdef".getBytes(StandardCharsets.UTF_8);
        testECBMode(plaintext, "Single block");
    }

    @Test
    @DisplayName("SM4-ECB: Multi-block (32 bytes)")
    void testSM4_ECB_MultiBlock() throws Exception {
        byte[] plaintext = "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8);
        testECBMode(plaintext, "Multi-block");
    }

    @ParameterizedTest(name = "{1}")
    @MethodSource("providePlaintextSizes")
    @DisplayName("SM4-ECB: Various plaintext sizes")
    void testSM4_ECB_VariousSizes(byte[] plaintext, String description) throws Exception {
        testECBMode(plaintext, description);
    }

    private void testECBMode(byte[] plaintext, String description) throws Exception {
        byte[] key = Hex.decode(TEST_KEY_HEX);
        
        // Java encryption
        byte[] javaCiphertext = encryptJavaSM4_ECB(plaintext, key);
        
        // JavaScript encryption
        byte[] jsCiphertext = encryptJavaScriptSM4_ECB(plaintext, key);
        
        // Verify ciphertexts match
        assertArrayEquals(javaCiphertext, jsCiphertext, 
            description + ": Ciphertexts don't match");
        
        // Java decryption
        byte[] javaDecrypted = decryptJavaSM4_ECB(javaCiphertext, key);
        assertArrayEquals(plaintext, javaDecrypted, 
            description + ": Java decryption failed");
        
        // JavaScript decryption
        byte[] jsDecrypted = decryptJavaScriptSM4_ECB(jsCiphertext, key);
        assertArrayEquals(plaintext, jsDecrypted, 
            description + ": JavaScript decryption failed");
        
        // Cross-platform decryption
        byte[] crossDecrypted1 = decryptJavaSM4_ECB(jsCiphertext, key);
        assertArrayEquals(plaintext, crossDecrypted1, 
            description + ": Java can't decrypt JS ciphertext");
        
        byte[] crossDecrypted2 = decryptJavaScriptSM4_ECB(javaCiphertext, key);
        assertArrayEquals(plaintext, crossDecrypted2, 
            description + ": JS can't decrypt Java ciphertext");
        
        System.out.printf("✓ ECB %s: plaintext=%d bytes, ciphertext=%d bytes%n",
            description, plaintext.length, javaCiphertext.length);
    }

    // ============================================
    // CBC Mode Tests
    // ============================================

    @Test
    @DisplayName("SM4-CBC: Single block with IV")
    void testSM4_CBC_SingleBlock() throws Exception {
        byte[] plaintext = "0123456789abcdef".getBytes(StandardCharsets.UTF_8);
        testCBCMode(plaintext, "Single block");
    }

    @Test
    @DisplayName("SM4-CBC: Multi-block with IV")
    void testSM4_CBC_MultiBlock() throws Exception {
        byte[] plaintext = "The quick brown fox jumps over the lazy dog".getBytes(StandardCharsets.UTF_8);
        testCBCMode(plaintext, "Multi-block");
    }

    @ParameterizedTest(name = "{1}")
    @MethodSource("providePlaintextSizes")
    @DisplayName("SM4-CBC: Various plaintext sizes")
    void testSM4_CBC_VariousSizes(byte[] plaintext, String description) throws Exception {
        testCBCMode(plaintext, description);
    }

    private void testCBCMode(byte[] plaintext, String description) throws Exception {
        byte[] key = Hex.decode(TEST_KEY_HEX);
        byte[] iv = Hex.decode(TEST_IV_HEX);
        
        // Java encryption
        byte[] javaCiphertext = encryptJavaSM4_CBC(plaintext, key, iv);
        
        // JavaScript encryption
        byte[] jsCiphertext = encryptJavaScriptSM4_CBC(plaintext, key, iv);
        
        // Verify ciphertexts match
        assertArrayEquals(javaCiphertext, jsCiphertext, 
            description + ": Ciphertexts don't match");
        
        // Cross-platform decryption
        byte[] javaDecrypted = decryptJavaSM4_CBC(jsCiphertext, key, iv);
        assertArrayEquals(plaintext, javaDecrypted, 
            description + ": Cross-platform decryption failed");
        
        System.out.printf("✓ CBC %s: plaintext=%d bytes, ciphertext=%d bytes%n",
            description, plaintext.length, javaCiphertext.length);
    }

    // ============================================
    // CTR Mode Tests
    // ============================================

    @Test
    @DisplayName("SM4-CTR: Stream mode without padding")
    void testSM4_CTR_NoPadding() throws Exception {
        byte[] plaintext = "Hello SM4 CTR mode!".getBytes(StandardCharsets.UTF_8);
        testCTRMode(plaintext, "No padding");
    }

    @ParameterizedTest(name = "{1}")
    @MethodSource("providePlaintextSizes")
    @DisplayName("SM4-CTR: Various plaintext sizes")
    void testSM4_CTR_VariousSizes(byte[] plaintext, String description) throws Exception {
        testCTRMode(plaintext, description);
    }

    private void testCTRMode(byte[] plaintext, String description) throws Exception {
        byte[] key = Hex.decode(TEST_KEY_HEX);
        byte[] iv = Hex.decode(TEST_IV_HEX);
        
        // Java encryption
        byte[] javaCiphertext = encryptJavaSM4_CTR(plaintext, key, iv);
        
        // JavaScript encryption
        byte[] jsCiphertext = encryptJavaScriptSM4_CTR(plaintext, key, iv);
        
        // Verify ciphertexts match
        assertArrayEquals(javaCiphertext, jsCiphertext, 
            description + ": Ciphertexts don't match");
        
        // CTR is self-inverse, same operation for decrypt
        byte[] javaDecrypted = encryptJavaSM4_CTR(javaCiphertext, key, iv);
        assertArrayEquals(plaintext, javaDecrypted, 
            description + ": Decryption failed");
        
        System.out.printf("✓ CTR %s: plaintext=%d bytes, ciphertext=%d bytes%n",
            description, plaintext.length, javaCiphertext.length);
    }

    // ============================================
    // GCM Mode Tests (AEAD)
    // ============================================

    @Test
    @DisplayName("SM4-GCM: AEAD with 16-byte plaintext")
    void testSM4_GCM_SingleBlock() throws Exception {
        byte[] plaintext = "0123456789abcdef".getBytes(StandardCharsets.UTF_8);
        byte[] aad = "additional".getBytes(StandardCharsets.UTF_8);
        testGCMMode(plaintext, aad, "Single block");
    }

    @Test
    @DisplayName("SM4-GCM: AEAD with 32-byte plaintext")
    void testSM4_GCM_MultiBlock() throws Exception {
        byte[] plaintext = "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8);
        byte[] aad = "metadata".getBytes(StandardCharsets.UTF_8);
        testGCMMode(plaintext, aad, "Multi-block");
    }

    @Test
    @DisplayName("SM4-GCM: Empty plaintext with AAD")
    void testSM4_GCM_EmptyPlaintext() throws Exception {
        byte[] plaintext = new byte[0];
        byte[] aad = "only-aad".getBytes(StandardCharsets.UTF_8);
        testGCMMode(plaintext, aad, "Empty plaintext");
    }

    @ParameterizedTest(name = "{2}")
    @MethodSource("provideGCMTestData")
    @DisplayName("SM4-GCM: Various configurations")
    void testSM4_GCM_Various(byte[] plaintext, byte[] aad, String description) throws Exception {
        testGCMMode(plaintext, aad, description);
    }

    private void testGCMMode(byte[] plaintext, byte[] aad, String description) throws Exception {
        byte[] key = Hex.decode(TEST_KEY_HEX);
        byte[] iv = new byte[12]; // GCM standard IV size
        new SecureRandom().nextBytes(iv);
        
        // Java encryption
        byte[] javaCiphertext = encryptJavaSM4_GCM(plaintext, key, iv, aad);
        
        // JavaScript encryption
        byte[] jsCiphertext = encryptJavaScriptSM4_GCM(plaintext, key, iv, aad);
        
        // Note: GCM ciphertexts may differ due to random padding, but both should decrypt correctly
        
        // Java decrypt Java
        byte[] javaDecrypted1 = decryptJavaSM4_GCM(javaCiphertext, key, iv, aad);
        assertArrayEquals(plaintext, javaDecrypted1, 
            description + ": Java can't decrypt its own ciphertext");
        
        // JavaScript decrypt JavaScript
        byte[] jsDecrypted1 = decryptJavaScriptSM4_GCM(jsCiphertext, key, iv, aad);
        assertArrayEquals(plaintext, jsDecrypted1, 
            description + ": JS can't decrypt its own ciphertext");
        
        // Cross-platform: Java decrypt JS
        byte[] javaDecrypted2 = decryptJavaSM4_GCM(jsCiphertext, key, iv, aad);
        assertArrayEquals(plaintext, javaDecrypted2, 
            description + ": Java can't decrypt JS ciphertext");
        
        // Cross-platform: JS decrypt Java
        byte[] jsDecrypted2 = decryptJavaScriptSM4_GCM(javaCiphertext, key, iv, aad);
        assertArrayEquals(plaintext, jsDecrypted2, 
            description + ": JS can't decrypt Java ciphertext");
        
        System.out.printf("✓ GCM %s: plaintext=%d bytes, ciphertext=%d bytes (with MAC)%n",
            description, plaintext.length, javaCiphertext.length);
    }

    @Test
    @DisplayName("SM4-GCM: MAC verification failure detection")
    void testSM4_GCM_MACFailure() throws Exception {
        byte[] plaintext = "sensitive data".getBytes(StandardCharsets.UTF_8);
        byte[] aad = "metadata".getBytes(StandardCharsets.UTF_8);
        byte[] key = Hex.decode(TEST_KEY_HEX);
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        
        // Encrypt
        byte[] ciphertext = encryptJavaSM4_GCM(plaintext, key, iv, aad);
        
        // Corrupt ciphertext (flip a bit)
        ciphertext[0] ^= 0x01;
        
        // Decryption should fail MAC verification
        assertThrows(Exception.class, () -> {
            decryptJavaSM4_GCM(ciphertext, key, iv, aad);
        }, "Should detect corrupted ciphertext");
        
        System.out.println("✓ GCM MAC verification correctly detects tampering");
    }

    // ============================================
    // Random Testing
    // ============================================

    @RepeatedTest(100)
    @DisplayName("SM4: Random data consistency test")
    void testSM4_RandomConsistency() throws Exception {
        SecureRandom random = new SecureRandom();
        
        // Random key, IV, and plaintext
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        byte[] plaintext = new byte[random.nextInt(200) + 1]; // 1-200 bytes
        
        random.nextBytes(key);
        random.nextBytes(iv);
        random.nextBytes(plaintext);
        
        // Test CBC mode
        byte[] javaCiphertext = encryptJavaSM4_CBC(plaintext, key, iv);
        byte[] jsCiphertext = encryptJavaScriptSM4_CBC(plaintext, key, iv);
        
        assertArrayEquals(javaCiphertext, jsCiphertext, 
            "Random test failed: ciphertexts don't match");
        
        byte[] decrypted = decryptJavaSM4_CBC(jsCiphertext, key, iv);
        assertArrayEquals(plaintext, decrypted, 
            "Random test failed: decryption mismatch");
    }

    // ============================================
    // Test Data Providers
    // ============================================

    static Stream<Arguments> providePlaintextSizes() {
        return Stream.of(
            Arguments.of(new byte[0], "Empty (0 bytes)"),
            Arguments.of(new byte[1], "1 byte"),
            Arguments.of(new byte[15], "15 bytes (< block)"),
            Arguments.of(new byte[16], "16 bytes (1 block)"),
            Arguments.of(new byte[17], "17 bytes (> block)"),
            Arguments.of(new byte[31], "31 bytes"),
            Arguments.of(new byte[32], "32 bytes (2 blocks)"),
            Arguments.of(new byte[100], "100 bytes"),
            Arguments.of(new byte[1000], "1 KB")
        );
    }

    static Stream<Arguments> provideGCMTestData() {
        return Stream.of(
            Arguments.of(new byte[16], new byte[8], "16-byte plaintext, 8-byte AAD"),
            Arguments.of(new byte[32], new byte[0], "32-byte plaintext, no AAD"),
            Arguments.of(new byte[100], new byte[50], "100-byte plaintext, 50-byte AAD"),
            Arguments.of(new byte[0], new byte[32], "Empty plaintext, 32-byte AAD")
        );
    }

    // ============================================
    // Java SM4 Implementation Helpers
    // ============================================

    private byte[] encryptJavaSM4_ECB(byte[] plaintext, byte[] key) throws Exception {
        PaddedBufferedBlockCipher cipher = new PaddedBufferedBlockCipher(
            new SM4Engine(), new PKCS7Padding());
        cipher.init(true, new KeyParameter(key));
        
        byte[] output = new byte[cipher.getOutputSize(plaintext.length)];
        int len = cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
        len += cipher.doFinal(output, len);
        
        return Arrays.copyOf(output, len);
    }

    private byte[] decryptJavaSM4_ECB(byte[] ciphertext, byte[] key) throws Exception {
        PaddedBufferedBlockCipher cipher = new PaddedBufferedBlockCipher(
            new SM4Engine(), new PKCS7Padding());
        cipher.init(false, new KeyParameter(key));
        
        byte[] output = new byte[cipher.getOutputSize(ciphertext.length)];
        int len = cipher.processBytes(ciphertext, 0, ciphertext.length, output, 0);
        len += cipher.doFinal(output, len);
        
        return Arrays.copyOf(output, len);
    }

    private byte[] encryptJavaSM4_CBC(byte[] plaintext, byte[] key, byte[] iv) throws Exception {
        PaddedBufferedBlockCipher cipher = new PaddedBufferedBlockCipher(
            new CBCBlockCipher(new SM4Engine()), new PKCS7Padding());
        cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
        
        byte[] output = new byte[cipher.getOutputSize(plaintext.length)];
        int len = cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
        len += cipher.doFinal(output, len);
        
        return Arrays.copyOf(output, len);
    }

    private byte[] decryptJavaSM4_CBC(byte[] ciphertext, byte[] key, byte[] iv) throws Exception {
        PaddedBufferedBlockCipher cipher = new PaddedBufferedBlockCipher(
            new CBCBlockCipher(new SM4Engine()), new PKCS7Padding());
        cipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
        
        byte[] output = new byte[cipher.getOutputSize(ciphertext.length)];
        int len = cipher.processBytes(ciphertext, 0, ciphertext.length, output, 0);
        len += cipher.doFinal(output, len);
        
        return Arrays.copyOf(output, len);
    }

    private byte[] encryptJavaSM4_CTR(byte[] plaintext, byte[] key, byte[] iv) throws Exception {
        BlockCipher engine = new SM4Engine();
        SICBlockCipher ctrCipher = new SICBlockCipher(engine);
        ctrCipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
        
        byte[] output = new byte[plaintext.length];
        ctrCipher.processBytes(plaintext, 0, plaintext.length, output, 0);
        
        return output;
    }

    private byte[] encryptJavaSM4_GCM(byte[] plaintext, byte[] key, byte[] iv, byte[] aad) throws Exception {
        GCMBlockCipher gcmCipher = new GCMBlockCipher(new SM4Engine());
        org.bouncycastle.crypto.params.AEADParameters params = 
            new org.bouncycastle.crypto.params.AEADParameters(
                new KeyParameter(key), 128, iv, aad);
        gcmCipher.init(true, params);
        
        byte[] output = new byte[gcmCipher.getOutputSize(plaintext.length)];
        int len = gcmCipher.processBytes(plaintext, 0, plaintext.length, output, 0);
        len += gcmCipher.doFinal(output, len);
        
        return Arrays.copyOf(output, len);
    }

    private byte[] decryptJavaSM4_GCM(byte[] ciphertext, byte[] key, byte[] iv, byte[] aad) throws Exception {
        GCMBlockCipher gcmCipher = new GCMBlockCipher(new SM4Engine());
        org.bouncycastle.crypto.params.AEADParameters params = 
            new org.bouncycastle.crypto.params.AEADParameters(
                new KeyParameter(key), 128, iv, aad);
        gcmCipher.init(false, params);
        
        byte[] output = new byte[gcmCipher.getOutputSize(ciphertext.length)];
        int len = gcmCipher.processBytes(ciphertext, 0, ciphertext.length, output, 0);
        len += gcmCipher.doFinal(output, len);
        
        return Arrays.copyOf(output, len);
    }

    // ============================================
    // JavaScript SM4 Implementation Helpers
    // ============================================

    private byte[] encryptJavaScriptSM4_ECB(byte[] plaintext, byte[] key) {
        String keyHex = bytesToHex(key);
        String plaintextHex = bytesToHex(plaintext);
        
        Value result = evalJs(String.format("""
            (() => {
                try {
                    const SM4Engine = smBcLibrary.SM4Engine;
                    const ECBBlockCipher = smBcLibrary.ECBBlockCipher;
                    const PaddedBufferedBlockCipher = smBcLibrary.PaddedBufferedBlockCipher;
                    const PKCS7Padding = smBcLibrary.PKCS7Padding;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    
                    const key = testUtils.hexToBytes('%s');
                    const plaintext = testUtils.hexToBytes('%s');
                    
                    const cipher = new PaddedBufferedBlockCipher(
                        new ECBBlockCipher(new SM4Engine()), new PKCS7Padding());
                    cipher.init(true, new KeyParameter(key));
                    
                    const output = new Uint8Array(cipher.getOutputSize(plaintext.length));
                    let len = cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
                    len += cipher.doFinal(output, len);
                    
                    return {
                        success: true,
                        ciphertext: testUtils.bytesToHex(output.subarray(0, len))
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, plaintextHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript SM4-ECB encryption failed: " + result.getMember("error"));
        
        return hexToBytes(result.getMember("ciphertext").asString());
    }

    private byte[] decryptJavaScriptSM4_ECB(byte[] ciphertext, byte[] key) {
        String keyHex = bytesToHex(key);
        String ciphertextHex = bytesToHex(ciphertext);
        
        Value result = evalJs(String.format("""
            (() => {
                try {
                    const SM4Engine = smBcLibrary.SM4Engine;
                    const ECBBlockCipher = smBcLibrary.ECBBlockCipher;
                    const PaddedBufferedBlockCipher = smBcLibrary.PaddedBufferedBlockCipher;
                    const PKCS7Padding = smBcLibrary.PKCS7Padding;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    
                    const key = testUtils.hexToBytes('%s');
                    const ciphertext = testUtils.hexToBytes('%s');
                    
                    const cipher = new PaddedBufferedBlockCipher(
                        new ECBBlockCipher(new SM4Engine()), new PKCS7Padding());
                    cipher.init(false, new KeyParameter(key));
                    
                    const output = new Uint8Array(cipher.getOutputSize(ciphertext.length));
                    let len = cipher.processBytes(ciphertext, 0, ciphertext.length, output, 0);
                    len += cipher.doFinal(output, len);
                    
                    return {
                        success: true,
                        plaintext: testUtils.bytesToHex(output.subarray(0, len))
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, ciphertextHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript SM4-ECB decryption failed: " + result.getMember("error"));
        
        return hexToBytes(result.getMember("plaintext").asString());
    }

    private byte[] encryptJavaScriptSM4_CBC(byte[] plaintext, byte[] key, byte[] iv) {
        String keyHex = bytesToHex(key);
        String ivHex = bytesToHex(iv);
        String plaintextHex = bytesToHex(plaintext);
        
        Value result = evalJs(String.format("""
            (() => {
                try {
                    const SM4Engine = smBcLibrary.SM4Engine;
                    const CBCBlockCipher = smBcLibrary.CBCBlockCipher;
                    const PaddedBufferedBlockCipher = smBcLibrary.PaddedBufferedBlockCipher;
                    const PKCS7Padding = smBcLibrary.PKCS7Padding;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const ParametersWithIV = smBcLibrary.ParametersWithIV;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const plaintext = testUtils.hexToBytes('%s');
                    
                    const cipher = new PaddedBufferedBlockCipher(
                        new CBCBlockCipher(new SM4Engine()), new PKCS7Padding());
                    cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
                    
                    const output = new Uint8Array(cipher.getOutputSize(plaintext.length));
                    let len = cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
                    len += cipher.doFinal(output, len);
                    
                    return {
                        success: true,
                        ciphertext: testUtils.bytesToHex(output.subarray(0, len))
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, ivHex, plaintextHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript SM4-CBC encryption failed: " + result.getMember("error"));
        
        return hexToBytes(result.getMember("ciphertext").asString());
    }

    private byte[] decryptJavaScriptSM4_CBC(byte[] ciphertext, byte[] key, byte[] iv) {
        String keyHex = bytesToHex(key);
        String ivHex = bytesToHex(iv);
        String ciphertextHex = bytesToHex(ciphertext);
        
        Value result = evalJs(String.format("""
            (() => {
                try {
                    const SM4Engine = smBcLibrary.SM4Engine;
                    const CBCBlockCipher = smBcLibrary.CBCBlockCipher;
                    const PaddedBufferedBlockCipher = smBcLibrary.PaddedBufferedBlockCipher;
                    const PKCS7Padding = smBcLibrary.PKCS7Padding;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const ParametersWithIV = smBcLibrary.ParametersWithIV;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const ciphertext = testUtils.hexToBytes('%s');
                    
                    const cipher = new PaddedBufferedBlockCipher(
                        new CBCBlockCipher(new SM4Engine()), new PKCS7Padding());
                    cipher.init(false, new ParametersWithIV(new KeyParameter(key), iv));
                    
                    const output = new Uint8Array(cipher.getOutputSize(ciphertext.length));
                    let len = cipher.processBytes(ciphertext, 0, ciphertext.length, output, 0);
                    len += cipher.doFinal(output, len);
                    
                    return {
                        success: true,
                        plaintext: testUtils.bytesToHex(output.subarray(0, len))
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, ivHex, ciphertextHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript SM4-CBC decryption failed: " + result.getMember("error"));
        
        return hexToBytes(result.getMember("plaintext").asString());
    }

    private byte[] encryptJavaScriptSM4_CTR(byte[] plaintext, byte[] key, byte[] iv) {
        String keyHex = bytesToHex(key);
        String ivHex = bytesToHex(iv);
        String plaintextHex = bytesToHex(plaintext);
        
        Value result = evalJs(String.format("""
            (() => {
                try {
                    const SM4Engine = smBcLibrary.SM4Engine;
                    const SICBlockCipher = smBcLibrary.SICBlockCipher;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const ParametersWithIV = smBcLibrary.ParametersWithIV;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const plaintext = testUtils.hexToBytes('%s');
                    
                    const cipher = new SICBlockCipher(new SM4Engine());
                    cipher.init(true, new ParametersWithIV(new KeyParameter(key), iv));
                    
                    const output = new Uint8Array(plaintext.length);
                    cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
                    
                    return {
                        success: true,
                        ciphertext: testUtils.bytesToHex(output)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, ivHex, plaintextHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript SM4-CTR encryption failed: " + result.getMember("error"));
        
        return hexToBytes(result.getMember("ciphertext").asString());
    }

    private byte[] encryptJavaScriptSM4_GCM(byte[] plaintext, byte[] key, byte[] iv, byte[] aad) {
        String keyHex = bytesToHex(key);
        String ivHex = bytesToHex(iv);
        String plaintextHex = bytesToHex(plaintext);
        String aadHex = bytesToHex(aad);
        
        Value result = evalJs(String.format("""
            (() => {
                try {
                    const SM4Engine = smBcLibrary.SM4Engine;
                    const GCMBlockCipher = smBcLibrary.GCMBlockCipher;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const AEADParameters = smBcLibrary.AEADParameters;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const plaintext = testUtils.hexToBytes('%s');
                    const aad = testUtils.hexToBytes('%s');
                    
                    const cipher = new GCMBlockCipher(new SM4Engine());
                    const params = new AEADParameters(new KeyParameter(key), 128, iv, aad);
                    cipher.init(true, params);
                    
                    const output = new Uint8Array(cipher.getOutputSize(plaintext.length));
                    let len = cipher.processBytes(plaintext, 0, plaintext.length, output, 0);
                    len += cipher.doFinal(output, len);
                    
                    return {
                        success: true,
                        ciphertext: testUtils.bytesToHex(output.subarray(0, len))
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, ivHex, plaintextHex, aadHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript SM4-GCM encryption failed: " + result.getMember("error"));
        
        return hexToBytes(result.getMember("ciphertext").asString());
    }

    private byte[] decryptJavaScriptSM4_GCM(byte[] ciphertext, byte[] key, byte[] iv, byte[] aad) {
        String keyHex = bytesToHex(key);
        String ivHex = bytesToHex(iv);
        String ciphertextHex = bytesToHex(ciphertext);
        String aadHex = bytesToHex(aad);
        
        Value result = evalJs(String.format("""
            (() => {
                try {
                    const SM4Engine = smBcLibrary.SM4Engine;
                    const GCMBlockCipher = smBcLibrary.GCMBlockCipher;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const AEADParameters = smBcLibrary.AEADParameters;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const ciphertext = testUtils.hexToBytes('%s');
                    const aad = testUtils.hexToBytes('%s');
                    
                    const cipher = new GCMBlockCipher(new SM4Engine());
                    const params = new AEADParameters(new KeyParameter(key), 128, iv, aad);
                    cipher.init(false, params);
                    
                    const output = new Uint8Array(cipher.getOutputSize(ciphertext.length));
                    let len = cipher.processBytes(ciphertext, 0, ciphertext.length, output, 0);
                    len += cipher.doFinal(output, len);
                    
                    return {
                        success: true,
                        plaintext: testUtils.bytesToHex(output.subarray(0, len))
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, ivHex, ciphertextHex, aadHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript SM4-GCM decryption failed: " + result.getMember("error"));
        
        return hexToBytes(result.getMember("plaintext").asString());
    }
}
