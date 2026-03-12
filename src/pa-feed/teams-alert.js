/**
 * Teams Alert Formatter for PA Cyber Watch Feed.
 * Formats incidents as Adaptive Cards and posts to Teams via webhook.
 * Also generates daily digest emails.
 */

const fetch = require('node-fetch');

class TeamsAlerter {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.TEAMS_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl;
    this.minConfidenceForAlert = options.minConfidenceForAlert || 50; // Medium+
  }

  isConfigured() {
    return this.enabled;
  }

  /**
   * Build an Adaptive Card for a single incident alert.
   */
  buildAlertCard(incident) {
    const bandColor = this._bandColor(incident.confidenceBand);
    const summary = incident.aiSummary?.text || '';
    const sourceList = (incident.allSources || [])
      .slice(0, 3)
      .map(s => `[${s.sourceName}](${s.url})`)
      .join(' | ');

    return {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'Container',
              style: bandColor === 'attention' ? 'attention' : 'default',
              items: [
                {
                  type: 'TextBlock',
                  text: 'PA Cyber Watch Alert',
                  weight: 'Bolder',
                  size: 'Medium',
                  color: bandColor,
                },
              ],
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Entity', value: incident.entityName || 'Unknown' },
                { title: 'County', value: incident.county || 'N/A' },
                { title: 'Type', value: incident.entityType || 'Unknown' },
                { title: 'Incident', value: incident.incidentLabel || incident.incidentType || 'Cyber Incident' },
                { title: 'Confidence', value: `${incident.confidenceScore}/100 (${incident.confidenceBand})` },
                { title: 'Sources', value: `${incident.crossSourceCount} independent source(s)` },
              ],
            },
            {
              type: 'TextBlock',
              text: summary || incident.firstMention?.headline || '',
              wrap: true,
              size: 'Small',
            },
            {
              type: 'TextBlock',
              text: sourceList ? `Sources: ${sourceList}` : '',
              wrap: true,
              size: 'Small',
              isSubtle: true,
            },
            {
              type: 'TextBlock',
              text: incident.mappedClientOrProspect
                ? 'CLIENT/PROSPECT MATCH - Immediate review recommended'
                : incident.confidenceScore >= 75
                  ? 'Action: Review for prospecting, client discussion, or local awareness'
                  : 'Action: Monitor for additional source validation',
              wrap: true,
              weight: 'Bolder',
              size: 'Small',
              color: incident.mappedClientOrProspect ? 'Attention' : 'Default',
            },
          ],
          actions: incident.bestSource?.url ? [
            {
              type: 'Action.OpenUrl',
              title: 'View Source',
              url: incident.bestSource.url,
            },
            {
              type: 'Action.OpenUrl',
              title: 'Open Dashboard',
              url: process.env.DASHBOARD_URL || '#',
            },
          ] : [],
        },
      }],
    };
  }

  /**
   * Build a daily digest card summarizing all incidents.
   */
  buildDigestCard(incidents, dateRange) {
    const high = incidents.filter(i => i.confidenceBand === 'High');
    const medium = incidents.filter(i => i.confidenceBand === 'Medium');
    const low = incidents.filter(i => i.confidenceBand === 'Low');

    const topIncidents = incidents.slice(0, 5).map(i =>
      `- **${i.entityName}** (${i.county || 'PA'}): ${i.incidentLabel || 'Incident'} — ${i.confidenceBand} confidence`
    ).join('\n');

    return {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `PA Cyber Watch Daily Digest`,
              weight: 'Bolder',
              size: 'Large',
            },
            {
              type: 'TextBlock',
              text: dateRange || new Date().toLocaleDateString(),
              isSubtle: true,
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Total Incidents', value: String(incidents.length) },
                { title: 'High Confidence', value: String(high.length) },
                { title: 'Medium Confidence', value: String(medium.length) },
                { title: 'Low / Chatter', value: String(low.length) },
              ],
            },
            {
              type: 'TextBlock',
              text: '**Top Items:**',
              weight: 'Bolder',
            },
            {
              type: 'TextBlock',
              text: topIncidents || 'No incidents detected.',
              wrap: true,
              size: 'Small',
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Open Dashboard',
              url: process.env.DASHBOARD_URL || '#',
            },
          ],
        },
      }],
    };
  }

  /**
   * Post a card to Teams webhook.
   */
  async postToTeams(card) {
    if (!this.enabled) {
      console.log('[TeamsAlerter] Webhook not configured, skipping post');
      return { sent: false, reason: 'not_configured' };
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
        timeout: 10000,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[TeamsAlerter] HTTP ${response.status}: ${text}`);
        return { sent: false, reason: `http_${response.status}` };
      }

      return { sent: true };
    } catch (err) {
      console.error(`[TeamsAlerter] Error: ${err.message}`);
      return { sent: false, reason: err.message };
    }
  }

  /**
   * Send alerts for all high/medium incidents.
   */
  async alertOnIncidents(incidents) {
    const alertable = incidents.filter(i =>
      i.confidenceScore >= this.minConfidenceForAlert
    );

    const results = [];
    for (const incident of alertable) {
      const card = this.buildAlertCard(incident);
      const result = await this.postToTeams(card);
      results.push({ incident: incident.entityName, ...result });

      if (this.enabled) {
        await new Promise(r => setTimeout(r, 1000)); // Rate limit
      }
    }

    return results;
  }

  _bandColor(band) {
    switch (band) {
      case 'High': return 'Attention';
      case 'Medium': return 'Warning';
      case 'Low': return 'Accent';
      default: return 'Default';
    }
  }
}

module.exports = { TeamsAlerter };
