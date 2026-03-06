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

  async getAccessToken() {
    console.log('[Fabric] Requesting access token...');
    try {
      const tokenResponse = await this.credential.getToken('https://database.windows.net/.default');
      console.log('[Fabric] Access token obtained successfully');
      return tokenResponse.token;
    } catch (err) {
      console.error(`[Fabric] Failed to get access token: ${err.message}`);
      console.error(err.stack);
      throw err;
    }
  }

  async getPool() {
    if (this.pool && this.pool.connected) {
      console.log('[Fabric] Reusing existing pool');
      return this.pool;
    }

    if (this.pool) {
      console.log('[Fabric] Pool exists but not connected, closing stale pool...');
      try { await this.pool.close(); } catch (_) {}
      this.pool = null;
    }

    console.log('[Fabric] Creating new connection pool...');
    const token = await this.getAccessToken();

    const config = {
      server: this.sqlServer,
      database: this.database,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 30000,
        requestTimeout: 60000,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 60000,
        acquireTimeoutMillis: 30000,
      },
      authentication: {
        type: 'azure-active-directory-access-token',
        options: { token },
      },
    };

    console.log(`[Fabric] Connecting to ${this.sqlServer}/${this.database}...`);
    try {
      this.pool = await sql.connect(config);
      console.log('[Fabric] Pool connected successfully');
    } catch (err) {
      console.error(`[Fabric] Pool connection failed: ${err.message}`);
      console.error(`[Fabric] Error code: ${err.code || 'none'}`);
      console.error(`[Fabric] Error number: ${err.number || 'none'}`);
      console.error(err.stack);
      throw err;
    }

    this.pool.on('error', (err) => {
      console.warn(`[Fabric] Pool error (will reconnect on next query): ${err.message}`);
      console.warn(`[Fabric] Pool error code: ${err.code || 'none'}`);
      try { this.pool.close(); } catch (_) {}
      this.pool = null;
    });

    this._tokenTimer = setTimeout(() => {
      console.log('[Fabric] Token expiry timer fired, closing pool for refresh');
      if (this.pool) {
        this.pool.close().catch(() => {});
        this.pool = null;
      }
    }, 50 * 60 * 1000);

    console.log('[Fabric] Connected to SQL endpoint');
    return this.pool;
  }

  async query(queryText, params = {}) {
    const maxRetries = 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Fabric] Executing query (attempt ${attempt + 1}): ${queryText.substring(0, 80).replace(/\s+/g, ' ')}...`);
        const pool = await this.getPool();
        const request = pool.request();

        for (const [name, value] of Object.entries(params)) {
          request.input(name, value);
        }

        const result = await request.query(queryText);
        console.log(`[Fabric] Query returned ${(result.recordset || []).length} rows`);
        return result.recordset || [];
      } catch (err) {
        console.error(`[Fabric] Query error (attempt ${attempt + 1}): ${err.message}`);
        console.error(`[Fabric] Query error code: ${err.code || 'none'}`);
        console.error(`[Fabric] Query error number: ${err.number || 'none'}`);
        console.error(err.stack);

        const isConnectionError = /socket hang up|ECONNRESET|ECONN|connection.*lost|connection.*closed/i.test(err.message);
        if (isConnectionError && attempt < maxRetries) {
          console.warn(`[Fabric] Connection error (retrying): ${err.message}`);
          if (this.pool) {
            try { await this.pool.close(); } catch (_) {}
            this.pool = null;
          }
          continue;
        }
        throw err;
      }
    }
  }

  async getOpenTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    let where = 'WHERE status != 5 AND status != 13';
    const params = {};
    if (queueId) { where += ' AND queueID = @queueId'; params.queueId = queueId; }
    if (dateFrom) { where += ' AND createDate >= @dateFrom'; params.dateFrom = dateFrom; }
    if (dateTo) { where += ' AND createDate <= @dateTo'; params.dateTo = dateTo; }
    const queryText = `SELECT TOP (@maxRecords) * FROM Tickets ${where} ORDER BY createDate DESC`;
    params.maxRecords = maxRecords;
    return this.query(queryText, params);
  }

  async getAllTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    let where = 'WHERE 1=1';
    const params = {};
    if (queueId) { where += ' AND queueID = @queueId'; params.queueId = queueId; }
    if (dateFrom) { where += ' AND createDate >= @dateFrom'; params.dateFrom = dateFrom; }
    if (dateTo) { where += ' AND createDate <= @dateTo'; params.dateTo = dateTo; }
    const queryText = `SELECT TOP (@maxRecords) * FROM Tickets ${where} ORDER BY createDate DESC`;
    params.maxRecords = maxRecords;
    return this.query(queryText, params);
  }

  async getCompletedTickets({ queueId, maxRecords = 500, dateFrom, dateTo } = {}) {
    let where = 'WHERE status = 5';
    const params = {};
    if (queueId) { where += ' AND queueID = @queueId'; params.queueId = queueId; }
    if (dateFrom) { where += ' AND createDate >= @dateFrom'; params.dateFrom = dateFrom; }
    if (dateTo) { where += ' AND createDate <= @dateTo'; params.dateTo = dateTo; }
    const queryText = `SELECT TOP (@maxRecords) * FROM Tickets ${where} ORDER BY createDate DESC`;
    params.maxRecords = maxRecords;
    return this.query(queryText, params);
  }

  async getTicket(ticketId) {
    const rows = await this.query('SELECT * FROM Tickets WHERE id = @ticketId', { ticketId });
    return rows[0] || null;
  }

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

  async getTicketNotes(ticketId) {
    return this.query(
      'SELECT TOP 50 * FROM TicketNotes WHERE ticketID = @ticketId ORDER BY createDateTime DESC',
      { ticketId }
    );
  }

  async getQueues() {
    try {
      const rows = await this.query('SELECT * FROM Queues WHERE isActive = 1');
      return rows.map(r => ({ value: r.id || r.value, label: r.name || r.label }));
    } catch {
      console.log('[Fabric] No Queues table found, deriving from Tickets');
      const rows = await this.query(
        'SELECT DISTINCT queueID as value, CAST(queueID AS VARCHAR) as label FROM Tickets WHERE queueID IS NOT NULL'
      );
      return rows;
    }
  }

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

  async getTimeEntriesForTickets(ticketIds) {
    if (!ticketIds || ticketIds.length === 0) return {};
    const hoursMap = {};
    const batchSize = 500;
    for (let i = 0; i < ticketIds.length; i += batchSize) {
      const batch = ticketIds.slice(i, i + batchSize);
      try {
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
        for (const row of rows) { hoursMap[row.ticketID] = row.totalHours || 0; }
      } catch (err) {
        console.warn(`[Fabric] Time entries batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`);
      }
    }
    return hoursMap;
  }

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
        const queryText = `SELECT * FROM TicketNotes WHERE ticketID IN (${paramNames.join(',')})`;
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
        const queryText = `SELECT id, companyName FROM Companies WHERE id IN (${paramNames.join(',')})`;
        const rows = await this.query(queryText, params);
        for (const c of rows) { nameMap[c.id] = c.companyName || `Company ${c.id}`; }
      } catch (err) {
        console.warn(`[Fabric] Company names batch failed: ${err.message}`);
      }
    }
    return nameMap;
  }

  async close() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}

module.exports = FabricClient;
