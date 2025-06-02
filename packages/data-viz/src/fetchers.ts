import type { DataSource, DataFetcher, VisualizationRequest } from "./types";

/**
 * Generic data fetcher that can retrieve data from various sources
 */
export class GenericDataFetcher implements DataFetcher {
  /**
   * Fetch data from a source
   */
  async fetch(source: DataSource): Promise<any> {
    if (source.url) {
      return this.fetchFromUrl(source);
    }

    throw new Error("No supported data source provided");
  }

  /**
   * Fetch data from URL
   */
  private async fetchFromUrl(source: DataSource): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...source.headers,
    };

    if (source.apiKey) {
      headers["Authorization"] = `Bearer ${source.apiKey}`;
    }

    const response = await fetch(source.url!, {
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return response.json();
    }

    if (contentType?.includes("text/csv") || source.format === "csv") {
      const text = await response.text();
      return this.parseCsv(text);
    }

    if (contentType?.includes("application/xml") || source.format === "xml") {
      const text = await response.text();
      return this.parseXml(text);
    }

    return response.text();
  }

  /**
   * Parse CSV data into structured format
   */
  private parseCsv(csvText: string): any[] {
    const lines = csvText.trim().split("\n");
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        // Try to convert to number if possible
        row[header] = isNaN(Number(value)) ? value : Number(value);
      });
      return row;
    });

    return rows;
  }

  /**
   * Parse XML data (basic implementation)
   */
  private parseXml(xmlText: string): any {
    // This is a very basic XML parser - you might want to use a proper XML library
    // For now, return the raw text
    return { xml: xmlText };
  }

  /**
   * Transform fetched data into visualization format
   */
  async transform(data: any): Promise<VisualizationRequest["data"]> {
    // If data is already in the right format, return as-is
    if (this.isVisualizationData(data)) {
      return data;
    }

    // Convert arrays of objects to data points
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
      const firstItem = data[0];
      const keys = Object.keys(firstItem);

      // Find label and value keys
      const labelKey =
        keys.find((key) => typeof firstItem[key] === "string") || keys[0];
      const valueKey =
        keys.find((key) => typeof firstItem[key] === "number") || keys[1];

      return data.map((item) => ({
        label: String(item[labelKey]),
        value: Number(item[valueKey]) || 0,
      }));
    }

    // Convert simple objects to data points
    if (typeof data === "object" && !Array.isArray(data)) {
      return Object.entries(data).map(([label, value]) => ({
        label,
        value: Number(value) || 0,
      }));
    }

    throw new Error("Unable to transform data into visualization format");
  }

  /**
   * Check if data is already in visualization format
   */
  private isVisualizationData(data: any): boolean {
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      return (
        typeof first === "object" &&
        (("label" in first && "value" in first) ||
          ("x" in first && "y" in first) ||
          ("timestamp" in first && "value" in first))
      );
    }

    // Check if it's table data
    if (
      typeof data === "object" &&
      "headers" in data &&
      "rows" in data &&
      Array.isArray(data.headers) &&
      Array.isArray(data.rows)
    ) {
      return true;
    }

    return false;
  }
}

/**
 * Specialized fetchers for common data sources
 */

/**
 * REST API data fetcher with JSON support
 */
export class RestApiDataFetcher extends GenericDataFetcher {
  constructor(
    private baseUrl: string,
    private defaultHeaders: Record<string, string> = {}
  ) {
    super();
  }

  async fetch(source: DataSource): Promise<any> {
    const url = source.url || this.baseUrl;
    const headers = { ...this.defaultHeaders, ...source.headers };

    return super.fetch({
      ...source,
      url,
      headers,
    });
  }
}

/**
 * GraphQL data fetcher
 */
export class GraphQLDataFetcher implements DataFetcher {
  constructor(
    private endpoint: string,
    private defaultHeaders: Record<string, string> = {}
  ) {}

  async fetch(source: DataSource): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.defaultHeaders,
        ...source.headers,
      },
      body: JSON.stringify({
        query: source.query,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GraphQL query failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(
        `GraphQL errors: ${result.errors.map((e: any) => e.message).join(", ")}`
      );
    }

    return result.data;
  }

  async transform(data: any): Promise<VisualizationRequest["data"]> {
    // GraphQL responses are often nested, so we need to extract the relevant data
    // This is a basic implementation - you might need to customize based on your schema
    const values = Object.values(data);
    if (values.length === 1 && Array.isArray(values[0])) {
      return new GenericDataFetcher().transform(values[0]);
    }

    return new GenericDataFetcher().transform(data);
  }
}

/**
 * Database query result fetcher
 */
export class DatabaseDataFetcher implements DataFetcher {
  async fetch(source: DataSource): Promise<any> {
    // This would typically connect to a database and execute a query
    // For now, throw an error indicating this needs to be implemented
    throw new Error(
      "Database fetcher not yet implemented - please use URL-based sources"
    );
  }

  async transform(data: any): Promise<VisualizationRequest["data"]> {
    return new GenericDataFetcher().transform(data);
  }
}

/**
 * Factory function to create appropriate fetcher based on source type
 */
export function createDataFetcher(source: DataSource): DataFetcher {
  if (source.url) {
    if (source.url.includes("graphql") || source.query) {
      return new GraphQLDataFetcher(source.url);
    }
    return new GenericDataFetcher();
  }

  // Default to generic fetcher
  return new GenericDataFetcher();
}

/**
 * Convenience function to fetch and transform data in one call
 */
export async function fetchAndTransformData(
  source: DataSource
): Promise<VisualizationRequest["data"]> {
  const fetcher = createDataFetcher(source);
  const rawData = await fetcher.fetch(source);
  return fetcher.transform ? await fetcher.transform(rawData) : rawData;
}
