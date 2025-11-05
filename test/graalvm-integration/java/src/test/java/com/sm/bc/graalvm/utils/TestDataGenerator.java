package com.sm.bc.graalvm.utils;

import org.bouncycastle.asn1.gm.GMNamedCurves;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.AsymmetricCipherKeyPair;
import org.bouncycastle.crypto.generators.ECKeyPairGenerator;
import org.bouncycastle.crypto.params.ECDomainParameters;
import org.bouncycastle.crypto.params.ECKeyGenerationParameters;
import org.bouncycastle.crypto.params.ECPrivateKeyParameters;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;
import org.bouncycastle.math.ec.ECPoint;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

/**
 * 测试数据生成器工具类
 * 提供各种测试场景所需的随机数据、边界值、测试向量等
 */
public class TestDataGenerator {
    
    private static final SecureRandom random = new SecureRandom();
    private static ECDomainParameters domainParams;
    
    static {
        // 初始化SM2曲线参数
        X9ECParameters sm2Params = GMNamedCurves.getByName("sm2p256v1");
        domainParams = new ECDomainParameters(
            sm2Params.getCurve(),
            sm2Params.getG(),
            sm2Params.getN(),
            sm2Params.getH()
        );
    }
    
    // ==================== 随机字节生成 ====================
    
