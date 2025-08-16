import type { Driver, Session } from "neo4j-driver";
import { auth } from "neo4j-driver";
import neo4j from "neo4j-driver";
import type {
  GraphProvider,
  GraphNode,
  GraphEdge,
  GraphFilter,
  GraphTraversal,
  GraphPath,
  HealthStatus,
} from "@daydreamsai/core";

/**
 * Configuration for the Memgraph provider
 */
export interface MemgraphProviderConfig {
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
 * Memgraph implementation of GraphProvider using Neo4j driver
 */
export class MemgraphProvider implements GraphProvider {
  private driver: Driver;
  private database?: string;

  constructor(config: MemgraphProviderConfig = {}) {
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

  async initialize(): Promise<void> {
    try {
      // Test connection
      const session = this.driver.session({ database: this.database });
      try {
        await session.run("RETURN 1");
      } finally {
        await session.close();
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize Memgraph connection: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  async health(): Promise<HealthStatus> {
    try {
      const session = this.driver.session({ database: this.database });
      try {
        await session.run("RETURN 1");
        return {
          status: "healthy",
          message: "Memgraph provider is operational",
        };
      } finally {
        await session.close();
      }
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Memgraph connection failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  async addNode(node: GraphNode): Promise<string> {
    const session = this.driver.session({ database: this.database });
    try {
      // Build labels string
      const labelsStr = node.labels?.length
        ? `:${node.labels.join(":")}`
        : `:${node.type}`;

      // Create properties object
      const properties = {
        id: node.id,
        type: node.type,
        ...node.properties,
      };

      const query = `
        CREATE (n${labelsStr} $properties)
        RETURN n.id as id
      `;

      const result = await session.run(query, { properties });
      const record = result.records[0];

      if (!record) {
        throw new Error("Failed to create node");
      }

      return record.get("id") as string;
    } catch (error) {
      throw new Error(
        `Failed to add node to Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async getNode(id: string): Promise<GraphNode | null> {
    const session = this.driver.session({ database: this.database });
    try {
      const query = `
        MATCH (n {id: $id})
        RETURN n, labels(n) as labels
      `;

      const result = await session.run(query, { id });
      const record = result.records[0];

      if (!record) {
        return null;
      }

      const node = record.get("n");
      const labels = record.get("labels") as string[];

      return {
        id: node.properties.id,
        type: node.properties.type || labels[0] || "Node",
        properties: this.cleanProperties(node.properties, ["id", "type"]),
        labels,
      };
    } catch (error) {
      throw new Error(
        `Failed to get node from Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async updateNode(id: string, updates: Partial<GraphNode>): Promise<void> {
    const session = this.driver.session({ database: this.database });
    try {
      // Build SET clause for properties
      const setProperties: Record<string, any> = {};
      if (updates.properties) {
        Object.entries(updates.properties).forEach(([key, value]) => {
          setProperties[`n.${key}`] = value;
        });
      }

      if (updates.type) {
        setProperties["n.type"] = updates.type;
      }

      if (Object.keys(setProperties).length === 0) {
        return; // Nothing to update
      }

      const setClause = Object.keys(setProperties)
        .map((key) => `${key} = $${key.replace("n.", "")}`)
        .join(", ");

      const query = `
        MATCH (n {id: $id})
        SET ${setClause}
        RETURN n
      `;

      const parameters = {
        id,
        ...updates.properties,
        ...(updates.type ? { type: updates.type } : {}),
      };

      const result = await session.run(query, parameters);
      if (result.records.length === 0) {
        throw new Error(`Node with id ${id} not found`);
      }
    } catch (error) {
      throw new Error(
        `Failed to update node in Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async deleteNode(id: string): Promise<boolean> {
    const session = this.driver.session({ database: this.database });
    try {
      const query = `
        MATCH (n {id: $id})
        DETACH DELETE n
        RETURN count(n) as deleted
      `;

      const result = await session.run(query, { id });
      const record = result.records[0];
      const deleted = record?.get("deleted")?.toNumber() || 0;

      return deleted > 0;
    } catch (error) {
      throw new Error(
        `Failed to delete node from Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async addEdge(edge: GraphEdge): Promise<string> {
    const session = this.driver.session({ database: this.database });
    try {
      // Create properties object
      const properties = {
        id: edge.id,
        ...edge.properties,
      };

      const query = `
        MATCH (from {id: $fromId})
        MATCH (to {id: $toId})
        CREATE (from)-[r:\`${edge.type}\` $properties]->(to)
        RETURN r.id as id
      `;

      const result = await session.run(query, {
        fromId: edge.from,
        toId: edge.to,
        properties,
      });

      const record = result.records[0];
      if (!record) {
        throw new Error("Failed to create edge");
      }

      return record.get("id") as string;
    } catch (error) {
      throw new Error(
        `Failed to add edge to Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async getEdges(
    nodeId: string,
    direction: "in" | "out" | "both" = "both"
  ): Promise<GraphEdge[]> {
    const session = this.driver.session({ database: this.database });
    try {
      let pattern: string;
      switch (direction) {
        case "in":
          pattern = "(n)<-[r]-(other)";
          break;
        case "out":
          pattern = "(n)-[r]->(other)";
          break;
        case "both":
        default:
          pattern = "(n)-[r]-(other)";
          break;
      }

      const query = `
        MATCH ${pattern}
        WHERE n.id = $nodeId
        RETURN r, startNode(r).id as fromId, endNode(r).id as toId, type(r) as relType
      `;

      const result = await session.run(query, { nodeId });

      return result.records.map((record) => {
        const rel = record.get("r");
        const fromId = record.get("fromId");
        const toId = record.get("toId");
        const relType = record.get("relType");

        return {
          id: rel.properties.id || `${fromId}-${relType}-${toId}`,
          from: fromId,
          to: toId,
          type: relType,
          properties: this.cleanProperties(rel.properties, ["id"]),
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to get edges from Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async deleteEdge(id: string): Promise<boolean> {
    const session = this.driver.session({ database: this.database });
    try {
      const query = `
        MATCH ()-[r {id: $id}]-()
        DELETE r
        RETURN count(r) as deleted
      `;

      const result = await session.run(query, { id });
      const record = result.records[0];
      const deleted = record?.get("deleted")?.toNumber() || 0;

      return deleted > 0;
    } catch (error) {
      throw new Error(
        `Failed to delete edge from Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async findNodes(filter: GraphFilter): Promise<GraphNode[]> {
    const session = this.driver.session({ database: this.database });
    try {
      let whereClause = "";
      const parameters: Record<string, any> = {};

      // Build WHERE clause
      const conditions: string[] = [];

      if (filter.type) {
        conditions.push("n.type = $type");
        parameters.type = filter.type;
      }

      if (filter.labels && filter.labels.length > 0) {
        const labelConditions = filter.labels.map((label, i) => {
          return `$label${i} IN labels(n)`;
        });
        conditions.push(`(${labelConditions.join(" OR ")})`);
        filter.labels.forEach((label, i) => {
          parameters[`label${i}`] = label;
        });
      }

      if (filter.properties) {
        Object.entries(filter.properties).forEach(([key, value], i) => {
          conditions.push(`n.${key} = $prop${i}`);
          parameters[`prop${i}`] = value;
        });
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(" AND ")}`;
      }

      const query = `
        MATCH (n)
        ${whereClause}
        RETURN n, labels(n) as labels
      `;

      const result = await session.run(query, parameters);

      return result.records.map((record) => {
        const node = record.get("n");
        const labels = record.get("labels") as string[];

        return {
          id: node.properties.id,
          type: node.properties.type || labels[0] || "Node",
          properties: this.cleanProperties(node.properties, ["id", "type"]),
          labels,
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to find nodes in Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async traverse(traversal: GraphTraversal): Promise<GraphPath[]> {
    const session = this.driver.session({ database: this.database });
    try {
      let pattern: string;
      const maxDepth = traversal.maxDepth || 5;

      switch (traversal.direction) {
        case "in":
          pattern = `(start)<-[*1..${maxDepth}]-(end)`;
          break;
        case "out":
          pattern = `(start)-[*1..${maxDepth}]->(end)`;
          break;
        case "both":
        default:
          pattern = `(start)-[*1..${maxDepth}]-(end)`;
          break;
      }

      let whereClause = "";
      const parameters: Record<string, any> = { startId: traversal.start };

      if (traversal.filter) {
        const conditions: string[] = [];

        if (traversal.filter.type) {
          conditions.push("end.type = $type");
          parameters.type = traversal.filter.type;
        }

        if (traversal.filter.properties) {
          Object.entries(traversal.filter.properties).forEach(
            ([key, value], i) => {
              conditions.push(`end.${key} = $prop${i}`);
              parameters[`prop${i}`] = value;
            }
          );
        }

        if (conditions.length > 0) {
          whereClause = `AND ${conditions.join(" AND ")}`;
        }
      }

      const query = `
        MATCH path = ${pattern}
        WHERE start.id = $startId ${whereClause}
        RETURN path, length(path) as pathLength
        ORDER BY pathLength
      `;

      const result = await session.run(query, parameters);

      return result.records.map((record) => {
        const path = record.get("path");
        const pathLength = record.get("pathLength")?.toNumber() || 0;

        const nodes: GraphNode[] = path.segments.reduce(
          (acc: GraphNode[], segment: any, i: number) => {
            // Add start node (only for first segment)
            if (i === 0) {
              const startNode = segment.start;
              acc.push({
                id: startNode.properties.id,
                type: startNode.properties.type || "Node",
                properties: this.cleanProperties(startNode.properties, [
                  "id",
                  "type",
                ]),
                labels: startNode.labels,
              });
            }

            // Add end node
            const endNode = segment.end;
            acc.push({
              id: endNode.properties.id,
              type: endNode.properties.type || "Node",
              properties: this.cleanProperties(endNode.properties, [
                "id",
                "type",
              ]),
              labels: endNode.labels,
            });

            return acc;
          },
          []
        );

        const edges: GraphEdge[] = path.segments.map((segment: any) => {
          const rel = segment.relationship;
          return {
            id:
              rel.properties.id ||
              `${segment.start.properties.id}-${rel.type}-${segment.end.properties.id}`,
            from: segment.start.properties.id,
            to: segment.end.properties.id,
            type: rel.type,
            properties: this.cleanProperties(rel.properties, ["id"]),
          };
        });

        return {
          nodes,
          edges,
          length: pathLength,
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to traverse graph in Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  async shortestPath(from: string, to: string): Promise<GraphPath | null> {
    const session = this.driver.session({ database: this.database });
    try {
      const query = `
        MATCH (start {id: $from}), (end {id: $to})
        MATCH path = shortestPath((start)-[*]-(end))
        RETURN path, length(path) as pathLength
      `;

      const result = await session.run(query, { from, to });
      const record = result.records[0];

      if (!record) {
        return null;
      }

      const path = record.get("path");
      const pathLength = record.get("pathLength")?.toNumber() || 0;

      const nodes: GraphNode[] = path.segments.reduce(
        (acc: GraphNode[], segment: any, i: number) => {
          // Add start node (only for first segment)
          if (i === 0) {
            const startNode = segment.start;
            acc.push({
              id: startNode.properties.id,
              type: startNode.properties.type || "Node",
              properties: this.cleanProperties(startNode.properties, [
                "id",
                "type",
              ]),
              labels: startNode.labels,
            });
          }

          // Add end node
          const endNode = segment.end;
          acc.push({
            id: endNode.properties.id,
            type: endNode.properties.type || "Node",
            properties: this.cleanProperties(endNode.properties, [
              "id",
              "type",
            ]),
            labels: endNode.labels,
          });

          return acc;
        },
        []
      );

      const edges: GraphEdge[] = path.segments.map((segment: any) => {
        const rel = segment.relationship;
        return {
          id:
            rel.properties.id ||
            `${segment.start.properties.id}-${rel.type}-${segment.end.properties.id}`,
          from: segment.start.properties.id,
          to: segment.end.properties.id,
          type: rel.type,
          properties: this.cleanProperties(rel.properties, ["id"]),
        };
      });

      return {
        nodes,
        edges,
        length: pathLength,
      };
    } catch (error) {
      throw new Error(
        `Failed to find shortest path in Memgraph: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Helper method to clean properties by removing specified keys
   */
  private cleanProperties(
    properties: Record<string, any>,
    excludeKeys: string[] = []
  ): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (!excludeKeys.includes(key)) {
        // Convert Neo4j integers to regular numbers
        if (
          typeof value === "object" &&
          value !== null &&
          "toNumber" in value
        ) {
          cleaned[key] = value.toNumber();
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }
}

/**
 * Factory function to create a Memgraph provider
 */
export function createMemgraphProvider(
  config: MemgraphProviderConfig = {}
): MemgraphProvider {
  return new MemgraphProvider(config);
}
