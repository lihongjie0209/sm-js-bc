package com.sm.bc.graalvm;

import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cross-language SM3 digest verification tests between Java Bouncy Castle and JavaScript SM-BC
 * 
 * Tests:
 * 1. Standard test vectors verification
 * 2. Java digest → JavaScript verification
 * 3. JavaScript digest → Java verification
 * 4. Incremental digest updates
 * 5. Various input sizes and edge cases
 */
@DisplayName("SM3 Digest Cross-Language Tests")
public class SM3DigestInteropTest extends BaseGraalVMTest {

    @BeforeAll
    static void setupCrypto() {
        Security.addProvider(new BouncyCastleProvider());
    }

    @Test
    @DisplayName("Standard test vectors verification")
    void testStandardTestVectors() throws Exception {
        System.out.println("\n=== Testing Standard SM3 Test Vectors ===");
        
        // Standard test vectors for SM3
        TestVector[] testVectors = {
            new TestVector(
                "",
                "1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b"
            ),
            new TestVector(
                "a",
                "623476ac18f65a2909e43c7fec61b49c7e764a91a18ccb82f1917a29c86c5e88"
            ),
            new TestVector(
                "abc",
                "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0"
            ),
            new TestVector(
                "abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd",
                "debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732"
            )
        };
        
        for (int i = 0; i < testVectors.length; i++) {
            TestVector tv = testVectors[i];
            System.out.println("Test vector " + (i + 1) + ": \"" + tv.input + "\"");
            
            // Test with Java Bouncy Castle
            String javaResult = computeJavaSM3(tv.input);
            assertEquals(tv.expectedHash, javaResult, 
                "Java SM3 failed for test vector " + (i + 1));
            
            // Test with JavaScript SM-BC
            String jsResult = computeJavaScriptSM3(tv.input);
            assertEquals(tv.expectedHash, jsResult, 
                "JavaScript SM3 failed for test vector " + (i + 1));
            
            System.out.println("  ✓ Both implementations match expected: " + tv.expectedHash);
        }
        
        System.out.println("✓ All standard test vectors passed");
    }

    @Test
    @DisplayName("Cross-implementation verification")
    void testCrossImplementationVerification() throws Exception {
        System.out.println("\n=== Testing Cross-Implementation Verification ===");
        
        String[] testMessages = {
            "Hello SM3!",
            "The quick brown fox jumps over the lazy dog",
            "SM3哈希算法测试消息",
            "A".repeat(1000), // 1KB message
            new String(new byte[0], StandardCharsets.UTF_8) // Empty string
        };
        
        for (String message : testMessages) {
            System.out.println("Testing message: \"" + 
                (message.length() > 50 ? message.substring(0, 47) + "..." : message) + "\"");
            
            // Compute with both implementations
            String javaHash = computeJavaSM3(message);
            String jsHash = computeJavaScriptSM3(message);
            
            assertEquals(javaHash, jsHash, 
                "Java and JavaScript SM3 results don't match for message: " + message);
            
            System.out.println("  ✓ Both implementations agree: " + javaHash);
        }
        
        System.out.println("✓ Cross-implementation verification passed");
    }

