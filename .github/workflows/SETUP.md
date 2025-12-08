# GitHub Actions Workflow Setup

## Required Secrets

To enable automated publishing to npm, you need to configure the following secret in your GitHub repository:

### NPM_TOKEN

This token is required for the `publish.yml` workflow to publish packages to npm.

#### Setup Steps:

1. **Generate an npm token:**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Select "Automation" token type
   - Copy the generated token (it starts with `npm_...`)

2. **Add token to GitHub repository:**
   - Go to https://github.com/lihongjie0209/sm-js-bc/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your npm token)
   - Click "Add secret"

3. **Verify setup:**
   - Push a version tag (e.g., `git push origin v0.4.0`)
   - The workflow should automatically run and publish to npm
   - Check the workflow run at: https://github.com/lihongjie0209/sm-js-bc/actions

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
