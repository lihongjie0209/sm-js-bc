/**
 * Key Derivation Function based on SM3.
 * 
 * Based on: org.bouncycastle.crypto.agreement.kdf.ECDHKEKGenerator
 */

import { SM3Digest } from '../digests/SM3Digest';

export class KDF {
  private readonly digest: SM3Digest;

  constructor() {
    this.digest = new SM3Digest();
  }

  /**
   * Derive key material from shared secret.
   * 
   * @param Z - Shared secret (x || y coordinates)
   * @param klen - Required key length in bytes
   * @returns Derived key material
   */
  deriveKey(Z: Uint8Array, klen: number): Uint8Array {
    const v = this.digest.getDigestSize();
    const K = new Uint8Array(klen);
    let ct = 1;
    let offset = 0;

    const hashBuf = new Uint8Array(v);

    while (offset < klen) {
      this.digest.reset();
      this.digest.updateArray(Z, 0, Z.length);
      
      // Add counter as 4 bytes big-endian
      const ctBytes = new Uint8Array([
        (ct >>> 24) & 0xff,
        (ct >>> 16) & 0xff,
        (ct >>> 8) & 0xff,
        ct & 0xff
      ]);
      this.digest.updateArray(ctBytes, 0, 4);

      this.digest.doFinal(hashBuf, 0);

      const copyLen = Math.min(klen - offset, v);
      K.set(hashBuf.subarray(0, copyLen), offset);

      offset += copyLen;
      ct++;
    }

    return K;
  }

  /**
   * Check if all bytes are zero (used in decryption).
   */
  static isZero(data: Uint8Array): boolean {
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) {
        return false;
      }
    }
    return true;
  }
}
