package com.sm.bc.graalvm.parameterized;

import com.sm.bc.graalvm.BaseGraalVMTest;
import com.sm.bc.graalvm.utils.TestDataGenerator;
import org.bouncycastle.asn1.gm.GMNamedCurves;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.engines.SM2Engine;
import org.bouncycastle.crypto.generators.ECKeyPairGenerator;
import org.bouncycastle.crypto.params.*;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.math.ec.ECPoint;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.Security;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * SM2 Encryption Parameterized Tests
 * Tests comprehensive encryption/decryption scenarios with various data inputs
 */
@DisplayName("SM2 Encryption Parameterized Tests")
public class SM2EncryptionParameterizedTest extends BaseGraalVMTest {

    private static ECDomainParameters domainParams;
    private static SecureRandom random;
    private ECPrivateKeyParameters privateKey;
    private ECPublicKeyParameters publicKey;

    @BeforeAll
    static void setupCrypto() {
        Security.addProvider(new BouncyCastleProvider());
        
        X9ECParameters sm2Params = GMNamedCurves.getByName("sm2p256v1");
        domainParams = new ECDomainParameters(
            sm2Params.getCurve(),
            sm2Params.getG(),
            sm2Params.getN(),
            sm2Params.getH()
        );
        
        random = new SecureRandom();
    }

    @BeforeEach
    void generateKeyPair() {
        ECKeyPairGenerator generator = new ECKeyPairGenerator();
        ECKeyGenerationParameters params = new ECKeyGenerationParameters(domainParams, random);
        generator.init(params);
        
        AsymmetricCipherKeyPair keyPair = generator.generateKeyPair();
        this.privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        this.publicKey = (ECPublicKeyParameters) keyPair.getPublic();
    }

    // Test data providers
    static Stream<String> simpleMessages() {
        return Stream.of(
            "Hello SM2!",
            "Test",
            "a",
            "Short msg",
            "This is a longer message for SM2 encryption testing"
        );
    }

    static Stream<String> unicodeMessages() {
        return Stream.of(
            "你好 SM2!",
            "Hello 世界",
            "SM2加密测试",
            "日本語テスト",
            "Тест на русском",
            "اختبار عربي",
            "🔐🚀✨"
        );
    }

    static Stream<Integer> messageLengths() {
        return Stream.of(1, 10, 32, 64, 128, 256, 512, 1024, 2048);
    }

    // ==================== Different Message Types ====================

    @ParameterizedTest
    @MethodSource("simpleMessages")
    @DisplayName("Encrypt and decrypt simple ASCII messages")
    void testSimpleMessages(String message) throws Exception {
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Java encrypt
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        assertNotNull(ciphertext);
        assertTrue(ciphertext.length > plaintext.length, "Ciphertext should be longer than plaintext");
        
        // Java decrypt
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        assertArrayEquals(plaintext, decrypted, "Decrypted should match original");
        assertEquals(message, new String(decrypted, StandardCharsets.UTF_8));
    }

    @ParameterizedTest
    @MethodSource("unicodeMessages")
    @DisplayName("Encrypt and decrypt Unicode messages")
    void testUnicodeMessages(String message) throws Exception {
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Java encrypt
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        assertNotNull(ciphertext);
        
        // Java decrypt
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        assertArrayEquals(plaintext, decrypted);
        assertEquals(message, new String(decrypted, StandardCharsets.UTF_8));
    }

    @ParameterizedTest
    @MethodSource("messageLengths")
    @DisplayName("Encrypt and decrypt messages of various lengths")
    void testVariousLengths(int length) throws Exception {
        byte[] plaintext = TestDataGenerator.randomBytes(length);
        
        // Java encrypt
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        assertNotNull(ciphertext);
        assertTrue(ciphertext.length > 96, "SM2 ciphertext should be at least 97 bytes (1+64+32+data)");
        
        // Java decrypt
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        assertArrayEquals(plaintext, decrypted, "Decrypted should match original for length " + length);
    }

    // ==================== Cross-Language Compatibility ====================

