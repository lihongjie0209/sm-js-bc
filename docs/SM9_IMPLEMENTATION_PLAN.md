# SM9 Implementation Plan

## Current Status

### Completed Foundation
- ✅ **Extension Field Base**: `ExtensionField.ts` interface and utilities
- ✅ **Fp2 Implementation**: `Fp2Element.ts` - Quadratic extension field (Fp2 = Fp[u]/(u^2+1))
  - Addition, subtraction, multiplication, division
  - Inversion, negation, squaring
  - Conjugate operation
  - Comprehensive unit tests

### Remaining Work

#### 1. Extension Fields (Est: 3-4 days)

**Fp4 Element** (`src/math/ec/Fp4Element.ts`)
- Quartic extension field: Fp4 = Fp2[v]/(v^2-u)
- Operations: add, subtract, multiply, divide, invert, square
- Frobenius map
- Unit tests

**Fp12 Element** (`src/math/ec/Fp12Element.ts`)
- Dodecic extension field: Fp12 = Fp4[w]/(w^3-v)
- Operations: add, subtract, multiply, divide, invert, square
- Frobenius map (critical for pairing)
- Final exponentiation support
- Unit tests

#### 2. SM9 Curve Parameters (Est: 1 day)

**SM9Parameters** (`src/crypto/params/SM9Parameters.ts`)
```typescript
class SM9Parameters {
  // BN Curve parameters from GM/T 0044-2016
  static readonly P: bigint;        // Base field modulus (256-bit prime)
  static readonly A: bigint;        // Curve parameter a
  static readonly B: bigint;        // Curve parameter b
  static readonly N: bigint;        // Order of G1 and G2
  
  // Generator points
  static readonly G1: ECPoint;      // Generator on E(Fp)
  static readonly G2: ECPointFp2;   // Generator on E'(Fp2)
  
  // Pairing parameters
  static readonly EMBEDDING_DEGREE: number; // k = 12
  static readonly TRACE: bigint;    // Trace of Frobenius
}
```

**ECPointFp2** (`src/math/ec/ECPointFp2.ts`)
- Points on twisted curve E'(Fp2)
- Point addition and doubling over Fp2
- Scalar multiplication

#### 3. Pairing Engine (Est: 4-5 days)

**PairingEngine** (`src/crypto/SM9PairingEngine.ts`)
```typescript
class SM9PairingEngine {
  // Miller loop - computes bilinear pairing
  miller(P: ECPoint, Q: ECPointFp2): Fp12Element;
  
  // Final exponentiation - ensures result is in GT
  finalExp(f: Fp12Element): Fp12Element;
  
  // Complete pairing e: G1 × G2 → GT
  pair(P: ECPoint, Q: ECPointFp2): Fp12Element;
  
  // Optimal Ate pairing (more efficient)
  atePairing(P: ECPoint, Q: ECPointFp2): Fp12Element;
}
```

**Key Operations**:
- Line functions for Miller algorithm
- Doubling step: compute tangent line
- Addition step: compute line through two points
- Sparse multiplication optimization
- Frobenius map applications

#### 4. SM9 Hash Functions (Est: 1 day)

**SM9Hash** (`src/crypto/SM9Hash.ts`)
```typescript
class SM9Hash {
  // H1: Map identity to point on G1
  static H1(id: Uint8Array, hid: number, N: bigint): bigint;
  
  // H2: Map message and GT element to integer
  static H2(msg: Uint8Array, w: Fp12Element, N: bigint): bigint;
  
  // Helper: Map to curve point
  private static mapToG1(h: bigint): ECPoint;
  private static mapToG2(h: bigint): ECPointFp2;
}
```

#### 5. SM9 Key Generation (Est: 1-2 days)

**SM9MasterKeyGenerator** (`src/crypto/generators/SM9MasterKeyGenerator.ts`)
```typescript
class SM9MasterKeyGenerator {
  // Generate master key pair for signing
  generateSignMasterKeyPair(): {
    masterPublicKey: ECPointFp2;    // Ppub-s = ks * P2
    masterSecretKey: bigint;        // ks
  };
}
```

**SM9PrivateKeyGenerator** (`src/crypto/generators/SM9PrivateKeyGenerator.ts`)
```typescript
class SM9PrivateKeyGenerator {
  // Derive user signing key from identity
  generateUserSignKey(
    id: string,
    masterSecretKey: bigint
  ): ECPointFp2;  // dsA = 1/(ks + H1(IDA||hid,N)) * P1
}
```

#### 6. SM9 Signer (Est: 3-4 days)

**SM9Signer** (`src/crypto/signers/SM9Signer.ts`)
```typescript
class SM9Signer implements Signer {
  init(forSigning: boolean, params: CipherParameters): void;
  
  // Generate signature (h, S)
  generateSignature(message: Uint8Array): Uint8Array;
  
  // Verify signature
  verifySignature(message: Uint8Array, signature: Uint8Array): boolean;
}
```

**Signature Algorithm**:
1. Compute g = e(P1, Ppub-s)
2. Generate random r ∈ [1, N-1]
3. Compute w = g^r
4. Compute h = H2(M || w, N)
5. Compute l = (r - h) mod N, if l = 0 goto step 2
6. Compute S = l * dsA
7. Output (h, S)

