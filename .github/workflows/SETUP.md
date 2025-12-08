# GitHub Actions Workflow Setup

## Recommended: npm Trusted Publishers (OIDC)

**This workflow is configured to use npm Trusted Publishers** - a more secure authentication method that doesn't require storing tokens.

### Setup Steps:

1. **Configure Trusted Publisher on npmjs.com:**
   - Go to your package settings: https://www.npmjs.com/package/sm-js-bc/access
   - Under "Publishing access" → Click "Add trusted publisher"
   - Select "GitHub Actions"
   - Fill in:
     - **Organization/User**: `lihongjie0209`
     - **Repository**: `sm-js-bc`
     - **Workflow filename**: `publish.yml`
     - **Environment** (optional): leave empty
   - Click "Add"

2. **Verify permissions in workflow:**
   - The workflow already has `id-token: write` permission ✅
   - This enables OIDC authentication

3. **Test the workflow:**
   - Push a version tag: `git push origin v0.4.0`
   - The workflow will automatically authenticate using OIDC
   - No tokens needed! 🎉

### Benefits of Trusted Publishers

- ✅ **No token management** - no secrets to store or rotate
- ✅ **More secure** - temporary credentials that can't be leaked
- ✅ **Automatic provenance** - better supply chain security
- ✅ **Simpler setup** - just configure once on npmjs.com

---

## Alternative: Classic Authentication with NPM_TOKEN

If you prefer to use the traditional token-based authentication:

### Setup Steps:

1. **Generate an npm token:**
   - Go to https://www.npmjs.com/settings/lihongjie0209/tokens
   - Click "Generate New Token"
   - Select "Automation" token type
   - Copy the generated token (starts with `npm_...`)

2. **Add token to GitHub repository:**
   - Go to https://github.com/lihongjie0209/sm-js-bc/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your npm token)
   - Click "Add secret"

3. **Update the workflow:**
   - Modify `.github/workflows/publish.yml`
   - Change the publish step to:
   ```yaml
   - name: Publish to npm
     run: npm publish --provenance --access public
     env:
       NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

## Current Issue

The workflow run failed because `NPM_TOKEN` is not configured:
https://github.com/lihongjie0209/sm-js-bc/actions/runs/20021037128

Error message:
```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
```

## Manual Publishing Alternative

If you prefer not to set up automated publishing, you can publish manually:

```bash
# 1. Ensure you're on the correct tag
git checkout v0.4.0

# 2. Install dependencies and build
npm ci
npm test
npm run build

# 3. Login to npm (if not already logged in)
npm login

# 4. Publish to npm
npm publish --access public

# 5. Create GitHub release manually
# Go to: https://github.com/lihongjie0209/sm-js-bc/releases/new
# Select tag: v0.4.0
# Copy release notes from CHANGELOG.md
```

## Next Steps

After configuring the `NPM_TOKEN` secret:

1. Re-run the failed workflow:
   - Go to https://github.com/lihongjie0209/sm-js-bc/actions/runs/20021037128
   - Click "Re-run all jobs"

OR

2. Trigger a new workflow by pushing the tag again:
   ```bash
   # Delete and recreate the tag
   git tag -d v0.4.0
   git push --delete origin v0.4.0
   git tag -a v0.4.0 -m "Release version 0.4.0"
   git push origin v0.4.0
   ```
