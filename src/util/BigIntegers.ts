/**
 * 大整数工具类
 * 
 * 参考: org.bouncycastle.util.BigIntegers
 */
export class BigIntegers {
  static readonly ZERO = 0n;

  /**
   * 将 BigInt 转换为无符号字节数组（大端序），指定长度
   * 
   * @param length 字节数组长度
   * @param value BigInt 值
   * @returns 字节数组
   */
  static asUnsignedByteArray(length: number, value: bigint): Uint8Array {
    const bytes = new Uint8Array(length);
    
    // 从低字节到高字节填充
    for (let i = length - 1; i >= 0; i--) {
      bytes[i] = Number(value & 0xffn);
      value >>= 8n;
    }
    
    return bytes;
  }

  /**
   * 将无符号字节数组转换为 BigInt（大端序）
   * 
   * @param bytes 字节数组
   * @returns BigInt 值
   */
  static fromUnsignedByteArray(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
  }

  /**
   * 创建指定位长度的随机 BigInt
   * 
   * @param bitLength 位长度
   * @param random 随机数生成器（提供 nextBytes 方法）
   * @returns 随机 BigInt
   */
  static createRandomBigInteger(
    bitLength: number,
    random: { nextBytes(bytes: Uint8Array): void }
  ): bigint {
    const byteLength = Math.ceil(bitLength / 8);
    const bytes = new Uint8Array(byteLength);
    random.nextBytes(bytes);

    // 清除超出 bitLength 的高位
    const excessBits = byteLength * 8 - bitLength;
    if (excessBits > 0) {
      bytes[0] &= (1 << (8 - excessBits)) - 1;
    }

    return BigIntegers.fromUnsignedByteArray(bytes);
  }

  /**
   * 计算模逆（当模数为奇数时）
   * 
   * @param mod 模数
   * @param value 值
   * @returns 模逆
   */
  static modOddInverse(mod: bigint, value: bigint): bigint {
    // 使用扩展欧几里得算法
    return BigIntegers.modInverse(value, mod);
  }

  /**
   * 计算模逆（通用方法）
   * 
   * @param a 值
   * @param m 模数
   * @returns 模逆
   */
  private static modInverse(a: bigint, m: bigint): bigint {
    a = ((a % m) + m) % m;
    
    if (a === 0n) {
      throw new Error('No modular inverse exists');
    }

    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
      const quotient = old_r / r;
      [old_r, r] = [r, old_r - quotient * r];
      [old_s, s] = [s, old_s - quotient * s];
    }

    if (old_r !== 1n) {
      throw new Error('No modular inverse exists');
    }

    return ((old_s % m) + m) % m;
  }

  /**
   * 计算模幂：(base^exponent) mod m
   * 使用快速幂算法（二进制方法）
   * 
   * @param base 底数
   * @param exponent 指数
   * @param m 模数
   * @returns 模幂结果
   */
  static modPow(base: bigint, exponent: bigint, m: bigint): bigint {
    if (m === 1n) return 0n;
    if (exponent === 0n) return 1n;
    if (exponent === 1n) return ((base % m) + m) % m;

    // 处理负指数
    if (exponent < 0n) {
      base = BigIntegers.modInverse(base, m);
      exponent = -exponent;
    }

    // 快速幂算法
    let result = 1n;
    base = ((base % m) + m) % m;

    while (exponent > 0n) {
      if (exponent & 1n) {
        result = (result * base) % m;
      }
      base = (base * base) % m;
      exponent >>= 1n;
    }

    return result;
  }

  /**
   * 获取 BigInt 的位长度（最高位1的位置+1）
   * 
   * @param value BigInt 值
   * @returns 位长度
   */
  static bitLength(value: bigint): number {
    if (value === 0n) return 0;
    
    // 处理负数
    if (value < 0n) {
      value = -value;
    }

    let bitLen = 0;
    while (value > 0n) {
      bitLen++;
      value >>= 1n;
    }
    return bitLen;
  }

  /**
   * 测试指定位是否为1
   * 
   * @param value BigInt 值
   * @param n 位索引（从0开始，0表示最低位）
   * @returns 如果第n位为1返回true，否则返回false
   */
  static testBit(value: bigint, n: number): boolean {
    if (n < 0) {
      throw new Error('Bit index must be non-negative');
    }
    
    // 处理负数（二进制补码表示）
    if (value < 0n) {
      // 对于负数，使用补码规则
      value = -value - 1n;
      return ((value >> BigInt(n)) & 1n) === 0n;
    }
    
    return ((value >> BigInt(n)) & 1n) === 1n;
  }

  /**
   * 计算 Legendre 符号 (a/p)
   * 用于判断 a 是否为模 p 的二次剩余
   * 
   * @param a 值
   * @param p 奇素数
   * @returns 1 如果 a 是二次剩余, -1 如果不是, 0 如果 a ≡ 0 (mod p)
   */
  static legendreSymbol(a: bigint, p: bigint): number {
    a = ((a % p) + p) % p;
    
    if (a === 0n) return 0;
    if (a === 1n) return 1;
    
    // 使用欧拉判别法: a^((p-1)/2) mod p
    const result = BigIntegers.modPow(a, (p - 1n) / 2n, p);
    
    if (result === 1n) return 1;
    if (result === p - 1n) return -1; // p-1 ≡ -1 (mod p)
    return 0;
  }

  /**
   * 获取 BigInt 的字节长度
   * 
   * @param value BigInt 值
   * @returns 字节长度
   */
  static byteLength(value: bigint): number {
    const bitLen = BigIntegers.bitLength(value);
    return Math.ceil(bitLen / 8);
  }

  /**
   * 设置指定位为1
   * 
   * @param value BigInt 值
   * @param n 位索引（从0开始）
   * @returns 设置后的值
   */
  static setBit(value: bigint, n: number): bigint {
    if (n < 0) {
      throw new Error('Bit index must be non-negative');
    }
    return value | (1n << BigInt(n));
  }

  /**
   * 清除指定位为0
   * 
   * @param value BigInt 值
   * @param n 位索引（从0开始）
   * @returns 清除后的值
   */
  static clearBit(value: bigint, n: number): bigint {
    if (n < 0) {
      throw new Error('Bit index must be non-negative');
    }
    return value & ~(1n << BigInt(n));
  }

  /**
   * 翻转指定位
   * 
   * @param value BigInt 值
   * @param n 位索引（从0开始）
   * @returns 翻转后的值
   */
  static flipBit(value: bigint, n: number): bigint {
    if (n < 0) {
      throw new Error('Bit index must be non-negative');
    }
    return value ^ (1n << BigInt(n));
  }

  /**
   * 获取最低的n位
   * 
   * @param value BigInt 值
   * @param n 位数
   * @returns 最低n位的值
   */
  static getLowestBits(value: bigint, n: number): bigint {
    if (n < 0) {
      throw new Error('Bit count must be non-negative');
    }
    if (n === 0) return 0n;
    return value & ((1n << BigInt(n)) - 1n);
  }
}
