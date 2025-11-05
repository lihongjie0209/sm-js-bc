package com.sm.bc.graalvm;

import org.bouncycastle.asn1.gm.GMNamedCurves;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.engines.SM2Engine;
import org.bouncycastle.crypto.generators.ECKeyPairGenerator;
import org.bouncycastle.crypto.params.ECDomainParameters;
import org.bouncycastle.crypto.params.ECKeyGenerationParameters;
import org.bouncycastle.crypto.params.ECPrivateKeyParameters;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;
import org.bouncycastle.crypto.params.ParametersWithRandom;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import java.security.SecureRandom;
import org.bouncycastle.math.ec.ECPoint;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.Security;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cross-language encryption/decryption tests between Java Bouncy Castle and JavaScript SM-BC
 * 
 * Tests:
 * 1. Java encrypt → JavaScript decrypt
 * 2. JavaScript encrypt → Java decrypt
 * 3. Various message sizes
 * 4. Error handling for invalid ciphertexts
 */
@DisplayName("SM2 Encryption Cross-Language Tests")
public class SM2EncryptionInteropTest extends BaseGraalVMTest {

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

    @Test
    @DisplayName("Java encrypt → JavaScript decrypt")
    void testJavaEncryptJavaScriptDecrypt() throws Exception {
        System.out.println("\n=== Testing Java Encrypt → JavaScript Decrypt ===");
        
        // Generate key pair with Java
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        // Test messages of different sizes
        String[] testMessages = {
            "Hello SM2!",
            "This is a longer test message for SM2 encryption verification.",
            "SM2加密测试消息，包含中文字符！",
            "" // Empty message
        };
        
        for (String message : testMessages) {
            if (message.isEmpty()) {
                System.out.println("Skipping empty message (SM2 requires non-empty input)");
                continue; // Skip empty message as SM2 cannot encrypt empty data
            } else {
                System.out.println("Testing message: \"" + message + "\"");
            }
            
            testJavaEncryptJsDecryptSingle(message, privateKey, publicKey);
        }
        
        System.out.println("✓ All Java encrypt → JavaScript decrypt tests passed");
    }

