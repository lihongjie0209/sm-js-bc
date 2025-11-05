/**
 * DSA signature encoding interface.
 * 
 * This interface defines how DSA-style signatures (r, s) are encoded
 * and decoded to/from byte arrays. Different encodings may be used
 * (e.g., ASN.1 DER, raw concatenation, etc.).
 * 
 * Based on: org.bouncycastle.crypto.signers.DSAEncoding
 */

/**
 * Interface for encoding/decoding DSA-style signatures.
 */
export interface DSAEncoding {
  /**
   * Encode the (r, s) signature components into a byte array.
   * 
   * @param n - the order of the base point of the curve
   * @param r - the r component of the signature
   * @param s - the s component of the signature
   * @returns encoded signature bytes
   * @throws Error if encoding fails
   */
  encode(n: bigint, r: bigint, s: bigint): Uint8Array;

  /**
   * Decode signature bytes into (r, s) components.
   * 
   * @param n - the order of the base point of the curve
   * @param encoding - encoded signature bytes
   * @returns tuple containing [r, s] components
   * @throws Error if decoding fails or signature is invalid
   */
  decode(n: bigint, encoding: Uint8Array): [bigint, bigint];
}