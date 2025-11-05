/**
 * Interface for calculating k values used in DSA-style signatures.
 * 
 * The k value is a critical component in DSA signatures that must be
 * cryptographically random and unique for each signature to maintain
 * security. This interface abstracts the k generation process.
 * 
 * Based on: org.bouncycastle.crypto.signers.DSAKCalculator
 */

import { SecureRandom } from '../../util/SecureRandom';

/**
 * Interface for DSA k value calculation.
 */
export interface DSAKCalculator {
  /**
   * Initialize the calculator with the domain parameters.
   * 
   * @param n - the order of the base point (curve order)
   * @param random - secure random number generator
   */
  init(n: bigint, random: SecureRandom): void;

  /**
   * Calculate the next k value for signature generation.
   * 
   * @returns a cryptographically secure random k value where 1 <= k < n
   */
  nextK(): bigint;

  /**
   * Check if the calculator has been properly initialized.
   * 
   * @returns true if initialized, false otherwise
   */
  isDeterministic(): boolean;
}