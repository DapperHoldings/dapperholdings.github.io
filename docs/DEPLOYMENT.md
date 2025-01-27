# Deployment Guide for S.H.I.E.L.D.

This document outlines the deployment process for the S.H.I.E.L.D. community block list management tool.

## GitHub Pages Deployment

The application is configured for GitHub Pages deployment from the `/docs` directory.

### Steps to Deploy

1. Build the static files:
   ```bash
   npm run build && node build-docs.js
   ```
   This will:
   - Build the frontend
   - Copy built files to /docs
   - Preserve documentation files
   - Add necessary GitHub Pages configurations

2. Push the changes to GitHub:
   ```bash
   git add docs/
   git commit -m "Update static files for deployment"
   git push origin main
   ```

3. Enable GitHub Pages:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Select the `main` branch and `/docs` folder as the source
   - Save the settings

Your site will be available at: `https://<username>.github.io/<repository-name>`

### Updating the Deployment

To update the deployed site:
1. Make your changes to the codebase
2. Run `npm run build && node build-docs.js` to rebuild the static files
3. Commit and push the changes

### Important Notes

- The `/docs` folder contains:
  - Built frontend assets
  - Static documentation
  - Community block list data
  - GitHub Pages configuration files

- The `.nojekyll` file ensures proper handling of files starting with underscore
- The community block list is updated through the application's sync mechanism