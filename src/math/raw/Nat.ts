/**
 * Utility functions for natural number (non-negative BigInteger) operations.
 * Implements conversion to/from little-endian int arrays.
 */
export class Nat {
  /**
   * Convert a BigInteger to a little-endian int array.
   * @param bitLength The bit length to use (will create enough 32-bit words)
   * @param value The BigInteger value to convert
   * @returns A little-endian int array where each element is a 32-bit unsigned integer
   */
  static fromBigInteger(bitLength: number, value: bigint): number[] {
    if (value < 0n) {
      throw new Error('Value cannot be negative');
    }
    
    if (value === 0n) {
      const len = (bitLength + 31) >>> 5;
      return new Array(len).fill(0);
    }

    // Calculate how many 32-bit words we need
    const len = (bitLength + 31) >>> 5;
    const result = new Array(len).fill(0);

    // Extract 32-bit chunks in little-endian order
    for (let i = 0; i < len; i++) {
      result[i] = Number(value & 0xFFFFFFFFn);
      value = value >> 32n;
    }

    return result;
  }

  /**
   * Convert a little-endian int array to a BigInteger.
   * @param arr The little-endian int array
   * @returns The BigInteger value
   */
  static toBigInteger(arr: number[]): bigint {
    let result = 0n;
    for (let i = arr.length - 1; i >= 0; i--) {
      result = (result << 32n) | BigInt(arr[i] >>> 0);
    }
    return result;
  }

  /**
   * Get a specific bit from the int array.
   * @param arr The int array
   * @param bitIndex The bit index (0-based, little-endian)
   * @returns 1 if the bit is set, 0 otherwise
   */
  static getBit(arr: number[], bitIndex: number): number {
    const wordIndex = bitIndex >>> 5;
    const bitOffset = bitIndex & 0x1F;
    if (wordIndex >= arr.length) {
      return 0;
    }
    return (arr[wordIndex] >>> bitOffset) & 1;
  }
}
