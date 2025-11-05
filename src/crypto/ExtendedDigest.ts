import { Digest } from './Digest';

/**
 * 扩展的摘要接口，提供内部状态访问
 * 
 * 参考: org.bouncycastle.crypto.ExtendedDigest
 */
export interface ExtendedDigest extends Digest {
  /**
   * 获取内部块大小（字节）
   * @returns 块大小
   */
  getByteLength(): number;
}
