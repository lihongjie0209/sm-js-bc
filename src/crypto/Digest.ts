/**
 * 消息摘要算法的基础接口
 * 
 * 参考: org.bouncycastle.crypto.Digest
 */
export interface Digest {
  /**
   * 获取算法名称
   * @returns 算法名称
   */
  getAlgorithmName(): string;

  /**
   * 获取摘要输出的字节长度
   * @returns 摘要长度（字节）
   */
  getDigestSize(): number;

  /**
   * 更新摘要，添加单个字节
   * @param input 输入字节
   */
  update(input: number): void;

  /**
   * 更新摘要，添加字节数组
   * @param input 输入字节数组
   * @param offset 起始偏移量
   * @param length 数据长度
   */
  updateArray(input: Uint8Array, offset: number, length: number): void;

  /**
   * 完成摘要计算，输出结果
   * @param out 输出缓冲区
   * @param outOffset 输出起始位置
   * @returns 写入的字节数
   */
  doFinal(out: Uint8Array, outOffset: number): number;

  /**
   * 重置摘要状态
   */
  reset(): void;
}
