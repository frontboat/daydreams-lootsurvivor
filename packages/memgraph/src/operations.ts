import type { MemgraphClient } from "./client";
import type { QueryResult } from "neo4j-driver";

/**
 * High-level graph operations using Memgraph client
 */
export class MemgraphOperations {
  constructor(private client: MemgraphClient) {}

  /**
   * Create a person node with properties
   */
  async createPerson(name: string, age?: number, properties: any = {}): Promise<string> {
    const allProps = { name, ...properties };
    if (age !== undefined) {
      allProps.age = age;
    }

    const result = await this.client.writeQuery(
      "CREATE (p:Person $props) RETURN p.name as name",
      { props: allProps }
    );

    return result.records[0]?.get("name") || name;
  }

  /**
   * Create a relationship between two nodes
   */
  async createRelationship(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: any = {}
  ): Promise<void> {
    await this.client.writeQuery(
      `MATCH (a {id: $fromId})
       MATCH (b {id: $toId})
       CREATE (a)-[r:\`${relationshipType}\` $props]->(b)
       RETURN r`,
      { fromId, toId, props: properties }
    );
  }

  /**
   * Find all nodes of a specific type
   */
  async findNodesByType<T = any>(nodeType: string): Promise<T[]> {
    const query = `MATCH (n:\`${nodeType}\`) RETURN n`;
    const result = await this.client.readQuery(query);

    return result.records.map((record) => record.get("n").properties);
  }

  /**
   * Find nodes with specific property values
   */
  async findNodesByProperty<T = any>(
    property: string,
    value: any,
    label?: string
  ): Promise<T[]> {
    const labelClause = label ? `:${label}` : "";
    const query = `MATCH (n${labelClause}) WHERE n.${property} = $value RETURN n`;

    const result = await this.client.readQuery(query, { value });

    return result.records.map((record) => record.get("n").properties);
  }

  /**
   * Get all neighbors of a node
   */
  async getNeighbors<T = any>(
    nodeId: string,
    direction: "INCOMING" | "OUTGOING" | "BOTH" = "BOTH"
  ): Promise<T[]> {
    let pattern: string;
    switch (direction) {
      case "INCOMING":
        pattern = "(n)<-[]-(neighbor)";
        break;
      case "OUTGOING":
        pattern = "(n)-[]->(neighbor)";
        break;
      default:
        pattern = "(n)-[]-(neighbor)";
    }

    const query = `MATCH ${pattern} WHERE n.id = $nodeId RETURN neighbor`;
    const result = await this.client.readQuery(query, { nodeId });

    return result.records.map((record) => record.get("neighbor").properties);
  }

  /**
   * Get relationships for a node
   */
  async getRelationships(
    nodeId: string,
    relationshipType?: string
  ): Promise<Array<{
    relationship: any;
    startNode: any;
    endNode: any;
  }>> {
    const typeClause = relationshipType ? `:${relationshipType}` : "";
    const query = `
      MATCH (start)-[r${typeClause}]-(end)
      WHERE start.id = $nodeId OR end.id = $nodeId
      RETURN r as relationship, start as startNode, end as endNode
    `;

    const result = await this.client.readQuery(query, { nodeId });

    return result.records.map((record) => ({
      relationship: record.get("relationship").properties,
      startNode: record.get("startNode").properties,
      endNode: record.get("endNode").properties,
    }));
  }

  /**
   * Find shortest path between two nodes
   */
  async findShortestPath(
    fromId: string,
    toId: string
  ): Promise<Array<{ nodes: any[]; relationships: any[] }> | null> {
    const query = `
      MATCH (start {id: $fromId}), (end {id: $toId})
      MATCH path = shortestPath((start)-[*]-(end))
      RETURN nodes(path) as nodes, relationships(path) as relationships
    `;
    const result = await this.client.readQuery(query, { fromId, toId });

    if (result.records.length === 0) {
      return null;
    }

    return result.records.map((record) => ({
      nodes: record.get("nodes").map((n: any) => n.properties),
      relationships: record.get("relationships").map((r: any) => r.properties),
    }));
  }

