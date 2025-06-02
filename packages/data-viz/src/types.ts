import { z } from "zod";

// Base data types that can be visualized
export const DataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const TimeSeriesDataPointSchema = z.object({
  timestamp: z.union([z.string(), z.number(), z.date()]),
  value: z.number(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const TableDataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number()]))),
  title: z.string().optional(),
});

export const ScatterDataPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
  size: z.number().optional(),
  color: z.string().optional(),
});

export const HeatmapDataPointSchema = z.object({
  x: z.string(),
  y: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

// Chart configuration schemas
export const ChartConfigSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  width: z.number().default(800),
  height: z.number().default(600),
  backgroundColor: z.string().default("#ffffff"),
  textColor: z.string().default("#000000"),
  fontFamily: z.string().default("Arial, sans-serif"),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  theme: z.enum(["light", "dark", "auto"]).default("light"),
});

export const LineChartConfigSchema = ChartConfigSchema.extend({
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  showPoints: z.boolean().default(true),
  lineWidth: z.number().default(2),
  smooth: z.boolean().default(false),
});

export const BarChartConfigSchema = ChartConfigSchema.extend({
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  horizontal: z.boolean().default(false),
  barSpacing: z.number().default(0.1),
});

export const PieChartConfigSchema = ChartConfigSchema.extend({
  showPercentages: z.boolean().default(true),
  showValues: z.boolean().default(false),
  donut: z.boolean().default(false),
  donutRadius: z.number().default(0.5),
});

export const ScatterChartConfigSchema = ChartConfigSchema.extend({
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  pointSize: z.number().default(5),
  showTrendline: z.boolean().default(false),
});

export const HeatmapConfigSchema = ChartConfigSchema.extend({
  colorScale: z.array(z.string()).default(["#fff7ec", "#7f2704"]),
  showValues: z.boolean().default(false),
  cellSpacing: z.number().default(1),
});

// Visualization request schemas
export const VisualizationRequestSchema = z.object({
  type: z.enum([
    "line",
    "bar",
    "pie",
    "scatter",
    "heatmap",
    "table",
    "metric",
    "histogram",
    "area",
  ]),
  data: z.union([
    z.array(DataPointSchema),
    z.array(TimeSeriesDataPointSchema),
    z.array(ScatterDataPointSchema),
    z.array(HeatmapDataPointSchema),
    TableDataSchema,
  ]),
  config: ChartConfigSchema.partial().optional(),
  format: z.enum(["png", "jpeg", "svg", "webp"]).default("png").optional(),
  quality: z.number().min(1).max(100).default(90).optional(),
});

// Export types
export type DataPoint = z.infer<typeof DataPointSchema>;
export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>;
export type TableData = z.infer<typeof TableDataSchema>;
export type ScatterDataPoint = z.infer<typeof ScatterDataPointSchema>;
export type HeatmapDataPoint = z.infer<typeof HeatmapDataPointSchema>;

export type ChartConfig = z.infer<typeof ChartConfigSchema>;
export type LineChartConfig = z.infer<typeof LineChartConfigSchema>;
export type BarChartConfig = z.infer<typeof BarChartConfigSchema>;
export type PieChartConfig = z.infer<typeof PieChartConfigSchema>;
export type ScatterChartConfig = z.infer<typeof ScatterChartConfigSchema>;
export type HeatmapConfig = z.infer<typeof HeatmapConfigSchema>;

export type VisualizationRequest = z.infer<typeof VisualizationRequestSchema>;

// Generic data detection utilities
export interface DataAnalysis {
  type: "numerical" | "categorical" | "temporal" | "mixed";
  structure: "flat" | "nested" | "tabular" | "key-value";
  suggestedVisualization: VisualizationRequest["type"];
  confidence: number;
}

// Result interface
export interface VisualizationResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  metadata: {
    generatedAt: Date;
    dataPoints: number;
    chartType: string;
  };
}

// Data fetching interfaces
export interface DataSource {
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  query?: string;
  format?: "json" | "csv" | "xml";
}

export interface DataFetcher {
  fetch(source: DataSource): Promise<any>;
  transform?(data: any): Promise<VisualizationRequest["data"]>;
}
