const fetch = require('node-fetch');

class AutotaskClient {
  constructor({ apiUser, apiSecret, integrationCode, zone }) {
    // Validate and fix common zone URL mistakes
    let cleanZone = (zone || '').trim().replace(/\/+$/, '');

    // Detect web portal URLs and auto-correct to API URL
    const portalMatch = cleanZone.match(/https?:\/\/ww(\d+)\.autotask\.net/i);
    if (portalMatch) {
      const zoneNum = portalMatch[1];
      const corrected = `https://webservices${zoneNum}.autotask.net`;
      console.warn(`[Autotask] WARNING: Zone "${cleanZone}" looks like the web portal, not the API.`);
      console.warn(`[Autotask] Auto-correcting to "${corrected}"`);
      console.warn(`[Autotask] Please update AUTOTASK_API_ZONE in your .env file to: ${corrected}`);
      cleanZone = corrected;
    }

    this.zone = cleanZone;
    this.baseUrl = `${cleanZone}/ATServicesRest/V1.0`;
    this.headers = {
      'Content-Type': 'application/json',
      'UserName': apiUser,
      'Secret': apiSecret,
      'ApiIntegrationCode': integrationCode,
    };

    console.log(`[Autotask] Client initialized — Zone: ${cleanZone}`);
    console.log(`[Autotask] API Base URL: ${this.baseUrl}`);
    console.log(`[Autotask] API User: ${apiUser ? apiUser.substring(0, 3) + '***' : '(empty)'}`);
    console.log(`[Autotask] Integration Code: ${integrationCode ? integrationCode.substring(0, 4) + '***' : '(empty)'}`);
  }

  async request(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const opts = { method, headers: this.headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      let hint = '';
      if (res.status === 401) {
        hint = ' — Check AUTOTASK_API_USER, AUTOTASK_API_SECRET, and AUTOTASK_API_INTEGRATION_CODE in your .env file';
      } else if (res.status === 403) {
        hint = ' — Check AUTOTASK_API_ZONE in your .env file (should be https://webservicesN.autotask.net, not the web portal URL)';
      }
      console.error(`[Autotask] ${method} ${url} → ${res.status}${hint}`);
      throw new Error(`Autotask API ${res.status}: ${text}`);
    }
    return res.json();
  }

  /**
   * Paginated query — follows nextPageUrl to fetch all matching records.
   */
  async queryAll(endpoint, filter) {
    let allItems = [];
    const data = await this.request(endpoint, 'POST', filter);
    allItems = allItems.concat(data.items || []);

    let nextUrl = data.pageDetails && data.pageDetails.nextPageUrl;
    while (nextUrl) {
      const res = await fetch(nextUrl, { method: 'GET', headers: this.headers });
      if (!res.ok) break;
      const page = await res.json();
      allItems = allItems.concat(page.items || []);
      nextUrl = page.pageDetails && page.pageDetails.nextPageUrl;
    }
    return allItems;
  }

  /**
   * Fetch open tickets, optionally filtered by queue/status/date range.
   * Autotask REST API uses a query object for filtering.
   */
  async getOpenTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    const filter = {
      filter: [
        { op: 'noteq', field: 'status', value: 5 }, // 5 = Complete
        { op: 'noteq', field: 'status', value: 13 }, // 13 = Waiting Customer
      ],
    };
    if (queueId) {
      filter.filter.push({ op: 'eq', field: 'queueID', value: queueId });
    }
    if (dateFrom) {
      filter.filter.push({ op: 'gte', field: 'createDate', value: dateFrom });
    }
    if (dateTo) {
      filter.filter.push({ op: 'lte', field: 'createDate', value: dateTo });
    }
    filter.MaxRecords = maxRecords;

