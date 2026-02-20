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
}

module.exports = AutotaskClient;
