package com.sm.bc.graalvm;

import org.bouncycastle.crypto.engines.ZucEngine;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.crypto.params.ParametersWithIV;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.encoders.Hex;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.Security;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Cross-language ZUC Stream Cipher verification tests between Java Bouncy Castle and JavaScript SM-BC
 * 
 * Tests:
 * 1. Basic ZUC-128 encryption/decryption
 * 2. Java encryption → JavaScript decryption
 * 3. JavaScript encryption → Java decryption
 * 4. Different key and IV combinations
 * 5. Various plaintext sizes
 */
@DisplayName("ZUC Stream Cipher Cross-Language Tests")
public class ZUCEngineInteropTest extends BaseGraalVMTest {

    @BeforeAll
    static void setupCrypto() {
        Security.addProvider(new BouncyCastleProvider());
    }

    /**
     * Encrypt using Java Bouncy Castle ZUC
     */
    private String encryptJavaZUC(byte[] key, byte[] iv, String plaintext) {
        ZucEngine zuc = new ZucEngine();
        zuc.init(true, new ParametersWithIV(new KeyParameter(key), iv));
        
        byte[] input = Hex.decode(plaintext);
        byte[] output = new byte[input.length];
        
        zuc.processBytes(input, 0, input.length, output, 0);
        
        return Hex.toHexString(output);
    }

