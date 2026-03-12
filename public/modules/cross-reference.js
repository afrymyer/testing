/**
 * PA Feed ↔ Ticket Cross-Reference Module
 *
 * Links PA Cyber Watch Feed incidents with ticket data by matching
 * keywords, entity names, and threat types against ticket content.
 */

(function() {
  let paIncidents = [];
  let crossRefResults = [];

  /**
   * Fetch PA Feed incidents from the standalone PA feed server.
   */
  async function fetchPAIncidents() {
    const paPort = 3001;
    try {
      const res = await fetch(`/api/cross-reference`);
      const config = await res.json();

      // Try to fetch from PA Feed server
      const incRes = await fetch(config.endpoints.paFeed).catch(() => null);
      if (!incRes || !incRes.ok) {
        return [];
      }
      const data = await incRes.json();
      return Array.isArray(data) ? data : (data.incidents || []);
    } catch {
      return [];
    }
  }

  /**
   * Cross-reference PA incidents with loaded tickets.
   * Matches based on:
   * - Entity names appearing in ticket titles/descriptions
   * - Threat keywords (ransomware, breach, phishing) in tickets
   * - Timing correlation (incidents near ticket creation dates)
   */
  function crossReference(tickets, incidents) {
    if (!tickets || !incidents || tickets.length === 0 || incidents.length === 0) {
      return [];
    }

    const results = [];
    const threatKeywords = [
      'ransomware', 'breach', 'phishing', 'malware', 'hack',
      'compromised', 'security incident', 'data leak', 'unauthorized access',
      'virus', 'trojan', 'exploit', 'vulnerability', 'cve-',
    ];

    for (const incident of incidents) {
      const incidentText = [
        incident.title || '',
        incident.description || '',
        incident.summary || '',
      ].join(' ').toLowerCase();

      const matchedTickets = [];

      for (const ticket of tickets) {
        const ticketText = [
          ticket.title || '',
          ticket.description || '',
          ticket.companyName || '',
        ].join(' ').toLowerCase();

        let matchScore = 0;
        const matchReasons = [];

        // Check threat keyword overlap
        for (const kw of threatKeywords) {
          if (incidentText.includes(kw) && ticketText.includes(kw)) {
            matchScore += 30;
            matchReasons.push(`Shared threat keyword: "${kw}"`);
          }
        }

        // Check entity name matches
        if (incident.entity && ticket.companyName) {
          const entityName = (incident.entity.name || incident.entity || '').toLowerCase();
          const companyName = ticket.companyName.toLowerCase();
          if (entityName && companyName && (entityName.includes(companyName) || companyName.includes(entityName))) {
            matchScore += 50;
            matchReasons.push(`Entity match: ${incident.entity.name || incident.entity}`);
          }
        }

        // Timing correlation (within 7 days)
        if (incident.date && ticket.createDate) {
          const incDate = new Date(incident.date).getTime();
          const tickDate = new Date(ticket.createDate).getTime();
          const daysDiff = Math.abs(incDate - tickDate) / (1000 * 60 * 60 * 24);
          if (daysDiff <= 7) {
            matchScore += 20;
            matchReasons.push(`Created within ${Math.round(daysDiff)} days of incident`);
          }
        }

        if (matchScore >= 30) {
          matchedTickets.push({
            ticketId: ticket.ticketId,
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            companyName: ticket.companyName,
            matchScore,
            matchReasons,
          });
        }
      }

      if (matchedTickets.length > 0) {
        results.push({
          incident: {
            id: incident.id,
            title: incident.title,
            source: incident.source,
            confidence: incident.confidence,
            date: incident.date,
          },
          matchedTickets: matchedTickets.sort((a, b) => b.matchScore - a.matchScore),
        });
      }
    }

    return results.sort((a, b) => b.matchedTickets.length - a.matchedTickets.length);
  }

  /**
   * Auto-run cross-reference when tickets are loaded.
   * Results are stored and can be displayed in the UI.
   */
  async function runCrossReference() {
    if (!allTickets || allTickets.length === 0) return;

    paIncidents = await fetchPAIncidents();
    if (paIncidents.length === 0) return;

    crossRefResults = crossReference(allTickets, paIncidents);

    if (crossRefResults.length > 0) {
      showToast(`Found ${crossRefResults.length} potential threat-ticket correlations`);
    }
  }

  // Make accessible
  window.runCrossReference = runCrossReference;
  window.getCrossRefResults = () => crossRefResults;
})();
