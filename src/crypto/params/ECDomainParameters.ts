/**
 * Elliptic curve domain parameters.
 * 
 * Based on: org.bouncycastle.crypto.params.ECDomainParameters
 */

import { ECCurve } from '../../math/ec/ECCurve';
import { ECPoint } from '../../math/ec/ECPoint';

export class ECDomainParameters {
  private readonly curve: ECCurve;
  private readonly G: ECPoint;
  private readonly n: bigint;
  private readonly h: bigint;
  private readonly seed: Uint8Array | null;

  constructor(
    curve: ECCurve,
    G: ECPoint,
    n: bigint,
    h?: bigint,
    seed?: Uint8Array | null
  ) {
    this.curve = curve;
    this.G = G;
    this.n = n;
    this.h = h ?? 1n;
    this.seed = seed ?? null;
  }

  getCurve(): ECCurve {
    return this.curve;
  }

  getG(): ECPoint {
    return this.G;
  }

  getN(): bigint {
    return this.n;
  }

  getH(): bigint {
    return this.h;
  }

  getSeed(): Uint8Array | null {
    return this.seed;
  }

  equals(other: any): boolean {
    if (!(other instanceof ECDomainParameters)) {
      return false;
    }

    return (
      this.curve.equals(other.curve) &&
      this.G.equals(other.G) &&
      this.n === other.n &&
      this.h === other.h
    );
  }

  hashCode(): number {
    let hash = this.curve.hashCode();
    hash ^= this.G.hashCode();
    hash ^= Number(this.n & 0xffffffffn);
    hash ^= Number(this.h & 0xffffffffn);
    return hash;
  }
}
