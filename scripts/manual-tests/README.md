# Manual Test Scripts

This directory contains manual test scripts for debugging and verification purposes.

## Files

- `test-gcm-simple.mjs` - Simple 16-byte GCM encryption/decryption test
- `test-gcm-32bytes.mjs` - 32-byte multi-block GCM test
- `test-gcm-debug.mjs` - Detailed GCM debugging output

## Usage

All scripts should be run from the project root directory:

```bash
# Build the project first
npm run build

# Run individual tests
node scripts/manual-tests/test-gcm-simple.mjs
node scripts/manual-tests/test-gcm-32bytes.mjs
node scripts/manual-tests/test-gcm-debug.mjs
```

## Note

These are supplementary manual tests. The main test suite is in `test/` directory and runs via:

```bash
npm test
```
