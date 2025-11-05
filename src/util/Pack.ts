/**
 * 字节打包和解包工具类
 * 用于处理大端序（Big Endian）的整数和字节数组转换
 * 
 * 参考: org.bouncycastle.util.Pack
 */
export class Pack {
  /**
   * 将字节数组转换为 32 位整数（大端序）
   * 
   * @param bytes 字节数组
   * @param offset 起始偏移量
   * @returns 32位整数
   */
  static bigEndianToInt(bytes: Uint8Array, offset: number): number {
    let n = bytes[offset] << 24;
    n |= (bytes[offset + 1] & 0xff) << 16;
    n |= (bytes[offset + 2] & 0xff) << 8;
    n |= bytes[offset + 3] & 0xff;
    return n;
  }

  /**
   * 将 32 位整数转换为字节数组（大端序）
   * 
   * @param value 32位整数
   * @param bytes 目标字节数组
   * @param offset 起始偏移量
   */
  static intToBigEndian(value: number, bytes: Uint8Array, offset: number): void {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
  }

  /**
   * 将字节数组转换为 64 位整数（大端序）
   * 
   * @param bytes 字节数组
   * @param offset 起始偏移量
   * @returns 64位大整数
   */
  static bigEndianToLong(bytes: Uint8Array, offset: number): bigint {
    const hi = Pack.bigEndianToInt(bytes, offset);
    const lo = Pack.bigEndianToInt(bytes, offset + 4);
    // 确保使用无符号转换，避免符号扩展问题
    return (BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0);
  }

  /**
   * 将 64 位整数转换为字节数组（大端序）
   * 
   * @param value 64位大整数
   * @param bytes 目标字节数组
   * @param offset 起始偏移量
   */
  static longToBigEndian(value: bigint, bytes: Uint8Array, offset: number): void {
    const hi = Number((value >> 32n) & 0xffffffffn);
    const lo = Number(value & 0xffffffffn);
    Pack.intToBigEndian(hi, bytes, offset);
    Pack.intToBigEndian(lo, bytes, offset + 4);
  }
}
