/**
 * Generic signer interface for digital signature algorithms.
 * 
 * This interface provides a standard API for signing and verification
 * operations, following the pattern used in Bouncy Castle Java.
 */

import { CipherParameters } from '../params/CipherParameters';

/**
 * Interface for digital signature algorithms.
 */
export interface Signer {
  /**
   * Initialize the signer for signing or verification.
   * 
   * @param forSigning - true for signing, false for verification
   * @param parameters - cipher parameters (keys, etc.)
   */
  init(forSigning: boolean, parameters: CipherParameters): void;

  /**
   * Update the signer with a single byte of data.
   * 
   * @param b - byte to add to the message being signed/verified
   */
  update(b: number): void;

  /**
   * Update the signer with a block of data.
   * 
   * @param input - input data array
   * @param offset - start offset in the input array
   * @param length - number of bytes to process
   */
  update(input: Uint8Array, offset: number, length: number): void;

  /**
   * Generate a signature for the data that has been updated.
   * The signer must be initialized for signing.
   * 
   * @returns the signature bytes
   * @throws Error if not initialized for signing
   */
  generateSignature(): Uint8Array;

  /**
   * Verify a signature against the data that has been updated.
   * The signer must be initialized for verification.
   * 
   * @param signature - signature to verify
   * @returns true if the signature is valid, false otherwise
   * @throws Error if not initialized for verification
   */
  verifySignature(signature: Uint8Array): boolean;

  /**
   * Reset the signer to its initial state.
   * This clears any buffered data but does not change the initialization.
   */
  reset(): void;

  /**
   * Get the algorithm name.
   * 
   * @returns algorithm name (e.g., "SM2", "ECDSA")
   */
  getAlgorithmName(): string;
}