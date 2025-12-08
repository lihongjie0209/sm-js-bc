# Maintainer Instructions for Release 0.4.0

This document provides step-by-step instructions for the repository maintainer to complete the release of version 0.4.0.

## Overview

All release preparation has been completed:
- ✅ Version 0.4.0 set in package.json
- ✅ CHANGELOG.md updated with release notes
- ✅ All 767 tests passing
- ✅ Build successful
- ✅ Git tag v0.4.0 created (local only)
- ✅ Automated publish workflow created
- ✅ Package verified (no vulnerabilities)

## ⚠️ IMPORTANT: First-Time Setup Required

**Before pushing the tag**, you must configure npm authentication:

### Recommended: npm Trusted Publishers (OIDC) ✨

1. Go to https://www.npmjs.com/package/sm-js-bc/access
2. Add trusted publisher for GitHub Actions:
   - Organization: `lihongjie0209`
   - Repository: `sm-js-bc`
   - Workflow: `publish.yml`

**No secrets needed!** The workflow uses secure OIDC authentication.

See detailed instructions in `.github/workflows/SETUP.md`

## Quick Start (After Setup)

```bash
# 1. Checkout main branch and pull latest changes
git checkout main
git pull origin main

# 2. Create and push the release tag
git tag -a v0.4.0 -m "Release version 0.4.0"
git push origin v0.4.0

# The workflow will automatically publish to npm and create a GitHub release
```

## Alternative: Manual Publishing

If you prefer not to set up automated publishing:

```bash
git checkout v0.4.0
npm ci && npm test && npm run build
npm login
npm publish --access public
```

## Detailed Steps

### Step 1: Merge the PR

Merge the pull request for the copilot/release-040 branch to main.

### Step 2: Setup npm Token (One-time setup)

If not already configured, you need to set up an npm access token:

1. Generate an npm token:
   - Go to https://www.npmjs.com/settings/~/tokens
   - Click "Generate New Token"
   - Choose "Automation" or "Publishing" type
   - Copy the generated token

2. Add token to GitHub secrets:
   - Go to https://github.com/lihongjie0209/sm-js-bc/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your npm token)
   - Click "Add secret"

### Step 3: Create and Push the Release Tag

```bash
# Switch to main branch
git checkout main
git pull origin main

# Create annotated tag
git tag -a v0.4.0 -m "Release version 0.4.0"

# Push tag to GitHub
git push origin v0.4.0
```

### Step 4: Monitor Automated Release

Once the tag is pushed, the GitHub Actions workflow will automatically:

1. Run all tests
2. Build the package
3. Publish to npm with provenance
4. Create a GitHub release

Monitor the workflow at:
https://github.com/lihongjie0209/sm-js-bc/actions/workflows/publish.yml

### Step 5: Verify Release

After the workflow completes (or after manual publish):

1. **Verify npm publication:**
```bash
npm view sm-js-bc version
# Should output: 0.4.0

npm info sm-js-bc
# Should show updated package info
```

2. **Verify GitHub release:**
   - Go to https://github.com/lihongjie0209/sm-js-bc/releases
   - Confirm v0.4.0 release is visible

3. **Test installation:**
```bash
# In a test directory
npm install sm-js-bc@0.4.0
```

## Manual Publishing (Alternative)

If you prefer to publish manually or if the automated workflow fails:

```bash
# Ensure you're logged in to npm
npm login

# Publish the package
npm publish

# Create GitHub release manually
# Go to: https://github.com/lihongjie0209/sm-js-bc/releases/new
# - Select tag: v0.4.0
# - Title: Release 0.4.0
# - Description: Copy from CHANGELOG.md
```

## Troubleshooting

### Workflow fails with "ENEEDAUTH"
- The NPM_TOKEN secret is not configured or is invalid
- Follow Step 2 to set up the token
- Or use manual publishing

### Tag already exists
```bash
# Delete local tag
git tag -d v0.4.0

# Delete remote tag (if pushed)
git push --delete origin v0.4.0

# Recreate tag
git tag -a v0.4.0 -m "Release version 0.4.0"
git push origin v0.4.0
```

### npm publish fails with version conflict
- Version 0.4.0 may already be published
- Check: `npm view sm-js-bc versions`
- If already published, the release is complete!

## Post-Release

After successful release:

1. Announce the release on relevant channels
2. Update any dependent projects
3. Monitor for issues or feedback

## Release Contents Summary

Version 0.4.0 includes:

- **API Improvements:**
  - 97% API consistency with Bouncy Castle Java (up from 91%)
  - New `SM3Digest.reset(Memoable)` method
  - New `SM2Engine.Mode` static property
  - New `SM2Signer.createBasePointMultiplier()` method
  - New `SM2Signer.calculateE()` method

- **Documentation:**
  - API_CONSISTENCY_AUDIT.md (537 lines)
  - API_IMPROVEMENTS.md (migration guide)

- **Deprecations:**
  - `SM2Signer.hashToInteger()` → use `calculateE()` (removal in v1.0.0)

- **Testing:**
  - 14 new API compatibility tests
  - 767 total tests passing

## Support

For questions or issues with the release process:
- Check RELEASE.md for additional details
- Open an issue on GitHub
- Contact the development team

---

**Note:** This release has been prepared by the Copilot agent. All code changes, tests, and documentation have been verified and are ready for publication.
