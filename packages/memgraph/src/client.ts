import type { Driver, Session, QueryResult, Record } from "neo4j-driver";
import neo4j, { auth } from "neo4j-driver";
import type { MemgraphConfig, MemgraphQueryOptions } from "./types";

/**
 * Memgraph client wrapper providing high-level operations
 * Built on top of the Neo4j JavaScript driver
 */
export class MemgraphClient {
  private driver: Driver;
  private database?: string;

  constructor(config: MemgraphConfig = {}) {
    const {
      uri = "bolt://localhost:7687",
      username = "",
      password = "",
      database,
      options = {},
    } = config;

    // Create auth token (empty credentials for default Memgraph setup)
    const authToken =
      username || password
        ? auth.basic(username, password)
        : auth.basic("", "");

    // Initialize Neo4j driver for Memgraph
    this.driver = neo4j.driver(uri, authToken, {
      disableLosslessIntegers: options.disableLosslessIntegers ?? true,
      maxConnectionLifetime: options.maxConnectionLifetime ?? 3600000, // 1 hour
      maxConnectionPoolSize: options.maxConnectionPoolSize ?? 100,
      connectionAcquisitionTimeout:
        options.connectionAcquisitionTimeout ?? 60000,
    });

    this.database = database;
  }

  /**
   * Execute a Cypher query with parameters
   */
  async query(
    cypher: string,
    parameters: any = {},
    options: MemgraphQueryOptions = {}
  ): Promise<QueryResult> {
    const session = this.createSession(options);
    try {
      return await session.run(cypher, parameters);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a read-only query with automatic retry
   */
  async readQuery(
    cypher: string,
    parameters: any = {},
    options: MemgraphQueryOptions = {}
  ): Promise<QueryResult> {
    const session = this.createSession(options);
    try {
      return await session.executeRead(async (tx) => {
        return await tx.run(cypher, parameters);
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query with automatic retry
   */
  async writeQuery(
    cypher: string,
    parameters: any = {},
    options: MemgraphQueryOptions = {}
  ): Promise<QueryResult> {
    const session = this.createSession(options);
    try {
      return await session.executeWrite(async (tx) => {
        return await tx.run(cypher, parameters);
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(
    callback: (tx: any) => Promise<T>,
    options: MemgraphQueryOptions = {}
  ): Promise<T> {
    const session = this.createSession(options);
    try {
      return await session.executeWrite(callback);
    } finally {
      await session.close();
    }
  }

  /**
   * Test the connection to Memgraph
   */
  async testConnection(): Promise<boolean> {
    try {
      const session = this.createSession();
      try {
        await session.run("RETURN 1");
        return true;
      } finally {
        await session.close();
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    const session = this.createSession();
    try {
      const result = await session.run(`
        CALL dbms.components() YIELD name, versions, edition
        RETURN name, versions, edition
      `);

      return result.records.map((record) => ({
        name: record.get("name"),
        versions: record.get("versions"),
        edition: record.get("edition"),
      }));
    } catch (error) {
      // Fallback for Memgraph which might not have dbms.components
      try {
        await session.run("RETURN 1");
        return [
          { name: "Memgraph", versions: ["unknown"], edition: "community" },
        ];
      } catch (fallbackError) {
        throw new Error(`Unable to get server info: ${error}`);
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Clear the entire database
   */
  async clearDatabase(): Promise<void> {
    await this.writeQuery("MATCH (n) DETACH DELETE n");
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    nodeCount: number;
    relationshipCount: number;
    labelCount: number;
    relationshipTypeCount: number;
  }> {
    const session = this.createSession();
    try {
      // Get node count
      const nodeResult = await session.run(
        "MATCH (n) RETURN count(n) as count"
      );
      const nodeCount = nodeResult.records[0]?.get("count")?.toNumber() || 0;

      // Get relationship count
      const relResult = await session.run(
        "MATCH ()-[r]->() RETURN count(r) as count"
      );
      const relationshipCount =
        relResult.records[0]?.get("count")?.toNumber() || 0;

      // Get label count
      const labelResult = await session.run(`
        CALL db.labels() YIELD label
        RETURN count(label) as count
      `);
      let labelCount = 0;
      try {
        labelCount = labelResult.records[0]?.get("count")?.toNumber() || 0;
      } catch {
        // Fallback if db.labels() is not available
        const fallbackResult = await session.run(`
          MATCH (n)
          UNWIND labels(n) as label
          RETURN count(DISTINCT label) as count
        `);
        labelCount = fallbackResult.records[0]?.get("count")?.toNumber() || 0;
      }

      // Get relationship type count
      const typeResult = await session.run(`
        MATCH ()-[r]->()
        RETURN count(DISTINCT type(r)) as count
      `);
      const relationshipTypeCount =
        typeResult.records[0]?.get("count")?.toNumber() || 0;

      return {
        nodeCount,
        relationshipCount,
        labelCount,
        relationshipTypeCount,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Create indexes for better performance
   */
  async createIndex(label: string, property: string): Promise<void> {
    await this.writeQuery(`CREATE INDEX ON :${label}(${property})`);
  }

  /**
   * Drop an index
   */
  async dropIndex(label: string, property: string): Promise<void> {
    await this.writeQuery(`DROP INDEX ON :${label}(${property})`);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<Array<{ label: string; properties: string[] }>> {
    const session = this.createSession();
    try {
      // Try to call procedure to list indexes
      try {
        const result = await session.run("CALL db.indexes()");
        return result.records.map((record) => ({
          label: record.get("label"),
          properties: record.get("properties"),
        }));
      } catch {
        // Fallback - return empty array if procedure doesn't exist
        return [];
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Close the driver connection
   */
  async close(): Promise<void> {
    await this.driver.close();
  }

  /**
   * Get the underlying Neo4j driver
   */
  getDriver(): Driver {
    return this.driver;
  }

  /**
   * Create a new session with options
   */
  private createSession(options: MemgraphQueryOptions = {}): Session {
    const sessionConfig: any = {};

    if (this.database) {
      sessionConfig.database = this.database;
    }

    if (options.accessMode) {
      sessionConfig.defaultAccessMode = options.accessMode;
    }

    return this.driver.session(sessionConfig);
  }
}

/**
 * Factory function to create a Memgraph client
 */
export function createMemgraphClient(
  config: MemgraphConfig = {}
): MemgraphClient {
  return new MemgraphClient(config);
}
