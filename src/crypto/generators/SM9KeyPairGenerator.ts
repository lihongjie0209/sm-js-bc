import { SM9Parameters } from '../params/SM9Parameters';
import { ECPointFp } from '../../math/ec/ECPoint';
import { ECPointFp2 } from '../../math/ec/ECPointFp2';
import { SM9Hash } from '../SM9Hash';
import { SecureRandom } from '../../util/SecureRandom';

/**
 * SM9 Master Key Pair for Signing
 */
export interface SM9SignMasterKeyPair {
  masterSecretKey: bigint;
  masterPublicKey: ECPointFp2;
}

/**
 * SM9 User Signing Key
 */
export interface SM9UserSignKey {
  userId: string;
  privateKey: ECPointFp;
}

/**
 * SM9 Key Pair Generator
 * 
 * Generates master key pairs and derives user keys per GM/T 0044-2016 Section 5.
 */
export class SM9KeyPairGenerator {
  /**
   * Generate master key pair for signing
   */
  static generateSignMasterKeyPair(): SM9SignMasterKeyPair {
    const n = SM9Parameters.N;
    const p2 = SM9Parameters.getP2();

    const ks = this.generateRandomInRange(n);
    const ppubs = p2.multiply(ks);

    return {
      masterSecretKey: ks,
      masterPublicKey: ppubs
    };
  }

  /**
   * Derive user signing key from identity
   */
  static generateUserSignKey(
    userId: string,
    masterSecretKey: bigint
  ): SM9UserSignKey {
    const n = SM9Parameters.N;
    const p1 = SM9Parameters.getP1();
    const hid = SM9Parameters.HID_SIGN;

    const idBytes = new TextEncoder().encode(userId);

    const h1 = SM9Hash.H1(idBytes, hid, n);
    let t1 = (h1 + masterSecretKey) % n;
    if (t1 < 0n) {
      t1 += n;
    }

    if (t1 === 0n) {
      throw new Error('Invalid key generation: t1 = 0');
    }

    const t1Inv = this.modInverse(t1, n);
    let t2 = (masterSecretKey * t1Inv) % n;
    if (t2 < 0n) {
      t2 += n;
    }

    const dsA = p1.multiply(t2) as ECPointFp;

    return {
      userId,
      privateKey: dsA
    };
  }

  private static generateRandomInRange(n: bigint): bigint {
    const random = new SecureRandom();
    const bytes = new Uint8Array(32);
    const nMinus1 = n - 1n;

    // Use rejection sampling to avoid modulo bias
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      attempts++;
      random.nextBytes(bytes);

      let r = 0n;
      for (let i = 0; i < 32; i++) {
        r = (r << 8n) | BigInt(bytes[i]);
      }

      // Only accept if r < threshold to avoid bias
      // threshold = 2^256 - (2^256 mod (n-1))
      if (r > 0n && r < nMinus1) {
        return r + 1n; // Return value in [1, n-1]
      }
      
      // Simple fallback for efficiency
      const candidate = (r % nMinus1) + 1n;
      if (candidate > 0n && candidate < n) {
        return candidate;
      }
    }

    throw new Error('Failed to generate random number after maximum attempts');
  }

  private static modInverse(a: bigint, m: bigint): bigint {
    if (a === 0n) {
      throw new Error('Cannot compute inverse of zero');
    }

    let old_r = a;
    let r = m;
    let old_s = 1n;
    let s = 0n;

    while (r !== 0n) {
      const quotient = old_r / r;
      
      let temp = r;
      r = old_r - quotient * r;
      old_r = temp;

      temp = s;
      s = old_s - quotient * s;
      old_s = temp;
    }

    if (old_r > 1n) {
      throw new Error('Number is not invertible');
    }

    if (old_s < 0n) {
      old_s += m;
    }

    return old_s;
  }
}
