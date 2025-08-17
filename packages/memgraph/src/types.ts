/**
 * Configuration for Memgraph client and provider
 */
export interface MemgraphConfig {
  /** Connection URI (default: bolt://localhost:7687) */
  uri?: string;
  /** Username for authentication */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** Database name (for multi-tenant setups) */
  database?: string;
  /** Connection options */
  options?: {
    maxConnectionLifetime?: number;
    maxConnectionPoolSize?: number;
    connectionAcquisitionTimeout?: number;
    disableLosslessIntegers?: boolean;
  };
}

/**
 * Options for query execution
 */
export interface MemgraphQueryOptions {
  /** Access mode for the session */
  accessMode?: "READ" | "WRITE";
  /** Custom database to use for this query */
  database?: string;
}

/**
 * Common Memgraph data types
 */
export interface MemgraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface MemgraphRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
}

export interface MemgraphPath {
  nodes: MemgraphNode[];
  relationships: MemgraphRelationship[];
  length: number;
}

/**
 * Query result helpers
 */
export interface QueryStats {
  nodesCreated: number;
  nodesDeleted: number;
  relationshipsCreated: number;
  relationshipsDeleted: number;
  propertiesSet: number;
  labelsAdded: number;
  labelsRemoved: number;
  indexesAdded: number;
  indexesRemoved: number;
  constraintsAdded: number;
  constraintsRemoved: number;
}