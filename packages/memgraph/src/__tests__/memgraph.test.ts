import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createMemgraphClient, createMemgraphProvider, createMemgraphOperations } from "../index";

// These tests require a running Memgraph instance
// Skip them if no connection is available
const SKIP_INTEGRATION_TESTS = process.env.SKIP_INTEGRATION_TESTS === "true";

describe.skipIf(SKIP_INTEGRATION_TESTS)("Memgraph Integration", () => {
  const client = createMemgraphClient({
    uri: "bolt://localhost:7687",
    username: "",
    password: "",
  });

  beforeAll(async () => {
    // Test connection - if it fails, skip all tests
    try {
      const isConnected = await client.testConnection();
      if (!isConnected) {
        throw new Error("Cannot connect to Memgraph");
      }
      // Clear any existing data
      await client.clearDatabase();
    } catch (error) {
      console.log("Skipping integration tests - no Memgraph connection");
      // This will cause all tests to be skipped
    }
  });

  afterAll(async () => {
    await client.close();
  });

  it("should connect to Memgraph", async () => {
    const isConnected = await client.testConnection();
    expect(isConnected).toBe(true);
  });

  it("should get server info", async () => {
    const info = await client.getServerInfo();
    expect(Array.isArray(info)).toBe(true);
    expect(info.length).toBeGreaterThan(0);
  });

  it("should create and retrieve a simple node", async () => {
    // Create a node
    await client.writeQuery(
      "CREATE (p:Person {id: 'test-1', name: 'Alice', age: 30})"
    );

    // Retrieve the node
    const result = await client.readQuery(
      "MATCH (p:Person {id: 'test-1'}) RETURN p"
    );

    expect(result.records).toHaveLength(1);
    const person = result.records[0].get("p");
    expect(person.properties.name).toBe("Alice");
    expect(person.properties.age.toNumber()).toBe(30);
  });

  it("should use operations helper", async () => {
    const ops = createMemgraphOperations(client);
    
    // Create a person using operations helper
    const name = await ops.createPerson("Bob", 25, { city: "NYC" });
    expect(name).toBe("Bob");

    // Find people
    const people = await ops.findNodesByProperty("name", "Bob", "Person");
    expect(people).toHaveLength(1);
    expect(people[0].city).toBe("NYC");
  });

  it("should get database stats", async () => {
    const stats = await client.getStats();
    expect(typeof stats.nodeCount).toBe("number");
    expect(typeof stats.relationshipCount).toBe("number");
    expect(stats.nodeCount).toBeGreaterThan(0); // We created some nodes
  });
});

describe("Memgraph Provider", () => {
  it("should create provider instance", () => {
    const provider = createMemgraphProvider({
      uri: "bolt://localhost:7687",
    });
    expect(provider).toBeDefined();
  });

  it("should have all required provider methods", () => {
    const provider = createMemgraphProvider();
    
    // Check GraphProvider interface methods
    expect(typeof provider.initialize).toBe("function");
    expect(typeof provider.close).toBe("function");
    expect(typeof provider.health).toBe("function");
    expect(typeof provider.addNode).toBe("function");
    expect(typeof provider.getNode).toBe("function");
    expect(typeof provider.updateNode).toBe("function");
    expect(typeof provider.deleteNode).toBe("function");
    expect(typeof provider.addEdge).toBe("function");
    expect(typeof provider.getEdges).toBe("function");
    expect(typeof provider.deleteEdge).toBe("function");
    expect(typeof provider.findNodes).toBe("function");
    expect(typeof provider.traverse).toBe("function");
    expect(typeof provider.shortestPath).toBe("function");
  });
});

describe("Memgraph Client", () => {
  it("should create client instance", () => {
    const client = createMemgraphClient({
      uri: "bolt://localhost:7687",
      username: "test",
      password: "test",
    });
    expect(client).toBeDefined();
  });

  it("should have all required client methods", () => {
    const client = createMemgraphClient();
    
    expect(typeof client.query).toBe("function");
    expect(typeof client.readQuery).toBe("function");
    expect(typeof client.writeQuery).toBe("function");
    expect(typeof client.transaction).toBe("function");
    expect(typeof client.testConnection).toBe("function");
    expect(typeof client.getServerInfo).toBe("function");
    expect(typeof client.clearDatabase).toBe("function");
    expect(typeof client.getStats).toBe("function");
    expect(typeof client.close).toBe("function");
  });
});

describe("Memgraph Operations", () => {
  const client = createMemgraphClient();
  const ops = createMemgraphOperations(client);

  it("should create operations instance", () => {
    expect(ops).toBeDefined();
  });

  it("should have all required operations methods", () => {
    expect(typeof ops.createPerson).toBe("function");
    expect(typeof ops.createRelationship).toBe("function");
    expect(typeof ops.findNodesByType).toBe("function");
    expect(typeof ops.findNodesByProperty).toBe("function");
    expect(typeof ops.getNeighbors).toBe("function");
    expect(typeof ops.getRelationships).toBe("function");
    expect(typeof ops.findShortestPath).toBe("function");
    expect(typeof ops.countNodesByLabel).toBe("function");
    expect(typeof ops.getNodeDegree).toBe("function");
    expect(typeof ops.updateNode).toBe("function");
    expect(typeof ops.deleteNode).toBe("function");
    expect(typeof ops.executeCypher).toBe("function");
    expect(typeof ops.batchCreateNodes).toBe("function");
    expect(typeof ops.batchCreateRelationships).toBe("function");
    expect(typeof ops.getAllLabels).toBe("function");
    expect(typeof ops.getAllRelationshipTypes).toBe("function");
  });
});