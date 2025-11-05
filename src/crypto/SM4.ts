import { SM4Engine } from './engines/SM4Engine';
import { KeyParameter } from './params/KeyParameter';
import { SecureRandom } from '../util/SecureRandom';

/**
 * SM4 高级 API - 提供便捷的加密/解密接口
 * 
 * SM4 是一个 128 位分组密码算法，使用 128 位密钥
 * 
 * 标准: GB/T 32907-2016
 * 
 * @example
 * ```typescript
 * // 生成密钥
 * const key = SM4.generateKey();
 * 
 * // 加密数据（ECB模式）
 * const plaintext = new TextEncoder().encode('Hello, SM4!');
 * const ciphertext = SM4.encrypt(plaintext, key);
 * 
 * // 解密数据
 * const decrypted = SM4.decrypt(ciphertext, key);
 * const message = new TextDecoder().decode(decrypted);
 * ```
 */
export class SM4 {
  private static readonly KEY_SIZE = 16; // 128位 = 16字节
  private static readonly BLOCK_SIZE = 16; // 128位 = 16字节

  /**
   * 生成随机的 SM4 密钥（128位）
   * 
   * @returns 16字节的随机密钥
   */
  public static generateKey(): Uint8Array {
    const random = new SecureRandom();
    return random.generateSeed(SM4.KEY_SIZE);
  }

  /**
   * 加密数据（ECB模式，PKCS7填充）
   * 
   * 注意：ECB模式不安全，仅用于演示和兼容性测试。
   * 生产环境请使用 CBC、CTR 或 GCM 模式。
   * 
   * @param plaintext - 明文数据
   * @param key - 128位密钥
   * @returns 密文数据（包含填充）
   */
  public static encrypt(plaintext: Uint8Array, key: Uint8Array): Uint8Array {
    if (key.length !== SM4.KEY_SIZE) {
      throw new Error('SM4 requires a 128 bit (16 byte) key');
    }

    // 应用 PKCS7 填充
    const paddedData = SM4.pkcs7Padding(plaintext, SM4.BLOCK_SIZE);

    // 创建引擎并初始化
    const engine = new SM4Engine();
    engine.init(true, new KeyParameter(key));

    // 加密所有块
    const ciphertext = new Uint8Array(paddedData.length);
    for (let i = 0; i < paddedData.length; i += SM4.BLOCK_SIZE) {
      engine.processBlock(paddedData, i, ciphertext, i);
    }

    return ciphertext;
  }

  /**
   * 解密数据（ECB模式，PKCS7填充）
   * 
   * @param ciphertext - 密文数据
   * @param key - 128位密钥
   * @returns 明文数据（已移除填充）
   */
  public static decrypt(ciphertext: Uint8Array, key: Uint8Array): Uint8Array {
    if (key.length !== SM4.KEY_SIZE) {
      throw new Error('SM4 requires a 128 bit (16 byte) key');
    }

    if (ciphertext.length % SM4.BLOCK_SIZE !== 0) {
      throw new Error('Ciphertext length must be a multiple of block size (16 bytes)');
    }

    // 创建引擎并初始化
    const engine = new SM4Engine();
    engine.init(false, new KeyParameter(key));

    // 解密所有块
    const paddedData = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i += SM4.BLOCK_SIZE) {
      engine.processBlock(ciphertext, i, paddedData, i);
    }

    // 移除 PKCS7 填充
    return SM4.pkcs7Unpadding(paddedData);
  }

  /**
   * 加密单个块（无填充）
   * 
   * 适用于需要直接控制加密过程的场景。
   * 输入数据必须正好是 16 字节。
   * 
   * @param block - 16字节的数据块
   * @param key - 128位密钥
   * @returns 16字节的加密块
   */
  public static encryptBlock(block: Uint8Array, key: Uint8Array): Uint8Array {
    if (block.length !== SM4.BLOCK_SIZE) {
      throw new Error('Block must be exactly 16 bytes');
    }

    if (key.length !== SM4.KEY_SIZE) {
      throw new Error('SM4 requires a 128 bit (16 byte) key');
    }

    const engine = new SM4Engine();
    engine.init(true, new KeyParameter(key));

    const output = new Uint8Array(SM4.BLOCK_SIZE);
    engine.processBlock(block, 0, output, 0);

    return output;
  }

  /**
   * 解密单个块（无填充）
   * 
   * @param block - 16字节的加密块
   * @param key - 128位密钥
   * @returns 16字节的明文块
   */
  public static decryptBlock(block: Uint8Array, key: Uint8Array): Uint8Array {
    if (block.length !== SM4.BLOCK_SIZE) {
      throw new Error('Block must be exactly 16 bytes');
    }

    if (key.length !== SM4.KEY_SIZE) {
      throw new Error('SM4 requires a 128 bit (16 byte) key');
    }

    const engine = new SM4Engine();
    engine.init(false, new KeyParameter(key));

    const output = new Uint8Array(SM4.BLOCK_SIZE);
    engine.processBlock(block, 0, output, 0);

    return output;
  }

  /**
   * PKCS7 填充
   * 
   * @param data - 原始数据
   * @param blockSize - 块大小
   * @returns 填充后的数据
   */
  private static pkcs7Padding(data: Uint8Array, blockSize: number): Uint8Array {
    const paddingLength = blockSize - (data.length % blockSize);
    const paddedData = new Uint8Array(data.length + paddingLength);
    paddedData.set(data);
    
    // 填充字节的值等于填充长度
    for (let i = data.length; i < paddedData.length; i++) {
      paddedData[i] = paddingLength;
    }

    return paddedData;
  }

  /**
   * 移除 PKCS7 填充
   * 
   * @param data - 填充后的数据
   * @returns 原始数据
   */
  private static pkcs7Unpadding(data: Uint8Array): Uint8Array {
    if (data.length === 0) {
      throw new Error('Cannot unpad empty data');
    }

    const paddingLength = data[data.length - 1];

    // 验证填充
    if (paddingLength < 1 || paddingLength > SM4.BLOCK_SIZE) {
      throw new Error('Invalid padding');
    }

    // 检查所有填充字节是否正确
    for (let i = data.length - paddingLength; i < data.length; i++) {
      if (data[i] !== paddingLength) {
        throw new Error('Invalid padding');
      }
    }

    return data.slice(0, data.length - paddingLength);
  }
}
