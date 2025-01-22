# S.H.I.E.L.D.

**Social Harmony, Innovation, Empowerment, Liberty and Decentralization**

A content management application for BlueSky that provides advanced block list management and automated firewall protection through collective moderation.

## Features

- **BlueSky API Integration**: Secure authentication and API connections
- **Automated Firewall Protection**: 
  - Automatically blocks problematic accounts across all connected users
  - Self-block prevention to maintain account access
  - Real-time synchronization with BlueSky's blocking system
- **Community-Driven Protection**:
  - Shared block list database
  - Automatic propagation of blocks to protect all connected users
  - Category management for organized moderation
- **User-Friendly Interface**:
  - Dashboard with real-time statistics
  - Block reason tracking
  - Category tagging system

## How It Works

1. Users connect their BlueSky account to S.H.I.E.L.D.
2. The application maintains a database of blocked accounts from all connected users
3. When any user blocks an account:
   - The block is added to the S.H.I.E.L.D. database
   - All connected users are protected by automatically blocking that account
4. Self-block prevention ensures users can't accidentally block themselves
5. The firewall stays active as long as users remain connected to S.H.I.E.L.D.

## Deployment Instructions

1. **Prerequisites**
   - Node.js 20 or later
   - PostgreSQL database
   - A Replit account

2. **Environment Variables**
   Make sure you have the following environment variables set:
   ```
   DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
   ```

3. **Installation**
   ```bash
   npm install
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

6. **Start the Application**
   ```bash
   npm start
   ```

The application will be available on port 5000.

## Development

To run the application in development mode:
```bash
npm run dev
```

## Security Considerations

- User credentials are never stored, only BlueSky session tokens
- All database queries are protected against SQL injection
- API endpoints require authentication
- Block lists are private by default
- Built-in protection against self-blocking
- Automatic synchronization with BlueSky's blocking system

## Maintenance

- Regularly update dependencies for security patches
- Monitor the database size and clean up unused categories
- Keep BlueSky API tokens up to date
- Check logs for any unusual blocking patterns
- Consider implementing rate limiting for block operations

## License

MIT License