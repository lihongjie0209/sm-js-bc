/**
 * 字节操作工具类
 * 
 * 参考: org.bouncycastle.util.Bytes
 */
export class Bytes {
  /**
   * 将源数组的指定长度与目标数组进行异或操作，结果存入目标数组
   * 
   * @param length 要异或的字节数
   * @param src 源数组
   * @param srcOff 源数组起始偏移量
   * @param dest 目标数组
   * @param destOff 目标数组起始偏移量
   */
  static xorTo(
    length: number,
    src: Uint8Array,
    srcOff: number,
    dest: Uint8Array,
    destOff: number
  ): void {
    for (let i = 0; i < length; i++) {
      dest[destOff + i] ^= src[srcOff + i];
    }
  }
}
