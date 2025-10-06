# DJAMMS Appwrite Sites Setup Guide

## Overview
This guide will help you deploy the DJAMMS SvelteKit application using Appwrite Sites with GitHub integration for automatic deployments.

## Prerequisites
- GitHub repository: `SystemVirtue/DJAMMS_Appwrite_v2`
- Appwrite project with functions already deployed
- SvelteKit app configured for static site generation

## Step 1: Configure SvelteKit for Static Build

The SvelteKit app has been configured to use `@sveltejs/adapter-static` for static site generation:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    }),
    prerender: {
      entries: ['*']
    }
  }
};
```

## Step 2: Create Appwrite Site

### Via Appwrite Console

1. **Navigate to Appwrite Console**
   - Go to: `https://cloud.appwrite.io/console/project/68cc86c3002b27e13947/sites`

2. **Create New Site**
   - Click "Create site"
   - Fill in the details:
     - **Site ID**: `djamms-web-app`
     - **Name**: `DJAMMS Web App`
     - **Framework**: `SvelteKit` (or closest available)
     - **Build Runtime**: `Node.js 18` (or latest available)

3. **Configure Build Settings**
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Adapter**: `Static`

4. **Connect GitHub Repository**
   - **Repository**: `SystemVirtue/DJAMMS_Appwrite_v2`
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Silent Mode**: Disabled (recommended for seeing deployment comments)

5. **Set Environment Variables**
   Add these environment variables for the site:
   ```
   VITE_APPWRITE_ENDPOINT=https://syd.cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=68cc86c3002b27e13947
   VITE_APPWRITE_DATABASE_ID=68cc92d30024e1b6eeb6
   ```

## Step 3: Initial Deployment

1. **Push Code to GitHub**
   ```bash
   git add .
   git commit -m "Configure for Appwrite Sites deployment"
   git push origin main
   ```

2. **Trigger Initial Deployment**
   - Appwrite will automatically detect the push and start building
   - Monitor the deployment in the Appwrite Console under Sites > Deployments

## Step 4: Verify Deployment

1. **Check Site URL**
   - Your site will be available at: `https://djamms-web-app.appwrite.global`
   - Or check the actual URL in the Appwrite Console

2. **Test Functionality**
   - Visit the site URL
   - Try logging in with Google OAuth
   - Test basic navigation between pages

## Step 5: Configure Custom Domain (Optional)

If you want a custom domain:

1. **Go to Site Settings** in Appwrite Console
2. **Add Custom Domain**
3. **Configure DNS** as instructed
4. **Wait for SSL certificate** to be issued

## Troubleshooting

### Build Failures
- Check the deployment logs in Appwrite Console
- Ensure all dependencies are in `package.json`
- Verify the build commands work locally: `npm run build`

### Runtime Issues
- Check browser console for JavaScript errors
- Verify environment variables are set correctly
- Ensure API endpoints are accessible

### GitHub Integration Issues
- Verify the repository is public or Appwrite has access
- Check that the branch name matches exactly
- Ensure the root directory path is correct

## Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_APPWRITE_ENDPOINT` | `https://syd.cloud.appwrite.io/v1` | Appwrite API endpoint |
| `VITE_APPWRITE_PROJECT_ID` | `68cc86c3002b27e13947` | Your project ID |
| `VITE_APPWRITE_DATABASE_ID` | `68cc92d30024e1b6eeb6` | Database ID |

## Automatic Deployments

Once configured, Appwrite will automatically:
- Deploy on every push to the `main` branch
- Create comments on pull requests with preview URLs
- Rollback failed deployments automatically

## Monitoring

- **Deployment Status**: Check in Appwrite Console > Sites > Deployments
- **Site Analytics**: View in Appwrite Console > Sites > Analytics
- **Logs**: Access build and runtime logs in the console

## Security Notes

- Environment variables are securely stored and not exposed to clients
- Only `VITE_` prefixed variables are available in the browser
- API keys and sensitive data should never be in client-side code

---

**Site URL**: `https://djamms-web-app.appwrite.global`
**Repository**: `https://github.com/SystemVirtue/DJAMMS_Appwrite_v2`
**Framework**: SvelteKit with Static Adapter