package com.sm.bc.graalvm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Security;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Simplified cross-language tests using Node.js process execution
 * This approach doesn't require GraalVM setup but still validates cross-language compatibility
 */
@DisplayName("SM3 Cross-Language Node.js Tests")
public class SimplifiedCrossLanguageTest {

    private static final String SM_BC_DIST_PATH = "../../../dist";
    private static final String TEST_SCRIPTS_PATH = "src/test/resources/scripts";
    private static ObjectMapper objectMapper = new ObjectMapper();

    @BeforeAll
    static void setupCrypto() {
        Security.addProvider(new BouncyCastleProvider());
        
        // Create test scripts directory if it doesn't exist
        try {
            Files.createDirectories(Paths.get(TEST_SCRIPTS_PATH));
        } catch (IOException e) {
            // Directory might already exist
        }
    }

    @Test
    @DisplayName("SM3 cross-implementation verification with Node.js")
    void testSM3CrossImplementation() throws Exception {
        System.out.println("\n=== Testing SM3 Cross-Implementation with Node.js ===");
        
        String[] testMessages = {
            "",  // Empty string
            "a", // Single character
            "abc", // Standard test
            "Hello SM3!", // Regular message
            "SM3哈希算法测试消息" // Chinese characters
        };
        
        for (String message : testMessages) {
            System.out.println("Testing message: \"" + message + "\"");
            
            // Compute hash with Java Bouncy Castle
            String javaHash = computeJavaSM3(message);
            
            // Compute hash with JavaScript SM-BC via Node.js
            String jsHash = computeJavaScriptSM3ViaNodeJs(message);
            
            assertEquals(javaHash, jsHash, 
                "Java and JavaScript SM3 results don't match for message: " + message);
            
            System.out.println("  ✓ Both implementations agree: " + javaHash);
        }
        
        System.out.println("✓ All SM3 cross-implementation tests passed");
    }

    @Test
    @DisplayName("Standard SM3 test vectors verification")
    void testSM3StandardVectors() throws Exception {
        System.out.println("\n=== Testing SM3 Standard Test Vectors ===");
        
        // Standard test vectors
        TestVector[] vectors = {
            new TestVector("", "1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b"),
            new TestVector("a", "623476ac18f65a2909e43c7fec61b49c7e764a91a18ccb82f1917a29c86c5e88"),
            new TestVector("abc", "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0")
        };
        
        for (int i = 0; i < vectors.length; i++) {
            TestVector tv = vectors[i];
            System.out.println("Test vector " + (i + 1) + ": \"" + tv.input + "\"");
            
            // Test with Java
            String javaResult = computeJavaSM3(tv.input);
            assertEquals(tv.expectedHash, javaResult, 
                "Java SM3 failed for test vector " + (i + 1));
            
            // Test with JavaScript (if Node.js is available)
            if (isNodeJsAvailable()) {
                String jsResult = computeJavaScriptSM3ViaNodeJs(tv.input);
                assertEquals(tv.expectedHash, jsResult, 
                    "JavaScript SM3 failed for test vector " + (i + 1));
                System.out.println("  ✓ Both Java and JavaScript match expected: " + tv.expectedHash);
            } else {
                System.out.println("  ✓ Java matches expected: " + tv.expectedHash + " (Node.js not available)");
            }
        }
        
        System.out.println("✓ All standard test vectors passed");
    }

    @Test
    @DisplayName("Performance comparison")
    void testPerformanceComparison() throws Exception {
        if (!isNodeJsAvailable()) {
            System.out.println("Skipping performance test - Node.js not available");
            return;
        }
        
        System.out.println("\n=== Performance Comparison ===");
        
        String testMessage = "Performance test message: " + "x".repeat(1000); // 1KB message
        int iterations = 100;
        
        // Java performance
        long javaStartTime = System.currentTimeMillis();
        for (int i = 0; i < iterations; i++) {
            computeJavaSM3(testMessage);
        }
        long javaTime = System.currentTimeMillis() - javaStartTime;
        
        // JavaScript performance (via Node.js - includes process overhead)
        long jsTime = measureJavaScriptSM3Performance(testMessage, iterations);
        
        System.out.println("Message size: " + testMessage.length() + " bytes");
        System.out.println("Iterations: " + iterations);
        System.out.println("Java time: " + javaTime + " ms (" + 
            String.format("%.2f", (double) javaTime / iterations) + " ms/op)");
        System.out.println("JavaScript time (with Node.js overhead): " + jsTime + " ms (" + 
            String.format("%.2f", (double) jsTime / iterations) + " ms/op)");
        
        // Note: JavaScript via Node.js will be slower due to process creation overhead
        // This is expected and not a fair comparison, but shows the results
        System.out.println("Note: JavaScript timing includes Node.js process creation overhead");
        
        System.out.println("✓ Performance comparison completed");
    }

