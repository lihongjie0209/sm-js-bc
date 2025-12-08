# Fix Workflow Failure - NPM Authentication

## Problem

The GitHub Actions workflow failed with:
```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in
```

Workflow URL: https://github.com/lihongjie0209/sm-js-bc/actions/runs/20021037128

## Root Cause

npm authentication is not configured. The workflow needs either:
- npm Trusted Publishers (OIDC) - **Recommended** ✨
- Or NPM_TOKEN secret (traditional method)

## Solution

Choose one of the following options:

### Option 1: Configure npm Trusted Publishers (OIDC) - **Recommended** ✨

**This is more secure and doesn't require storing secrets!**

1. **Configure on npmjs.com:**
   - Visit: https://www.npmjs.com/package/sm-js-bc/access
   - Under "Publishing access" → Click "Add trusted publisher"
   - Select "GitHub Actions"
   - Fill in:
     - **Organization/User**: `lihongjie0209`
     - **Repository**: `sm-js-bc`
     - **Workflow filename**: `publish.yml`
   - Click "Add"

2. **Push changes and re-run:**
   ```bash
   # The workflow has been updated to support OIDC
   git pull origin master
   git push origin v0.4.0  # Re-push the tag or re-run the workflow
   ```

3. **Or re-run the existing workflow:**
   - Visit: https://github.com/lihongjie0209/sm-js-bc/actions/runs/20021037128
   - Click "Re-run all jobs"

### Option 2: Use NPM_TOKEN (Traditional Method)

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

3. **Update the workflow file** to use the token:
   ```yaml
   - name: Publish to npm
     run: npm publish --provenance --access public
     env:
       NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

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
