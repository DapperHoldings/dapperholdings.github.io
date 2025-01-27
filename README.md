# S.H.I.E.L.D. - Community Block List Management for Bluesky

S.H.I.E.L.D. (Spam, Hate, Interference, Exploitation, and Liability Defense) is a collaborative block list management web application designed to enhance online safety for Bluesky social media users through community-driven moderation tools.

## Features

- **Bluesky Authentication**: Secure login using your Bluesky credentials
- **Block List Management**: View and manage your blocked accounts
- **Block Import**: Import your existing Bluesky blocks with one click
- **Community Collaboration**: Share and discover blocked accounts from other users
- **Report System**: Flag suspicious or incorrectly blocked accounts for review

## Documentation

Visit our [documentation site](docs/index.html) for detailed information about:
- Installation and setup
- Deployment guides
- API documentation
- Contributing guidelines

## Quick Start

For local development:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

For deployment instructions, see our [deployment guide](docs/DEPLOYMENT.md).

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Bluesky API (@atproto/api)
- **UI Components**: shadcn/ui

## GitHub Pages Deployment

This project is configured for GitHub Pages deployment. The `/docs` directory contains the static site files that will be served through GitHub Pages.

To enable GitHub Pages:
1. Go to your repository settings
2. Navigate to the "Pages" section
3. Select the `main` branch and `/docs` folder
4. Save the settings

Your documentation will be available at `https://<username>.github.io/<repository-name>`.

## Contributing

Feel free to submit issues and enhancement requests to help improve S.H.I.E.L.D.'s effectiveness in protecting the Bluesky community.

## Note

This project is designed to help Bluesky users collaborate on maintaining safer online spaces through shared block lists. Always review blocks before applying them to ensure they align with your moderation preferences.