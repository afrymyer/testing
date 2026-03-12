/**
 * AI Summarization Layer for PA Cyber Watch Feed.
 * Uses Anthropic Claude to generate structured incident summaries
 * once an item passes minimum confidence threshold.
 */

const Anthropic = require('@anthropic-ai/sdk');

class IncidentSummarizer {
  constructor(options = {}) {
    this.minConfidenceForSummary = options.minConfidenceForSummary || 40;
    this.client = null;
    this.enabled = false;

    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic();
      this.enabled = true;
    }
  }

  isConfigured() {
    return this.enabled;
  }

  /**
   * Generate a structured summary for a deduplicated incident group.
   */
  async summarizeIncident(incident) {
    if (!this.enabled) {
      return this._fallbackSummary(incident);
    }

    if (incident.confidenceScore < this.minConfidenceForSummary) {
      return this._fallbackSummary(incident);
    }

    const sourceList = incident.allSources
      .map(s => `- ${s.sourceName}: "${s.headline}" (${s.publishedAt})`)
      .join('\n');

    const prompt = `You are a cybersecurity incident analyst monitoring Pennsylvania organizations.
Summarize this potential incident in a concise, structured format.

Entity: ${incident.entityName}
Entity Type: ${incident.entityType}
County: ${incident.county}
Incident Type: ${incident.incidentLabel || incident.incidentType}
Confidence Score: ${incident.confidenceScore}/100
Confidence Band: ${incident.confidenceBand}
Number of Sources: ${incident.crossSourceCount}

Sources:
${sourceList}

First Mention: ${incident.firstMention.headline} (${incident.firstMention.sourceName}, ${incident.firstMention.publishedAt})
Most Authoritative: ${incident.bestSource.headline} (${incident.bestSource.sourceName})
Latest Update: ${incident.latestUpdate.headline} (${incident.latestUpdate.sourceName}, ${incident.latestUpdate.publishedAt})

Provide a structured summary with these exact fields:
1. Organization: [name]
2. Type: [entity type]
3. Incident: [brief incident description]
4. Status: [confidence assessment]
5. What happened: [2-3 sentence summary of what is known]
6. Source(s): [key sources]
7. Next step: [recommended next action for an MSP monitoring this]

Keep it concise and factual. Do not speculate beyond what the sources indicate.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const summary = response.content[0]?.text || '';
      return {
        generated: true,
        text: summary,
        model: 'claude-haiku-4-5-20251001',
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error(`[Summarizer] AI error: ${err.message}`);
      return this._fallbackSummary(incident);
    }
  }

  /**
   * Batch summarize multiple incidents.
   */
  async summarizeBatch(incidents) {
    const results = [];
    for (const incident of incidents) {
      const summary = await this.summarizeIncident(incident);
      results.push({ ...incident, aiSummary: summary });
      // Small delay to avoid rate limits
      if (this.enabled) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return results;
  }

  /**
   * Generate a fallback summary without AI.
   */
  _fallbackSummary(incident) {
    const sourcesStr = incident.allSources
      ? incident.allSources.slice(0, 3).map(s => s.sourceName).join(', ')
      : incident.sourceName || 'Unknown';

    return {
      generated: false,
      text: `Organization: ${incident.entityName || 'Unknown'}
Type: ${incident.entityType || 'Unknown'}
Incident: ${incident.incidentLabel || incident.incidentType || 'Cyber Incident'}
Status: ${incident.confidenceBand || 'Unknown'} confidence
What happened: ${incident.firstMention?.headline || incident.headline || 'Details pending review.'}
Source(s): ${sourcesStr}
Next step: ${incident.confidenceScore >= 50
  ? 'Watch for official statement, additional source validation.'
  : 'Hold for analyst review; seek second-source validation.'}`,
      model: null,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = { IncidentSummarizer };
