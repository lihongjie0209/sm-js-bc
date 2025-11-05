# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive API consistency audit against Bouncy Castle Java
- `SM3Digest.reset(Memoable)` method overload for state restoration
- `SM2Engine.Mode` static property for Java-style enum access
- `SM2Signer.createBasePointMultiplier()` protected method for extensibility
- `SM2Signer.calculateE()` protected method matching Java API signature
- Comprehensive API compatibility test suite (14 new tests)
- API_CONSISTENCY_AUDIT.md - 537-line detailed audit report
- API_IMPROVEMENTS.md - Usage guide with migration examples

### Changed
- Improved API consistency score from 91% to 97%
- Enhanced `SM2Signer.hashToInteger()` deprecation notice with version timeline
- Updated documentation structure in docs/README.md

### Deprecated
- `SM2Signer.hashToInteger()` - Use `calculateE()` instead (will be removed in v1.0.0)

## [0.3.0] - Previous Release

### Added
- SM2 elliptic curve public key cryptography
  - Digital signature (sign/verify)
  - Public key encryption (encrypt/decrypt)
  - Key exchange (ECDH)
- SM3 cryptographic hash algorithm
- SM4 block cipher algorithm
  - Multiple operation modes (ECB, CBC, CTR, GCM, CFB, OFB, SIC)
  - PKCS7 and Zero-byte padding
- Comprehensive test suite
  - 614+ TypeScript unit tests
  - 1077 Java GraalVM interoperability tests
- Complete documentation
  - Implementation plan
  - Test strategy
  - API documentation

### Features
- Zero runtime dependencies
- Pure TypeScript implementation
- Full compatibility with Bouncy Castle Java
- Browser and Node.js support
- Multiple output formats (CommonJS, ESM, IIFE)

## Links

- [Repository](https://github.com/lihongjie0209/sm-js-bc)
- [Issue Tracker](https://github.com/lihongjie0209/sm-js-bc/issues)
- [API Documentation](./docs/README.md)
- [API Consistency Audit](./docs/API_CONSISTENCY_AUDIT.md)
- [API Improvements Guide](./docs/API_IMPROVEMENTS.md)
