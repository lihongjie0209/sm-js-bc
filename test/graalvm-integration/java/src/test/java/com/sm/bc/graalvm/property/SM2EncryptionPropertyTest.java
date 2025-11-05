package com.sm.bc.graalvm.property;

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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.Security;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

/**
 * SM2 Encryption Property-Based Tests
 * Tests mathematical and security properties of SM2 encryption
 */
@DisplayName("SM2 Encryption Property Tests")
public class SM2EncryptionPropertyTest extends BaseGraalVMTest {

    private static final int ITERATIONS = 10;
    
    private static ECDomainParameters domainParams;
    private static SecureRandom random;

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

    // ==================== Encryption/Decryption Properties ====================

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Encryption then decryption returns original plaintext")
    void testEncryptionDecryptionRoundtrip() throws Exception {
        // Generate fresh key pair and message for each iteration
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        byte[] plaintext = TestDataGenerator.randomBytes(64);
        
        // Java: encrypt then decrypt
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        
        assertArrayEquals(plaintext, decrypted, 
            "Decrypted plaintext should match original");
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Same plaintext encrypted twice produces different ciphertexts")
    void testCiphertextRandomness() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        byte[] plaintext = TestDataGenerator.randomBytes(32);
        
        // Encrypt same plaintext twice
        byte[] ciphertext1 = javaEncrypt(plaintext, publicKey);
        byte[] ciphertext2 = javaEncrypt(plaintext, publicKey);
        
        // Ciphertexts should be different (randomness from ephemeral key)
        assertFalse(Arrays.equals(ciphertext1, ciphertext2),
            "Same plaintext encrypted twice should produce different ciphertexts");
        
        // But both should decrypt to same plaintext
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        byte[] decrypted1 = javaDecrypt(ciphertext1, privateKey);
        byte[] decrypted2 = javaDecrypt(ciphertext2, privateKey);
        
        assertArrayEquals(plaintext, decrypted1);
        assertArrayEquals(plaintext, decrypted2);
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Decryption with wrong key should fail")
    void testDecryptionWithWrongKey() throws Exception {
        AsymmetricCipherKeyPair keyPair1 = generateKeyPair();
        AsymmetricCipherKeyPair keyPair2 = generateKeyPair();
        
        ECPublicKeyParameters publicKey1 = (ECPublicKeyParameters) keyPair1.getPublic();
        ECPrivateKeyParameters privateKey2 = (ECPrivateKeyParameters) keyPair2.getPrivate();
        
        byte[] plaintext = TestDataGenerator.randomBytes(32);
        
        // Encrypt with key pair 1
        byte[] ciphertext = javaEncrypt(plaintext, publicKey1);
        
        // Try to decrypt with different key pair 2 - should fail
        assertThrows(Exception.class, () -> javaDecrypt(ciphertext, privateKey2),
            "Decryption with wrong key should throw exception");
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Modified ciphertext should fail decryption")
    void testCiphertextModificationDetection() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        byte[] plaintext = TestDataGenerator.randomBytes(32);
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        
        // Corrupt the ciphertext
        byte[] corrupted = ciphertext.clone();
        corrupted[corrupted.length / 2] ^= 0xFF;
        
        // Should fail verification or decryption
        assertThrows(Exception.class, () -> javaDecrypt(corrupted, privateKey),
            "Modified ciphertext should fail decryption");
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Small messages can be encrypted and decrypted")
    void testSmallMessageEncryption() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        // Test single byte
        byte[] singleByte = new byte[]{0x42};
        byte[] ciphertext = javaEncrypt(singleByte, publicKey);
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        
        assertArrayEquals(singleByte, decrypted, 
            "Single byte should encrypt/decrypt correctly");
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Large messages can be encrypted and decrypted")
    void testLargeMessageEncryption() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        // Test 10KB message
        byte[] largePlaintext = TestDataGenerator.randomBytes(10240);
        byte[] ciphertext = javaEncrypt(largePlaintext, publicKey);
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        
        assertArrayEquals(largePlaintext, decrypted,
            "Large message should encrypt/decrypt correctly");
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Decryption is deterministic")
    void testDecryptionDeterminism() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        byte[] plaintext = TestDataGenerator.randomBytes(32);
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        
        // Decrypt same ciphertext multiple times
        byte[] decrypted1 = javaDecrypt(ciphertext, privateKey);
        byte[] decrypted2 = javaDecrypt(ciphertext, privateKey);
        byte[] decrypted3 = javaDecrypt(ciphertext, privateKey);
        
        // All should produce same result
        assertArrayEquals(decrypted1, decrypted2, 
            "Decryption should be deterministic");
        assertArrayEquals(decrypted2, decrypted3,
            "Decryption should be deterministic");
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Different plaintexts produce different ciphertexts")
    void testDifferentPlaintextsDifferentCiphertexts() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        byte[] plaintext1 = TestDataGenerator.randomBytes(32);
        byte[] plaintext2 = TestDataGenerator.randomBytes(32);
        
        // Ensure plaintexts are different
        assertFalse(Arrays.equals(plaintext1, plaintext2));
        
        byte[] ciphertext1 = javaEncrypt(plaintext1, publicKey);
        byte[] ciphertext2 = javaEncrypt(plaintext2, publicKey);
        
        // Ciphertexts should be different
        assertFalse(Arrays.equals(ciphertext1, ciphertext2),
            "Different plaintexts should produce different ciphertexts");
    }

    // ==================== Cross-Language Properties ====================

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: Java encrypt → JavaScript decrypt maintains plaintext")
    void testJavaEncryptJsDecryptProperty() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        String message = "Test message " + System.currentTimeMillis();
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        
        // Java encrypt
        byte[] ciphertext = javaEncrypt(plaintext, publicKey);
        
        // JavaScript decrypt
        String decryptedMessage = jsDecrypt(ciphertext, privateKey);
        
        assertEquals(message, decryptedMessage,
            "JS should correctly decrypt Java-encrypted message");
    }

    @RepeatedTest(ITERATIONS)
    @DisplayName("Property: JavaScript encrypt → Java decrypt maintains plaintext")
    void testJsEncryptJavaDecryptProperty() throws Exception {
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        String message = "JS test " + System.currentTimeMillis();
        
        // JavaScript encrypt
        String ciphertextHex = jsEncrypt(message, publicKey);
        byte[] ciphertext = hexToBytes(ciphertextHex);
        
        // Java decrypt
        byte[] decrypted = javaDecrypt(ciphertext, privateKey);
        String decryptedMessage = new String(decrypted, StandardCharsets.UTF_8);
        
        assertEquals(message, decryptedMessage,
            "Java should correctly decrypt JS-encrypted message");
    }

    // ==================== Helper Methods ====================

    private AsymmetricCipherKeyPair generateKeyPair() {
        ECKeyPairGenerator generator = new ECKeyPairGenerator();
        ECKeyGenerationParameters params = new ECKeyGenerationParameters(domainParams, random);
        generator.init(params);
        return generator.generateKeyPair();
    }

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
}