  /**
   * Count nodes by label
   */
  async countNodesByLabel(label: string): Promise<number> {
    const result = await this.client.readQuery(
      `MATCH (n:${label}) RETURN count(n) as count`
    );

    return result.records[0]?.get("count")?.toNumber() || 0;
  }

  /**
   * Get node degree (number of connections)
   */
  async getNodeDegree(nodeId: string): Promise<{
    incoming: number;
    outgoing: number;
    total: number;
  }> {
    const query = `
      MATCH (n {id: $nodeId})
      OPTIONAL MATCH (n)<-[incoming]-()
      OPTIONAL MATCH (n)-[outgoing]->()
      RETURN count(incoming) as incoming, count(outgoing) as outgoing
    `;
    const result = await this.client.readQuery(query, { nodeId });

    const record = result.records[0];
    const incoming = record?.get("incoming")?.toNumber() || 0;
    const outgoing = record?.get("outgoing")?.toNumber() || 0;

    return {
      incoming,
      outgoing,
      total: incoming + outgoing,
    };
  }

  /**
   * Update node properties
   */
  async updateNode(
    nodeId: string,
    properties: any
  ): Promise<void> {
    const setClause = Object.keys(properties)
      .map((key) => `n.${key} = $${key}`)
      .join(", ");

    const query = `MATCH (n {id: $nodeId}) SET ${setClause} RETURN n`;
    await this.client.writeQuery(query, { nodeId, ...properties });
  }

  /**
   * Delete node and all its relationships
   */
  async deleteNode(nodeId: string): Promise<boolean> {
    const query = "MATCH (n {id: $nodeId}) DETACH DELETE n RETURN count(n) as deleted";
    const result = await this.client.writeQuery(query, { nodeId });

    return (result.records[0]?.get("deleted")?.toNumber() || 0) > 0;
  }

  /**
   * Execute a custom Cypher query
   */
  async executeCypher(
    cypher: string,
    parameters: any = {}
  ): Promise<QueryResult> {
    return this.client.query(cypher, parameters);
  }

  /**
   * Batch create nodes efficiently
   */
  async batchCreateNodes(
    nodes: Array<{
      labels: string[];
      properties: any;
    }>
  ): Promise<void> {
    const query = `
      UNWIND $nodes as node
      CALL apoc.create.node(node.labels, node.properties) YIELD node as n
      RETURN count(n) as created
    `;
    await this.client.writeQuery(query, { nodes });
  }

  /**
   * Batch create relationships efficiently
   */
  async batchCreateRelationships(
    relationships: Array<{
      fromId: string;
      toId: string;
      type: string;
      properties?: any;
    }>
  ): Promise<void> {
    const query = `
      UNWIND $relationships as rel
      MATCH (from {id: rel.fromId})
      MATCH (to {id: rel.toId})
      CALL apoc.create.relationship(from, rel.type, rel.properties, to) YIELD rel as r
      RETURN count(r) as created
    `;
    await this.client.writeQuery(query, { relationships });
  }

  /**
   * Get all labels in the database
   */
  async getAllLabels(): Promise<string[]> {
    try {
      // Try to use built-in procedure first
      const result = await this.client.readQuery("CALL db.labels()");
      return result.records.map((record) => record.get("label"));
    } catch {
      // Fallback method
      const result = await this.client.readQuery(`
        MATCH (n)
        UNWIND labels(n) as label
        RETURN DISTINCT label
        ORDER BY label
      `);
      return result.records.map((record) => record.get("label"));
    }
  }

  /**
   * Get all relationship types in the database
   */
  async getAllRelationshipTypes(): Promise<string[]> {
    try {
      // Try to use built-in procedure first
      const result = await this.client.readQuery("CALL db.relationshipTypes()");
      return result.records.map((record) => record.get("relationshipType"));
    } catch {
      // Fallback method
      const result = await this.client.readQuery(`
        MATCH ()-[r]->()
        RETURN DISTINCT type(r) as relationshipType
        ORDER BY relationshipType
      `);
      return result.records.map((record) => record.get("relationshipType"));
    }
  }
}

/**
 * Factory function to create graph operations
 */
export function createMemgraphOperations(client: MemgraphClient): MemgraphOperations {
  return new MemgraphOperations(client);
}