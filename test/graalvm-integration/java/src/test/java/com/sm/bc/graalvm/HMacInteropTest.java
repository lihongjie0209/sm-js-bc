package com.sm.bc.graalvm;

import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.crypto.macs.HMac;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.encoders.Hex;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cross-language HMAC-SM3 verification tests between Java Bouncy Castle and JavaScript SM-BC
 * 
 * Tests:
 * 1. Basic HMAC computation
 * 2. Java HMAC → JavaScript verification
 * 3. JavaScript HMAC → Java verification
 * 4. Various key lengths
 * 5. Various message sizes
 */
@DisplayName("HMAC-SM3 Cross-Language Tests")
public class HMacInteropTest extends BaseGraalVMTest {

    @BeforeAll
    static void setupCrypto() {
        Security.addProvider(new BouncyCastleProvider());
    }

    /**
     * Compute HMAC-SM3 using Java Bouncy Castle
     */
    private String computeJavaHMac(byte[] key, String message) {
        HMac hmac = new HMac(new SM3Digest());
        hmac.init(new KeyParameter(key));
        
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        hmac.update(messageBytes, 0, messageBytes.length);
        
        byte[] out = new byte[hmac.getMacSize()];
        hmac.doFinal(out, 0);
        
        return Hex.toHexString(out);
    }

    /**
     * Compute HMAC-SM3 using JavaScript SM-BC
     */
    private String computeJavaScriptHMac(byte[] key, String message) {
        String keyHex = Hex.toHexString(key);
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        String messageHex = Hex.toHexString(messageBytes);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const HMac = smBcLibrary.HMac;
                    const SM3Digest = smBcLibrary.SM3Digest;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    
                    const key = testUtils.hexToBytes('%s');
                    const messageBytes = testUtils.hexToBytes('%s');
                    
                    const digest = new SM3Digest();
                    const hmac = new HMac(digest);
                    const keyParam = new KeyParameter(key);
                    
                    hmac.init(keyParam);
                    hmac.updateArray(messageBytes, 0, messageBytes.length);
                    
                    const out = new Uint8Array(hmac.getMacSize());
                    hmac.doFinal(out, 0);
                    
                    return {
                        success: true,
                        mac: testUtils.bytesToHex(out)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, keyHex, messageHex));
        
        assertTrue(result.getMember("success").asBoolean(),
            "JavaScript HMAC computation failed: " + result.getMember("error"));
        
