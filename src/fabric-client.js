const sql = require('mssql');
const { ClientSecretCredential } = require('@azure/identity');

class FabricClient {
  constructor({ sqlServer, database, tenantId, clientId, clientSecret }) {
    this.sqlServer = sqlServer;
    this.database = database;
    this.credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    this.pool = null;

    console.log(`[Fabric] Client initialized — Server: ${sqlServer}, Database: ${database}`);
  }

  /**
   * Get an Azure AD access token for the Fabric SQL endpoint.
   */
  async getAccessToken() {
    const tokenResponse = await this.credential.getToken('https://database.windows.net/.default');
    return tokenResponse.token;
  }

  /**
   * Get or create a connection pool to the Fabric SQL endpoint.
   */
  async getPool() {
    if (this.pool && this.pool.connected) return this.pool;

    // Close stale pool if it exists but isn't connected
    if (this.pool) {
      try { await this.pool.close(); } catch (_) {}
      this.pool = null;
    }

    console.log(`[Fabric] Acquiring access token...`);
    const token = await this.getAccessToken();
    console.log(`[Fabric] Token acquired, connecting to ${this.sqlServer}...`);

    const config = {
      server: this.sqlServer,
      database: this.database,
      connectionTimeout: 30000,
      requestTimeout: 60000,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
      },
      authentication: {
        type: 'azure-active-directory-access-token',
        options: {
          token,
        },
      },
    };

    this.pool = await sql.connect(config);

    // Handle unexpected pool errors to prevent crashes
    this.pool.on('error', (err) => {
      console.warn(`[Fabric] Pool error (will reconnect on next query): ${err.message}`);
      try { this.pool.close(); } catch (_) {}
      this.pool = null;
    });

    // Refresh the pool when token expires (tokens last ~1 hour)
    if (this._tokenTimer) clearTimeout(this._tokenTimer);
    this._tokenTimer = setTimeout(() => {
      if (this.pool) {
        this.pool.close().catch(() => {});
        this.pool = null;
      }
    }, 50 * 60 * 1000); // Refresh after 50 minutes

