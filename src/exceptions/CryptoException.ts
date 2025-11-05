/**
 * 加密异常基类
 */
export class CryptoException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoException';
  }
}
