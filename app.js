// Strava Weekly Leaderboard App

class StravaLeaderboard {
  constructor() {
    this.data = null;
    this.init();
  }

  async init() {
    try {
      await this.fetchData();
      this.render();
    } catch (error) {
      this.renderError(error);
    }
  }

  async fetchData() {
    const response = await fetch('data/weekly.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    this.data = await response.json();
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  renderHeader() {
    const { lastUpdated, weekStart, weekEnd } = this.data;

    document.getElementById('last-updated').textContent =
      `Last updated: ${this.formatDate(lastUpdated)} at ${this.formatTime(lastUpdated)}`;
    document.getElementById('week-range').textContent =
      `Week: ${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)}`;
  }

  createTable(type) {
    const athletes = this.data.athletes
      .map(athlete => ({
        name: athlete.name,
        ...athlete.weekly[type]
      }))
      .filter(athlete => athlete.distance_km > 0)
      .sort((a, b) => b.distance_km - a.distance_km);

    if (athletes.length === 0) {
      return `<div class="no-data">No ${type} data for this week</div>`;
    }

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const countLabel = type === 'cycling' ? 'Rides' : 'Runs';

    let table = `
      <div class="table-container">
        <h2>${typeLabel} Leaderboard</h2>
        <table>
          <thead>
            <tr>
              <th class="athlete-col">Athlete</th>
              <th class="count-col">${countLabel}</th>
              <th class="distance-col">km</th>
              <th class="time-col">Hours</th>
              <th class="elevation-col">Elevation (m)</th>
            </tr>
          </thead>
          <tbody>
    `;

    athletes.forEach((athlete, index) => {
      const rowClass = index % 2 === 0 ? 'even' : 'odd';
      table += `
            <tr class="${rowClass}">
              <td class="athlete-col">${athlete.name}</td>
              <td class="count-col">${athlete.count}</td>
              <td class="distance-col">${athlete.distance_km.toFixed(1)}</td>
              <td class="time-col">${athlete.time_hours.toFixed(1)}</td>
              <td class="elevation-col">${athlete.elevation_m.toFixed(0)}</td>
            </tr>
      `;
    });

    table += `
          </tbody>
        </table>
      </div>
    `;

    return table;
  }

  render() {
    this.renderHeader();
    document.getElementById('cycling-table').innerHTML = this.createTable('cycling');
    document.getElementById('running-table').innerHTML = this.createTable('running');
  }

  renderError(error) {
    console.error('Error loading leaderboard:', error);

    const errorHTML = `
      <div class="error-message">
        <h2>⚠️ Unable to Load Leaderboard</h2>
        <p>${error.message}</p>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    `;

    document.getElementById('cycling-table').innerHTML = errorHTML;
    document.getElementById('running-table').innerHTML = '';
  }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new StravaLeaderboard());
} else {
  new StravaLeaderboard();
}
