/**
 * Utility functions for integer operations.
 * Provides bit manipulation and other integer utilities similar to Java's Integer class.
 */
export class Integers {
  /**
   * Returns the number of zero bits preceding the highest-order ("leftmost")
   * one-bit in the two's complement binary representation of the specified number.
   * Returns 32 if the number is zero.
   * 
   * @param i - the value whose number of leading zero bits to compute
   * @returns the number of zero bits preceding the highest-order one-bit (0-32)
   */
  static numberOfLeadingZeros(i: number): number {
    // Convert to 32-bit integer
    i = i | 0;
    
    if (i === 0) {
      return 32;
    }
    
    let n = 1;
    if (i >>> 16 === 0) { n += 16; i <<= 16; }
    if (i >>> 24 === 0) { n +=  8; i <<=  8; }
    if (i >>> 28 === 0) { n +=  4; i <<=  4; }
    if (i >>> 30 === 0) { n +=  2; i <<=  2; }
    n -= i >>> 31;
    
    return n;
  }

  /**
   * Returns the number of one-bits in the two's complement binary representation
   * of the specified number.
   * 
   * @param i - the value whose bits to count
   * @returns the number of one-bits
   */
  static bitCount(i: number): number {
    // Convert to 32-bit integer
    i = i | 0;
    
    // Brian Kernighan's algorithm
    i = i - ((i >>> 1) & 0x55555555);
    i = (i & 0x33333333) + ((i >>> 2) & 0x33333333);
    i = (i + (i >>> 4)) & 0x0f0f0f0f;
    i = i + (i >>> 8);
    i = i + (i >>> 16);
    return i & 0x3f;
  }

  /**
   * Returns the value obtained by rotating the two's complement binary representation
   * of the specified number left by the specified number of bits.
   * 
   * @param i - the value whose bits to rotate left
   * @param distance - the number of bit positions to rotate by
   * @returns the value obtained by rotating left
   */
  static rotateLeft(i: number, distance: number): number {
    // Convert to 32-bit integer
    i = i | 0;
    distance = distance & 31; // Only use lower 5 bits
    
    return (i << distance) | (i >>> (32 - distance));
  }

  /**
   * Returns the value obtained by rotating the two's complement binary representation
   * of the specified number right by the specified number of bits.
   * 
   * @param i - the value whose bits to rotate right
   * @param distance - the number of bit positions to rotate by
   * @returns the value obtained by rotating right
   */
  static rotateRight(i: number, distance: number): number {
    // Convert to 32-bit integer
    i = i | 0;
    distance = distance & 31; // Only use lower 5 bits
    
    return (i >>> distance) | (i << (32 - distance));
  }

  /**
   * Returns the number of zero bits following the lowest-order ("rightmost")
   * one-bit in the two's complement binary representation of the specified number.
   * Returns 32 if the number is zero.
   * 
   * @param i - the value whose number of trailing zero bits to compute
   * @returns the number of zero bits following the lowest-order one-bit (0-32)
   */
  static numberOfTrailingZeros(i: number): number {
    // Convert to 32-bit integer
    i = i | 0;
    
    if (i === 0) {
      return 32;
    }
    
    let n = 31;
    let y = i << 16; if (y !== 0) { n -= 16; i = y; }
    y = i << 8;  if (y !== 0) { n -=  8; i = y; }
    y = i << 4;  if (y !== 0) { n -=  4; i = y; }
    y = i << 2;  if (y !== 0) { n -=  2; i = y; }
    return n - ((i << 1) >>> 31);
  }

  /**
   * Returns the highest one bit of the specified number.
   * 
   * @param i - the value whose highest one bit to compute
   * @returns the highest one bit, or 0 if i is 0
   */
  static highestOneBit(i: number): number {
    // Convert to 32-bit integer
    i = i | 0;
    
    i |= (i >> 1);
    i |= (i >> 2);
    i |= (i >> 4);
    i |= (i >> 8);
    i |= (i >> 16);
    return i - (i >>> 1);
  }

  /**
   * Returns the lowest one bit of the specified number.
   * 
   * @param i - the value whose lowest one bit to compute
   * @returns the lowest one bit, or 0 if i is 0
   */
  static lowestOneBit(i: number): number {
    // Convert to 32-bit integer
    i = i | 0;
    
    return i & -i;
  }
}
