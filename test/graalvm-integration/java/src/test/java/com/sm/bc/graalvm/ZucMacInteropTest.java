package com.sm.bc.graalvm;

import org.bouncycastle.crypto.macs.Zuc128Mac;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.crypto.params.ParametersWithIV;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.encoders.Hex;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.Security;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cross-language ZUC MAC verification tests between Java Bouncy Castle and JavaScript SM-BC
 * 
 * Tests:
 * 1. Basic MAC computation
 * 2. Java MAC → JavaScript verification
 * 3. JavaScript MAC → Java verification
 * 4. Various message sizes
 */
@DisplayName("ZUC MAC Cross-Language Tests")
public class ZucMacInteropTest extends BaseGraalVMTest {

    @BeforeAll
    static void setupCrypto() {
        Security.addProvider(new BouncyCastleProvider());
    }

    /**
     * Compute ZUC-128 MAC using Java Bouncy Castle
     */
    private String computeJavaZucMac(byte[] key, byte[] iv, String message) {
        Zuc128Mac mac = new Zuc128Mac();
        mac.init(new ParametersWithIV(new KeyParameter(key), iv));
        
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        mac.update(messageBytes, 0, messageBytes.length);
        
        byte[] out = new byte[mac.getMacSize()];
        mac.doFinal(out, 0);
        
        return Hex.toHexString(out);
    }

    /**
     * Compute ZUC-128 MAC using JavaScript SM-BC
     */
    private String computeJavaScriptZucMac(byte[] key, byte[] iv, String message) {
        String keyHex = Hex.toHexString(key);
        String ivHex = Hex.toHexString(iv);
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        String messageHex = Hex.toHexString(messageBytes);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const Zuc128Mac = smBcLibrary.Zuc128Mac;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const ParametersWithIV = smBcLibrary.ParametersWithIV;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const messageBytes = testUtils.hexToBytes('%s');
                    
                    const mac = new Zuc128Mac();
                    const keyParam = new KeyParameter(key);
                    const params = new ParametersWithIV(keyParam, iv);
                    
                    mac.init(params);
                    mac.updateArray(messageBytes, 0, messageBytes.length);
                    
                    const out = new Uint8Array(mac.getMacSize());
                    mac.doFinal(out, 0);
                    
                    return testUtils.bytesToHex(out);
                } catch (error) {
                    return 'ERROR: ' + error.message;
                }
            })()
            """, keyHex, ivHex, messageHex));
        
        String resultStr = result.asString();
        if (resultStr.startsWith("ERROR:")) {
            throw new RuntimeException(resultStr);
        }
        
        return resultStr;
    }

    @Test
    @DisplayName("Basic ZUC-128 MAC computation")
    void testBasicMac() {
        byte[] key = new byte[16]; // All zeros
        byte[] iv = new byte[16];  // All zeros
        String message = "Hello, World!";
        
        String javaMac = computeJavaZucMac(key, iv, message);
        String jsMac = computeJavaScriptZucMac(key, iv, message);
        
        assertNotNull(javaMac);
        assertNotNull(jsMac);
        assertEquals(8, javaMac.length(), "MAC should be 4 bytes (8 hex chars)");
        assertEquals(javaMac, jsMac, "Java and JS should produce the same MAC");
    }

    @Test
    @DisplayName("ZUC MAC with non-zero key and IV")
    void testNonZeroKeyIV() {
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) i;
            iv[i] = (byte) (i + 16);
        }
        
        String message = "Test message for ZUC MAC";
        
        String javaMac = computeJavaZucMac(key, iv, message);
        String jsMac = computeJavaScriptZucMac(key, iv, message);
        
        assertEquals(javaMac, jsMac, "MAC results should match");
    }

    @Test
    @DisplayName("ZUC MAC with empty message")
    void testEmptyMessage() {
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) (i * 2);
            iv[i] = (byte) (i * 3);
        }
        
        String message = "";
        
        String javaMac = computeJavaZucMac(key, iv, message);
        String jsMac = computeJavaScriptZucMac(key, iv, message);
        
        assertEquals(javaMac, jsMac, "Empty message MAC should match");
    }

    @Test
    @DisplayName("ZUC MAC with different message sizes")
    void testDifferentMessageSizes() {
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) i;
            iv[i] = (byte) (15 - i);
        }
        
        // Test different message sizes
        String[] messages = {
            "a",
            "ab",
            "abc",
            "abcd",
            "abcde",
            "abcdef",
            "The quick brown fox jumps over the lazy dog",
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit"
        };
        
        for (String message : messages) {
            String javaMac = computeJavaZucMac(key, iv, message);
            String jsMac = computeJavaScriptZucMac(key, iv, message);
            
            assertEquals(javaMac, jsMac, 
                String.format("MAC should match for message: %s", message));
        }
    }

    @Test
    @DisplayName("ZUC MAC algorithm name and size")
    void testMacProperties() {
        Value result = jsContext.eval("js", """
            (() => {
                const Zuc128Mac = smBcLibrary.Zuc128Mac;
                const mac = new Zuc128Mac();
                return {
                    name: mac.getAlgorithmName(),
                    size: mac.getMacSize()
                };
            })()
            """);
        
        assertEquals("ZUC-128-MAC", result.getMember("name").asString(), 
            "Algorithm name should be ZUC-128-MAC");
        assertEquals(4, result.getMember("size").asInt(), 
            "MAC size should be 4 bytes");
    }

    @Test
    @DisplayName("ZUC MAC different keys produce different MACs")
    void testDifferentKeys() {
        byte[] key1 = new byte[16];
        byte[] key2 = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key1[i] = (byte) i;
            key2[i] = (byte) (i + 1);
            iv[i] = 0;
        }
        
        String message = "Test message";
        
        String mac1 = computeJavaZucMac(key1, iv, message);
        String mac2 = computeJavaZucMac(key2, iv, message);
        
        assertNotEquals(mac1, mac2, "Different keys should produce different MACs");
    }

    @Test
    @DisplayName("ZUC MAC different IVs produce different MACs")
    void testDifferentIVs() {
        byte[] key = new byte[16];
        byte[] iv1 = new byte[16];
        byte[] iv2 = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) i;
            iv1[i] = (byte) i;
            iv2[i] = (byte) (i + 1);
        }
        
        String message = "Test message";
        
        String mac1 = computeJavaZucMac(key, iv1, message);
        String mac2 = computeJavaZucMac(key, iv2, message);
        
        assertNotEquals(mac1, mac2, "Different IVs should produce different MACs");
    }
}
