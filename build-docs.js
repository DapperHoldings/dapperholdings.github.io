import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  try {
    // Create docs directory if it doesn't exist
    console.log('Creating docs directory...');
    await fs.mkdir('docs', { recursive: true });

    // List of files to preserve during build
    const docsFiles = [
      'community-blocklist.json',
      '404.html',
      '.nojekyll'
    ];

    // Back up existing files
    console.log('Backing up existing files...');
    for (const file of docsFiles) {
      const sourcePath = path.join('docs', file);
      const backupPath = path.join('docs', `${file}.backup`);
      try {
        await fs.access(sourcePath);
        await fs.copyFile(sourcePath, backupPath);
        console.log(`Backed up ${file}`);
      } catch (err) {
        console.log(`${file} not found, will create new one`);
      }
    }

    // Build the frontend
    console.log('Building frontend...');
    execSync('npm run build', { stdio: 'inherit' });

    // Copy build output to docs
    console.log('Copying build files to docs...');
    await fs.rm('docs', { recursive: true, force: true });
    await fs.cp('dist/public', 'docs', { recursive: true });

    // Create initial community blocklist if it doesn't exist
    const blocklistContent = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      blocks: [],
      metadata: {
        totalBlocks: 0,
        categories: {},
        contributors: []
      }
    };
    await fs.writeFile(
      path.join('docs', 'community-blocklist.json'),
      JSON.stringify(blocklistContent, null, 2)
    );

    // Create 404 page for client-side routing
    const notFoundPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - S.H.I.E.L.D.</title>
    <script>
        window.location.href = window.location.pathname.split('/').slice(0, -1).join('/') || '/';
    </script>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f9fafb;
            color: #111827;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 { margin-bottom: 1rem; }
        p { color: #4b5563; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Page Not Found</h1>
        <p>Redirecting to homepage...</p>
    </div>
</body>
</html>`;
    await fs.writeFile(path.join('docs', '404.html'), notFoundPage);

    // Create .nojekyll file to prevent GitHub Pages from ignoring files that begin with an underscore
    await fs.writeFile(path.join('docs', '.nojekyll'), '');

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();