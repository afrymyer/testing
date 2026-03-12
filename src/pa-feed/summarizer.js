/**
 * Summarization Layer for PA Cyber Watch Feed.
 * Generates structured incident summaries from source data using templates.
 */

class IncidentSummarizer {
  constructor(options = {}) {
    this.minConfidenceForSummary = options.minConfidenceForSummary || 40;
  }

  isConfigured() {
    return true;
  }

  /**
   * Generate a structured summary for a deduplicated incident group.
   */
  async summarizeIncident(incident) {
    if (incident.confidenceScore < this.minConfidenceForSummary) {
      return this._buildSummary(incident);
    }
    return this._buildSummary(incident);
  }

  /**
   * Batch summarize multiple incidents.
   */
  async summarizeBatch(incidents) {
    return incidents.map(incident => ({
      ...incident,
      aiSummary: this._buildSummary(incident),
    }));
  }

  /**
   * Build a structured summary from incident data.
   */
  _buildSummary(incident) {
    const sourcesStr = incident.allSources
      ? incident.allSources.slice(0, 3).map(s => s.sourceName).join(', ')
      : incident.sourceName || 'Unknown';

    const headline = incident.firstMention?.headline || incident.headline || 'Details pending review.';
    const bestHeadline = incident.bestSource?.headline || headline;

    let nextStep;
    if (incident.confidenceScore >= 75) {
      nextStep = 'Review for prospecting, client discussion, or local awareness. Watch for official statement.';
    } else if (incident.confidenceScore >= 50) {
      nextStep = 'Watch for official statement, law enforcement mention, or second-source validation.';
    } else {
      nextStep = 'Hold for analyst review; seek second-source validation.';
    }

    return {
      generated: true,
      text: `Organization: ${incident.entityName || 'Unknown'}
Type: ${incident.entityType || 'Unknown'}
Incident: ${incident.incidentLabel || incident.incidentType || 'Cyber Incident'}
Status: ${incident.confidenceBand || 'Unknown'} confidence
What happened: ${bestHeadline}
Source(s): ${sourcesStr}
Next step: ${nextStep}`,
      model: null,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = { IncidentSummarizer };
