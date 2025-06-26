import type {
  SemanticMemory,
  SemanticConcept,
  Pattern,
  SearchOptions,
  Memory,
} from "./types";

export class SemanticMemoryImpl implements SemanticMemory {
  constructor(private memory: Memory) {}

  async store(concept: SemanticConcept): Promise<void> {
    if (!concept.id) {
      concept.id = `concept:${concept.type}:${Date.now()}`;
    }

    // Store in KV
    await this.memory.kv.set(`semantic:${concept.id}`, concept);

    // Index for vector search
    await this.memory.vector.index([
      {
        id: concept.id,
        content: concept.content,
        metadata: {
          type: "semantic",
          conceptType: concept.type,
          confidence: concept.confidence,
          occurrences: concept.occurrences,
          ...concept.metadata,
        },
      },
    ]);

    await this.memory.lifecycle.emit("semantic.stored", concept);
  }

  async get(id: string): Promise<SemanticConcept | null> {
    return this.memory.kv.get<SemanticConcept>(`semantic:${id}`);
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SemanticConcept[]> {
    const results = await this.memory.vector.search({
      query,
      filter: { type: "semantic", ...options?.filter },
      limit: options?.limit || 10,
    });

    const concepts: SemanticConcept[] = [];
    for (const result of results) {
      const concept = await this.get(result.id);
      if (concept) concepts.push(concept);
    }

    // Sort by confidence if requested
    if (options?.sort === "confidence") {
      concepts.sort((a, b) => b.confidence - a.confidence);
    }

    return concepts;
  }

  async getRelevantPatterns(contextId: string): Promise<Pattern[]> {
    // Get all patterns
    const patterns: Pattern[] = [];

    const iterator = this.memory.kv.scan("semantic:concept:pattern:*");
    let result = await iterator.next();
    while (!result.done) {
      const [key, concept] = result.value;
      if (concept.type === "pattern") {
        patterns.push(concept as Pattern);
      }
      result = await iterator.next();
    }

    // Sort by success rate and occurrences
    patterns.sort((a, b) => {
      const scoreA = a.successRate * a.occurrences;
      const scoreB = b.successRate * b.occurrences;
      return scoreB - scoreA;
    });

    return patterns.slice(0, 10);
  }

  async learnFromAction(action: any, result: any): Promise<void> {
    // Extract pattern from action-result pair
    const patternId = `pattern:${action.name}:${Date.now()}`;

    const pattern: Pattern = {
      id: patternId,
      type: "pattern",
      content: `When action ${action.name} is called with similar input, expect similar result`,
      trigger: JSON.stringify(action.input),
      response: JSON.stringify(result.data),
      confidence: result.error ? 0.3 : 0.8,
      occurrences: 1,
      successRate: result.error ? 0 : 1,
      examples: [
        `${action.name}(${JSON.stringify(action.input)}) => ${JSON.stringify(
          result.data
        )}`,
      ],
    };

    // Check if similar pattern exists
    const similar = await this.findSimilarPattern(pattern);

    if (similar) {
      // Update existing pattern
      similar.occurrences++;
      similar.confidence =
        (similar.confidence * (similar.occurrences - 1) + pattern.confidence) /
        similar.occurrences;
      similar.successRate = result.error
        ? (similar.successRate * (similar.occurrences - 1)) /
          similar.occurrences
        : (similar.successRate * (similar.occurrences - 1) + 1) /
          similar.occurrences;
      similar.examples.push(pattern.examples[0]);

      await this.store(similar);
    } else {
      // Store new pattern
      await this.store(pattern);
    }
  }

  async updateConfidence(id: string, delta: number): Promise<void> {
    const concept = await this.get(id);
    if (!concept) throw new Error(`Concept ${id} not found`);

    concept.confidence = Math.max(0, Math.min(1, concept.confidence + delta));
    await this.store(concept);
  }

  private async findSimilarPattern(pattern: Pattern): Promise<Pattern | null> {
    const results = await this.memory.vector.search({
      query: pattern.trigger,
      filter: { type: "semantic", conceptType: "pattern" },
      limit: 1,
      minScore: 0.8,
    });

    if (results.length > 0) {
      const similar = await this.get(results[0].id);
      return similar as Pattern;
    }

    return null;
  }
}
