import { CryptoException } from './CryptoException';

/**
 * 无效密文异常
 * 当解密密文无效时抛出
 */
export class InvalidCipherTextException extends CryptoException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCipherTextException';
  }
}
