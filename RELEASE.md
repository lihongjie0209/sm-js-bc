# Release 0.4.0

This document provides the steps to complete the release of version 0.4.0.

## Pre-release Checklist

- [x] Version updated to 0.4.0 in package.json
- [x] CHANGELOG.md updated with 0.4.0 changes (dated 2025-12-08)
- [x] All tests pass (767 tests passing)
- [x] Build succeeds (dist files generated)
- [x] Git tag v0.4.0 created locally

## Publishing Steps

### Automated Release (Recommended)

The repository now includes a GitHub Actions workflow that automates the release process.

**Prerequisites:**
- An `NPM_TOKEN` secret must be configured in the repository settings
  - Go to https://github.com/lihongjie0209/sm-js-bc/settings/secrets/actions
  - Add a new secret named `NPM_TOKEN` with your npm access token
  - Generate token at https://www.npmjs.com/settings/~/tokens (Automation or Publishing type)

**Steps:**

1. Push the Git Tag:
```bash
git push origin v0.4.0
```

2. The GitHub Actions workflow will automatically:
   - Run all tests
   - Build the package
   - Publish to npm with provenance
   - Create a GitHub release

3. Monitor the workflow at: https://github.com/lihongjie0209/sm-js-bc/actions

### Manual Release (Alternative)

If the automated workflow is not set up:

1. **Push the Git Tag**
```bash
git push origin v0.4.0
```

2. **Publish to npm**

Ensure you're logged in to npm:
```bash
npm login
npm publish
```

3. **Create GitHub Release**

Go to https://github.com/lihongjie0209/sm-js-bc/releases/new and:
- Select tag: v0.4.0
- Release title: Release 0.4.0
- Copy changelog content from CHANGELOG.md
- Publish release

## Verification

After publishing, verify the release:

1. Check npm: `npm view sm-js-bc version` should show 0.4.0
2. Check GitHub releases page
3. Test installation: `npm install sm-js-bc@0.4.0`

## Release Content Summary

### Version 0.4.0 Features

- Comprehensive API consistency audit against Bouncy Castle Java
- New `SM3Digest.reset(Memoable)` method overload for state restoration
- New `SM2Engine.Mode` static property for Java-style enum access
- New `SM2Signer.createBasePointMultiplier()` protected method
- New `SM2Signer.calculateE()` protected method
- 14 new API compatibility tests
- Improved API consistency score from 91% to 97%
- Deprecation of `SM2Signer.hashToInteger()` (use `calculateE()` instead)

### Documentation

- API_CONSISTENCY_AUDIT.md (537 lines)
- API_IMPROVEMENTS.md (usage guide with migration examples)

## Package Information

- Package name: sm-js-bc
- Version: 0.4.0
- Previous version on npm: 0.3.1
- License: MIT
- Repository: https://github.com/lihongjie0209/sm-js-bc

## Build Artifacts

The following files are included in the npm package (as defined in package.json "files"):

- dist/ (built files: index.js, index.mjs, index.cjs, index.d.ts, index.d.cts)
- README.md
- LICENSE

Total dist size: ~128 KB (per format)
