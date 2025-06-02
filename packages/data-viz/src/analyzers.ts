import type { DataAnalysis, VisualizationRequest } from "./types";

/**
 * Analyzes raw data to determine its structure and suggest appropriate visualizations
 */
export class DataAnalyzer {
  /**
   * Analyze data and suggest visualization type
   */
  static analyze(data: any): DataAnalysis {
    if (!data) {
      throw new Error("No data provided for analysis");
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return this.analyzeArray(data);
    }

    // Handle objects
    if (typeof data === "object") {
      return this.analyzeObject(data);
    }

    // Handle primitives
    return {
      type: "categorical",
      structure: "flat",
      suggestedVisualization: "metric",
      confidence: 0.9,
    };
  }

  private static analyzeArray(data: any[]): DataAnalysis {
    if (data.length === 0) {
      throw new Error("Empty array provided");
    }

    const firstItem = data[0];

    // Check if it's a simple array of numbers
    if (data.every((item) => typeof item === "number")) {
      return {
        type: "numerical",
        structure: "flat",
        suggestedVisualization: "histogram",
        confidence: 0.95,
      };
    }

    // Check if it's a simple array of strings
    if (data.every((item) => typeof item === "string")) {
      return {
        type: "categorical",
        structure: "flat",
        suggestedVisualization: "bar",
        confidence: 0.9,
      };
    }

    // Check if it's an array of objects
    if (typeof firstItem === "object" && firstItem !== null) {
      return this.analyzeObjectArray(data);
    }

    return {
      type: "mixed",
      structure: "flat",
      suggestedVisualization: "table",
      confidence: 0.7,
    };
  }

  private static analyzeObjectArray(data: any[]): DataAnalysis {
    const firstItem = data[0];
    const keys = Object.keys(firstItem);

    // Check for time series pattern
    const timeKeys = ["timestamp", "date", "time", "created_at", "updated_at"];
    const hasTimeKey = keys.some((key) =>
      timeKeys.some((timeKey) => key.toLowerCase().includes(timeKey))
    );

    if (hasTimeKey && keys.length >= 2) {
      return {
        type: "temporal",
        structure: "tabular",
        suggestedVisualization: "line",
        confidence: 0.9,
      };
    }

    // Check for coordinate pattern (x, y values)
    if (
      keys.includes("x") &&
      keys.includes("y") &&
      data.every(
        (item) => typeof item.x === "number" && typeof item.y === "number"
      )
    ) {
      return {
        type: "numerical",
        structure: "tabular",
        suggestedVisualization: "scatter",
        confidence: 0.95,
      };
    }

    // Check for key-value pairs
    if (
      keys.length === 2 &&
      data.every((item) => {
        const values = Object.values(item);
        return (
          typeof values[0] === "string" ||
          (typeof values[0] === "number" && typeof values[1] === "number")
        );
      })
    ) {
      return {
        type: "categorical",
        structure: "tabular",
        suggestedVisualization: "bar",
        confidence: 0.85,
      };
    }

    // Check if it looks like a table structure
    if (keys.length > 2) {
      const hasNumericValues = data.some((item) =>
        Object.values(item).some((value) => typeof value === "number")
      );

      if (hasNumericValues) {
        return {
          type: "mixed",
          structure: "tabular",
          suggestedVisualization: "table",
          confidence: 0.8,
        };
      }
    }

    return {
      type: "mixed",
      structure: "tabular",
      suggestedVisualization: "table",
      confidence: 0.7,
    };
  }

  private static analyzeObject(data: any): DataAnalysis {
    const keys = Object.keys(data);
    const values = Object.values(data);

    // Check if it's a simple key-value object where values are numbers
    if (values.every((value) => typeof value === "number")) {
      return {
        type: "numerical",
        structure: "key-value",
        suggestedVisualization: keys.length > 5 ? "bar" : "pie",
        confidence: 0.9,
      };
    }

    // Check if it's a nested object (contains arrays or objects)
    if (
      values.some((value) => Array.isArray(value) || typeof value === "object")
    ) {
      return {
        type: "mixed",
        structure: "nested",
        suggestedVisualization: "table",
        confidence: 0.6,
      };
    }

    return {
      type: "categorical",
      structure: "key-value",
      suggestedVisualization: "table",
      confidence: 0.7,
    };
  }