    const data = await this.request('/Tickets/query', 'POST', filter);
    return data.items || [];
  }

  /**
   * Fetch all tickets in a date range regardless of status.
   */
  async getAllTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    const filter = {
      filter: [],
      MaxRecords: maxRecords,
    };
    if (queueId) {
      filter.filter.push({ op: 'eq', field: 'queueID', value: queueId });
    }
    if (dateFrom) {
      filter.filter.push({ op: 'gte', field: 'createDate', value: dateFrom });
    }
    if (dateTo) {
      filter.filter.push({ op: 'lte', field: 'createDate', value: dateTo });
    }

    return this.queryAll('/Tickets/query', filter);
  }

  /**
   * Fetch completed tickets in a date range for historical analysis.
   */
  async getCompletedTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    const filter = {
      filter: [
        { op: 'eq', field: 'status', value: 5 }, // 5 = Complete
      ],
    };
    if (queueId) {
      filter.filter.push({ op: 'eq', field: 'queueID', value: queueId });
    }
    if (dateFrom) {
      filter.filter.push({ op: 'gte', field: 'createDate', value: dateFrom });
    }
    if (dateTo) {
      filter.filter.push({ op: 'lte', field: 'createDate', value: dateTo });
    }
    filter.MaxRecords = maxRecords;

    const data = await this.request('/Tickets/query', 'POST', filter);
    return data.items || [];
  }

  /**
   * Fetch a single ticket by ID with full details.
   */
  async getTicket(ticketId) {
    const data = await this.request(`/Tickets/${ticketId}`);
    return data.item;
  }

  /**
   * Get ticket notes/comments for deeper analysis.
   */
  async getTicketNotes(ticketId) {
    const data = await this.request(
      `/Tickets/${ticketId}/Notes?search={"MaxRecords":50}`
    );
    return data.items || [];
  }

  /**
   * Fetch all queues (for the filter dropdown).
   */
  async getQueues() {
    const data = await this.request(
      '/Tickets/entityInformation/fields'
    );
    // Find the queueID field and return its picklist values
    const queueField = (data.fields || []).find(f => f.name === 'queueID');
    return queueField ? queueField.picklistValues || [] : [];
  }

  /**
   * Fetch issue/sub-issue types for better categorization.
   */
  async getIssueTypes() {
    const data = await this.request(
      '/Tickets/entityInformation/fields'
    );
    const issueField = (data.fields || []).find(f => f.name === 'issueType');
    return issueField ? issueField.picklistValues || [] : [];
  }

  /**
   * Fetch active resources (technicians/SDEs) from Autotask.
   * Uses the Resources query endpoint to get all active resources.
   */
  async getResources() {
    const filter = {
      filter: [
        { op: 'eq', field: 'isActive', value: true },
        { op: 'eq', field: 'resourceType', value: 'Employee' },
      ],
      MaxRecords: 500,
    };

    const data = await this.request('/Resources/query', 'POST', filter);
    return (data.items || []).map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      name: `${r.firstName} ${r.lastName}`,
    }));
  }

  /**
   * Fetch time entries for a set of ticket IDs.
   * Returns a map of ticketID -> total hours worked.
   * Uses queryAll to paginate through all time entries per batch.
   */
  async getTimeEntriesForTickets(ticketIds) {
    if (!ticketIds || ticketIds.length === 0) return {};

    const hoursMap = {};
    let failedBatches = 0;

    // Autotask limits query complexity, batch ticket IDs
    const batchSize = 50;
    for (let i = 0; i < ticketIds.length; i += batchSize) {
      const batch = ticketIds.slice(i, i + batchSize);

      const filter = {
        filter: batch.map(id => ({
          op: 'eq',
          field: 'ticketID',
          value: id,
        })),
        MaxRecords: 500,
      };

      // If multiple ticket IDs, wrap in an OR group
      if (batch.length > 1) {
        filter.filter = [{
          op: 'or',
          items: batch.map(id => ({
            op: 'eq',
            field: 'ticketID',
            value: id,
          })),
        }];
      }

      try {
        // Use queryAll to paginate through ALL time entries for this batch
        const entries = await this.queryAll('/TimeEntries/query', filter);
        for (const entry of entries) {
          const tid = entry.ticketID;
          if (!hoursMap[tid]) hoursMap[tid] = 0;
          hoursMap[tid] += (entry.hoursWorked || 0);
        }
      } catch (err) {
        failedBatches++;
        console.warn(`[TimeEntries] Batch ${Math.floor(i / batchSize) + 1} failed (tickets ${i + 1}-${Math.min(i + batchSize, ticketIds.length)}): ${err.message}`);
      }
    }

    if (failedBatches > 0) {
      console.warn(`[TimeEntries] ${failedBatches} batch(es) failed out of ${Math.ceil(ticketIds.length / batchSize)}. Some tickets may show 0 worked hours.`);
    }

    return hoursMap;
  }
}

module.exports = AutotaskClient;
