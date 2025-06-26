import type {
  FactualMemory,
  Fact,
  FactVerification,
  SearchOptions,
  Memory,
} from "./types";

export class FactualMemoryImpl implements FactualMemory {
  constructor(private memory: Memory) {}

  async store(facts: Fact | Fact[]): Promise<void> {
    const factArray = Array.isArray(facts) ? facts : [facts];

    // Store each fact
    for (const fact of factArray) {
      // Validate fact
      if (!fact.id) fact.id = `fact:${Date.now()}:${Math.random()}`;
      if (!fact.timestamp) fact.timestamp = Date.now();

      // Store in KV
      await this.memory.kv.set(`fact:${fact.id}`, fact);

      // Index for vector search
      await this.memory.vector.index([
        {
          id: fact.id,
          content: fact.statement,
          metadata: {
            type: "fact",
            confidence: fact.confidence,
            source: fact.source,
            entities: fact.entities,
            tags: fact.tags,
            contextId: fact.contextId,
            timestamp: fact.timestamp,
          },
        },
      ]);

      // Add entities to graph if present
      if (fact.entities && fact.entities.length > 0) {
        for (const entityName of fact.entities) {
          await this.memory.graph.addEntity({
            id: `entity:${entityName.toLowerCase().replace(/\s+/g, "-")}`,
            type: "entity",
            name: entityName,
            properties: {
              mentionedInFacts: [fact.id],
            },
            contextIds: fact.contextId ? [fact.contextId] : [],
          });
        }
      }
    }

    await this.memory.lifecycle.emit("facts.stored", factArray);
  }

  async get(id: string): Promise<Fact | null> {
    return this.memory.kv.get<Fact>(`fact:${id}`);
  }

  async search(query: string, options?: SearchOptions): Promise<Fact[]> {
    const vectorResults = await this.memory.vector.search({
      query,
      filter: { type: "fact", ...options?.filter },
      limit: options?.limit || 20,
    });

    const facts: Fact[] = [];
    for (const result of vectorResults) {
      const fact = await this.get(result.id);
      if (fact) facts.push(fact);
    }

    // Sort by confidence if requested
    if (options?.sort === "confidence") {
      facts.sort((a, b) => b.confidence - a.confidence);
    }

    return facts;
  }

  async verify(factId: string): Promise<FactVerification> {
    const fact = await this.get(factId);
    if (!fact) throw new Error(`Fact ${factId} not found`);

    // Find related facts
    const related = await this.memory.vector.search({
      query: fact.statement,
      filter: { type: "fact" },
      limit: 20,
    });

    // Separate supporting and conflicting facts
    const supporting: string[] = [];
    const conflicting: string[] = [];

    for (const result of related) {
      if (result.id === factId) continue;

      // Simple similarity check - in production this would use LLM
      if (result.score && result.score > 0.8) {
        supporting.push(result.id);
      } else if (result.score && result.score < 0.3) {
        conflicting.push(result.id);
      }
    }

    const verification: FactVerification = {
      factId,
      verified: conflicting.length === 0,
      confidence: this.calculateVerificationConfidence(
        fact,
        supporting,
        conflicting
      ),
      supportingFacts: supporting,
      conflictingFacts: conflicting,
      lastVerified: Date.now(),
    };

    // Update fact with verification
    fact.verification = verification;
    await this.memory.kv.set(`fact:${factId}`, fact);

    return verification;
  }

  async update(id: string, updates: Partial<Fact>): Promise<void> {
    const fact = await this.get(id);
    if (!fact) throw new Error(`Fact ${id} not found`);

    const updated = { ...fact, ...updates, id };
    await this.store(updated);
  }

  async delete(id: string): Promise<boolean> {
    const exists = await this.memory.kv.exists(`fact:${id}`);
    if (!exists) return false;

    await this.memory.kv.delete(`fact:${id}`);
    await this.memory.vector.delete([id]);

    return true;
  }

  async getByTag(tag: string, value: string): Promise<Fact[]> {
    // This would be more efficient with a proper index
    const facts: Fact[] = [];

    const iterator = this.memory.kv.scan("fact:*");
    let result = await iterator.next();
    while (!result.done) {
      const [key, fact] = result.value;
      if (fact.tags && fact.tags[tag] === value) {
        facts.push(fact);
      }
      result = await iterator.next();
    }

    return facts;
  }

  async getByContext(contextId: string): Promise<Fact[]> {
    const results = await this.memory.vector.search({
      filter: { type: "fact", contextId },
      limit: 1000,
    });

    const facts: Fact[] = [];
    for (const result of results) {
      const fact = await this.get(result.id);
      if (fact) facts.push(fact);
    }

    return facts;
  }

  private calculateVerificationConfidence(
    fact: Fact,
    supporting: string[],
    conflicting: string[]
  ): number {
    // Simple confidence calculation
    const supportWeight = supporting.length * 0.1;
    const conflictWeight = conflicting.length * 0.2;

    let confidence = fact.confidence;
    confidence += Math.min(supportWeight, 0.3);
    confidence -= Math.min(conflictWeight, 0.5);

    return Math.max(0, Math.min(1, confidence));
  }
}
