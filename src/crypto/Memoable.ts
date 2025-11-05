/**
 * 支持状态保存和恢复的可记忆对象接口
 * 
 * 参考: org.bouncycastle.util.Memoable
 */
export interface Memoable {
  /**
   * 生成当前对象的独立副本
   * @returns 对象的副本
   */
  copy(): Memoable;

  /**
   * 从另一个对象恢复状态
   * @param other 要恢复状态的源对象
   */
  resetFromMemoable(other: Memoable): void;
}