    // Helper methods
    private String computeJavaSM3(String input) throws Exception {
        byte[] inputBytes = input.getBytes(StandardCharsets.UTF_8);
        SM3Digest digest = new SM3Digest();
        digest.update(inputBytes, 0, inputBytes.length);
        
        byte[] result = new byte[digest.getDigestSize()];
        digest.doFinal(result, 0);
        
        return bytesToHex(result);
    }

    private String computeJavaScriptSM3ViaNodeJs(String input) throws Exception {
        // Create a temporary Node.js script
        String script = createSM3TestScript(input);
        Path scriptPath = Paths.get(TEST_SCRIPTS_PATH, "temp_sm3_test.mjs");
        Files.write(scriptPath, script.getBytes(StandardCharsets.UTF_8));
        
        try {
            // Execute the script
            ProcessBuilder pb = new ProcessBuilder("node", scriptPath.toAbsolutePath().toString());
            pb.directory(Paths.get(SM_BC_DIST_PATH).toAbsolutePath().toFile());
            Process process = pb.start();
            
            // Wait for completion with timeout
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Node.js script timed out");
            }
            
            if (process.exitValue() != 0) {
                // Read error output
                String error = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                throw new RuntimeException("Node.js script failed: " + error);
            }
            
            // Read result
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            JsonNode result = objectMapper.readTree(output.trim());
            
            if (result.has("error")) {
                throw new RuntimeException("JavaScript error: " + result.get("error").asText());
            }
            
            return result.get("hash").asText();
            
        } finally {
            // Clean up temporary file
            Files.deleteIfExists(scriptPath);
        }
    }

    private long measureJavaScriptSM3Performance(String message, int iterations) throws Exception {
        // Create performance test script
        String script = createSM3PerformanceScript(message, iterations);
        Path scriptPath = Paths.get(TEST_SCRIPTS_PATH, "temp_sm3_perf.mjs");
        Files.write(scriptPath, script.getBytes(StandardCharsets.UTF_8));
        
        try {
            long startTime = System.currentTimeMillis();
            
            ProcessBuilder pb = new ProcessBuilder("node", scriptPath.toAbsolutePath().toString());
            pb.directory(Paths.get(SM_BC_DIST_PATH).toAbsolutePath().toFile());
            Process process = pb.start();
            
            boolean finished = process.waitFor(60, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Performance test timed out");
            }
            
            long endTime = System.currentTimeMillis();
            
            if (process.exitValue() != 0) {
                String error = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                throw new RuntimeException("Performance test failed: " + error);
            }
            
            return endTime - startTime;
            
        } finally {
            Files.deleteIfExists(scriptPath);
        }
    }

    private String createSM3TestScript(String input) {
        String escapedInput = input.replace("\\", "\\\\").replace("\"", "\\\"");
        
        return String.format("""
            import { SM3Digest } from '../../../../../../../dist/index.mjs';
            
            try {
                const message = new TextEncoder().encode("%s");
                const digest = new SM3Digest();
                digest.updateArray(message, 0, message.length);
                
                const result = new Uint8Array(digest.getDigestSize());
                digest.doFinal(result, 0);
                
                const hash = Array.from(result)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                
                console.log(JSON.stringify({ hash: hash }));
            } catch (error) {
                console.log(JSON.stringify({ error: error.message }));
                process.exit(1);
            }
        """, escapedInput);
    }

    private String createSM3PerformanceScript(String message, int iterations) {
        String escapedMessage = message.replace("\\", "\\\\").replace("\"", "\\\"");
        
        return String.format("""
            import { SM3Digest } from '../../../../../../../dist/index.mjs';
            
            try {
                const message = new TextEncoder().encode("%s");
                const iterations = %d;
                
                for (let i = 0; i < iterations; i++) {
                    const digest = new SM3Digest();
                    digest.update(message, 0, message.length);
                    
                    const result = new Uint8Array(digest.getDigestSize());
                    digest.doFinal(result, 0);
                }
                
                console.log("Performance test completed");
            } catch (error) {
                console.error("Performance test error:", error.message);
                process.exit(1);
            }
        """, escapedMessage, iterations);
    }

    private boolean isNodeJsAvailable() {
        try {
            ProcessBuilder pb = new ProcessBuilder("node", "--version");
            Process process = pb.start();
            boolean finished = process.waitFor(5, TimeUnit.SECONDS);
            return finished && process.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
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