**Verification Algorithm**:
1. Check h ∈ [1, N-1]
2. Compute P = H1(IDA || hid, N) * P1 + Ppub-s
3. Compute u = e(S, P)
4. Compute w = u * g^h
5. Compute h' = H2(M || w, N)
6. Verify h' = h

#### 7. Parameter Classes (Est: 1 day)

- `SM9SignMasterPublicKeyParameters.ts`
- `SM9SignMasterSecretKeyParameters.ts`
- `SM9SignPrivateKeyParameters.ts`
- `SM9VerifyParameters.ts`

#### 8. Testing (Est: 3-4 days)

**Unit Tests**:
- Fp4Element operations
- Fp12Element operations
- Pairing computations
- SM9 hash functions
- Key generation
- Signature generation and verification

**Integration Tests**:
- Complete sign/verify cycles
- Cross-validation with test vectors
- Edge cases and error handling

**Java Interop Tests**:
- `SM9SignerInteropTest.java`
- Cross-language signature verification

**Test Vectors**:
- GM/T 0044-2016 Appendix A test vectors
- Custom test vectors for edge cases

#### 9. Documentation (Est: 1-2 days)

- TSDoc comments for all classes and methods
- Usage examples in README
- API documentation
- Algorithm explanation

## Implementation Notes

### Optimization Opportunities

1. **Sparse Multiplication**: During Miller loop, exploit sparse structure of line functions
2. **Frobenius Map**: Precompute Frobenius constants
3. **Final Exponentiation**: Use cyclotomic exponentiation
4. **Point Compression**: Compress Fp2 points for signature size
5. **Precomputation**: Cache frequently used values (g = e(P1, Ppub-s))

### Security Considerations

1. **Random Number Generation**: Use cryptographically secure RNG for r
2. **Timing Attacks**: Constant-time operations where possible
3. **Invalid Point Checks**: Verify points are on curve and in correct subgroup
4. **Key Validation**: Validate master and user keys
5. **Signature Malleability**: Ensure signatures are canonical

### Performance Targets

- **Key Generation**: < 100ms per user key
- **Signing**: < 200ms per signature
- **Verification**: < 300ms per verification
- **Pairing Computation**: < 150ms per pairing

### Dependencies

**New Dependencies**: None (pure TypeScript implementation)

**Existing Dependencies**:
- SM3Digest (for H1, H2 hash functions)
- SecureRandom (for random number generation)
- ECPoint (base point operations)
- BigInteger utilities

## Testing Strategy

### Phase 1: Foundation Testing
- Extension field arithmetic correctness
- Curve operations on E(Fp2)

### Phase 2: Pairing Testing
- Miller loop correctness
- Final exponentiation
- Pairing bilinearity: e(aP, Q) = e(P, aQ) = e(P, Q)^a

### Phase 3: Cryptographic Testing
- Key generation with test vectors
- Signature generation with test vectors
- Signature verification with test vectors

### Phase 4: Interoperability Testing
- Compare with Bouncy Castle Java implementation
- Cross-language sign/verify
- Performance benchmarking

## References

1. **GM/T 0044-2016**: SM9 标识密码算法
2. **ISO/IEC 15946-5**: Identity-based cryptography
3. **Bouncy Castle Java**: 
   - `org.bouncycastle.crypto.signers.SM9Signer`
   - `org.bouncycastle.math.ec.custom.gm.SM9*`
4. **Academic Papers**:
   - "Efficient Implementation of Pairing-Based Cryptography"
   - "The Eta Pairing Revisited"
   - "High-Speed Software Implementation of the Optimal Ate Pairing over BN Curves"

## Estimated Timeline

| Component | Estimated Time | Priority |
|-----------|---------------|----------|
| Fp4 Element | 1-1.5 days | High |
| Fp12 Element | 1.5-2 days | High |
| SM9 Parameters | 1 day | High |
| ECPointFp2 | 1 day | High |
| Pairing Engine | 4-5 days | Critical |
| SM9 Hash | 1 day | High |
| Key Generation | 1-2 days | High |
| SM9 Signer | 3-4 days | Critical |
| Parameter Classes | 1 day | Medium |
| Unit Tests | 2-3 days | High |
| Java Interop Tests | 1 day | High |
| Documentation | 1-2 days | Medium |

**Total Estimated Time**: 18-25 days

**Current Progress**: 
- Foundation: 30% complete (Fp2 done)
- Overall: 5% complete

## Next Steps

1. ✅ Complete Fp2 implementation and tests
2. Implement Fp4Element
3. Implement Fp12Element
4. Define SM9Parameters from GM/T 0044-2016
5. Implement ECPointFp2
6. Begin pairing engine implementation
7. Continue with key generation and signing

## Notes

- SM9 is significantly more complex than ZUC due to pairing-based cryptography
- Pairing computation is the most challenging part
- Reference Bouncy Castle Java implementation closely for algorithm details
- Test vectors from GM/T 0044-2016 are essential for validation
- Consider performance optimization after correctness is established
