# @daydreamsai/memgraph

Memgraph graph database integration for Daydreams AI agents, providing graph memory capabilities using the Neo4j JavaScript driver.

## Installation

```bash
npm install @daydreamsai/memgraph neo4j-driver
```

## Quick Start

### Running Memgraph

First, start Memgraph using Docker:

```bash
# For Linux and macOS
curl https://install.memgraph.com | sh

# For Windows
iwr https://windows.memgraph.com | iex
```

This starts Memgraph Platform with:
- Memgraph database on port 7687
- Memgraph Lab web interface at http://localhost:3000

### Basic Usage

```typescript
import { createMemgraphClient, createMemgraphProvider } from "@daydreamsai/memgraph";

// Create a client for direct database operations
const client = createMemgraphClient({
  uri: "bolt://localhost:7687",
  username: "", // Default: no auth
  password: "", // Default: no auth
});

// Test connection
const isConnected = await client.testConnection();
console.log("Connected:", isConnected);

// Execute a simple query
await client.writeQuery("CREATE (:Person {name: 'Alice', age: 22})");

// Read data
const result = await client.readQuery("MATCH (p:Person) RETURN p");
console.log("People:", result.records);

// Clean up
await client.close();
```

## Using with Daydreams Memory System

### Graph Provider Integration

```typescript
import { createDreams } from "@daydreamsai/core";
import { createMemgraphProvider } from "@daydreamsai/memgraph";

// Create Memgraph provider for graph memory
const graphProvider = createMemgraphProvider({
  uri: "bolt://localhost:7687",
  username: "",
  password: "",
});

// Configure agent with graph memory
const agent = createDreams({
  memory: {
    providers: {
      graph: graphProvider,
      // ... other providers
    },
  },
});

// Use graph memory in agent
await agent.memory.graph.addEntity({
  id: "user-123",
  type: "User",
  name: "Alice",
  properties: { age: 30, email: "alice@example.com" },
  contextIds: ["chat-session-1"],
});

await agent.memory.graph.addRelationship({
  id: "rel-1",
  from: "user-123",
  to: "topic-ai",
  type: "INTERESTED_IN",
  properties: { strength: 0.8 },
});

// Find related entities
const related = await agent.memory.graph.findRelated("user-123");
```

## Configuration

### Connection Configuration

```typescript
interface MemgraphConfig {
  uri?: string;                    // Default: "bolt://localhost:7687"
  username?: string;               // Default: ""
  password?: string;               // Default: ""
  database?: string;               // For multi-tenant setups
  options?: {
    maxConnectionLifetime?: number;        // Default: 3600000 (1 hour)
    maxConnectionPoolSize?: number;        // Default: 100
    connectionAcquisitionTimeout?: number; // Default: 60000 (1 minute)
    disableLosslessIntegers?: boolean;     // Default: true
  };
}
```

### Authentication

For Memgraph with authentication enabled:

```typescript
// First create user in Memgraph
// CREATE USER 'memgraph' IDENTIFIED BY 'password';

const client = createMemgraphClient({
  uri: "bolt://localhost:7687",
  username: "memgraph",
  password: "password",
});
```

## High-Level Operations

### Graph Operations Class

```typescript
import { createMemgraphOperations } from "@daydreamsai/memgraph";

const client = createMemgraphClient();
const ops = createMemgraphOperations(client);

// Create nodes
await ops.createPerson("Bob", 25, { city: "NYC" });

// Create relationships
await ops.createRelationship("user-1", "user-2", "KNOWS", { since: 2020 });

// Find nodes
const people = await ops.findNodesByType("Person");
const bobData = await ops.findNodesByProperty("name", "Bob");

// Graph traversal
const neighbors = await ops.getNeighbors("user-1");
const path = await ops.findShortestPath("user-1", "user-2");

// Analytics
const stats = await ops.getNodeDegree("user-1");
const count = await ops.countNodesByLabel("Person");
```

## Client Operations

### Query Execution

```typescript
// Direct query execution
const result = await client.query(
  "MATCH (p:Person {name: $name}) RETURN p",
  { name: "Alice" }
);

// Read-only queries with retry
const people = await client.readQuery("MATCH (p:Person) RETURN p");

// Write queries with retry
await client.writeQuery(
  "CREATE (:Person {name: $name})",
  { name: "Charlie" }
);

// Transactions
await client.transaction(async (tx) => {
  await tx.run("CREATE (:Person {name: 'Dave'})");
  await tx.run("CREATE (:Person {name: 'Eve'})");
  // Both operations commit together
});
```

