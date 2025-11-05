package com.sm.bc.graalvm;

import org.bouncycastle.asn1.gm.GMNamedCurves;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.crypto.engines.SM2Engine;
import org.bouncycastle.crypto.params.ECDomainParameters;
import org.bouncycastle.crypto.params.ECPrivateKeyParameters;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;
import org.bouncycastle.crypto.params.ParametersWithRandom;
import org.bouncycastle.crypto.signers.SM2Signer;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.math.ec.ECPoint;

import java.security.SecureRandom;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Security;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Base class for GraalVM Polyglot tests that need to interact with JavaScript SM-BC library
 */
public abstract class BaseGraalVMTest {
    
    protected Context jsContext;
    protected Value smBcLibrary;
    
    // Paths to the built SM-BC library files
    protected static final String SM_BC_DIST_PATH = "../../../dist";
    protected static final String SM_BC_ESM_FILE = "index.mjs";
    protected static final String SM_BC_CJS_FILE = "index.cjs";
    
    /**
     * Check if GraalVM JavaScript support is available
     * @return true if GraalVM JS is available, false otherwise
     */
    protected static boolean isGraalVMJavaScriptAvailable() {
        try {
            Context testContext = Context.newBuilder("js").build();
            testContext.close();
            return true;
        } catch (IllegalStateException e) {
            return false;
        }
    }
    
    @BeforeEach
    public void setupGraalVM() throws IOException {
        // Add Bouncy Castle provider
        Security.addProvider(new BouncyCastleProvider());
        
        // Create GraalVM context with JavaScript support
        jsContext = Context.newBuilder("js")
                .allowAllAccess(true)
                .allowExperimentalOptions(true)
                .option("js.ecmascript-version", "2022")
                .option("js.nashorn-compat", "true")
                .build();
        
        // Set up test utilities first (includes polyfills required by the library)
        setupTestUtilities();
        
        // Load the SM-BC library
        loadSmBcLibrary();
    }
    
    @AfterEach
    public void cleanupGraalVM() {
        if (jsContext != null) {
            jsContext.close();
        }
    }
    
    /**
     * Load the SM-BC JavaScript library into the context
     */
    private void loadSmBcLibrary() throws IOException {
        // Try to load the CommonJS build first (more compatible)
        Path libPath = Paths.get(SM_BC_DIST_PATH, SM_BC_CJS_FILE).toAbsolutePath();
        
        if (!Files.exists(libPath)) {
            throw new RuntimeException("SM-BC library not found at: " + libPath + 
                ". Please run 'npm run build' to generate the distribution files.");
        }
        
        // Read and evaluate the library
        String libSource = Files.readString(libPath);
        
        // Create a CommonJS-like environment
        jsContext.eval("js", """
            var module = { exports: {} };
            var exports = module.exports;
            var require = function(id) { 
                throw new Error('require not implemented for: ' + id); 
            };
        """);
        
        // Load the library
        jsContext.eval("js", libSource);
        
        // Get the exported library
        smBcLibrary = jsContext.eval("js", "module.exports");
        
        if (smBcLibrary == null || smBcLibrary.isNull()) {
            throw new RuntimeException("Failed to load SM-BC library exports");
        }
        
        // Expose library to global scope for easier access in tests
        jsContext.getBindings("js").putMember("smBcLibrary", smBcLibrary);
        
        System.out.println("Successfully loaded SM-BC library with exports: " + 
            smBcLibrary.getMemberKeys());
    }
    
