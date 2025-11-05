import { Pack } from '../../../util/Pack';

/**
 * Utility functions for GCM mode.
 * Implements Galois field arithmetic for GCM authentication.
 * 
 * @see BouncyCastle GCMUtil.java
 */
export class GCMUtil {
  static readonly BLOCK_SIZE = 16;
  
  private static readonly E1 = 0xe1000000;
  private static readonly E1L = BigInt(GCMUtil.E1) << 32n;
  
  /**
   * XOR two blocks.
   */
  static xor(block: Uint8Array, val: Uint8Array): void {
    for (let i = 0; i < 16; i++) {
      block[i] ^= val[i];
    }
  }
  
  /**
   * Convert bytes to two 64-bit integers (big-endian).
   */
  static asLongs(x: Uint8Array): [bigint, bigint] {
    const x0 = Pack.bigEndianToLong(x, 0);
    const x1 = Pack.bigEndianToLong(x, 8);
    return [x0, x1];
  }
  
  /**
   * Convert two 64-bit integers to bytes (big-endian).
   */
  static fromLongs(x0: bigint, x1: bigint): Uint8Array {
    const result = new Uint8Array(16);
    Pack.longToBigEndian(x0, result, 0);
    Pack.longToBigEndian(x1, result, 8);
    return result;
  }
  
  /**
   * Galois field multiplication in GF(2^128).
   * Multiplies two 128-bit blocks.
   * 
   * This implements the algorithm from BouncyCastle's GCMUtil.java multiply(byte[] x, byte[] y) method.
   * Using byte array processing instead of long arrays to avoid bigint signed/unsigned issues.
   */
  static multiply(xBytes: Uint8Array, yBytes: Uint8Array): Uint8Array {
    // Convert to 32-bit int arrays (4 ints = 128 bits)
    const x = new Array<number>(4);
    const y = new Array<number>(4);
    
    for (let i = 0; i < 4; i++) {
      const offset = i * 4;
      x[i] = (xBytes[offset] << 24) | (xBytes[offset + 1] << 16) | (xBytes[offset + 2] << 8) | xBytes[offset + 3];
      y[i] = (yBytes[offset] << 24) | (yBytes[offset + 1] << 16) | (yBytes[offset + 2] << 8) | yBytes[offset + 3];
    }
    
    let y0 = y[0], y1 = y[1], y2 = y[2], y3 = y[3];
    let z0 = 0, z1 = 0, z2 = 0, z3 = 0;
    
    // Process each bit of x
    for (let i = 0; i < 4; ++i) {
      let bits = x[i];
      for (let j = 0; j < 32; ++j) {
        const m1 = bits >> 31; // Arithmetic shift: -1 if MSB set, 0 otherwise
        bits <<= 1;
        z0 ^= (y0 & m1);
        z1 ^= (y1 & m1);
        z2 ^= (y2 & m1);
        z3 ^= (y3 & m1);
        
        // Shift y right with reduction polynomial
        const m2 = (y3 << 31) >> 8; // Extract bit for reduction
        y3 = (y3 >>> 1) | (y2 << 31);
        y2 = (y2 >>> 1) | (y1 << 31);
        y1 = (y1 >>> 1) | (y0 << 31);
        y0 = (y0 >>> 1) ^ (m2 & GCMUtil.E1);
      }
    }
    
    // Convert result back to bytes
    const result = new Uint8Array(16);
    for (let i = 0; i < 4; i++) {
      const val = [z0, z1, z2, z3][i];
      const offset = i * 4;
      result[offset] = (val >>> 24) & 0xff;
      result[offset + 1] = (val >>> 16) & 0xff;
      result[offset + 2] = (val >>> 8) & 0xff;
      result[offset + 3] = val & 0xff;
    }
    
    return result;
  }
  
  /**
   * Increment the rightmost 32 bits of a counter block.
   */
  static increment(counter: Uint8Array): void {
    let c = 1;
    for (let i = 15; i >= 12; i--) {
      c += counter[i] & 0xff;
      counter[i] = c & 0xff;
      c >>>= 8;
    }
  }
}
