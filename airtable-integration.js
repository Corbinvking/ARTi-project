const axios = require('axios');
const { Pool } = require('pg');

class AirtableIntegration {
  constructor() {
    this.baseURL = 'https://api.airtable.com/v0';
    this.apiKey = process.env.AIRTABLE_API_KEY;
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Database connection
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'your-super-secret-and-long-postgres-password'
    });

    // Airtable base configuration
    this.bases = {
      // Add your Airtable base IDs here
      // Example: 'appXXXXXXXXXXXXXX': 'Base Name'
    };

    // Table mappings (Airtable table name -> Local table name)
    this.tableMappings = {
      // Example mappings
      // 'Projects': 'projects',
      // 'Tasks': 'tasks',
      // 'Users': 'users'
    };

    // Field mappings (Airtable field -> Local field)
    this.fieldMappings = {
      // Example mappings
      // 'Projects': {
      //   'Name': 'name',
      //   'Status': 'status',
      //   'Created': 'created_at'
      // }
    };
  }

  /**
   * Initialize the integration with base and table configurations
   */
  async initialize(baseId, tableMappings, fieldMappings) {
    this.bases[baseId] = 'Main Base';
    this.tableMappings = { ...this.tableMappings, ...tableMappings };
    this.fieldMappings = { ...this.fieldMappings, ...fieldMappings };
    
    console.log('Airtable integration initialized with:', {
      baseId,
      tableMappings,
      fieldMappings
    });
  }

  /**
   * Get all records from an Airtable table
   */
  async getTableRecords(baseId, tableName, options = {}) {
    try {
      const url = `${this.baseURL}/${baseId}/${encodeURIComponent(tableName)}`;
      const params = {
        ...options,
        'pageSize': options.pageSize || 100
      };

      const response = await axios.get(url, {
        headers: this.headers,
        params
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching records from ${tableName}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get all records from a table (handles pagination)
   */
  async getAllTableRecords(baseId, tableName, options = {}) {
    let allRecords = [];
    let offset = null;

    do {
      const params = { ...options };
      if (offset) {
        params.offset = offset;
      }

      const response = await this.getTableRecords(baseId, tableName, params);
      allRecords = allRecords.concat(response.records);
      offset = response.offset;

      console.log(`Fetched ${response.records.length} records from ${tableName}`);
    } while (offset);

    return allRecords;
  }

  /**
   * Create a record in Airtable
   */
  async createRecord(baseId, tableName, fields) {
    try {
      const url = `${this.baseURL}/${baseId}/${encodeURIComponent(tableName)}`;
      const data = {
        records: [{
          fields: fields
        }]
      };

      const response = await axios.post(url, data, {
        headers: this.headers
      });

      return response.data.records[0];
    } catch (error) {
      console.error(`Error creating record in ${tableName}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update a record in Airtable
   */
  async updateRecord(baseId, tableName, recordId, fields) {
    try {
      const url = `${this.baseURL}/${baseId}/${encodeURIComponent(tableName)}`;
      const data = {
        records: [{
          id: recordId,
          fields: fields
        }]
      };

      const response = await axios.patch(url, data, {
        headers: this.headers
      });

      return response.data.records[0];
    } catch (error) {
      console.error(`Error updating record ${recordId} in ${tableName}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a record from Airtable
   */
  async deleteRecord(baseId, tableName, recordId) {
    try {
      const url = `${this.baseURL}/${baseId}/${encodeURIComponent(tableName)}`;
      const params = {
        records: [recordId]
      };

      const response = await axios.delete(url, {
        headers: this.headers,
        params
      });

      return response.data;
    } catch (error) {
      console.error(`Error deleting record ${recordId} from ${tableName}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sync all data from Airtable to local database
   */
  async syncFromAirtable(baseId, tableName) {
    try {
      console.log(`Starting sync from Airtable table: ${tableName}`);
      
      // Get all records from Airtable
      const airtableRecords = await this.getAllTableRecords(baseId, tableName);
      console.log(`Found ${airtableRecords.length} records in Airtable`);

      // Get local table name
      const localTableName = this.tableMappings[tableName] || tableName.toLowerCase();
      
      // Get field mappings for this table
      const fieldMappings = this.fieldMappings[tableName] || {};

      // Begin transaction
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Clear existing data (optional - you might want to merge instead)
        await client.query(`DELETE FROM ${localTableName}`);

        // Insert new data
        for (const record of airtableRecords) {
          const mappedFields = this.mapAirtableFieldsToLocal(record.fields, fieldMappings);
          mappedFields.airtable_id = record.id;
          mappedFields.created_at = record.createdTime;
          
          const fieldNames = Object.keys(mappedFields);
          const fieldValues = Object.values(mappedFields);
          const placeholders = fieldValues.map((_, index) => `$${index + 1}`).join(', ');
          
          const query = `
            INSERT INTO ${localTableName} (${fieldNames.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT (airtable_id) DO UPDATE SET
            ${fieldNames.filter(f => f !== 'airtable_id').map(f => `${f} = EXCLUDED.${f}`).join(', ')}
          `;

          await client.query(query, fieldValues);
        }

        await client.query('COMMIT');
        console.log(`Successfully synced ${airtableRecords.length} records to ${localTableName}`);
        
        return {
          success: true,
          recordsSynced: airtableRecords.length,
          tableName: localTableName
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error(`Error syncing from Airtable:`, error);
      throw error;
    }
  }

  /**
   * Sync specific record to Airtable
   */
  async syncToAirtable(baseId, tableName, localRecordId) {
    try {
      const localTableName = this.tableMappings[tableName] || tableName.toLowerCase();
      const fieldMappings = this.fieldMappings[tableName] || {};

      // Get local record
      const client = await this.pool.connect();
      const result = await client.query(
        `SELECT * FROM ${localTableName} WHERE id = $1`,
        [localRecordId]
      );
      client.release();

      if (result.rows.length === 0) {
        throw new Error(`Record not found in local database: ${localRecordId}`);
      }

      const localRecord = result.rows[0];
      const airtableFields = this.mapLocalFieldsToAirtable(localRecord, fieldMappings);

      if (localRecord.airtable_id) {
        // Update existing record
        return await this.updateRecord(baseId, tableName, localRecord.airtable_id, airtableFields);
      } else {
        // Create new record
        const newRecord = await this.createRecord(baseId, tableName, airtableFields);
        
        // Update local record with Airtable ID
        await this.pool.query(
          `UPDATE ${localTableName} SET airtable_id = $1 WHERE id = $2`,
          [newRecord.id, localRecordId]
        );

        return newRecord;
      }

    } catch (error) {
      console.error(`Error syncing to Airtable:`, error);
      throw error;
    }
  }

  /**
   * Map Airtable fields to local database fields
   */
  mapAirtableFieldsToLocal(airtableFields, fieldMappings) {
    const mappedFields = {};
    
    for (const [airtableField, localField] of Object.entries(fieldMappings)) {
      if (airtableFields[airtableField] !== undefined) {
        mappedFields[localField] = airtableFields[airtableField];
      }
    }

    return mappedFields;
  }

  /**
   * Map local database fields to Airtable fields
   */
  mapLocalFieldsToAirtable(localRecord, fieldMappings) {
    const airtableFields = {};
    
    for (const [airtableField, localField] of Object.entries(fieldMappings)) {
      if (localRecord[localField] !== undefined) {
        airtableFields[airtableField] = localRecord[localField];
      }
    }

    return airtableFields;
  }

  /**
   * Get table schema from Airtable
   */
  async getTableSchema(baseId, tableName) {
    try {
      const url = `${this.baseURL}/meta/bases/${baseId}/tables`;
      const response = await axios.get(url, {
        headers: this.headers
      });

      // Case-insensitive search for table
      const table = response.data.tables.find(t => 
        t.name.toLowerCase() === tableName.toLowerCase()
      );
      if (!table) {
        throw new Error(`Table ${tableName} not found in base ${baseId}`);
      }

      return table;
    } catch (error) {
      console.error(`Error fetching table schema:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create local table based on Airtable schema
   */
  async createLocalTableFromSchema(baseId, tableName) {
    try {
      const schema = await this.getTableSchema(baseId, tableName);
      const localTableName = this.tableMappings[tableName] || tableName.toLowerCase();

      let createTableSQL = `CREATE TABLE IF NOT EXISTS ${localTableName} (
        id SERIAL PRIMARY KEY,
        airtable_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;

      // Add columns for each field
      for (const field of schema.fields) {
        const columnName = field.name.toLowerCase().replace(/\s+/g, '_');
        let columnType = 'TEXT'; // Default type

        // Map Airtable field types to PostgreSQL types
        switch (field.type) {
          case 'singleLineText':
          case 'multilineText':
          case 'singleSelect':
          case 'multipleSelects':
            columnType = 'TEXT';
            break;
          case 'number':
            columnType = 'NUMERIC';
            break;
          case 'date':
            columnType = 'DATE';
            break;
          case 'dateTime':
            columnType = 'TIMESTAMP';
            break;
          case 'checkbox':
            columnType = 'BOOLEAN';
            break;
          case 'url':
            columnType = 'TEXT';
            break;
          case 'email':
            columnType = 'TEXT';
            break;
          case 'phoneNumber':
            columnType = 'TEXT';
            break;
          default:
            columnType = 'TEXT';
        }

        createTableSQL += `,\n        ${columnName} ${columnType}`;
      }

      createTableSQL += '\n      )';

      await this.pool.query(createTableSQL);
      console.log(`Created local table: ${localTableName}`);

      return localTableName;
    } catch (error) {
      console.error(`Error creating local table:`, error);
      throw error;
    }
  }

  /**
   * Get sync status (last sync time, record counts, etc.)
   */
  async getSyncStatus(baseId, tableName) {
    try {
      const localTableName = this.tableMappings[tableName] || tableName.toLowerCase();
      
      // Get local record count
      const localCountResult = await this.pool.query(`SELECT COUNT(*) FROM ${localTableName}`);
      const localCount = parseInt(localCountResult.rows[0].count);

      // Get Airtable record count
      const airtableRecords = await this.getAllTableRecords(baseId, tableName);
      const airtableCount = airtableRecords.length;

      // Get last sync time (you might want to add a last_sync column to your tables)
      const lastSyncResult = await this.pool.query(`
        SELECT MAX(updated_at) as last_sync 
        FROM ${localTableName}
      `);
      const lastSync = lastSyncResult.rows[0].last_sync;

      return {
        tableName,
        localTableName,
        localRecordCount: localCount,
        airtableRecordCount: airtableCount,
        lastSync,
        isInSync: localCount === airtableCount
      };
    } catch (error) {
      console.error(`Error getting sync status:`, error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = AirtableIntegration;