    /**
     * Set up JavaScript utility functions for testing
     */
    private void setupTestUtilities() {
        // Add TextEncoder/TextDecoder polyfill for GraalVM
        jsContext.eval("js", """
            // TextEncoder polyfill
            globalThis.TextEncoder = function() {};
            globalThis.TextEncoder.prototype.encode = function(input) {
                // Convert string to UTF-8 bytes
                const utf8 = [];
                for (let i = 0; i < input.length; i++) {
                    let charCode = input.charCodeAt(i);
                    if (charCode < 0x80) {
                        utf8.push(charCode);
                    } else if (charCode < 0x800) {
                        utf8.push(0xC0 | (charCode >> 6));
                        utf8.push(0x80 | (charCode & 0x3F));
                    } else if (charCode < 0x10000) {
                        utf8.push(0xE0 | (charCode >> 12));
                        utf8.push(0x80 | ((charCode >> 6) & 0x3F));
                        utf8.push(0x80 | (charCode & 0x3F));
                    } else {
                        utf8.push(0xF0 | (charCode >> 18));
                        utf8.push(0x80 | ((charCode >> 12) & 0x3F));
                        utf8.push(0x80 | ((charCode >> 6) & 0x3F));
                        utf8.push(0x80 | (charCode & 0x3F));
                    }
                }
                return new Uint8Array(utf8);
            };
            
            // TextDecoder polyfill  
            globalThis.TextDecoder = function(encoding) {
                this.encoding = encoding || 'utf-8';
            };
            globalThis.TextDecoder.prototype.decode = function(bytes) {
                // Simple UTF-8 decoder
                let result = '';
                let i = 0;
                while (i < bytes.length) {
                    let byte1 = bytes[i++];
                    if (byte1 < 0x80) {
                        result += String.fromCharCode(byte1);
                    } else if ((byte1 >> 5) === 0x06) {
                        let byte2 = bytes[i++];
                        result += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
                    } else if ((byte1 >> 4) === 0x0E) {
                        let byte2 = bytes[i++];
                        let byte3 = bytes[i++];
                        result += String.fromCharCode(((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F));
                    } else if ((byte1 >> 3) === 0x1E) {
                        let byte2 = bytes[i++];
                        let byte3 = bytes[i++];
                        let byte4 = bytes[i++];
                        let codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
                        result += String.fromCharCode(codePoint);
                    }
                }
                return result;
            };
            
            // crypto polyfill for GraalVM
            globalThis.crypto = {
                getRandomValues: function(array) {
                    // Use Java's SecureRandom via Polyglot
                    const SecureRandom = Java.type('java.security.SecureRandom');
                    const random = new SecureRandom();
                    const bytes = new (Java.type('byte[]'))(array.length);
                    random.nextBytes(bytes);
                    for (let i = 0; i < array.length; i++) {
                        array[i] = bytes[i] & 0xFF; // Convert signed byte to unsigned
                    }
                    return array;
                }
            };
        """);
        
        jsContext.eval("js", """
            // Utility functions for tests
            globalThis.testUtils = {
                // Convert hex string to Uint8Array
                hexToBytes: function(hex) {
                    const bytes = new Uint8Array(hex.length / 2);
                    for (let i = 0; i < hex.length; i += 2) {
                        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
                    }
                    return bytes;
                },
                
                // Convert Uint8Array to hex string
                bytesToHex: function(bytes) {
                    return Array.from(bytes)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                },
                
                // Convert BigInt to hex string
                bigIntToHex: function(bigInt) {
                    return bigInt.toString(16);
                },
                
                // Convert hex string to BigInt
                hexToBigInt: function(hex) {
                    return BigInt('0x' + hex);
                }
            };
        """);
    }
    
    /**
     * Execute JavaScript code and return the result
     */
    protected Value evalJs(String code) {
        return jsContext.eval("js", code);
    }
    
    /**
     * Get a member from the SM-BC library
     */
    protected Value getLibraryMember(String memberName) {
        return smBcLibrary.getMember(memberName);
    }
    
    /**
     * Convert byte array to JavaScript Uint8Array
     */
    protected Value bytesToJsUint8Array(byte[] bytes) {
        Value uint8ArrayConstructor = jsContext.eval("js", "Uint8Array");
        Value jsBytes = uint8ArrayConstructor.newInstance(bytes.length);
        
        for (int i = 0; i < bytes.length; i++) {
            jsBytes.setArrayElement(i, bytes[i] & 0xFF);
        }
        
        return jsBytes;
    }
    
    /**
     * Convert JavaScript Uint8Array to byte array
     */
    protected byte[] jsUint8ArrayToBytes(Value jsArray) {
        if (!jsArray.hasArrayElements()) {
            throw new IllegalArgumentException("Value is not an array");
        }
        
        long length = jsArray.getArraySize();
        byte[] result = new byte[(int) length];
        
        for (int i = 0; i < length; i++) {
            result[i] = (byte) jsArray.getArrayElement(i).asInt();
        }
        
        return result;
    }
    
    /**
     * Convert hex string to byte array
     */
    protected static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                    + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
    