        return result.getMember("mac").asString();
    }

    @Test
    @DisplayName("Basic HMAC computation")
    void testBasicHMac() throws Exception {
        System.out.println("\n=== Testing Basic HMAC Computation ===");
        
        byte[] key = "key".getBytes(StandardCharsets.UTF_8);
        String message = "The quick brown fox jumps over the lazy dog";
        
        System.out.println("Key: \"key\"");
        System.out.println("Message: \"" + message + "\"");
        
        String javaResult = computeJavaHMac(key, message);
        String jsResult = computeJavaScriptHMac(key, message);
        
        System.out.println("Java result:   " + javaResult);
        System.out.println("JS result:     " + jsResult);
        
        assertEquals(javaResult, jsResult, "HMAC results should match");
        System.out.println("✓ Basic HMAC computation passed");
    }

    @Test
    @DisplayName("Cross-implementation verification")
    void testCrossImplementationVerification() throws Exception {
        System.out.println("\n=== Testing Cross-Implementation Verification ===");
        
        TestCase[] testCases = {
            new TestCase("key", ""),
            new TestCase("key", "hello"),
            new TestCase("key", "The quick brown fox jumps over the lazy dog"),
            new TestCase("short", "test message"),
            new TestCase("verylongkeythatexceedstheblocksizeofsm3digestwhichis64bytes...", "message"),
            new TestCase("key", "Very long message that exceeds the block size of 64 bytes for SM3 digest...".repeat(10))
        };
        
        for (int i = 0; i < testCases.length; i++) {
            TestCase tc = testCases[i];
            System.out.println("Test case " + (i + 1) + ":");
            System.out.println("  Key length: " + tc.key.length());
            System.out.println("  Message length: " + tc.message.length());
            
            byte[] keyBytes = tc.key.getBytes(StandardCharsets.UTF_8);
            String javaHash = computeJavaHMac(keyBytes, tc.message);
            String jsHash = computeJavaScriptHMac(keyBytes, tc.message);
            
            assertEquals(javaHash, jsHash,
                "HMAC mismatch for test case " + (i + 1));
            
            System.out.println("  ✓ Implementations match: " + javaHash.substring(0, 16) + "...");
        }
        
        System.out.println("✓ All cross-implementation tests passed");
    }

    @Test
    @DisplayName("Key length variations")
    void testKeyLengthVariations() throws Exception {
        System.out.println("\n=== Testing Key Length Variations ===");
        
        String message = "test message";
        int[] keyLengths = {1, 16, 32, 64, 128, 256};
        
        for (int keyLength : keyLengths) {
            System.out.println("Testing key length: " + keyLength + " bytes");
            
            byte[] key = new byte[keyLength];
            Arrays.fill(key, (byte)0x42); // Fill with 'B'
            
            String javaHash = computeJavaHMac(key, message);
            String jsHash = computeJavaScriptHMac(key, message);
            
            assertEquals(javaHash, jsHash,
                "HMAC mismatch for key length " + keyLength);
            
            System.out.println("  ✓ Match: " + javaHash.substring(0, 16) + "...");
        }
        
        System.out.println("✓ All key length tests passed");
    }

    @Test
    @DisplayName("Message length variations")
    void testMessageLengthVariations() throws Exception {
        System.out.println("\n=== Testing Message Length Variations ===");
        
        byte[] key = "test-key".getBytes(StandardCharsets.UTF_8);
        int[] messageLengths = {0, 1, 63, 64, 65, 127, 128, 1000, 10000};
        
        for (int messageLength : messageLengths) {
            System.out.println("Testing message length: " + messageLength + " bytes");
            
            String message = "A".repeat(messageLength);
            
            String javaHash = computeJavaHMac(key, message);
            String jsHash = computeJavaScriptHMac(key, message);
            
            assertEquals(javaHash, jsHash,
                "HMAC mismatch for message length " + messageLength);
            
            System.out.println("  ✓ Match: " + javaHash.substring(0, 16) + "...");
        }
        
        System.out.println("✓ All message length tests passed");
    }

    @Test
    @DisplayName("Incremental updates")
    void testIncrementalUpdates() throws Exception {
        System.out.println("\n=== Testing Incremental Updates ===");
        
        byte[] key = "key".getBytes(StandardCharsets.UTF_8);
        String message = "hello world";
        
        // Compute in one go with Java
        String javaOneGo = computeJavaHMac(key, message);
        
        // Compute incrementally with Java
        HMac javaHmac = new HMac(new SM3Digest());
        javaHmac.init(new KeyParameter(key));
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        javaHmac.update(messageBytes, 0, 5); // "hello"
        javaHmac.update(messageBytes, 5, 1); // " "
        javaHmac.update(messageBytes, 6, 5); // "world"
        byte[] javaOut = new byte[javaHmac.getMacSize()];
        javaHmac.doFinal(javaOut, 0);
        String javaIncremental = Hex.toHexString(javaOut);
        
        // Compute in one go with JavaScript
        String jsOneGo = computeJavaScriptHMac(key, message);
        
        // Compute incrementally with JavaScript
        String keyHex = Hex.toHexString(key);
        String messageHex = Hex.toHexString(messageBytes);
        
        Value jsIncrementalResult = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const HMac = smBcLibrary.HMac;
                    const SM3Digest = smBcLibrary.SM3Digest;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    
                    const key = testUtils.hexToBytes('%s');
                    const messageBytes = testUtils.hexToBytes('%s');
                    
                    const digest = new SM3Digest();
                    const hmac = new HMac(digest);
                    const keyParam = new KeyParameter(key);
                    
                    hmac.init(keyParam);
                    hmac.updateArray(messageBytes, 0, 5);
                    hmac.updateArray(messageBytes, 5, 1);
                    hmac.updateArray(messageBytes, 6, 5);
                    
                    const out = new Uint8Array(hmac.getMacSize());
                    hmac.doFinal(out, 0);
                    
                    return {
                        success: true,
                        mac: testUtils.bytesToHex(out)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString()
                    };
                }
            })()
        """, keyHex, messageHex));
        
        assertTrue(jsIncrementalResult.getMember("success").asBoolean(),
            "JavaScript incremental HMAC failed: " + jsIncrementalResult.getMember("error"));
        
        String jsIncremental = jsIncrementalResult.getMember("mac").asString();
        
        System.out.println("Java one-go:        " + javaOneGo);
        System.out.println("Java incremental:   " + javaIncremental);
        System.out.println("JS one-go:          " + jsOneGo);
        System.out.println("JS incremental:     " + jsIncremental);
        
        assertEquals(javaOneGo, javaIncremental, "Java incremental should match one-go");
        assertEquals(jsOneGo, jsIncremental, "JS incremental should match one-go");
        assertEquals(javaOneGo, jsOneGo, "Java and JS should match");
        
        System.out.println("✓ Incremental updates test passed");
    }

    @Test
    @DisplayName("Reset functionality")
    void testResetFunctionality() throws Exception {
        System.out.println("\n=== Testing Reset Functionality ===");
        
        byte[] key = "key".getBytes(StandardCharsets.UTF_8);
        String message1 = "first message";
        String message2 = "second message";
        
        // Test with Java
        HMac javaHmac = new HMac(new SM3Digest());
        javaHmac.init(new KeyParameter(key));
        
        byte[] msg1Bytes = message1.getBytes(StandardCharsets.UTF_8);
        javaHmac.update(msg1Bytes, 0, msg1Bytes.length);
        byte[] javaOut1 = new byte[javaHmac.getMacSize()];
        javaHmac.doFinal(javaOut1, 0);
        
        // After doFinal, compute another MAC
        byte[] msg2Bytes = message2.getBytes(StandardCharsets.UTF_8);
        javaHmac.update(msg2Bytes, 0, msg2Bytes.length);
        byte[] javaOut2 = new byte[javaHmac.getMacSize()];
        javaHmac.doFinal(javaOut2, 0);
        
        // Test with JavaScript
        String keyHex = Hex.toHexString(key);
        String msg1Hex = Hex.toHexString(msg1Bytes);
        String msg2Hex = Hex.toHexString(msg2Bytes);
        
        Value jsResetResult = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const HMac = smBcLibrary.HMac;
                    const SM3Digest = smBcLibrary.SM3Digest;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    
                    const key = testUtils.hexToBytes('%s');
                    const msg1 = testUtils.hexToBytes('%s');
                    const msg2 = testUtils.hexToBytes('%s');
                    
                    const digest = new SM3Digest();
                    const hmac = new HMac(digest);
                    const keyParam = new KeyParameter(key);
                    
                    hmac.init(keyParam);
                    
                    hmac.updateArray(msg1, 0, msg1.length);
                    const out1 = new Uint8Array(hmac.getMacSize());
                    hmac.doFinal(out1, 0);
                    
                    hmac.updateArray(msg2, 0, msg2.length);
                    const out2 = new Uint8Array(hmac.getMacSize());
                    hmac.doFinal(out2, 0);
                    
                    return {
                        success: true,
                        mac1: testUtils.bytesToHex(out1),
                        mac2: testUtils.bytesToHex(out2)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString()
                    };
                }
            })()
        """, keyHex, msg1Hex, msg2Hex));
        
        assertTrue(jsResetResult.getMember("success").asBoolean(),
            "JavaScript reset test failed: " + jsResetResult.getMember("error"));
        
        String javaResult1 = Hex.toHexString(javaOut1);
        String javaResult2 = Hex.toHexString(javaOut2);
        String jsResult1 = jsResetResult.getMember("mac1").asString();
        String jsResult2 = jsResetResult.getMember("mac2").asString();
        
        System.out.println("Message 1 - Java: " + javaResult1);
        System.out.println("Message 1 - JS:   " + jsResult1);
        System.out.println("Message 2 - Java: " + javaResult2);
        System.out.println("Message 2 - JS:   " + jsResult2);
        
        assertEquals(javaResult1, jsResult1, "First MAC should match");
        assertEquals(javaResult2, jsResult2, "Second MAC should match");
        assertNotEquals(javaResult1, javaResult2, "Different messages should produce different MACs");
        
        System.out.println("✓ Reset functionality test passed");
    }

    /**
     * Helper class for test cases
     */
    private static class TestCase {
        String key;
        String message;

        TestCase(String key, String message) {
            this.key = key;
            this.message = message;
        }
    }
}