  /**
   * Transform raw data into a standardized format for visualization
   */
  static transformToVisualizationData(
    data: any,
    analysis: DataAnalysis
  ): VisualizationRequest["data"] {
    switch (analysis.structure) {
      case "flat":
        return this.transformFlatData(data, analysis);
      case "tabular":
        return this.transformTabularData(data, analysis);
      case "key-value":
        return this.transformKeyValueData(data, analysis);
      case "nested":
        return this.transformNestedData(data, analysis);
      default:
        throw new Error(`Unsupported data structure: ${analysis.structure}`);
    }
  }

  private static transformFlatData(data: any[], analysis: DataAnalysis) {
    if (analysis.type === "numerical") {
      // Convert array of numbers to data points with index as label
      return data.map((value, index) => ({
        label: `Point ${index + 1}`,
        value: value,
      }));
    }

    if (analysis.type === "categorical") {
      // Count occurrences of each category
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        counts[String(item)] = (counts[String(item)] || 0) + 1;
      });

      return Object.entries(counts).map(([label, value]) => ({
        label,
        value,
      }));
    }

    return data.map((item, index) => ({
      label: String(item),
      value: index,
    }));
  }

  private static transformTabularData(data: any[], analysis: DataAnalysis) {
    const firstItem = data[0];
    const keys = Object.keys(firstItem);

    if (analysis.type === "temporal") {
      // Find time and value keys
      const timeKeys = [
        "timestamp",
        "date",
        "time",
        "created_at",
        "updated_at",
      ];
      const timeKey = keys.find((key) =>
        timeKeys.some((timeKey) => key.toLowerCase().includes(timeKey))
      );
      const valueKey = keys.find(
        (key) => key !== timeKey && typeof firstItem[key] === "number"
      );

      if (timeKey && valueKey) {
        return data.map((item) => ({
          timestamp: item[timeKey],
          value: item[valueKey],
          label: valueKey,
        }));
      }
    }

    if (analysis.suggestedVisualization === "scatter") {
      return data.map((item) => ({
        x: item.x,
        y: item.y,
        label: item.label || `(${item.x}, ${item.y})`,
      }));
    }

    // Default: convert to simple data points using first string and first number columns
    const labelKey =
      keys.find((key) => typeof firstItem[key] === "string") || keys[0];
    const valueKey =
      keys.find((key) => typeof firstItem[key] === "number") || keys[1];

    return data.map((item) => ({
      label: String(item[labelKey]),
      value: Number(item[valueKey]) || 0,
    }));
  }

  private static transformKeyValueData(data: any, analysis: DataAnalysis) {
    return Object.entries(data).map(([label, value]) => ({
      label,
      value: Number(value) || 0,
    }));
  }

  private static transformNestedData(data: any, analysis: DataAnalysis) {
    // For nested data, flatten to table format
    const flattenObject = (obj: any, prefix = ""): any => {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          Object.assign(result, flattenObject(value, newKey));
        } else {
          result[newKey] = value;
        }
      }
      return result;
    };

    const flattened = flattenObject(data);
    return Object.entries(flattened).map(([label, value]) => ({
      label,
      value: typeof value === "number" ? value : 0,
    }));
  }
}

/**
 * Auto-generate visualization configuration based on data analysis
 */
export function generateVisualizationConfig(
  analysis: DataAnalysis,
  dataSize: number
) {
  const baseConfig = {
    width: 800,
    height: 600,
    title: `${analysis.type} Data Visualization`,
    theme: "light" as const,
    showLegend: dataSize < 20,
    showGrid: true,
  };

  switch (analysis.suggestedVisualization) {
    case "line":
      return {
        ...baseConfig,
        title: "Time Series Data",
        xAxisLabel: "Time",
        yAxisLabel: "Value",
        showPoints: dataSize < 50,
        smooth: dataSize > 100,
      };

    case "bar":
      return {
        ...baseConfig,
        title: "Category Distribution",
        xAxisLabel: "Categories",
        yAxisLabel: "Count",
        horizontal: dataSize > 10,
      };

    case "pie":
      return {
        ...baseConfig,
        title: "Distribution",
        showPercentages: true,
        donut: dataSize > 8,
      };

    case "scatter":
      return {
        ...baseConfig,
        title: "Correlation Analysis",
        xAxisLabel: "X Values",
        yAxisLabel: "Y Values",
        showTrendline: dataSize > 10,
      };

    case "histogram":
      return {
        ...baseConfig,
        title: "Value Distribution",
        xAxisLabel: "Values",
        yAxisLabel: "Frequency",
      };

    default:
      return baseConfig;
  }
}