    /**
     * Convert byte array to hex string
     */
    protected static String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
    
    /**
     * Compute SM3 hash using Java Bouncy Castle implementation.
     *
     * @param input String input
     * @return Hex-encoded hash
     */
    protected String computeJavaSM3(String input) throws Exception {
        return computeJavaSM3(input.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Compute SM3 hash using Java Bouncy Castle implementation.
     *
     * @param input Byte array input
     * @return Hex-encoded hash
     */
    protected String computeJavaSM3(byte[] input) throws Exception {
        SM3Digest digest = new SM3Digest();
        digest.update(input, 0, input.length);

        byte[] result = new byte[digest.getDigestSize()];
        digest.doFinal(result, 0);

        return bytesToHex(result);
    }

    /**
     * Compute SM3 hash using JavaScript implementation via GraalVM.
     *
     * @param input String input
     * @return Hex-encoded hash
     */
    protected String computeJavaScriptSM3(String input) {
        return computeJavaScriptSM3(input.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Compute SM3 hash using JavaScript implementation via GraalVM.
     *
     * @param input Byte array input
     * @return Hex-encoded hash
     */
    protected String computeJavaScriptSM3(byte[] input) {
        // Convert byte array to hex string for JavaScript
        String hexInput = bytesToHex(input);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const SM3Digest = smBcLibrary.SM3Digest;
                    const bytes = testUtils.hexToBytes('%s');
                    
                    const digest = new SM3Digest();
                    digest.updateArray(bytes, 0, bytes.length);
                    
                    const result = new Uint8Array(digest.getDigestSize());
                    digest.doFinal(result, 0);
                    
                    return {
                        success: true,
                        hash: testUtils.bytesToHex(result)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, hexInput));

        assertTrue(result.getMember("success").asBoolean(),
                "JavaScript SM3 computation failed: " + result.getMember("error"));

        return result.getMember("hash").asString();
    }

    /**
     * Sign a message using Java Bouncy Castle SM2 implementation.
     *
     * @param message Message to sign
     * @param privateKeyHex Private key in hex format
     * @return Signature in hex format
     */
    protected String signWithJavaSM2(byte[] message, String privateKeyHex) throws Exception {
        // Get SM2 domain parameters from GMNamedCurves
        X9ECParameters sm2Params = GMNamedCurves.getByName("sm2p256v1");
        ECDomainParameters domainParams = new ECDomainParameters(
                sm2Params.getCurve(),
                sm2Params.getG(),
                sm2Params.getN(),
                sm2Params.getH()
        );
        
        // Parse private key
        BigInteger d = new BigInteger(privateKeyHex, 16);
        ECPrivateKeyParameters privateKey = new ECPrivateKeyParameters(d, domainParams);
        
        // Create signer with random parameter
        SM2Signer signer = new SM2Signer();
        ParametersWithRandom paramsWithRandom = new ParametersWithRandom(privateKey, new SecureRandom());
        signer.init(true, paramsWithRandom);
        signer.update(message, 0, message.length);
        
        // Generate signature
        byte[] signature = signer.generateSignature();
        
        return bytesToHex(signature);
    }

    /**
     * Verify a signature using Java Bouncy Castle SM2 implementation.
     *
     * @param message Message that was signed
     * @param signatureHex Signature in hex format
     * @param publicKeyHex Public key in hex format (uncompressed format: 04 + x + y)
     * @return true if signature is valid
     */
    protected boolean verifyWithJavaSM2(byte[] message, String signatureHex, String publicKeyHex) throws Exception {
        // Get SM2 domain parameters from GMNamedCurves
        X9ECParameters sm2Params = GMNamedCurves.getByName("sm2p256v1");
        ECDomainParameters domainParams = new ECDomainParameters(
                sm2Params.getCurve(),
                sm2Params.getG(),
                sm2Params.getN(),
                sm2Params.getH()
        );
        
        // Parse public key (uncompressed format: 04 + x + y)
        if (!publicKeyHex.startsWith("04")) {
            throw new IllegalArgumentException("Public key must be in uncompressed format (04 + x + y)");
        }
        
        int coordLen = (publicKeyHex.length() - 2) / 2;
        String xHex = publicKeyHex.substring(2, 2 + coordLen);
        String yHex = publicKeyHex.substring(2 + coordLen);
        
        BigInteger x = new BigInteger(xHex, 16);
        BigInteger y = new BigInteger(yHex, 16);
        
        ECPoint q = domainParams.getCurve().createPoint(x, y);
        ECPublicKeyParameters publicKey = new ECPublicKeyParameters(q, domainParams);
        
        // Create verifier
        SM2Signer verifier = new SM2Signer();
        verifier.init(false, publicKey);
        verifier.update(message, 0, message.length);
        
        // Verify signature
        byte[] signature = hexToBytes(signatureHex);
        return verifier.verifySignature(signature);
    }

    /**
     * Sign a message using JavaScript SM2 implementation via GraalVM.
     *
     * @param message Message to sign
     * @param privateKeyHex Private key in hex format
     * @return Signature in hex format
     */
    protected String signWithJavaScriptSM2(byte[] message, String privateKeyHex) {
        String messageHex = bytesToHex(message);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const SM2Signer = smBcLibrary.SM2Signer;
                    const ECPrivateKeyParameters = smBcLibrary.ECPrivateKeyParameters;
                    const SM2 = smBcLibrary.SM2;
                    const ParametersWithRandom = smBcLibrary.ParametersWithRandom;
                    const SecureRandom = smBcLibrary.SecureRandom;
                    
                    const message = testUtils.hexToBytes('%s');
                    const privateKeyBigInt = testUtils.hexToBigInt('%s');
                    
                    const domainParams = SM2.getParameters();
                    const privateKey = new ECPrivateKeyParameters(privateKeyBigInt, domainParams);
                    
                    const signer = new SM2Signer();
                    const random = new SecureRandom();
                    signer.init(true, new ParametersWithRandom(privateKey, random));
                    signer.update(message, 0, message.length);
                    
                    const signature = signer.generateSignature();
                    
                    return {
                        success: true,
                        signature: testUtils.bytesToHex(signature)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, messageHex, privateKeyHex));

        assertTrue(result.getMember("success").asBoolean(),
                "JavaScript SM2 signing failed: " + result.getMember("error"));

        return result.getMember("signature").asString();
    }

    /**
     * Verify a signature using JavaScript SM2 implementation via GraalVM.
     *
     * @param message Message that was signed
     * @param signatureHex Signature in hex format
     * @param publicKeyHex Public key in hex format (uncompressed format: 04 + x + y)
     * @return true if signature is valid
     */
    protected boolean verifyWithJavaScriptSM2(byte[] message, String signatureHex, String publicKeyHex) {
        String messageHex = bytesToHex(message);
        
        Value result = jsContext.eval("js", String.format("""
            (() => {
                try {
                    const SM2Signer = smBcLibrary.SM2Signer;
                    const ECPublicKeyParameters = smBcLibrary.ECPublicKeyParameters;
                    const SM2 = smBcLibrary.SM2;
                    
                    const message = testUtils.hexToBytes('%s');
                    const signature = testUtils.hexToBytes('%s');
                    const publicKeyHex = '%s';
                    
                    // Parse public key (uncompressed format: 04 + x + y)
                    if (!publicKeyHex.startsWith('04')) {
                        throw new Error('Public key must be in uncompressed format (04 + x + y)');
                    }
                    
                    const coordLen = (publicKeyHex.length - 2) / 2;
                    const xHex = publicKeyHex.substring(2, 2 + coordLen);
                    const yHex = publicKeyHex.substring(2 + coordLen);
                    
                    const x = testUtils.hexToBigInt(xHex);
                    const y = testUtils.hexToBigInt(yHex);
                    
                    const domainParams = SM2.getParameters();
                    const curve = domainParams.getCurve();
                    const q = curve.createPoint(x, y);
                    const publicKey = new ECPublicKeyParameters(q, domainParams);
                    
                    const verifier = new SM2Signer();
                    verifier.init(false, publicKey);
                    verifier.update(message, 0, message.length);
                    
                    const isValid = verifier.verifySignature(signature);
                    
                    return {
                        success: true,
                        isValid: isValid
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message || error.toString(),
                        stack: error.stack
                    };
                }
            })()
        """, messageHex, signatureHex, publicKeyHex));

        assertTrue(result.getMember("success").asBoolean(),
                "JavaScript SM2 verification failed: " + result.getMember("error"));

        return result.getMember("isValid").asBoolean();
    }
}