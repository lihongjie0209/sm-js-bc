/**
 * 安全随机数生成器
 * 使用 Web Crypto API（浏览器和现代Node.js）
 * 
 * 参考: java.security.SecureRandom
 */
export class SecureRandom {
  /**
   * 生成随机字节填充到指定数组
   * @param bytes 要填充的字节数组
   */
  nextBytes(bytes: Uint8Array): void {
    // 优先使用Web Crypto API（浏览器和Node.js 15.0.0+都支持）
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
      return;
    }

    // 检查全局crypto对象（Node.js环境）
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
      (globalThis as any).crypto.getRandomValues(bytes);
      return;
    }

    // 最后的备选方案（不推荐用于生产环境）
    console.warn('Using Math.random() for random number generation. This is NOT cryptographically secure!');
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  /**
   * 生成指定长度的随机字节数组
   * @param length 字节数
   * @returns 随机字节数组
   */
  generateSeed(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    this.nextBytes(bytes);
    return bytes;
  }
}
