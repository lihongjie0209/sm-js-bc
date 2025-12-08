# Fix Workflow Failure - NPM Authentication

## Problem

The GitHub Actions workflow failed with:
```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in
```

Workflow URL: https://github.com/lihongjie0209/sm-js-bc/actions/runs/20021037128

## Root Cause

The `NPM_TOKEN` secret is not configured in GitHub repository settings.

## Solution

Choose one of the following options:

### Option 1: Configure Automated Publishing (Recommended)

1. **Generate npm token:**
   - Visit: https://www.npmjs.com/settings/lihongjie0209/tokens
   - Click "Generate New Token" → Select "Automation"
   - Copy the token (starts with `npm_...`)

2. **Add secret to GitHub:**
   - Visit: https://github.com/lihongjie0209/sm-js-bc/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your token)
   - Click "Add secret"

3. **Re-run the workflow:**
   - Visit: https://github.com/lihongjie0209/sm-js-bc/actions/runs/20021037128
   - Click "Re-run all jobs"

### Option 2: Publish Manually

```bash
# 1. Checkout the release tag
git fetch --tags
git checkout v0.4.0

# 2. Build the package
npm ci
npm test
npm run build

# 3. Login to npm
npm login

# 4. Publish
npm publish --access public

# 5. Create GitHub release manually at:
# https://github.com/lihongjie0209/sm-js-bc/releases/new
# - Select tag: v0.4.0
# - Copy release notes from CHANGELOG.md section [0.4.0]
```

## Verification

After publishing (either way), verify:

```bash
# Check npm registry
npm view sm-js-bc version
# Should output: 0.4.0

# Test installation
npm install sm-js-bc@0.4.0
```

## Next Time

Once `NPM_TOKEN` is configured, future releases will work automatically:
- Just push a version tag: `git push origin v0.5.0`
- The workflow handles everything else

## Need Help?

See detailed documentation:
- `.github/workflows/SETUP.md` - Complete setup guide
- `MAINTAINER_INSTRUCTIONS.md` - Full release process
