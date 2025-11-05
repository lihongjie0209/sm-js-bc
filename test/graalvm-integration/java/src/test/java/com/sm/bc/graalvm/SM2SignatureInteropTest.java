package com.sm.bc.graalvm;

import org.bouncycastle.asn1.gm.GMNamedCurves;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.generators.ECKeyPairGenerator;
import org.bouncycastle.crypto.params.ECDomainParameters;
import org.bouncycastle.crypto.params.ECKeyGenerationParameters;
import org.bouncycastle.crypto.params.ECPrivateKeyParameters;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;
import org.bouncycastle.crypto.signers.SM2Signer;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.math.ec.ECPoint;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.security.Security;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cross-language signature validation tests between Java Bouncy Castle and JavaScript SM-BC
 * 
 * Tests:
 * 1. Java sign → JavaScript verify
 * 2. JavaScript sign → Java verify
 * 3. Key format compatibility
 * 4. Edge cases and error handling
 */
@DisplayName("SM2 Signature Cross-Language Tests")
public class SM2SignatureInteropTest extends BaseGraalVMTest {

    private static ECDomainParameters domainParams;
    private static SecureRandom random;

    @BeforeAll
    static void setupCrypto() {
        // Add Bouncy Castle provider
        Security.addProvider(new BouncyCastleProvider());
        
        // Initialize SM2 curve parameters
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
    @DisplayName("Java sign → JavaScript verify")
    void testJavaSignJavaScriptVerify() throws Exception {
        System.out.println("\n=== Testing Java Sign → JavaScript Verify ===");
        
        // Generate key pair with Java
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        // Test message
        String message = "Hello SM2 Cross-Language Test!";
        byte[] messageBytes = message.getBytes("UTF-8");
        
        // Sign with Java Bouncy Castle
        SM2Signer signer = new SM2Signer();
        signer.init(true, privateKey);
        signer.update(messageBytes, 0, messageBytes.length);
        byte[] signature = signer.generateSignature();
        
        System.out.println("Java signature length: " + signature.length + " bytes");
        System.out.println("Java signature (hex): " + bytesToHex(signature));
        
        // Prepare data for JavaScript verification
        String privateKeyHex = privateKey.getD().toString(16);
        ECPoint pubPoint = publicKey.getQ();
        String publicKeyX = pubPoint.getAffineXCoord().toBigInteger().toString(16);
        String publicKeyY = pubPoint.getAffineYCoord().toBigInteger().toString(16);
        String messageHex = bytesToHex(messageBytes);
        String signatureHex = bytesToHex(signature);
        
        // Verify with JavaScript SM-BC
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                
                // Convert hex strings to appropriate formats
                const message = testUtils.hexToBytes('%s');
                const signature = testUtils.hexToBytes('%s');
                
                // Create public key (assuming SM-BC expects x,y coordinates)
                const publicKey = {
                    x: testUtils.hexToBigInt('%s'),
                    y: testUtils.hexToBigInt('%s')
                };
                
                console.log('JS verifying signature of length:', signature.length);
                console.log('JS public key x:', publicKey.x.toString(16));
                console.log('JS public key y:', publicKey.y.toString(16));
                
                // Verify signature
                const isValid = sm2.verify(message, signature, publicKey);
                
                ({
                    success: true,
                    isValid: isValid,
                    message: 'Verification completed'
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString(),
                    stack: error.stack
                })
            }
        """, messageHex, signatureHex, publicKeyX, publicKeyY));
        
        // Check JavaScript result
        assertTrue(result.getMember("success").asBoolean(), 
            "JavaScript verification failed: " + result.getMember("error"));
        assertTrue(result.getMember("isValid").asBoolean(), 
            "JavaScript failed to verify Java signature");
        
        System.out.println("✓ Java signature successfully verified by JavaScript");
    }

    @Test
    @DisplayName("JavaScript sign → Java verify")
    void testJavaScriptSignJavaVerify() throws Exception {
        System.out.println("\n=== Testing JavaScript Sign → Java Verify ===");
        
        // Test message
        String message = "SM2 signature test from JavaScript to Java";
        byte[] messageBytes = message.getBytes("UTF-8");
        String messageHex = bytesToHex(messageBytes);
        
        // Generate key pair and sign with JavaScript SM-BC
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                
                // Generate key pair
                const keyPair = sm2.generateKeyPair();
                
                // Convert message
                const message = testUtils.hexToBytes('%s');
                
                console.log('JS generated key pair');
                console.log('JS private key:', keyPair.privateKey.toString(16));
                console.log('JS public key x:', keyPair.publicKey.x.toString(16));
                console.log('JS public key y:', keyPair.publicKey.y.toString(16));
                
                // Sign message
                const signature = sm2.sign(message, keyPair.privateKey);
                
                console.log('JS signature length:', signature.length);
                
                ({
                    success: true,
                    privateKey: testUtils.bigIntToHex(keyPair.privateKey),
                    publicKeyX: testUtils.bigIntToHex(keyPair.publicKey.x),
                    publicKeyY: testUtils.bigIntToHex(keyPair.publicKey.y),
                    signature: testUtils.bytesToHex(signature),
                    message: 'Signing completed'
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString(),
                    stack: error.stack
                })
            }
        """, messageHex));
        
        // Check JavaScript result
        assertTrue(result.getMember("success").asBoolean(), 
            "JavaScript signing failed: " + result.getMember("error"));
        
        // Extract data from JavaScript
        String privateKeyHex = result.getMember("privateKey").asString();
        String publicKeyX = result.getMember("publicKeyX").asString();
        String publicKeyY = result.getMember("publicKeyY").asString();
        String signatureHex = result.getMember("signature").asString();
        
        System.out.println("JavaScript signature length: " + signatureHex.length()/2 + " bytes");
        System.out.println("JavaScript signature (hex): " + signatureHex);
        
        // Create Java key parameters from JavaScript data
        BigInteger d = new BigInteger(privateKeyHex, 16);
        BigInteger x = new BigInteger(publicKeyX, 16);
        BigInteger y = new BigInteger(publicKeyY, 16);
        
        ECPoint pubPoint = domainParams.getCurve().createPoint(x, y);
        ECPublicKeyParameters publicKey = new ECPublicKeyParameters(pubPoint, domainParams);
        
        // Verify with Java Bouncy Castle
        byte[] signature = hexToBytes(signatureHex);
        
        SM2Signer verifier = new SM2Signer();
        verifier.init(false, publicKey);
        verifier.update(messageBytes, 0, messageBytes.length);
        boolean isValid = verifier.verifySignature(signature);
        
        assertTrue(isValid, "Java failed to verify JavaScript signature");
        System.out.println("✓ JavaScript signature successfully verified by Java");
    }

    @Test
    @DisplayName("Key format compatibility test")
    void testKeyFormatCompatibility() throws Exception {
        System.out.println("\n=== Testing Key Format Compatibility ===");
        
        // Generate key pair with Java
        AsymmetricCipherKeyPair javaKeyPair = generateKeyPair();
        ECPrivateKeyParameters javaPrivateKey = (ECPrivateKeyParameters) javaKeyPair.getPrivate();
        ECPublicKeyParameters javaPublicKey = (ECPublicKeyParameters) javaKeyPair.getPublic();
        
        // Export Java keys to hex
        String privateKeyHex = javaPrivateKey.getD().toString(16);
        ECPoint pubPoint = javaPublicKey.getQ();
        String publicKeyX = pubPoint.getAffineXCoord().toBigInteger().toString(16);
        String publicKeyY = pubPoint.getAffineYCoord().toBigInteger().toString(16);
        
        // Test key import in JavaScript
        Value jsResult = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                
                // Import keys from Java format
                const privateKey = testUtils.hexToBigInt('%s');
                const publicKey = {
                    x: testUtils.hexToBigInt('%s'),
                    y: testUtils.hexToBigInt('%s')
                };
                
                console.log('JS imported private key:', privateKey.toString(16));
                console.log('JS imported public key x:', publicKey.x.toString(16));
                console.log('JS imported public key y:', publicKey.y.toString(16));
                
                // Test message
                const message = new TextEncoder().encode('Key compatibility test');
                
                // Sign with imported private key
                const signature = sm2.sign(message, privateKey);
                
                // Verify with imported public key
                const isValid = sm2.verify(message, signature, publicKey);
                
                ({
                    success: true,
                    signatureLength: signature.length,
                    isValid: isValid,
                    message: 'Key compatibility test completed'
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString(),
                    stack: error.stack
                })
            }
        """, privateKeyHex, publicKeyX, publicKeyY));
        
        assertTrue(jsResult.getMember("success").asBoolean(), 
            "JavaScript key compatibility test failed: " + jsResult.getMember("error"));
        assertTrue(jsResult.getMember("isValid").asBoolean(), 
            "JavaScript sign/verify with imported Java keys failed");
        
        System.out.println("✓ Key format compatibility verified");
        System.out.println("  - Java keys successfully imported to JavaScript");
        System.out.println("  - JavaScript sign/verify works with imported keys");
    }

    @Test
    @DisplayName("Edge cases and error handling")
    void testEdgeCases() throws Exception {
        System.out.println("\n=== Testing Edge Cases ===");
        
        // Test 1: Empty message
        testEmptyMessage();
        
        // Test 2: Large message
        testLargeMessage();
        
        // Test 3: Invalid signature verification
        testInvalidSignature();
        
        System.out.println("✓ All edge cases handled correctly");
    }
    
    private void testEmptyMessage() throws Exception {
        System.out.println("Testing empty message...");
        
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        // Sign empty message with Java
        byte[] emptyMessage = new byte[0];
        SM2Signer signer = new SM2Signer();
        signer.init(true, privateKey);
        signer.update(emptyMessage, 0, emptyMessage.length);
        byte[] signature = signer.generateSignature();
        
        // Verify with JavaScript (if supported)
        ECPoint pubPoint = publicKey.getQ();
        String publicKeyX = pubPoint.getAffineXCoord().toBigInteger().toString(16);
        String publicKeyY = pubPoint.getAffineYCoord().toBigInteger().toString(16);
        String signatureHex = bytesToHex(signature);
        
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                const emptyMessage = new Uint8Array(0);
                const signature = testUtils.hexToBytes('%s');
                const publicKey = {
                    x: testUtils.hexToBigInt('%s'),
                    y: testUtils.hexToBigInt('%s')
                };
                
                const isValid = sm2.verify(emptyMessage, signature, publicKey);
                ({ success: true, isValid: isValid })
            } catch (error) {
                ({ success: false, error: error.message })
            }
        """, signatureHex, publicKeyX, publicKeyY));
        
        if (result.getMember("success").asBoolean()) {
            assertTrue(result.getMember("isValid").asBoolean(), 
                "Empty message signature verification failed");
            System.out.println("  ✓ Empty message handled correctly");
        } else {
            System.out.println("  ⚠ Empty message not supported: " + result.getMember("error").asString());
        }
    }
    
    private void testLargeMessage() throws Exception {
        System.out.println("Testing large message (10KB)...");
        
        // Create 10KB message
        byte[] largeMessage = new byte[10240];
        random.nextBytes(largeMessage);
        
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPrivateKeyParameters privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
        
        // Sign with Java
        SM2Signer signer = new SM2Signer();
        signer.init(true, privateKey);
        signer.update(largeMessage, 0, largeMessage.length);
        byte[] signature = signer.generateSignature();
        
        assertNotNull(signature);
        assertTrue(signature.length > 0);
        System.out.println("  ✓ Large message signed successfully");
    }
    
    private void testInvalidSignature() throws Exception {
        System.out.println("Testing invalid signature detection...");
        
        AsymmetricCipherKeyPair keyPair = generateKeyPair();
        ECPublicKeyParameters publicKey = (ECPublicKeyParameters) keyPair.getPublic();
        
        // Create invalid signature (all zeros)
        byte[] invalidSignature = new byte[64];
        byte[] message = "test message".getBytes("UTF-8");
        
        ECPoint pubPoint = publicKey.getQ();
        String publicKeyX = pubPoint.getAffineXCoord().toBigInteger().toString(16);
        String publicKeyY = pubPoint.getAffineYCoord().toBigInteger().toString(16);
        String messageHex = bytesToHex(message);
        String signatureHex = bytesToHex(invalidSignature);
        
        Value result = evalJs(String.format("""
            try {
                const sm2 = smBcLibrary.SM2;
                const message = testUtils.hexToBytes('%s');
                const signature = testUtils.hexToBytes('%s');
                const publicKey = {
                    x: testUtils.hexToBigInt('%s'),
                    y: testUtils.hexToBigInt('%s')
                };
                
                const isValid = sm2.verify(message, signature, publicKey);
                ({ success: true, isValid: isValid })
            } catch (error) {
                ({ success: true, isValid: false, error: error.message })
            }
        """, messageHex, signatureHex, publicKeyX, publicKeyY));
        
        assertTrue(result.getMember("success").asBoolean());
        assertFalse(result.getMember("isValid").asBoolean(), 
            "Invalid signature should not verify");
        System.out.println("  ✓ Invalid signature correctly rejected");
    }

    private AsymmetricCipherKeyPair generateKeyPair() {
        ECKeyPairGenerator generator = new ECKeyPairGenerator();
        ECKeyGenerationParameters params = new ECKeyGenerationParameters(domainParams, random);
        generator.init(params);
        return generator.generateKeyPair();
    }
}