    console.log(`[Fabric] Connected to SQL endpoint`);
    return this.pool;
  }

  /**
   * Execute a SQL query and return the recordset.
   * Retries up to 3 times on connection errors with exponential backoff.
   */
  async query(queryText, params = {}) {
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const pool = await this.getPool();
        const request = pool.request();

        for (const [name, value] of Object.entries(params)) {
          request.input(name, value);
        }

        const result = await request.query(queryText);
        return result.recordset || [];
      } catch (err) {
        const isRetryable = /socket hang up|ECONNRESET|ECONN|ESOCKET|ETIMEOUT|connection.*lost|connection.*closed|network/i.test(err.message);
        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.warn(`[Fabric] Connection error on attempt ${attempt + 1}/${maxRetries + 1} (retrying in ${delay}ms): ${err.message}`);
          // Force pool reset so next getPool() creates a fresh connection
          if (this.pool) {
            try { await this.pool.close(); } catch (_) {}
            this.pool = null;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        console.error(`[Fabric] Query failed after ${attempt + 1} attempt(s): ${err.message}`);
        throw err;
      }
    }
  }

  /**
   * Fetch open tickets (excludes Complete status=5 and Waiting Customer status=13).
   */
  async getOpenTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    let where = 'WHERE status != 5 AND status != 13';
    const params = {};

    if (queueId) {
      where += ' AND queueID = @queueId';
      params.queueId = queueId;
    }
    if (dateFrom) {
      where += ' AND createDate >= @dateFrom';
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      where += ' AND createDate <= @dateTo';
      params.dateTo = dateTo;
    }

    const queryText = `SELECT TOP (@maxRecords) * FROM Tickets ${where} ORDER BY createDate DESC`;
    params.maxRecords = maxRecords;

    return this.query(queryText, params);
  }

  /**
   * Fetch all tickets regardless of status.
   */
  async getAllTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    let where = 'WHERE 1=1';
    const params = {};

    if (queueId) {
      where += ' AND queueID = @queueId';
      params.queueId = queueId;
    }
    if (dateFrom) {
      where += ' AND createDate >= @dateFrom';
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      where += ' AND createDate <= @dateTo';
      params.dateTo = dateTo;
    }

    const queryText = `SELECT TOP (@maxRecords) * FROM Tickets ${where} ORDER BY createDate DESC`;
    params.maxRecords = maxRecords;

    return this.query(queryText, params);
  }

  /**
   * Fetch completed tickets for historical analysis.
   */
  async getCompletedTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    let where = 'WHERE status = 5';
    const params = {};

    if (queueId) {
      where += ' AND queueID = @queueId';
      params.queueId = queueId;
    }
    if (dateFrom) {
      where += ' AND createDate >= @dateFrom';
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      where += ' AND createDate <= @dateTo';
      params.dateTo = dateTo;
    }

    const queryText = `SELECT TOP (@maxRecords) * FROM Tickets ${where} ORDER BY createDate DESC`;
    params.maxRecords = maxRecords;

    return this.query(queryText, params);
  }

  /**
   * Fetch a single ticket by ID.
   */
  async getTicket(ticketId) {
    const rows = await this.query('SELECT * FROM Tickets WHERE id = @ticketId', { ticketId });
    return rows[0] || null;
  }

  /**
   * Update a ticket's fields.
   * NOTE: Fabric Lakehouse SQL endpoints are typically read-only.
   * This will work if using a Fabric Warehouse (read-write).
   * If using a Lakehouse, this will throw an error.
   */
  async updateTicket(ticketId, fields) {
    const setClauses = [];
    const params = { ticketId };
    let i = 0;

    for (const [key, value] of Object.entries(fields)) {
      const paramName = `field${i}`;
      setClauses.push(`[${key}] = @${paramName}`);
      params[paramName] = value;
      i++;
    }

    if (setClauses.length === 0) return null;

    const queryText = `UPDATE Tickets SET ${setClauses.join(', ')} WHERE id = @ticketId`;
    const pool = await this.getPool();
    const request = pool.request();
    for (const [name, value] of Object.entries(params)) {
      request.input(name, value);
    }
    await request.query(queryText);
    return this.getTicket(ticketId);
  }

  /**
   * Get ticket notes for a single ticket.
   */
  async getTicketNotes(ticketId) {
    return this.query(
      'SELECT TOP 50 * FROM TicketNotes WHERE ticketID = @ticketId ORDER BY createDateTime DESC',
      { ticketId }
    );
  }

  /**
   * Fetch queues — distinct queueID values from Tickets, or from a Queues lookup table if it exists.
   */
  async getQueues() {
    try {
      // Try a dedicated Queues lookup table first
      const rows = await this.query('SELECT * FROM Queues WHERE isActive = 1');
      return rows.map(r => ({ value: r.id || r.value, label: r.name || r.label }));
    } catch {
      // Fall back to distinct queueIDs from Tickets
      console.log('[Fabric] No Queues table found, deriving from Tickets');
      const rows = await this.query(
        'SELECT DISTINCT queueID as value, CAST(queueID AS VARCHAR) as label FROM Tickets WHERE queueID IS NOT NULL'
      );
      return rows;
    }
  }

  /**
   * Fetch priority picklist values.
   */
  async getPriorities() {
    try {
      const rows = await this.query('SELECT * FROM Priorities WHERE isActive = 1');
      return rows.map(r => ({ value: r.id || r.value, label: r.name || r.label }));
    } catch {
      console.log('[Fabric] No Priorities table found, deriving from Tickets');
      const rows = await this.query(
        'SELECT DISTINCT priority as value, CAST(priority AS VARCHAR) as label FROM Tickets WHERE priority IS NOT NULL'
      );
      return rows;
    }
  }

  /**
   * Fetch issue type and sub-issue type picklist values.
   */
  async getIssueAndSubIssueTypes() {
    let issueTypes = [];
    let subIssueTypes = [];

    try {
      const itRows = await this.query('SELECT * FROM IssueTypes WHERE isActive = 1');
      issueTypes = itRows.map(r => ({ value: r.id || r.value, label: r.name || r.label }));
    } catch {
      console.log('[Fabric] No IssueTypes table found, deriving from Tickets');
      const rows = await this.query(
        'SELECT DISTINCT issueType as value, CAST(issueType AS VARCHAR) as label FROM Tickets WHERE issueType IS NOT NULL'
      );
      issueTypes = rows;
    }

    try {
      const sitRows = await this.query('SELECT * FROM SubIssueTypes WHERE isActive = 1');
      subIssueTypes = sitRows.map(r => ({
        value: r.id || r.value,
        label: r.name || r.label,
        parentValue: r.parentValue || r.issueTypeId || null,
      }));
    } catch {
      console.log('[Fabric] No SubIssueTypes table found, deriving from Tickets');
      const rows = await this.query(
        'SELECT DISTINCT subIssueType as value, CAST(subIssueType AS VARCHAR) as label FROM Tickets WHERE subIssueType IS NOT NULL'
      );
      subIssueTypes = rows.map(r => ({ ...r, parentValue: null }));
    }

    return { issueTypes, subIssueTypes };
  }

  /**
   * Fetch active resources (technicians).
   */
  async getResources() {
    const rows = await this.query(
      "SELECT * FROM Resources WHERE isActive = 1 AND resourceType = 'Employee'"
    );
    return rows.map(r => ({
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
    const batchSize = 500; // SQL IN clause can handle larger batches than REST API

    for (let i = 0; i < ticketIds.length; i += batchSize) {
      const batch = ticketIds.slice(i, i + batchSize);

      try {
        // Build parameterized IN clause
        const paramNames = batch.map((_, idx) => `@tid${i + idx}`);
        const params = {};
        batch.forEach((id, idx) => { params[`tid${i + idx}`] = id; });

        const queryText = `
          SELECT ticketID, SUM(hoursWorked) as totalHours
          FROM TimeEntries
          WHERE ticketID IN (${paramNames.join(',')})
          GROUP BY ticketID
        `;

        const rows = await this.query(queryText, params);
        for (const row of rows) {
          hoursMap[row.ticketID] = row.totalHours || 0;
        }
      } catch (err) {
        console.warn(`[Fabric] Time entries batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`);
      }
    }

    return hoursMap;
  }

  /**
   * Fetch ticket notes for a set of ticket IDs.
   * Returns a map of ticketID -> array of note objects.
   */
  async getNotesForTickets(ticketIds) {
    if (!ticketIds || ticketIds.length === 0) return {};

    const notesMap = {};
    const batchSize = 500;

    for (let i = 0; i < ticketIds.length; i += batchSize) {
      const batch = ticketIds.slice(i, i + batchSize);

      try {
        const paramNames = batch.map((_, idx) => `@tid${i + idx}`);
        const params = {};
        batch.forEach((id, idx) => { params[`tid${i + idx}`] = id; });

        const queryText = `
          SELECT * FROM TicketNotes
          WHERE ticketID IN (${paramNames.join(',')})
        `;

        const rows = await this.query(queryText, params);
        for (const note of rows) {
          const tid = note.ticketID;
          if (!notesMap[tid]) notesMap[tid] = [];
          notesMap[tid].push(note);
        }
      } catch (err) {
        console.warn(`[Fabric] Ticket notes batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`);
      }
    }

    return notesMap;
  }

  /**
   * Fetch company names for a set of company IDs.
   * Returns a map of companyID -> companyName.
   */
  async getCompanyNames(companyIds) {
    if (!companyIds || companyIds.length === 0) return {};

    const nameMap = {};
    const batchSize = 500;

    for (let i = 0; i < companyIds.length; i += batchSize) {
      const batch = companyIds.slice(i, i + batchSize);

      try {
        const paramNames = batch.map((_, idx) => `@cid${i + idx}`);
        const params = {};
        batch.forEach((id, idx) => { params[`cid${i + idx}`] = id; });

        const queryText = `
          SELECT id, companyName FROM Companies
          WHERE id IN (${paramNames.join(',')})
        `;

        const rows = await this.query(queryText, params);
        for (const c of rows) {
          nameMap[c.id] = c.companyName || `Company ${c.id}`;
        }
      } catch (err) {
        console.warn(`[Fabric] Company names batch failed: ${err.message}`);
      }
    }

    return nameMap;
  }

  /**
   * Close the connection pool.
   */
  async close() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}

module.exports = FabricClient;