    @ParameterizedTest
    @ValueSource(strings = {"Hello", "Test message", "SM2加密", "Long message: " + "x"})
    @DisplayName("Java encrypt → JavaScript decrypt")
    void testJavaEncryptJsDecrypt(String message) throws Exception {
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Java encrypt
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        
        // JavaScript decrypt
        String decrypted = jsDecrypt(ciphertext, privateKey);
        assertEquals(message, decrypted, "JS decryption should match original message");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Hello", "Test message", "SM2加密", "JS message"})
    @DisplayName("JavaScript encrypt → Java decrypt")
    void testJsEncryptJavaDecrypt(String message) throws Exception {
        // JavaScript encrypt
        String ciphertextHex = jsEncrypt(message, publicKey);
        byte[] ciphertext = hexToBytes(ciphertextHex);
        
        // Java decrypt
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        assertEquals(message, new String(decrypted, StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("Four-way verification: Java ↔ JavaScript encrypt/decrypt")
    void testFourWayVerification() throws Exception {
        String message = "Four-way test message";
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // 1. Java encrypt → Java decrypt
        byte[] javaToJavaCipher = javaEncrypt(plaintext, publicKey);
        byte[] javaToJavaPlain = javaDecrypt(javaToJavaCipher, privateKey);
        assertEquals(message, new String(javaToJavaPlain, StandardCharsets.UTF_8), "Java → Java failed");
        
        // 2. Java encrypt → JS decrypt
        byte[] javaToJsCipher = javaEncrypt(plaintext, publicKey);
        String javaToJsPlain = jsDecrypt(javaToJsCipher, privateKey);
        assertEquals(message, javaToJsPlain, "Java → JS failed");
        
        // 3. JS encrypt → Java decrypt
        String jsToJavaCipherHex = jsEncrypt(message, publicKey);
        byte[] jsToJavaPlain = javaDecrypt(hexToBytes(jsToJavaCipherHex), privateKey);
        assertEquals(message, new String(jsToJavaPlain, StandardCharsets.UTF_8), "JS → Java failed");
        
        // 4. JS encrypt → JS decrypt
        String jsToJsCipherHex = jsEncrypt(message, publicKey);
        byte[] jsToJsCipher = hexToBytes(jsToJsCipherHex);
        String jsToJsPlain = jsDecrypt(jsToJsCipher, privateKey);
        assertEquals(message, jsToJsPlain, "JS → JS failed");
    }

    // ==================== Error Handling ====================

    @Test
    @DisplayName("Decryption with wrong key should fail")
    void testDecryptWithWrongKey() throws Exception {
        String message = "Secret message";
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Encrypt with first key
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        
        // Generate different key pair
        ECKeyPairGenerator generator = new ECKeyPairGenerator();
        generator.init(new ECKeyGenerationParameters(domainParams, random));
        AsymmetricCipherKeyPair wrongKeyPair = generator.generateKeyPair();
        ECPrivateKeyParameters wrongPrivateKey = (ECPrivateKeyParameters) wrongKeyPair.getPrivate();
        
        // Try to decrypt with wrong key - should fail
        assertThrows(Exception.class, () -> javaDecrypt(ciphertext, wrongPrivateKey),
            "Decryption with wrong key should throw exception");
    }

    @Test
    @DisplayName("Invalid ciphertext should be rejected")
    void testInvalidCiphertext() {
        // Too short ciphertext
        byte[] invalidCiphertext = new byte[]{1, 2, 3, 4};
        assertThrows(Exception.class, () -> javaDecrypt(invalidCiphertext, privateKey),
            "Too short ciphertext should be rejected");
    }

    @Test
    @DisplayName("Corrupted ciphertext should fail decryption")
    void testCorruptedCiphertext() throws Exception {
        String message = "Test message";
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Encrypt
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        
        // Corrupt the ciphertext
        byte[] corrupted = ciphertext.clone();
        corrupted[corrupted.length / 2] ^= 0xFF; // Flip bits in middle
        
        // Should fail to decrypt
        assertThrows(Exception.class, () -> javaDecrypt(corrupted, privateKey),
            "Corrupted ciphertext should fail verification");
    }

    // ==================== Edge Cases ====================

    @Test
    @DisplayName("Single byte message")
    void testSingleByte() throws Exception {
        byte[] plaintext = new byte[]{0x42};
        
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        
        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    @DisplayName("Binary data with all byte values")
    void testAllByteValues() throws Exception {
        // Create byte array with all possible byte values
        byte[] plaintext = new byte[256];
        for (int i = 0; i < 256; i++) {
            plaintext[i] = (byte) i;
        }
        
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        
        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    @DisplayName("Large message (10KB)")
    void testLargeMessage() throws Exception {
        byte[] plaintext = TestDataGenerator.randomBytes(10240); // 10KB
        
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        
        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    @DisplayName("Very large message (100KB)")
    void testVeryLargeMessage() throws Exception {
        byte[] plaintext = TestDataGenerator.randomBytes(102400); // 100KB
        
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        
        assertArrayEquals(plaintext, decrypted);
    }

    // ==================== Determinism and Randomness ====================

    @Test
    @DisplayName("Same message encrypted twice produces different ciphertexts")
    void testEncryptionRandomness() throws Exception {
        String message = "Test message";
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Encrypt twice
        byte[] ciphertext1 = javaEncrypt(plaintext, publicKey);
        byte[] ciphertext2 = javaEncrypt(plaintext, publicKey);
        
        // Ciphertexts should be different (due to random k value)
        assertFalse(bytesEqual(ciphertext1, ciphertext2),
            "Same message encrypted twice should produce different ciphertexts");
        
        // But both should decrypt to same message
        byte[] decrypted1 = javaDecrypt(ciphertext1, privateKey);
        byte[] decrypted2 = javaDecrypt(ciphertext2, privateKey);
        
        assertArrayEquals(plaintext, decrypted1);
        assertArrayEquals(plaintext, decrypted2);
    }

    @Test
    @DisplayName("Decryption is deterministic")
    void testDecryptionDeterminism() throws Exception {
        String message = "Determinism test";
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Encrypt once
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        
        // Decrypt multiple times
        byte[] decrypted1 = javaDecrypt(ciphertext, privateKey);
        byte[] decrypted2 = javaDecrypt(ciphertext, privateKey);
        byte[] decrypted3 = javaDecrypt(ciphertext, privateKey);
        
        // All decryptions should produce same result
        assertArrayEquals(decrypted1, decrypted2);
        assertArrayEquals(decrypted2, decrypted3);
        assertArrayEquals(plaintext, decrypted1);
    }

    // ==================== Helper Methods ====================

    private byte[] javaEncrypt(byte[] plaintext, ECPublicKeyParameters publicKey) throws Exception {
        SM2Engine engine = new SM2Engine();
        engine.init(true, new ParametersWithRandom(publicKey, random));
        return engine.processBlock(plaintext, 0, plaintext.length);
    }

    private byte[] javaDecrypt(byte[] ciphertext, ECPrivateKeyParameters privateKey) throws Exception {
        SM2Engine engine = new SM2Engine();
        engine.init(false, privateKey);
        return engine.processBlock(ciphertext, 0, ciphertext.length);
    }

    private String jsEncrypt(String message, ECPublicKeyParameters publicKey) {
        ECPoint pubPoint = publicKey.getQ();
        String publicKeyX = pubPoint.getAffineXCoord().toBigInteger().toString(16);
        String publicKeyY = pubPoint.getAffineYCoord().toBigInteger().toString(16);
        
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                const message = new TextEncoder().encode('%s');
                const publicKey = {
                    x: testUtils.hexToBigInt('%s'),
                    y: testUtils.hexToBigInt('%s')
                };
                
                const ciphertext = sm2.encrypt(message, publicKey);
                
                ({ success: true, ciphertext: testUtils.bytesToHex(ciphertext) })
            } catch (error) {
                ({ success: false, error: error.message })
            }
        """, message.replace("'", "\\'"), publicKeyX, publicKeyY));
        
        assertTrue(result.getMember("success").asBoolean(), 
            "JavaScript encryption failed: " + result.getMember("error"));
        
        return result.getMember("ciphertext").asString();
    }

    private String jsDecrypt(byte[] ciphertext, ECPrivateKeyParameters privateKey) {
        String ciphertextHex = bytesToHex(ciphertext);
        String privateKeyHex = privateKey.getD().toString(16);
        
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                const ciphertext = testUtils.hexToBytes('%s');
                const privateKey = testUtils.hexToBigInt('%s');
                
                const decrypted = sm2.decrypt(ciphertext, privateKey);
                const decryptedText = new TextDecoder('utf-8').decode(decrypted);
                
                ({ success: true, decryptedText: decryptedText })
            } catch (error) {
                ({ success: false, error: error.message })
            }
        """, ciphertextHex, privateKeyHex));
        
        assertTrue(result.getMember("success").asBoolean(), 
            "JavaScript decryption failed: " + result.getMember("error"));
        
        return result.getMember("decryptedText").asString();
    }

    private boolean bytesEqual(byte[] a, byte[] b) {
        if (a.length != b.length) return false;
        for (int i = 0; i < a.length; i++) {
            if (a[i] != b[i]) return false;
        }
        return true;
    }
}
