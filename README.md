# Strava Weekly Tracker

Text-based Strava tracking for friends. Displays weekly cycling and running activity totals in a sleek monospace leaderboard.

## Features

- Weekly activity aggregation (Monday-Sunday)
- Support for multiple athletes
- Cycling and running statistics (rides/runs, distance, moving time, elevation)
- Dark theme with monospace aesthetic
- Automated weekly updates via GitHub Actions
- Leaderboard sorted by distance

## Quick Start

### 1. Create a Strava API Application

1. Visit [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application with these details:
   - **Application Name**: Weekly Tracker
   - **Category**: Visualizer
   - **Website**: https://antonymoss.co.uk (or your domain)
   - **Application Description**: Weekly activity tracker for friends
   - **Authorization Callback Domain**: `localhost`

3. Note your **Client ID** and **Client Secret**

### 2. Get Your Refresh Token

Run the token helper script locally:

```bash
# Clone/download the repository
cd strava-tracker

# Install dependencies
npm install

# Set up environment variables
export STRAVA_CLIENT_ID=your_client_id_here
export STRAVA_CLIENT_SECRET=your_client_secret_here

# Start the authorization flow
npm run token
```

This will:
1. Open a browser window to authorize the app with Strava
2. Handle the OAuth callback
3. Display your **Access Token** and **Refresh Token**
4. Print instructions for GitHub secrets

**Save the Refresh Token** - you'll need this for the next step.

### 3. Configure GitHub Secrets

Add these secrets to your GitHub repository:

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Value |
|-------------|-------|
| `STRAVA_CLIENT_ID` | Your Client ID from step 1 |
| `STRAVA_CLIENT_SECRET` | Your Client Secret from step 1 |
| `STRAVA_ATHLETES` | JSON array (see format below) |

**STRAVA_ATHLETES format** (required):

```json
[
  {
    "id": 11884715,
    "name": "Ant M",
    "token": "your_refresh_token_from_step_2"
  },
  {
    "id": 987654321,
    "name": "Friend Name",
    "token": "their_refresh_token"
  }
]
```

Each athlete object requires:
- `id` - Their Strava athlete ID (visible in their profile URL)
- `name` - Display name for leaderboards
- `token` - Their refresh token (they must run `npm run token` separately)

### 4. Enable GitHub Pages

1. Go to **Settings → Pages**
2. Set **Source** to `main` branch
3. Save

Your site will be available at `https://username.github.io/strava-tracker`

### 5. Custom Domain (Optional)

To use a custom domain like `antonymoss.co.uk`:

1. Add a **CNAME** DNS record pointing to `username.github.io`
2. Go to **Settings → Pages → Custom domain**
3. Enter your domain (e.g., `antonymoss.co.uk`)
4. Enable HTTPS

The tracker will auto-update every 6 hours via GitHub Actions.

## Adding Friends

To add a friend to the leaderboard:

1. **They run locally**: Have them clone the repo and run `npm run token` with their own Strava app credentials
2. **They share the refresh token**: Have them copy the Refresh Token from the terminal output
3. **You update the secret**: Add their athlete info to `STRAVA_ATHLETES` in GitHub Secrets:
   ```json
   [
     {"id": 11884715, "name": "Ant M", "token": "..."},
     {"id": 12345678, "name": "Friend", "token": "..."}
   ]
   ```

## Manual Data Refresh

To update stats immediately (without waiting 6 hours):

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Fetch Strava Data** workflow
4. Click **Run workflow**
5. Wait for it to complete
6. Refresh the leaderboard page

## Data Format

The app fetches weekly data and stores it in `data/weekly.json`:

```json
{
  "lastUpdated": "2025-02-01T12:00:00Z",
  "weekStart": "2025-01-27",
  "weekEnd": "2025-02-02",
  "athletes": [
    {
      "id": 11884715,
      "name": "Ant M",
      "cycling": {
        "count": 3,
        "distance_km": 85.2,
        "time_hours": 4.5,
        "elevation_m": 650
      },
      "running": {
        "count": 2,
        "distance_km": 12.5,
        "time_hours": 1.2,
        "elevation_m": 80
      }
    }
  ]
}
```

## Scripts

### `npm run token`

Initiates OAuth flow to get your Strava refresh token. Run locally with your Client ID and Secret set as environment variables.

### `npm run fetch`

Fetches weekly activity data for all configured athletes and writes to `data/weekly.json`. Runs automatically via GitHub Actions every 6 hours.

## Leaderboards

Two leaderboards display:

- **Cycling Stats**: Sorted by distance, shows rides, km, moving hours, and elevation
- **Running Stats**: Sorted by distance, shows runs, km, moving hours, and elevation

Only athletes with activity in the current week appear on the leaderboards. Athletes are sorted by distance in descending order.

## Troubleshooting

### "Port 3000 is already in use" when running `npm run token`

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Then try again
npm run token
```

### GitHub Actions workflow fails

Check the **Actions** tab in your repository:

1. Click the failed run
2. Click **Fetch Strava Data** job
3. Expand logs to see error messages
4. Common issues:
   - Missing or incorrect GitHub Secrets
   - Invalid JSON in `STRAVA_ATHLETES`
   - Refresh token expired (get a new one with `npm run token`)

### Leaderboard shows "Unable to Load Leaderboard"

1. Check browser console for error messages (F12)
2. Verify `data/weekly.json` exists in your repository
3. Run the fetch workflow manually from Actions tab
4. Ensure GitHub Pages is enabled in Settings

### No data appearing on leaderboard

1. Verify athletes have activities in the current week
2. Check `data/weekly.json` has been updated recently
3. Manually trigger the workflow: Actions → Fetch Strava Data → Run workflow
4. Wait for workflow to complete and refresh the page

## Environment Variables

When running `npm run token` or `npm run fetch` locally:

| Variable | Required | Description |
|----------|----------|-------------|
| `STRAVA_CLIENT_ID` | Yes | Your Strava app Client ID |
| `STRAVA_CLIENT_SECRET` | Yes | Your Strava app Client Secret |
| `STRAVA_ATHLETES` | Yes (for fetch only) | JSON array of athlete objects |

## Permissions

The app requests `activity:read_all` scope, which allows reading:
- All activities (public and private)
- Activity statistics
- Athlete profile information

No write access is requested.

## License

MIT
