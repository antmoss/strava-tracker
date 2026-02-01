#!/usr/bin/env node

import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the start and end of the current week (Monday to Sunday)
 */
function getCurrentWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday = 0

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday,
    end: sunday,
    startISO: monday.toISOString().split('T')[0],
    endISO: sunday.toISOString().split('T')[0]
  };
}

/**
 * Exchange refresh token for access token
 */
async function getAccessToken(clientId, clientSecret, refreshToken) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch athlete activities from Strava API
 */
async function fetchActivities(accessToken, afterTimestamp, beforeTimestamp) {
  const url = new URL('https://www.strava.com/api/v3/athlete/activities');
  url.searchParams.append('after', Math.floor(afterTimestamp / 1000));
  url.searchParams.append('before', Math.floor(beforeTimestamp / 1000));
  url.searchParams.append('per_page', '200'); // Max allowed by Strava

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Aggregate activities by type (cycling and running)
 */
function aggregateActivities(activities) {
  const cycling = { count: 0, distance_km: 0, time_hours: 0, elevation_m: 0 };
  const running = { count: 0, distance_km: 0, time_hours: 0, elevation_m: 0 };

  for (const activity of activities) {
    const stats = {
      distance: (activity.distance || 0) / 1000, // meters to km
      movingTime: (activity.moving_time || 0) / 3600, // seconds to hours
      elevationGain: activity.total_elevation_gain || 0
    };

    if (activity.type === 'Ride') {
      cycling.count++;
      cycling.distance_km += stats.distance;
      cycling.time_hours += stats.movingTime;
      cycling.elevation_m += stats.elevationGain;
    } else if (activity.type === 'Run') {
      running.count++;
      running.distance_km += stats.distance;
      running.time_hours += stats.movingTime;
      running.elevation_m += stats.elevationGain;
    }
  }

  // Round values to 2 decimal places
  const round = (num) => Math.round(num * 100) / 100;

  return {
    cycling: {
      count: cycling.count,
      distance_km: round(cycling.distance_km),
      time_hours: round(cycling.time_hours),
      elevation_m: round(cycling.elevation_m)
    },
    running: {
      count: running.count,
      distance_km: round(running.distance_km),
      time_hours: round(running.time_hours),
      elevation_m: round(running.elevation_m)
    }
  };
}

/**
 * Process a single athlete
 */
async function processAthlete(clientId, clientSecret, athlete, weekBounds) {
  console.log(`Processing athlete: ${athlete.name} (ID: ${athlete.id})`);

  try {
    // Get access token
    const accessToken = await getAccessToken(clientId, clientSecret, athlete.token);

    // Fetch activities for current week
    const activities = await fetchActivities(
      accessToken,
      weekBounds.start.getTime(),
      weekBounds.end.getTime()
    );

    console.log(`  Found ${activities.length} activities`);

    // Aggregate by activity type
    const aggregated = aggregateActivities(activities);

    return {
      id: athlete.id,
      name: athlete.name,
      weekly: aggregated
    };
  } catch (error) {
    console.error(`  Error processing athlete ${athlete.name}:`, error.message);
    return {
      id: athlete.id,
      name: athlete.name,
      error: error.message,
      weekly: {
        cycling: { count: 0, distance_km: 0, time_hours: 0, elevation_m: 0 },
        running: { count: 0, distance_km: 0, time_hours: 0, elevation_m: 0 }
      }
    };
  }
}

/**
 * Main execution
 */
async function main() {
  // Read environment variables
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const athletesJson = process.env.STRAVA_ATHLETES;

  if (!clientId || !clientSecret || !athletesJson) {
    console.error('Missing required environment variables:');
    console.error('  STRAVA_CLIENT_ID');
    console.error('  STRAVA_CLIENT_SECRET');
    console.error('  STRAVA_ATHLETES');
    process.exit(1);
  }

  let athletes;
  try {
    athletes = JSON.parse(athletesJson);
  } catch (error) {
    console.error('Failed to parse STRAVA_ATHLETES JSON:', error.message);
    process.exit(1);
  }

  if (!Array.isArray(athletes) || athletes.length === 0) {
    console.error('STRAVA_ATHLETES must be a non-empty array');
    process.exit(1);
  }

  // Get current week bounds
  const weekBounds = getCurrentWeekBounds();
  console.log(`Fetching activities for week: ${weekBounds.startISO} to ${weekBounds.endISO}`);

  // Process each athlete
  const athleteResults = [];
  for (const athlete of athletes) {
    const result = await processAthlete(clientId, clientSecret, athlete, weekBounds);
    athleteResults.push(result);
  }

  // Build output structure
  const output = {
    lastUpdated: new Date().toISOString(),
    weekStart: weekBounds.startISO,
    weekEnd: weekBounds.endISO,
    athletes: athleteResults
  };

  // Write to data/weekly.json
  const outputPath = join(__dirname, '..', 'data', 'weekly.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\nData written to: ${outputPath}`);
  console.log('Summary:');
  for (const athlete of athleteResults) {
    console.log(`  ${athlete.name}:`);
    console.log(`    Cycling: ${athlete.weekly.cycling.count} rides, ${athlete.weekly.cycling.distance_km} km`);
    console.log(`    Running: ${athlete.weekly.running.count} runs, ${athlete.weekly.running.distance_km} km`);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
