# S.H.I.E.L.D. - Community Block List Management for Bluesky

S.H.I.E.L.D. (Spam, Hate, Interference, Exploitation, and Liability Defense) is a collaborative block list management web application designed to enhance online safety for Bluesky social media users through community-driven moderation tools.

## Features

- **Bluesky Authentication**: Secure login using your Bluesky credentials
- **Block List Management**: View and manage your blocked accounts
- **Block Import**: Import your existing Bluesky blocks with one click
- **Community Collaboration**: Share and discover blocked accounts from other users
- **Report System**: Flag suspicious or incorrectly blocked accounts for review

## How to Use

1. **Sign In**:
   - Click "Sign In with Bluesky"
   - Enter your Bluesky handle/email and app password
   - Note: Create an app password in your Bluesky settings for added security

2. **Managing Blocks**:
   - View your current block list in the main dashboard
   - Click "Import My Blocks" to sync your Bluesky blocks
   - Remove blocks by clicking the trash icon (only for blocks you added)
   - Report suspicious blocks using the flag icon

3. **Statistics**:
   - View total blocked accounts and contributor counts
   - Track community participation through the dashboard

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Bluesky API (@atproto/api)
- **UI Components**: shadcn/ui

## Contributing

Feel free to submit issues and enhancement requests to help improve S.H.I.E.L.D.'s effectiveness in protecting the Bluesky community.

## Note

This project is designed to help Bluesky users collaborate on maintaining safer online spaces through shared block lists. Always review blocks before applying them to ensure they align with your moderation preferences.