### Database Management

```typescript
// Get database statistics
const stats = await client.getStats();
console.log(`Nodes: ${stats.nodeCount}, Edges: ${stats.relationshipCount}`);

// Create indexes for performance
await client.createIndex("Person", "name");
await client.createIndex("User", "email");

// Clear database (use with caution!)
await client.clearDatabase();

// Get server information
const info = await client.getServerInfo();
```

## Examples

### Social Network Graph

```typescript
import { createMemgraphClient, createMemgraphOperations } from "@daydreamsai/memgraph";

const client = createMemgraphClient();
const ops = createMemgraphOperations(client);

// Create people
await ops.createPerson("Alice", 30, { city: "NYC" });
await ops.createPerson("Bob", 25, { city: "SF" });
await ops.createPerson("Charlie", 35, { city: "NYC" });

// Create friendships
await ops.createRelationship("alice", "bob", "FRIENDS", { since: 2020 });
await ops.createRelationship("alice", "charlie", "FRIENDS", { since: 2018 });

// Find Alice's friends
const aliceFriends = await ops.getNeighbors("alice", "OUTGOING");

// Find people in NYC
const nycPeople = await ops.findNodesByProperty("city", "NYC", "Person");

// Find mutual friends
const mutualPath = await ops.findShortestPath("bob", "charlie");
```

### Knowledge Graph

```typescript
// Create entities and relationships for a knowledge base
await client.writeQuery(`
  CREATE (:Concept {id: 'ai', name: 'Artificial Intelligence'})
  CREATE (:Concept {id: 'ml', name: 'Machine Learning'})
  CREATE (:Concept {id: 'dl', name: 'Deep Learning'})
  CREATE (:Person {id: 'alice', name: 'Alice', role: 'Data Scientist'})
`);

await client.writeQuery(`
  MATCH (ai:Concept {id: 'ai'})
  MATCH (ml:Concept {id: 'ml'})
  MATCH (dl:Concept {id: 'dl'})
  MATCH (alice:Person {id: 'alice'})
  CREATE (ml)-[:IS_PART_OF]->(ai)
  CREATE (dl)-[:IS_PART_OF]->(ml)
  CREATE (alice)-[:EXPERT_IN]->(ml)
`);

// Query the knowledge graph
const expertise = await client.readQuery(`
  MATCH (p:Person)-[r:EXPERT_IN]->(c:Concept)
  RETURN p.name as person, c.name as concept, type(r) as relationship
`);
```

## Graph Memory Provider

The `MemgraphProvider` implements the Daydreams `GraphProvider` interface:

```typescript
// Provider methods available:
await provider.addNode(node);
await provider.getNode(id);
await provider.updateNode(id, updates);
await provider.deleteNode(id);

await provider.addEdge(edge);
await provider.getEdges(nodeId, direction);
await provider.deleteEdge(id);

await provider.findNodes(filter);
await provider.traverse(traversal);
await provider.shortestPath(from, to);

// Health check
const health = await provider.health();
```

## Performance Tips

1. **Create Indexes**: For frequently queried properties
   ```typescript
   await client.createIndex("Person", "name");
   await client.createIndex("User", "email");
   ```

2. **Use Batch Operations**: For creating many nodes/relationships
   ```typescript
   await ops.batchCreateNodes(nodes);
   await ops.batchCreateRelationships(relationships);
   ```

3. **Connection Pool**: Configure appropriate pool size
   ```typescript
   const client = createMemgraphClient({
     options: {
       maxConnectionPoolSize: 50,
       maxConnectionLifetime: 1800000, // 30 minutes
     },
   });
   ```

4. **Use Transactions**: For related operations
   ```typescript
   await client.transaction(async (tx) => {
     // Multiple related operations
   });
   ```

## Error Handling

```typescript
try {
  await client.query("INVALID CYPHER");
} catch (error) {
  if (error.message.includes("syntax error")) {
    console.log("Invalid Cypher syntax");
  }
  // Handle other database errors
}
```

## License

MIT

## Contributing

This package follows the Daydreams contributing guidelines. See the main repository for details.