import { BlockCipherPadding } from './BlockCipherPadding';

/**
 * Zero Byte Padding - pads with zeros.
 * 
 * 参考: org.bouncycastle.crypto.paddings.ZeroBytePadding
 */
export class ZeroBytePadding implements BlockCipherPadding {
  public init(random?: any): void {
    // No initialization required
  }

  public getPaddingName(): string {
    return 'ZeroBytePadding';
  }

  public addPadding(input: Uint8Array, inOff: number): number {
    const added = input.length - inOff;

    while (inOff < input.length) {
      input[inOff] = 0;
      inOff++;
    }

    return added;
  }

  public padCount(input: Uint8Array): number {
    let count = input.length;

    while (count > 0 && input[count - 1] === 0) {
      count--;
    }

    return input.length - count;
  }
}