    private void testJavaEncryptJsDecryptSingle(String message, ECPrivateKeyParameters privateKey, 
                                              ECPublicKeyParameters publicKey) throws Exception {
        
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        
        // Encrypt with Java Bouncy Castle
        SM2Engine engine = new SM2Engine();
        engine.init(true, new ParametersWithRandom(publicKey, new SecureRandom())); // true for encryption
        byte[] ciphertext = engine.processBlock(messageBytes, 0, messageBytes.length);
        
        System.out.println("  Java ciphertext length: " + ciphertext.length + " bytes");
        
        // Prepare data for JavaScript decryption
        String privateKeyHex = privateKey.getD().toString(16);
        ECPoint pubPoint = publicKey.getQ();
        String publicKeyX = pubPoint.getAffineXCoord().toBigInteger().toString(16);
        String publicKeyY = pubPoint.getAffineYCoord().toBigInteger().toString(16);
        String ciphertextHex = bytesToHex(ciphertext);
        String expectedMessage = message;
        
        // Decrypt with JavaScript SM-BC
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                
                // Convert hex to appropriate formats
                const ciphertext = testUtils.hexToBytes('%s');
                const privateKey = testUtils.hexToBigInt('%s');
                
                console.log('JS decrypting ciphertext of length:', ciphertext.length);
                console.log('JS private key:', privateKey.toString(16));
                
                // Decrypt
                const decrypted = sm2.decrypt(ciphertext, privateKey);
                
                // Convert to string
                const decryptedText = new TextDecoder('utf-8').decode(decrypted);
                
                console.log('JS decrypted text:', decryptedText);
                
                ({
                    success: true,
                    decryptedText: decryptedText,
                    decryptedBytes: Array.from(decrypted),
                    message: 'Decryption completed'
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString(),
                    stack: error.stack
                })
            }
        """, ciphertextHex, privateKeyHex));
        
        // Check JavaScript result
        assertTrue(result.getMember("success").asBoolean(), 
            "JavaScript decryption failed: " + result.getMember("error"));
        
        String decryptedText = result.getMember("decryptedText").asString();
        assertEquals(expectedMessage, decryptedText, 
            "Decrypted message doesn't match original");
        
        System.out.println("  ✓ Successfully decrypted: \"" + decryptedText + "\"");
    }

    @Test
    @DisplayName("JavaScript encrypt → Java decrypt")
    void testJavaScriptEncryptJavaDecrypt() throws Exception {
        System.out.println("\n=== Testing JavaScript Encrypt → Java Decrypt ===");
        
        // Test messages
        String[] testMessages = {
            "JS to Java test",
            "JavaScript加密，Java解密测试！",
            "Long message from JavaScript: " + "x".repeat(100)
        };
        
        for (String message : testMessages) {
            System.out.println("Testing message: \"" + message + "\"");
            testJsEncryptJavaDecryptSingle(message);
        }
        
        System.out.println("✓ All JavaScript encrypt → Java decrypt tests passed");
    }

    private void testJsEncryptJavaDecryptSingle(String message) throws Exception {
        
        // Generate key pair and encrypt with JavaScript SM-BC
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                
                // Generate key pair
                const keyPair = sm2.generateKeyPair();
                
                // Convert message to bytes
                const message = new TextEncoder().encode('%s');
                
                console.log('JS encrypting message of length:', message.length);
                console.log('JS public key x:', keyPair.publicKey.x.toString(16));
                console.log('JS public key y:', keyPair.publicKey.y.toString(16));
                
                // Encrypt
                const ciphertext = sm2.encrypt(message, keyPair.publicKey);
                
                console.log('JS ciphertext length:', ciphertext.length);
                
                ({
                    success: true,
                    privateKey: testUtils.bigIntToHex(keyPair.privateKey),
                    publicKeyX: testUtils.bigIntToHex(keyPair.publicKey.x),
                    publicKeyY: testUtils.bigIntToHex(keyPair.publicKey.y),
                    ciphertext: testUtils.bytesToHex(ciphertext),
                    originalMessage: '%s',
                    message: 'Encryption completed'
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString(),
                    stack: error.stack
                })
            }
        """, message.replace("'", "\\'"), message.replace("'", "\\'")));
        
        // Check JavaScript result
        assertTrue(result.getMember("success").asBoolean(), 
            "JavaScript encryption failed: " + result.getMember("error"));
        
        // Extract data from JavaScript
        String privateKeyHex = result.getMember("privateKey").asString();
        String publicKeyX = result.getMember("publicKeyX").asString();
        String publicKeyY = result.getMember("publicKeyY").asString();
        String ciphertextHex = result.getMember("ciphertext").asString();
        String originalMessage = result.getMember("originalMessage").asString();
        
        System.out.println("  JavaScript ciphertext length: " + ciphertextHex.length()/2 + " bytes");
        
        // Create Java key parameters from JavaScript data
        BigInteger d = new BigInteger(privateKeyHex, 16);
        BigInteger x = new BigInteger(publicKeyX, 16);
        BigInteger y = new BigInteger(publicKeyY, 16);
        
        ECPoint pubPoint = domainParams.getCurve().createPoint(x, y);
        ECPrivateKeyParameters javaPrivateKey = new ECPrivateKeyParameters(d, domainParams);
        
        // Decrypt with Java Bouncy Castle
        byte[] ciphertext = hexToBytes(ciphertextHex);
        
        SM2Engine engine = new SM2Engine();
        engine.init(false, javaPrivateKey); // false for decryption
        byte[] decrypted = engine.processBlock(ciphertext, 0, ciphertext.length);
        
        String decryptedMessage = new String(decrypted, StandardCharsets.UTF_8);
        assertEquals(originalMessage, decryptedMessage, 
            "Decrypted message doesn't match original");
        
        System.out.println("  ✓ Successfully decrypted: \"" + decryptedMessage + "\"");
    }

    @Test
    @DisplayName("Encryption consistency test")
    void testEncryptionConsistency() throws Exception {
        System.out.println("\n=== Testing Encryption Consistency ===");
        
        // Use same key pair for both directions
        AsymmetricCipherKeyPair javaKeyPair = generateKeyPair();
        ECPrivateKeyParameters javaPrivateKey = (ECPrivateKeyParameters) javaKeyPair.getPrivate();
        ECPublicKeyParameters javaPublicKey = (ECPublicKeyParameters) javaKeyPair.getPublic();
        
        String testMessage = "Consistency test message";
        
        // Export keys for JavaScript
        String privateKeyHex = javaPrivateKey.getD().toString(16);
        ECPoint pubPoint = javaPublicKey.getQ();
        String publicKeyX = pubPoint.getAffineXCoord().toBigInteger().toString(16);
        String publicKeyY = pubPoint.getAffineYCoord().toBigInteger().toString(16);
        
        // Test: Java encrypt → JavaScript decrypt → Java encrypt → JavaScript decrypt
        System.out.println("Round 1: Java encrypt → JavaScript decrypt");
        
        byte[] messageBytes = testMessage.getBytes(StandardCharsets.UTF_8);
        SM2Engine javaEngine = new SM2Engine();
        javaEngine.init(true, new ParametersWithRandom(javaPublicKey, new SecureRandom()));
        byte[] javaCiphertext = javaEngine.processBlock(messageBytes, 0, messageBytes.length);
        
        // JavaScript decrypt
        Value jsResult1 = evalJs(String.format("""
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
        """, bytesToHex(javaCiphertext), privateKeyHex));
        
        assertTrue(jsResult1.getMember("success").asBoolean());
        assertEquals(testMessage, jsResult1.getMember("decryptedText").asString());
        
        System.out.println("Round 2: JavaScript encrypt → Java decrypt");
        
        // JavaScript encrypt
        Value jsResult2 = evalJs(String.format("""
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
        """, testMessage, publicKeyX, publicKeyY));
        
        assertTrue(jsResult2.getMember("success").asBoolean());
        
        // Java decrypt
        byte[] jsCiphertext = hexToBytes(jsResult2.getMember("ciphertext").asString());
        javaEngine.init(false, javaPrivateKey);
        byte[] javaDecrypted = javaEngine.processBlock(jsCiphertext, 0, jsCiphertext.length);
        String javaDecryptedText = new String(javaDecrypted, StandardCharsets.UTF_8);
        
        assertEquals(testMessage, javaDecryptedText);
        
        System.out.println("✓ Encryption consistency verified");
        System.out.println("  - Same keys work in both directions");
        System.out.println("  - Message integrity maintained");
    }

    @Test
    @DisplayName("Error handling test")
    void testErrorHandling() throws Exception {
        System.out.println("\n=== Testing Error Handling ===");
        
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        
        // Test 1: Invalid ciphertext (wrong length)
        testInvalidCiphertext(privateKey, "Invalid ciphertext - too short");
        
        // Test 2: Corrupted ciphertext
        testCorruptedCiphertext(privateKey);
        
        System.out.println("✓ Error handling tests completed");
    }
    
    private void testInvalidCiphertext(ECPrivateKeyParameters privateKey, String testName) {
        System.out.println("Testing: " + testName);
        
        String privateKeyHex = privateKey.getD().toString(16);
        
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                const invalidCiphertext = new Uint8Array([1, 2, 3, 4]); // Too short
                const privateKey = testUtils.hexToBigInt('%s');
                
                const decrypted = sm2.decrypt(invalidCiphertext, privateKey);
                
                ({ success: false, unexpectedSuccess: true })
            } catch (error) {
                ({ success: true, expectedError: true, error: error.message })
            }
        """, privateKeyHex));
        
        assertTrue(result.getMember("success").asBoolean(), 
            "Should catch invalid ciphertext error");
        assertTrue(result.getMember("expectedError").asBoolean(), 
            "Invalid ciphertext should throw error");
        
        System.out.println("  ✓ Invalid ciphertext properly rejected");
    }
    
    private void testCorruptedCiphertext(ECPrivateKeyParameters privateKey) throws Exception {
        System.out.println("Testing: Corrupted ciphertext");
        
        // Generate valid ciphertext first
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        String message = "test message";
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        
        SM2Engine engine = new SM2Engine();
        engine.init(true, new ParametersWithRandom(publicKey, new SecureRandom()));
        byte[] validCiphertext = engine.processBlock(messageBytes, 0, messageBytes.length);
        
        // Corrupt the ciphertext
        byte[] corruptedCiphertext = validCiphertext.clone();
        corruptedCiphertext[corruptedCiphertext.length / 2] ^= 0xFF; // Flip bits in middle
        
        String privateKeyHex = privateKey.getD().toString(16);
        String corruptedCiphertextHex = bytesToHex(corruptedCiphertext);
        
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                const corruptedCiphertext = testUtils.hexToBytes('%s');
                const privateKey = testUtils.hexToBigInt('%s');
                
                const decrypted = sm2.decrypt(corruptedCiphertext, privateKey);
                
                ({ success: false, unexpectedSuccess: true })
            } catch (error) {
                ({ success: true, expectedError: true, error: error.message })
            }
        """, corruptedCiphertextHex, privateKeyHex));
        
        assertTrue(result.getMember("success").asBoolean(), 
            "Should catch corrupted ciphertext error");
        
        System.out.println("  ✓ Corrupted ciphertext properly rejected");
    }

    private AsymmetricCipherKeyPair generateKeyPair() {
        ECKeyPairGenerator generator = new ECKeyPairGenerator();
        ECKeyGenerationParameters params = new ECKeyGenerationParameters(domainParams, random);
        generator.init(params);
        return generator.generateKeyPair();
    }
}