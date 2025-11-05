import { BlockCipherPadding } from './BlockCipherPadding';

/**
 * PKCS7 Padding - pads with the number of padding bytes.
 * 
 * 参考: org.bouncycastle.crypto.paddings.PKCS7Padding
 */
export class PKCS7Padding implements BlockCipherPadding {
  public init(random?: any): void {
    // No initialization required
  }

  public getPaddingName(): string {
    return 'PKCS7';
  }

  public addPadding(input: Uint8Array, inOff: number): number {
    const code = input.length - inOff;

    while (inOff < input.length) {
      input[inOff] = code;
      inOff++;
    }

    return code;
  }

  public padCount(input: Uint8Array): number {
    const count = input[input.length - 1] & 0xff;

    if (count > input.length || count === 0) {
      throw new Error('Invalid PKCS7 padding');
    }

    for (let i = 1; i <= count; i++) {
      if (input[input.length - i] !== count) {
        throw new Error('Invalid PKCS7 padding');
      }
    }

    return count;
  }
}