    /**
     * 生成指定长度的随机字节数组
     */
    public static byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        random.nextBytes(bytes);
        return bytes;
    }
    
    /**
     * 生成指定长度的全零字节数组
     */
    public static byte[] zerosPattern(int length) {
        return new byte[length];
    }
    
    /**
     * 生成指定长度的全1字节数组
     */
    public static byte[] onesPattern(int length) {
        byte[] bytes = new byte[length];
        for (int i = 0; i < length; i++) {
            bytes[i] = (byte) 0xFF;
        }
        return bytes;
    }
    
    /**
     * 生成指定长度的交替模式字节数组 (0xAA)
     */
    public static byte[] alternatingPattern(int length) {
        byte[] bytes = new byte[length];
        for (int i = 0; i < length; i++) {
            bytes[i] = (byte) 0xAA; // 10101010
        }
        return bytes;
    }
    
    /**
     * 使用指定模式重复填充到指定总长度
     */
    public static byte[] repeatingPattern(byte[] pattern, int totalLength) {
        byte[] result = new byte[totalLength];
        for (int i = 0; i < totalLength; i++) {
            result[i] = pattern[i % pattern.length];
        }
        return result;
    }
    
    // ==================== 字符串生成 ====================
    
    /**
     * 生成指定长度的随机ASCII字符串
     */
    public static String randomAsciiString(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            // 可打印ASCII字符范围：32-126
            char c = (char) (32 + random.nextInt(95));
            sb.append(c);
        }
        return sb.toString();
    }
    
    /**
     * 生成指定长度的随机Unicode字符串（包含各种语言字符）
     */
    public static String randomUnicodeString(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            // 选择不同的Unicode范围
            int range = random.nextInt(4);
            char c;
            switch (range) {
                case 0: // 基本拉丁字母
                    c = (char) (32 + random.nextInt(95));
                    break;
                case 1: // 中文常用汉字
                    c = (char) (0x4E00 + random.nextInt(0x9FA5 - 0x4E00));
                    break;
                case 2: // 日文平假名
                    c = (char) (0x3040 + random.nextInt(0x309F - 0x3040));
                    break;
                default: // 其他Unicode字符
                    c = (char) (0x0100 + random.nextInt(0x1000));
            }
            sb.append(c);
        }
        return sb.toString();
    }
    
    /**
     * 生成指定长度的随机中文字符串
     */
    public static String randomChineseString(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            // 中文常用汉字范围：0x4E00-0x9FA5
            char c = (char) (0x4E00 + random.nextInt(0x9FA5 - 0x4E00));
            sb.append(c);
        }
        return sb.toString();
    }
    
    /**
     * 生成包含表情符号的随机字符串
     */
    public static String randomEmojiString(int length) {
        StringBuilder sb = new StringBuilder(length * 2); // 表情符号可能占用多个字符
        String[] emojis = {"😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊",
                          "🔐", "🔑", "🔒", "🔓", "📝", "📄", "📃", "📋", "📊", "📈"};
        for (int i = 0; i < length; i++) {
            sb.append(emojis[random.nextInt(emojis.length)]);
        }
        return sb.toString();
    }
    
    // ==================== 密钥对生成 ====================
    
    /**
     * 密钥对测试数据封装类
     */
    public static class KeyPairTestData {
        public final ECPrivateKeyParameters privateKey;
        public final ECPublicKeyParameters publicKey;
        public final String privateKeyHex;
        public final String publicKeyXHex;
        public final String publicKeyYHex;
        public final int index; // 用于测试报告
        
        public KeyPairTestData(AsymmetricCipherKeyPair keyPair, int index) {
            this.privateKey = (ECPrivateKeyParameters) keyPair.getPrivate();
            this.publicKey = (ECPublicKeyParameters) keyPair.getPublic();
            this.privateKeyHex = privateKey.getD().toString(16).toUpperCase();
            
            ECPoint pubPoint = publicKey.getQ();
            this.publicKeyXHex = pubPoint.getAffineXCoord().toBigInteger().toString(16).toUpperCase();
            this.publicKeyYHex = pubPoint.getAffineYCoord().toBigInteger().toString(16).toUpperCase();
            this.index = index;
        }
        
        /**
         * Get private key in hex format (padded to 64 chars)
         */
        public String getPrivateKeyHex() {
            return String.format("%64s", privateKeyHex).replace(' ', '0');
        }
        
        /**
         * Get public key in uncompressed format (04 + x + y)
         */
        public String getPublicKeyHex() {
            String xPadded = String.format("%64s", publicKeyXHex).replace(' ', '0');
            String yPadded = String.format("%64s", publicKeyYHex).replace(' ', '0');
            return "04" + xPadded + yPadded;
        }
        
        @Override
        public String toString() {
            return String.format("KeyPair #%d (privKey: %s..., pubX: %s...)",
                index,
                privateKeyHex.substring(0, Math.min(16, privateKeyHex.length())),
                publicKeyXHex.substring(0, Math.min(16, publicKeyXHex.length())));
        }
    }
    
    /**
     * 生成单个随机SM2密钥对
     */
    public static KeyPairTestData randomKeyPair() {
        return randomKeyPair(0);
    }
    
    /**
     * 生成带索引的随机SM2密钥对
     */
    public static KeyPairTestData randomKeyPair(int index) {
        ECKeyPairGenerator generator = new ECKeyPairGenerator();
        generator.init(new ECKeyGenerationParameters(domainParams, random));
        AsymmetricCipherKeyPair keyPair = generator.generateKeyPair();
        return new KeyPairTestData(keyPair, index);
    }
    
    /**
     * 生成指定数量的密钥对集合
     */
    public static List<KeyPairTestData> generateKeyPairSet(int count) {
        List<KeyPairTestData> keyPairs = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            keyPairs.add(randomKeyPair(i + 1));
        }
        return keyPairs;
    }
    
    // ==================== 边界值生成 ====================
    
    /**
     * 边界值类型枚举
     */
    public enum BoundaryType {
        EMPTY,              // 空数组
        SINGLE_BYTE,        // 单字节
        BLOCK_SIZE_MINUS_1, // SM3块大小-1 (63 bytes)
        BLOCK_SIZE,         // SM3块大小 (64 bytes)
        BLOCK_SIZE_PLUS_1,  // SM3块大小+1 (65 bytes)
        DOUBLE_BLOCK_SIZE,  // 双块大小 (128 bytes)
        ALL_ZEROS,          // 全零
        ALL_ONES,           // 全1
        ALTERNATING         // 交替模式
    }
    
    /**
     * 根据边界类型生成测试数据
     */
    public static byte[] boundaryValue(BoundaryType type) {
        switch (type) {
            case EMPTY:
                return new byte[0];
            case SINGLE_BYTE:
                return new byte[]{(byte) 0x42};
            case BLOCK_SIZE_MINUS_1:
                return randomBytes(63);
            case BLOCK_SIZE:
                return randomBytes(64);
            case BLOCK_SIZE_PLUS_1:
                return randomBytes(65);
            case DOUBLE_BLOCK_SIZE:
                return randomBytes(128);
            case ALL_ZEROS:
                return zerosPattern(64);
            case ALL_ONES:
                return onesPattern(64);
            case ALTERNATING:
                return alternatingPattern(64);
            default:
                throw new IllegalArgumentException("Unknown boundary type: " + type);
        }
    }
    
    // ==================== SM3特定测试数据 ====================
    
    /**
     * SM3标准测试向量
     */
    public static class SM3TestVector {
        public final String input;
        public final String expectedHash;
        public final String description;
        
        public SM3TestVector(String input, String expectedHash, String description) {
            this.input = input;
            this.expectedHash = expectedHash;
            this.description = description;
        }
        
        @Override
        public String toString() {
            return description;
        }
    }
    
    /**
     * 获取SM3标准测试向量集合
     */
    public static List<SM3TestVector> getSM3StandardVectors() {
        List<SM3TestVector> vectors = new ArrayList<>();
        
        vectors.add(new SM3TestVector(
            "",
            "1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b",
            "Empty string"
        ));
        
        vectors.add(new SM3TestVector(
            "a",
            "623476ac18f65a2909e43c7fec61b49c7e764a91a18ccb82f1917a29c86c5e88",
            "Single character 'a'"
        ));
        
        vectors.add(new SM3TestVector(
            "abc",
            "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0",
            "String 'abc'"
        ));
        
        vectors.add(new SM3TestVector(
            "abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd",
            "debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732",
            "64-byte repeated 'abcd'"
        ));
        
        return vectors;
    }
    
    // ==================== 消息大小测试集 ====================
    
    /**
     * 获取各种消息大小用于参数化测试
     */
    public static int[] getMessageSizes() {
        return new int[]{
            0,      // 空消息
            1,      // 单字节
            32,     // 短消息
            55,     // 块大小边界附近
            63,     // 块大小 - 1
            64,     // 恰好一个块
            65,     // 块大小 + 1
            100,    // 中等消息
            128,    // 两个块
            256,    // 多个块
            512,    // 更多块
            1000,   // 1KB
            4096,   // 4KB
            10000   // 10KB
        };
    }
    
    /**
     * 获取SM2加密适用的消息大小（非空）
     */
    public static int[] getEncryptionMessageSizes() {
        return new int[]{
            1,      // 最小非空消息
            16,     // 短消息
            32,     // AES块大小
            64,     // 中等消息
            100,    // 常规消息
            256,    // 较大消息
            512,    // 大消息
            1000    // 接近最大消息
        };
    }
    
    // ==================== 工具方法 ====================
    
    /**
     * 将字节数组转换为十六进制字符串
     */
    public static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b & 0xFF));
        }
        return sb.toString();
    }
    
    /**
     * 将十六进制字符串转换为字节数组
     */
    public static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] bytes = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            bytes[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i + 1), 16));
        }
        return bytes;
    }
    
    /**
     * 计算两个十六进制字符串之间不同的比特数
     */
    public static int countDifferentBits(String hex1, String hex2) {
        if (hex1.length() != hex2.length()) {
            throw new IllegalArgumentException("Hex strings must have same length");
        }
        
        byte[] bytes1 = hexToBytes(hex1);
        byte[] bytes2 = hexToBytes(hex2);
        
        int diffBits = 0;
        for (int i = 0; i < bytes1.length; i++) {
            int xor = bytes1[i] ^ bytes2[i];
            // 计算xor结果中1的个数
            diffBits += Integer.bitCount(xor & 0xFF);
        }
        
        return diffBits;
    }
    
    /**
     * 生成随机的userId用于SM2签名
     */
    public static byte[] randomUserId() {
        int length = 1 + random.nextInt(32); // 1-32字节
        return randomBytes(length);
    }
    
    /**
     * 获取标准的默认userId
     */
    public static byte[] getDefaultUserId() {
        return "1234567812345678".getBytes(StandardCharsets.UTF_8);
    }
}
