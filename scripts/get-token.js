#!/usr/bin/env node

import http from 'http';
import { URL } from 'url';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const PORT = 3000;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing required environment variables');
  console.error('Please set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET');
  process.exit(1);
}

const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=activity:read_all`;

console.log('\n=== Strava OAuth Token Helper ===\n');
console.log('1. Visit this URL to authorize the application:\n');
console.log(authUrl);
console.log('\n2. After authorizing, you will be redirected to localhost:3000');
console.log('   The tokens will be displayed here.\n');
console.log('Waiting for callback...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error: No authorization code received</h1>');
      return;
    }

    try {
      // Exchange code for tokens
      const tokenUrl = 'https://www.strava.com/oauth/token';
      const tokenParams = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const data = await response.json();

      // Display success in browser
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Authorization Successful</title></head>
          <body>
            <h1>✓ Authorization Successful!</h1>
            <p>You can close this window and return to your terminal.</p>
          </body>
        </html>
      `);

      // Display tokens in console
      console.log('\n✓ Successfully obtained tokens!\n');
      console.log('Athlete Information:');
      console.log(`  ID: ${data.athlete.id}`);
      console.log(`  Name: ${data.athlete.firstname} ${data.athlete.lastname}`);
      console.log(`  Username: ${data.athlete.username || 'N/A'}`);
      console.log('\nTokens:');
      console.log(`  Access Token: ${data.access_token}`);
      console.log(`  Refresh Token: ${data.refresh_token}`);
      console.log(`  Expires At: ${new Date(data.expires_at * 1000).toISOString()}`);
      console.log('\n=== GitHub Secrets Setup ===\n');
      console.log('Add the following secrets to your GitHub repository:');
      console.log('(Settings → Secrets and variables → Actions → New repository secret)\n');
      console.log(`STRAVA_REFRESH_TOKEN=${data.refresh_token}`);
      console.log(`STRAVA_CLIENT_ID=${CLIENT_ID}`);
      console.log(`STRAVA_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log('\n');

      // Shutdown server
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (error) {
      console.error('\nError exchanging code for tokens:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error: ${error.message}</h1>`);
      process.exit(1);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 Not Found</h1>');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nError: Port ${PORT} is already in use.`);
    console.error('Please close the application using that port and try again.');
  } else {
    console.error('\nServer error:', error.message);
  }
  process.exit(1);
});
