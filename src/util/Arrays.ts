/**
 * 数组操作工具类
 * 
 * 参考: org.bouncycastle.util.Arrays
 */
export class Arrays {
  /**
   * 连接多个字节数组
   * @param arrays 要连接的字节数组
   * @returns 连接后的字节数组
   */
  static concatenate(...arrays: Uint8Array[]): Uint8Array {
    let totalLength = 0;
    for (const array of arrays) {
      totalLength += array.length;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array of arrays) {
      result.set(array, offset);
      offset += array.length;
    }

    return result;
  }

  /**
   * 用指定值填充数组
   * @param array 要填充的数组
   * @param value 填充值
   */
  static fill(array: Uint8Array, value: number): void {
    array.fill(value);
  }

  /**
   * 比较两个字节数组是否相等
   * @param a 第一个数组
   * @param b 第二个数组
   * @returns 数组是否相等
   */
  static areEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 常时间比较两个字节数组是否相等（抗时序攻击）
   * @param a 第一个数组
   * @param b 第二个数组
   * @returns 数组是否相等
   */
  static constantTimeAreEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }

  /**
   * 复制数组的指定范围
   * @param source 源数组
   * @param from 起始位置
   * @param to 结束位置（不包含）
   * @returns 新数组
   */
  static copyOfRange(source: Uint8Array, from: number, to: number): Uint8Array {
    const length = to - from;
    const result = new Uint8Array(length);
    result.set(source.subarray(from, to));
    return result;
  }
}
