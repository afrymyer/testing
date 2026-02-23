const fetch = require('node-fetch');

class AutotaskClient {
  constructor({ apiUser, apiSecret, integrationCode, zone }) {
    this.baseUrl = `${zone}/ATServicesRest/V1.0`;
    this.headers = {
      'Content-Type': 'application/json',
      'UserName': apiUser,
      'Secret': apiSecret,
      'ApiIntegrationCode': integrationCode,
    };
  }

  async request(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: this.headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${endpoint}`, opts);
    if (!res.ok) {
      const text = await res.text();
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
   */
  async getTimeEntriesForTickets(ticketIds) {
    if (!ticketIds || ticketIds.length === 0) return {};

    const hoursMap = {};

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
        const data = await this.request('/TimeEntries/query', 'POST', filter);
        for (const entry of (data.items || [])) {
          const tid = entry.ticketID;
          if (!hoursMap[tid]) hoursMap[tid] = 0;
          hoursMap[tid] += (entry.hoursWorked || 0);
        }
      } catch {
        // If time entries fail, continue without them
      }
    }

    return hoursMap;
  }
}

module.exports = AutotaskClient;
