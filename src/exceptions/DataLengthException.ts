import { CryptoException } from './CryptoException';

/**
 * 数据长度异常
 * 当输入数据长度不正确时抛出
 */
export class DataLengthException extends CryptoException {
  constructor(message: string) {
    super(message);
    this.name = 'DataLengthException';
  }
}