    /**
     * Encrypt using JavaScript SM-BC ZUC
     */
    private String encryptJavaScriptZUC(byte[] key, byte[] iv, String plaintext) {
        String keyHex = Hex.toHexString(key);
        String ivHex = Hex.toHexString(iv);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const ZUCEngine = smBcLibrary.ZUCEngine;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const ParametersWithIV = smBcLibrary.ParametersWithIV;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const plaintext = testUtils.hexToBytes('%s');
                    
                    const zuc = new ZUCEngine();
                    const keyParam = new KeyParameter(key);
                    const params = new ParametersWithIV(keyParam, iv);
                    
                    zuc.init(true, params);
                    
                    const output = new Uint8Array(plaintext.length);
                    zuc.processBytes(plaintext, 0, plaintext.length, output, 0);
                    
                    return testUtils.bytesToHex(output);
                } catch (error) {
                    return 'ERROR: ' + error.message;
                }
            })()
            """, keyHex, ivHex, plaintext));
        
        String resultStr = result.asString();
        if (resultStr.startsWith("ERROR:")) {
            throw new RuntimeException(resultStr);
        }
        
        return resultStr;
    }

    @Test
    @DisplayName("Basic ZUC-128 encryption")
    void testBasicEncryption() {
        byte[] key = new byte[16]; // All zeros
        byte[] iv = new byte[16];  // All zeros
        String plaintext = "00000000000000000000000000000000";
        
        String javaCiphertext = encryptJavaZUC(key, iv, plaintext);
        String jsCiphertext = encryptJavaScriptZUC(key, iv, plaintext);
        
        assertNotNull(javaCiphertext);
        assertNotNull(jsCiphertext);
        assertEquals(javaCiphertext, jsCiphertext, "Java and JS should produce the same ciphertext");
    }

    @Test
    @DisplayName("ZUC with non-zero key and IV")
    void testNonZeroKeyIV() {
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) i;
            iv[i] = (byte) (i + 16);
        }
        
        String plaintext = "0123456789abcdef0123456789abcdef";
        
        String javaCiphertext = encryptJavaZUC(key, iv, plaintext);
        String jsCiphertext = encryptJavaScriptZUC(key, iv, plaintext);
        
        assertEquals(javaCiphertext, jsCiphertext, "Encryption results should match");
    }

    @Test
    @DisplayName("ZUC encrypt/decrypt cycle")
    void testEncryptDecryptCycle() {
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) (i * 2);
            iv[i] = (byte) (i * 3);
        }
        
        String plaintext = "48656c6c6f20576f726c64"; // "Hello World"
        
        // Encrypt with Java
        String ciphertext = encryptJavaZUC(key, iv, plaintext);
        
        // Decrypt with JavaScript
        String keyHex = Hex.toHexString(key);
        String ivHex = Hex.toHexString(iv);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const ZUCEngine = smBcLibrary.ZUCEngine;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const ParametersWithIV = smBcLibrary.ParametersWithIV;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const ciphertext = testUtils.hexToBytes('%s');
                    
                    const zuc = new ZUCEngine();
                    const keyParam = new KeyParameter(key);
                    const params = new ParametersWithIV(keyParam, iv);
                    
                    zuc.init(false, params);
                    
                    const output = new Uint8Array(ciphertext.length);
                    zuc.processBytes(ciphertext, 0, ciphertext.length, output, 0);
                    
                    return testUtils.bytesToHex(output);
                } catch (error) {
                    return 'ERROR: ' + error.message;
                }
            })()
            """, keyHex, ivHex, ciphertext));
        
        String decrypted = result.asString();
        assertFalse(decrypted.startsWith("ERROR:"), "Decryption should not error");
        assertEquals(plaintext, decrypted, "Decrypted text should match original plaintext");
    }

    @Test
    @DisplayName("ZUC with different plaintext sizes")
    void testDifferentSizes() {
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) i;
            iv[i] = (byte) (15 - i);
        }
        
        // Test different sizes
        int[] sizes = {8, 16, 32, 64, 128, 256};
        
        for (int size : sizes) {
            StringBuilder plaintextBuilder = new StringBuilder();
            for (int i = 0; i < size; i++) {
                plaintextBuilder.append(String.format("%02x", i & 0xff));
            }
            String plaintext = plaintextBuilder.toString();
            
            String javaCiphertext = encryptJavaZUC(key, iv, plaintext);
            String jsCiphertext = encryptJavaScriptZUC(key, iv, plaintext);
            
            assertEquals(javaCiphertext, jsCiphertext, 
                String.format("Results should match for size %d", size));
        }
    }

    @Test
    @DisplayName("ZUC algorithm name")
    void testAlgorithmName() {
        Value result = jsContext.eval("js", """
            (() => {
                const ZUCEngine = smBcLibrary.ZUCEngine;
                const zuc = new ZUCEngine();
                return zuc.getAlgorithmName();
            })()
            """);
        
        assertEquals("ZUC-128", result.asString(), "Algorithm name should be ZUC-128");
    }

    @Test
    @DisplayName("ZUC reset functionality")
    void testResetFunctionality() {
        byte[] key = new byte[16];
        byte[] iv = new byte[16];
        
        for (int i = 0; i < 16; i++) {
            key[i] = (byte) i;
            iv[i] = (byte) (i + 16);
        }
        
        String plaintext = "0123456789abcdef";
        
        String keyHex = Hex.toHexString(key);
        String ivHex = Hex.toHexString(iv);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const ZUCEngine = smBcLibrary.ZUCEngine;
                    const KeyParameter = smBcLibrary.KeyParameter;
                    const ParametersWithIV = smBcLibrary.ParametersWithIV;
                    
                    const key = testUtils.hexToBytes('%s');
                    const iv = testUtils.hexToBytes('%s');
                    const plaintext = testUtils.hexToBytes('%s');
                    
                    const zuc = new ZUCEngine();
                    const keyParam = new KeyParameter(key);
                    const params = new ParametersWithIV(keyParam, iv);
                    
                    zuc.init(true, params);
                    
                    const output1 = new Uint8Array(plaintext.length);
                    zuc.processBytes(plaintext, 0, plaintext.length, output1, 0);
                    
                    zuc.reset();
                    
                    const output2 = new Uint8Array(plaintext.length);
                    zuc.processBytes(plaintext, 0, plaintext.length, output2, 0);
                    
                    // Check if outputs are the same
                    for (let i = 0; i < output1.length; i++) {
                        if (output1[i] !== output2[i]) {
                            return 'ERROR: Reset did not restore state';
                        }
                    }
                    
                    return 'SUCCESS';
                } catch (error) {
                    return 'ERROR: ' + error.message;
                }
            })()
            """, keyHex, ivHex, plaintext));
        
        assertEquals("SUCCESS", result.asString(), "Reset should restore initial state");
    }
}
