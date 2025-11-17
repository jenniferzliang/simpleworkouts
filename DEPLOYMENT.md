# Deployment Guide - Render

This guide will help you deploy SimpleWorkouts to Render.

## Prerequisites

1. A GitHub account with this repository pushed
2. A Render account (sign up at https://render.com)

## Deployment Steps

### Option 1: Deploy using Blueprint (Recommended)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Connect to Render**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

3. **Deploy**:
   - Click "Apply" to create the service
   - Render will build and deploy your app automatically
   - Your site will be live at: `https://simpleworkouts.onrender.com` (or your chosen name)

### Option 2: Manual Static Site Deployment

1. **Create a new Static Site**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Static Site"
   - Connect your GitHub repository

2. **Configure Build Settings**:
   - **Name**: `simpleworkouts` (or your preference)
   - **Root Directory**: Leave empty (or `.`)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`

3. **Add Rewrite Rule** (for React Router):
   - Under "Redirects/Rewrites"
   - Add: `/*` → `/index.html` (Type: Rewrite)

4. **Deploy**:
   - Click "Create Static Site"
   - Render will build and deploy your app

## Post-Deployment

### Custom Domain (Optional)
1. Go to your site's dashboard on Render
2. Click "Settings" → "Custom Domain"
3. Follow the instructions to add your domain

### Auto-Deploy on Push
Render automatically redeploys when you push to your main branch.

### Environment Variables
This app runs entirely client-side and doesn't require environment variables.
All data is stored in the browser's localStorage.

## Troubleshooting

### Build Fails
- Check that all dependencies are in `client/package.json`
- Ensure `npm run build` works locally
- Check Render build logs for specific errors

### Routes Not Working (404 on refresh)
- Ensure the rewrite rule is set: `/*` → `/index.html`
- Check that `render.yaml` includes the routes configuration

### App Loads but Features Don't Work
- Check browser console for errors
- Verify localStorage is enabled in browser
- Try clearing browser cache and localStorage

## Local Testing Before Deploy

```bash
# Build the production version
npm run build

# Test the build locally (install serve globally first)
npx serve -s client/build
```

## Support

For Render-specific issues, check: https://render.com/docs/static-sites