    @Test
    @DisplayName("Incremental digest updates")
    void testIncrementalDigest() throws Exception {
        System.out.println("\n=== Testing Incremental Digest Updates ===");
        
        String fullMessage = "This is a test message for incremental SM3 digest computation.";
        
        // Compute full message hash at once
        String fullHashJava = computeJavaSM3(fullMessage);
        String fullHashJs = computeJavaScriptSM3(fullMessage);
        
        // Compute incrementally with Java
        SM3Digest javaDigest = new SM3Digest();
        byte[] messageBytes = fullMessage.getBytes(StandardCharsets.UTF_8);
        
        // Add in chunks
        int chunkSize = 5;
        for (int i = 0; i < messageBytes.length; i += chunkSize) {
            int length = Math.min(chunkSize, messageBytes.length - i);
            javaDigest.update(messageBytes, i, length);
        }
        
        byte[] javaIncrementalHash = new byte[javaDigest.getDigestSize()];
        javaDigest.doFinal(javaIncrementalHash, 0);
        String javaIncrementalHashHex = bytesToHex(javaIncrementalHash);
        
        // Compute incrementally with JavaScript
        Value jsIncrementalResult = evalJs(String.format("""
            try {
                const sm3 = smBcLibrary.SM3Digest;
                const fullMessage = '%s';
                const messageBytes = new TextEncoder().encode(fullMessage);
                
                // Create digest instance
                const digest = new sm3();
                
                // Add in chunks of 5 bytes
                const chunkSize = 5;
                for (let i = 0; i < messageBytes.length; i += chunkSize) {
                    const chunk = messageBytes.slice(i, i + chunkSize);
                    digest.updateArray(chunk, 0, chunk.length);
                }
                
                // Finalize
                const result = new Uint8Array(digest.getDigestSize());
                digest.doFinal(result, 0);
                
                ({
                    success: true,
                    incrementalHash: testUtils.bytesToHex(result)
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString(),
                    stack: error.stack
                })
            }
        """, fullMessage.replace("'", "\\'")));
        
        assertTrue(jsIncrementalResult.getMember("success").asBoolean(), 
            "JavaScript incremental digest failed: " + jsIncrementalResult.getMember("error"));
        
        String jsIncrementalHashHex = jsIncrementalResult.getMember("incrementalHash").asString();
        
        // Verify all methods produce same result
        assertEquals(fullHashJava, javaIncrementalHashHex, 
            "Java incremental digest doesn't match full computation");
        assertEquals(fullHashJs, jsIncrementalHashHex, 
            "JavaScript incremental digest doesn't match full computation");
        assertEquals(javaIncrementalHashHex, jsIncrementalHashHex, 
            "Java and JavaScript incremental digests don't match");
        
        System.out.println("✓ Incremental digest computation verified");
        System.out.println("  Full message hash: " + fullHashJava);
        System.out.println("  Incremental hash:  " + javaIncrementalHashHex);
    }

    @Test
    @DisplayName("Digest cloning and reset")
    void testDigestCloningAndReset() throws Exception {
        System.out.println("\n=== Testing Digest Cloning and Reset ===");
        
        String partialMessage = "Partial message";
        String fullMessage = partialMessage + " with additional content";
        
        // Test with JavaScript (if cloning is supported)
        Value jsResult = evalJs(String.format("""
            try {
                const sm3 = smBcLibrary.SM3Digest;
                
                // Create digest and add partial message
                const digest1 = new sm3();
                const partialBytes = new TextEncoder().encode('%s');
                digest1.updateArray(partialBytes, 0, partialBytes.length);
                
                // Clone digest (if supported)
                let digest2;
                try {
                    digest2 = digest1.copy ? digest1.copy() : null;
                } catch (e) {
                    digest2 = null;
                }
                
                // Complete first digest with additional content
                const additionalBytes = new TextEncoder().encode(' with additional content');
                digest1.updateArray(additionalBytes, 0, additionalBytes.length);
                
                const result1 = new Uint8Array(digest1.getDigestSize());
                digest1.doFinal(result1, 0);
                
                let result2 = null;
                if (digest2) {
                    result2 = new Uint8Array(digest2.getDigestSize());
                    digest2.doFinal(result2, 0);
                }
                
                ({
                    success: true,
                    fullHash: testUtils.bytesToHex(result1),
                    partialHash: result2 ? testUtils.bytesToHex(result2) : null,
                    cloningSupported: digest2 !== null
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString()
                })
            }
        """, partialMessage.replace("'", "\\'")));
        
        assertTrue(jsResult.getMember("success").asBoolean(), 
            "JavaScript digest cloning test failed: " + jsResult.getMember("error"));
        
        String jsFullHash = jsResult.getMember("fullHash").asString();
        boolean cloningSupported = jsResult.getMember("cloningSupported").asBoolean();
        
        // Verify against expected results
        String expectedFullHash = computeJavaSM3(fullMessage);
        assertEquals(expectedFullHash, jsFullHash, 
            "JavaScript full message hash doesn't match expected");
        
        if (cloningSupported) {
            String jsPartialHash = jsResult.getMember("partialHash").asString();
            String expectedPartialHash = computeJavaSM3(partialMessage);
            assertEquals(expectedPartialHash, jsPartialHash, 
                "JavaScript partial hash from cloned digest doesn't match expected");
            
            System.out.println("✓ Digest cloning supported and working correctly");
        } else {
            System.out.println("ℹ Digest cloning not supported in JavaScript implementation");
        }
        
        // Test reset functionality
        testDigestReset();
    }
    
    private void testDigestReset() throws Exception {
        System.out.println("Testing digest reset functionality...");
        
        Value jsResetResult = evalJs("""
            try {
                const sm3 = smBcLibrary.SM3Digest;
                const digest = new sm3();
                
                // Add some data
                const data1 = new TextEncoder().encode('first data');
                digest.updateArray(data1, 0, data1.length);
                
                // Reset digest
                digest.reset();
                
                // Add different data
                const data2 = new TextEncoder().encode('second data');
                digest.updateArray(data2, 0, data2.length);
                
                const result = new Uint8Array(digest.getDigestSize());
                digest.doFinal(result, 0);
                
                ({
                    success: true,
                    resetHash: testUtils.bytesToHex(result)
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString()
                })
            }
        """);
        
        assertTrue(jsResetResult.getMember("success").asBoolean(), 
            "JavaScript digest reset test failed: " + jsResetResult.getMember("error"));
        
        String jsResetHash = jsResetResult.getMember("resetHash").asString();
        String expectedResetHash = computeJavaSM3("second data");
        
        assertEquals(expectedResetHash, jsResetHash, 
            "JavaScript digest reset didn't work correctly");
        
        System.out.println("  ✓ Digest reset functionality working correctly");
    }

    @Test
    @DisplayName("Edge cases and performance")
    void testEdgeCases() throws Exception {
        System.out.println("\n=== Testing Edge Cases ===");
        
        // Test 1: Very large message (1MB)
        testLargeMessage();
        
        // Test 2: Binary data with all byte values
        testBinaryData();
        
        // Test 3: Repeated digest operations
        testRepeatedOperations();
        
        System.out.println("✓ All edge cases handled correctly");
    }
    
    private void testLargeMessage() throws Exception {
        System.out.println("Testing 1MB message...");
        
        // Generate 1MB of data
        byte[] largeData = new byte[1024 * 1024];
        for (int i = 0; i < largeData.length; i++) {
            largeData[i] = (byte) (i & 0xFF);
        }
        
        // Compute with Java
        SM3Digest javaDigest = new SM3Digest();
        javaDigest.update(largeData, 0, largeData.length);
        byte[] javaHash = new byte[javaDigest.getDigestSize()];
        javaDigest.doFinal(javaHash, 0);
        String javaHashHex = bytesToHex(javaHash);
        
        System.out.println("  Java hash for 1MB: " + javaHashHex);
        System.out.println("  ✓ Large message handled successfully");
    }
    
    private void testBinaryData() throws Exception {
        System.out.println("Testing binary data with all byte values...");
        
        // Create data with all possible byte values
        byte[] binaryData = new byte[256];
        for (int i = 0; i < 256; i++) {
            binaryData[i] = (byte) i;
        }
        
        String javaHash = computeJavaSM3(binaryData);
        
        // Test with JavaScript
        String binaryDataHex = bytesToHex(binaryData);
        Value jsResult = evalJs(String.format("""
            try {
                const sm3 = smBcLibrary.SM3Digest;
                const binaryData = testUtils.hexToBytes('%s');
                
                const digest = new sm3();
                digest.updateArray(binaryData, 0, binaryData.length);
                
                const result = new Uint8Array(digest.getDigestSize());
                digest.doFinal(result, 0);
                
                ({
                    success: true,
                    hash: testUtils.bytesToHex(result)
                })
            } catch (error) {
                ({
                    success: false,
                    error: error.message || error.toString()
                })
            }
        """, binaryDataHex));
        
        assertTrue(jsResult.getMember("success").asBoolean(), 
            "JavaScript binary data test failed: " + jsResult.getMember("error"));
        
        String jsHash = jsResult.getMember("hash").asString();
        assertEquals(javaHash, jsHash, 
            "Binary data hashes don't match");
        
        System.out.println("  ✓ Binary data handled correctly: " + javaHash);
    }
    
    private void testRepeatedOperations() throws Exception {
        System.out.println("Testing repeated digest operations...");
        
        String testMessage = "Repeated operation test";
        String expectedHash = computeJavaSM3(testMessage);
        
        // Perform multiple operations to check for state issues
        for (int i = 0; i < 10; i++) {
            String hash = computeJavaScriptSM3(testMessage);
            assertEquals(expectedHash, hash, 
                "Repeated operation " + (i + 1) + " produced different result");
        }
        
        System.out.println("  ✓ Repeated operations produce consistent results");
    }

    // Test vector class
    private static class TestVector {
        final String input;
        final String expectedHash;
        
        TestVector(String input, String expectedHash) {
            this.input = input;
            this.expectedHash = expectedHash;
        }
    }
}