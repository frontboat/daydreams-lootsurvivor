// Optional imports - will fallback if not available
let ChartJSNodeCanvas: any = null;
let Chart: any = null;
let canvasAvailable = false;

try {
  const chartjsModule = require("chartjs-node-canvas");
  const chartModule = require("chart.js");
  ChartJSNodeCanvas = chartjsModule.ChartJSNodeCanvas;
  Chart = chartModule.Chart;
  if (Chart && Chart.register) {
    Chart.register(...chartModule.registerables);
  }
  canvasAvailable = true;
  console.log("✅ Canvas/Chart.js available - using high-quality rendering");
} catch (error) {
  console.log("⚠️  Canvas/Chart.js not available - using SVG fallback mode");
  console.log("   Install canvas dependencies for better performance:");
  console.log(
    "   macOS: brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman"
  );
  console.log("   then: pnpm install --force");
}

import * as d3 from "d3";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import type {
  VisualizationRequest,
  VisualizationResult,
  DataPoint,
  TimeSeriesDataPoint,
  ScatterDataPoint,
  TableData,
  ChartConfig,
} from "./types";

/**
 * Main visualization engine that converts data to images
 */
export class DataVisualizer {
  private chartJS: any = null;
  private canvasMode: boolean = false;

  constructor(width = 800, height = 600) {
    if (canvasAvailable && ChartJSNodeCanvas) {
      try {
        this.chartJS = new ChartJSNodeCanvas({
          width,
          height,
          backgroundColour: "white",
        });
        this.canvasMode = true;
        console.log("🎨 Using Canvas rendering mode");
      } catch (error) {
        console.log("⚠️  Canvas initialization failed, using SVG mode");
        this.canvasMode = false;
      }
    } else {
      console.log("🖼️  Using SVG rendering mode");
      this.canvasMode = false;
    }
  }

  /**
   * Generate visualization from request
   */
  async visualize(request: VisualizationRequest): Promise<VisualizationResult> {
    const { type, data, format = "png", quality = 90 } = request;
    const config: Partial<ChartConfig> = request.config || {};

    let buffer: Buffer;

    // Always use SVG mode if canvas is not available
    if (!this.canvasMode) {
      console.log(`📊 Generating ${type} chart using SVG fallback`);
      buffer = await this.createSVGVisualization(type, data, config);

      return {
        buffer,
        format: "svg", // Always return SVG when canvas is not available
        width: config.width || 800,
        height: config.height || 600,
        metadata: {
          generatedAt: new Date(),
          dataPoints: Array.isArray(data) ? data.length : 1,
          chartType: type,
        },
      };
    }

    // Canvas mode - use Chart.js
    try {
      switch (type) {
        case "line":
          buffer = await this.createLineChart(
            data as TimeSeriesDataPoint[],
            config
          );
          break;
        case "bar":
          buffer = await this.createBarChart(data as DataPoint[], config);
          break;
        case "pie":
          buffer = await this.createPieChart(data as DataPoint[], config);
          break;
        case "scatter":
          buffer = await this.createScatterChart(
            data as ScatterDataPoint[],
            config
          );
          break;
        case "area":
          buffer = await this.createAreaChart(
            data as TimeSeriesDataPoint[],
            config
          );
          break;
        case "histogram":
          buffer = await this.createHistogram(data as DataPoint[], config);
          break;
        case "table":
          buffer = await this.createTable(data as TableData, config);
          break;
        case "metric":
          buffer = await this.createMetricCard(data as DataPoint[], config);
          break;
        case "heatmap":
          buffer = await this.createHeatmap(data as any[], config);
          break;
        default:
          throw new Error(`Unsupported visualization type: ${type}`);
      }

      // Convert to requested format if needed
      if (format !== "png" && format !== "svg") {
        try {
          buffer = await this.convertFormat(buffer, format, quality);
        } catch (error) {
          console.warn(`⚠️  Format conversion failed, returning PNG: ${error}`);
        }
      }

      return {
        buffer,
        format,
        width: config.width || 800,
        height: config.height || 600,
        metadata: {
          generatedAt: new Date(),
          dataPoints: Array.isArray(data) ? data.length : 1,
          chartType: type,
        },
      };
    } catch (error) {
      console.warn(
        `⚠️  Canvas rendering failed, falling back to SVG: ${error}`
      );
      // Fallback to SVG if canvas fails
      buffer = await this.createSVGVisualization(type, data, config);

      return {
        buffer,
        format: "svg",
        width: config.width || 800,
        height: config.height || 600,
        metadata: {
          generatedAt: new Date(),
          dataPoints: Array.isArray(data) ? data.length : 1,
          chartType: type,
        },
      };
    }
  }

  /**
   * SVG fallback visualization for when canvas is not available
   */
  private async createSVGVisualization(
    type: string,
    data: any,
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    switch (type) {
      case "bar":
        const barData = this.ensureDataPointFormat(data);
        return this.createSVGBarChart(barData, config);
      case "line":
        const lineData = this.ensureTimeSeriesFormat(data);
        return this.createSVGLineChart(lineData, config);
      case "pie":
        const pieData = this.ensureDataPointFormat(data);
        return this.createSVGPieChart(pieData, config);
      case "table":
        return this.createTable(data as TableData, config);
      case "metric":
        const metricData = this.ensureDataPointFormat(data);
        return this.createMetricCard(metricData, config);
      default:
        // Default to bar chart for unsupported types
        const defaultData = this.ensureDataPointFormat(data);
        return this.createSVGBarChart(defaultData, config);
    }
  }

  /**
   * Ensure data is in DataPoint format
   */
  private ensureDataPointFormat(data: any): DataPoint[] {
    // If it's already an array with the right structure, return it
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];

      // Check if it's already in DataPoint format
      if (
        firstItem &&
        typeof firstItem === "object" &&
        "label" in firstItem &&
        "value" in firstItem
      ) {
        return data.map((item) => ({
          label: item.label || "Unknown",
          value: item.value || 0,
          color: item.color,
          metadata: item.metadata,
        }));
      }

      // Convert array of numbers to DataPoints
      if (data.every((item) => typeof item === "number")) {
        return data.map((value: number, index: number) => ({
          label: `Point ${index + 1}`,
          value: value,
        }));
      }

      // Convert array of strings to DataPoints (count occurrences)
      if (data.every((item) => typeof item === "string")) {
        const counts: Record<string, number> = {};
        data.forEach((item: string) => {
          counts[item] = (counts[item] || 0) + 1;
        });
        return Object.entries(counts).map(([label, value]) => ({
          label,
          value,
        }));
      }

      // Try to extract label/value from object arrays
      if (typeof firstItem === "object") {
        const keys = Object.keys(firstItem);
        const labelKey =
          keys.find((key) => typeof firstItem[key] === "string") || keys[0];
        const valueKey =
          keys.find((key) => typeof firstItem[key] === "number") || keys[1];

        return data.map((item) => ({
          label: String(item[labelKey] || "Unknown"),
          value: Number(item[valueKey]) || 0,
        }));
      }
    }

    // If it's an object, convert to DataPoint array
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return Object.entries(data).map(([label, value]) => ({
        label,
        value: typeof value === "number" ? value : 0,
      }));
    }

    // Fallback: convert to single data point
    return [
      {
        label: "Value",
        value: typeof data === "number" ? data : 1,
      },
    ];
  }

  /**
   * Ensure data is in TimeSeriesDataPoint format
   */
  private ensureTimeSeriesFormat(data: any): TimeSeriesDataPoint[] {
    // If it's already an array with the right structure, return it
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];

      // Check if it's TimeSeriesDataPoint format
      if (
        firstItem &&
        typeof firstItem === "object" &&
        "timestamp" in firstItem &&
        "value" in firstItem
      ) {
        return data.map((item) => ({
          timestamp: item.timestamp,
          value: item.value || 0,
          label: item.label,
          color: item.color,
        }));
      }

      // Convert DataPoint format to TimeSeries
      if (
        firstItem &&
        typeof firstItem === "object" &&
        "label" in firstItem &&
        "value" in firstItem
      ) {
        return data.map((item, index) => ({
          timestamp: `Point ${index + 1}`,
          value: item.value || 0,
          label: item.label,
        }));
      }

      // Convert array of numbers to TimeSeries
      if (data.every((item) => typeof item === "number")) {
        return data.map((value: number, index: number) => ({
          timestamp: `Point ${index + 1}`,
          value: value,
        }));
      }
    }

    // If it's an object, convert to TimeSeries
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return Object.entries(data).map(([label, value]) => ({
        timestamp: label,
        value: typeof value === "number" ? value : 0,
      }));
    }

    // Fallback
    return [
      {
        timestamp: "Point 1",
        value: typeof data === "number" ? data : 1,
      },
    ];
  }

  /**
   * Create SVG bar chart
   */
  private async createSVGBarChart(
    data: DataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const width = config.width || 800;
    const height = config.height || 600;
    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data.map((d) => d.value));
    const barWidth = chartWidth / data.length;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${
          config.backgroundColor || "#ffffff"
        }"/>
        
        <!-- Title -->
        ${
          config.title
            ? `
          <text x="${
            width / 2
          }" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${
                config.textColor || "#000000"
              }">
            ${config.title}
          </text>
        `
            : ""
        }
        
        <!-- Chart area background -->
        <rect x="${margin.left}" y="${
      margin.top
    }" width="${chartWidth}" height="${chartHeight}" 
              fill="none" stroke="#e5e7eb" stroke-width="1"/>
        
        <!-- Y-axis lines -->
        ${Array.from({ length: 5 }, (_, i) => {
          const y = margin.top + (i * chartHeight) / 4;
          const value = maxValue * (1 - i / 4);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${
            margin.left + chartWidth
          }" y2="${y}" 
                  stroke="#f3f4f6" stroke-width="1"/>
            <text x="${margin.left - 10}" y="${
            y + 5
          }" text-anchor="end" font-size="12" fill="${
            config.textColor || "#666666"
          }">
              ${Math.round(value)}
            </text>
          `;
        }).join("")}
        
        <!-- Bars -->
        ${data
          .map((d, i) => {
            const barHeight = (d.value / maxValue) * chartHeight;
            const x = margin.left + i * barWidth + barWidth * 0.1;
            const y = margin.top + chartHeight - barHeight;
            const actualBarWidth = barWidth * 0.8;
            const color =
              d.color || `hsl(${(i * 360) / data.length}, 70%, 50%)`;

            return `
            <rect x="${x}" y="${y}" width="${actualBarWidth}" height="${barHeight}" 
                  fill="${color}" stroke="none"/>
            <text x="${x + actualBarWidth / 2}" y="${
              margin.top + chartHeight + 20
            }" 
                  text-anchor="middle" font-size="12" fill="${
                    config.textColor || "#000000"
                  }">
              ${d.label}
            </text>
          `;
          })
          .join("")}
        
        <!-- Y-axis label -->
        <text x="20" y="${
          height / 2
        }" text-anchor="middle" font-size="14" fill="${
      config.textColor || "#000000"
    }" 
              transform="rotate(-90, 20, ${height / 2})">Value</text>
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Create SVG line chart
   */
  private async createSVGLineChart(
    data: TimeSeriesDataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const width = config.width || 800;
    const height = config.height || 600;
    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));

    const points = data
      .map((d, i) => {
        const x = margin.left + (i / (data.length - 1)) * chartWidth;
        const y =
          margin.top +
          chartHeight -
          ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${
          config.backgroundColor || "#ffffff"
        }"/>
        
        <!-- Title -->
        ${
          config.title
            ? `
          <text x="${
            width / 2
          }" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${
                config.textColor || "#000000"
              }">
            ${config.title}
          </text>
        `
            : ""
        }
        
        <!-- Chart area background -->
        <rect x="${margin.left}" y="${
      margin.top
    }" width="${chartWidth}" height="${chartHeight}" 
              fill="none" stroke="#e5e7eb" stroke-width="1"/>
        
        <!-- Grid lines -->
        ${Array.from({ length: 5 }, (_, i) => {
          const y = margin.top + (i * chartHeight) / 4;
          const value = maxValue - (i * (maxValue - minValue)) / 4;
          return `
            <line x1="${margin.left}" y1="${y}" x2="${
            margin.left + chartWidth
          }" y2="${y}" 
                  stroke="#f3f4f6" stroke-width="1"/>
            <text x="${margin.left - 10}" y="${
            y + 5
          }" text-anchor="end" font-size="12" fill="${
            config.textColor || "#666666"
          }">
              ${Math.round(value)}
            </text>
          `;
        }).join("")}
        
        <!-- Line -->
        <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2"/>
        
        <!-- Points -->
        ${data
          .map((d, i) => {
            const x = margin.left + (i / (data.length - 1)) * chartWidth;
            const y =
              margin.top +
              chartHeight -
              ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
            return `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6"/>`;
          })
          .join("")}
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Create SVG pie chart
   */
  private async createSVGPieChart(
    data: DataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const width = config.width || 800;
    const height = config.height || 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = 0;

    const slices = data.map((d, i) => {
      const sliceAngle = (d.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      const color = d.color || `hsl(${(i * 360) / data.length}, 70%, 50%)`;

      currentAngle += sliceAngle;

      return {
        path: `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
        color,
        label: d.label,
        percentage: ((d.value / total) * 100).toFixed(1),
      };
    });

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${
          config.backgroundColor || "#ffffff"
        }"/>
        
        <!-- Title -->
        ${
          config.title
            ? `
          <text x="${
            width / 2
          }" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${
                config.textColor || "#000000"
              }">
            ${config.title}
          </text>
        `
            : ""
        }
        
        <!-- Pie slices -->
        ${slices
          .map(
            (slice) => `
          <path d="${slice.path}" fill="${slice.color}" stroke="white" stroke-width="2"/>
        `
          )
          .join("")}
        
        <!-- Legend -->
        ${slices
          .map(
            (slice, i) => `
          <rect x="${width - 200}" y="${
              60 + i * 25
            }" width="15" height="15" fill="${slice.color}"/>
          <text x="${width - 180}" y="${72 + i * 25}" font-size="12" fill="${
              config.textColor || "#000000"
            }">
            ${slice.label} (${slice.percentage}%)
          </text>
        `
          )
          .join("")}
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Create line chart using Chart.js
   */
  private async createLineChart(
    data: TimeSeriesDataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const chartConfig = {
      type: "line" as const,
      data: {
        labels: data.map((d) => {
          if (d.timestamp instanceof Date) {
            return d.timestamp.toLocaleDateString();
          }
          return new Date(d.timestamp).toLocaleDateString();
        }),
        datasets: [
          {
            label: config.title || "Data",
            data: data.map((d) => d.value),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title,
          },
          legend: {
            display: config.showLegend ?? true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: config.showGrid ?? true,
            },
          },
          x: {
            grid: {
              display: config.showGrid ?? true,
            },
          },
        },
      },
    };

    return this.chartJS.renderToBuffer(chartConfig);
  }

  /**
   * Create bar chart using Chart.js
   */
  private async createBarChart(
    data: DataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const chartConfig = {
      type: "bar" as const,
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: config.title || "Data",
            data: data.map((d) => d.value),
            backgroundColor: data.map(
              (d, i) => d.color || `hsl(${(i * 360) / data.length}, 70%, 50%)`
            ),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title,
          },
          legend: {
            display: config.showLegend ?? false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: config.showGrid ?? true,
            },
          },
        },
      },
    };

    return this.chartJS.renderToBuffer(chartConfig);
  }

  /**
   * Create pie chart using Chart.js
   */
  private async createPieChart(
    data: DataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const chartConfig = {
      type: "pie" as const,
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map(
              (d, i) => d.color || `hsl(${(i * 360) / data.length}, 70%, 50%)`
            ),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title,
          },
          legend: {
            display: config.showLegend ?? true,
            position: "right" as const,
          },
        },
      },
    };

    return this.chartJS.renderToBuffer(chartConfig);
  }

  /**
   * Create scatter plot using Chart.js
   */
  private async createScatterChart(
    data: ScatterDataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const chartConfig = {
      type: "scatter" as const,
      data: {
        datasets: [
          {
            label: config.title || "Data Points",
            data: data.map((d) => ({ x: d.x, y: d.y })),
            backgroundColor: "#3b82f6",
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title,
          },
          legend: {
            display: config.showLegend ?? false,
          },
        },
        scales: {
          x: {
            type: "linear" as const,
            position: "bottom" as const,
            grid: {
              display: config.showGrid ?? true,
            },
          },
          y: {
            grid: {
              display: config.showGrid ?? true,
            },
          },
        },
      },
    };

    return this.chartJS.renderToBuffer(chartConfig);
  }

  /**
   * Create area chart (filled line chart)
   */
  private async createAreaChart(
    data: TimeSeriesDataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const chartConfig = {
      type: "line" as const,
      data: {
        labels: data.map((d) => {
          if (d.timestamp instanceof Date) {
            return d.timestamp.toLocaleDateString();
          }
          return new Date(d.timestamp).toLocaleDateString();
        }),
        datasets: [
          {
            label: config.title || "Data",
            data: data.map((d) => d.value),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.3)",
            borderWidth: 2,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title,
          },
          legend: {
            display: config.showLegend ?? true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: config.showGrid ?? true,
            },
          },
        },
      },
    };

    return this.chartJS.renderToBuffer(chartConfig);
  }

  /**
   * Create histogram
   */
  private async createHistogram(
    data: DataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    // Convert to histogram bins
    const values = data.map((d) => d.value);
    const bins = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogramData = Array.from({ length: bins }, (_, i) => {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      const count = values.filter((v) => v >= binMin && v < binMax).length;
      return {
        label: `${binMin.toFixed(1)}-${binMax.toFixed(1)}`,
        value: count,
      };
    });

    return this.createBarChart(histogramData, {
      ...config,
      title: config.title || "Distribution",
    });
  }

  /**
   * Create table visualization using SVG
   */
  private async createTable(
    data: TableData,
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const width = config.width || 800;
    const height = config.height || 600;
    const padding = 40;
    const rowHeight = 30;
    const headerHeight = 40;

    // Create SVG
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${
          config.backgroundColor || "#ffffff"
        }"/>
        
        <!-- Title -->
        ${
          config.title
            ? `<text x="${
                width / 2
              }" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="${
                config.textColor || "#000000"
              }">${config.title}</text>`
            : ""
        }
        
        <!-- Headers -->
        ${data.headers
          .map(
            (header, i) => `
          <rect x="${
            padding + (i * (width - 2 * padding)) / data.headers.length
          }" y="${config.title ? 50 : 20}" 
                width="${
                  (width - 2 * padding) / data.headers.length
                }" height="${headerHeight}" 
                fill="#f3f4f6" stroke="#d1d5db"/>
          <text x="${
            padding +
            (i * (width - 2 * padding)) / data.headers.length +
            (width - 2 * padding) / data.headers.length / 2
          }" 
                y="${(config.title ? 50 : 20) + headerHeight / 2 + 5}" 
                text-anchor="middle" font-weight="bold" font-size="14" fill="${
                  config.textColor || "#000000"
                }">${header}</text>
        `
          )
          .join("")}
        
        <!-- Rows -->
        ${data.rows
          .map(
            (row, rowIndex) => `
          ${row
            .map(
              (cell, colIndex) => `
            <rect x="${
              padding + (colIndex * (width - 2 * padding)) / data.headers.length
            }" 
                  y="${
                    (config.title ? 50 : 20) +
                    headerHeight +
                    rowIndex * rowHeight
                  }" 
                  width="${
                    (width - 2 * padding) / data.headers.length
                  }" height="${rowHeight}" 
                  fill="${
                    rowIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                  }" stroke="#e5e7eb"/>
            <text x="${
              padding +
              (colIndex * (width - 2 * padding)) / data.headers.length +
              (width - 2 * padding) / data.headers.length / 2
            }" 
                  y="${
                    (config.title ? 50 : 20) +
                    headerHeight +
                    rowIndex * rowHeight +
                    rowHeight / 2 +
                    5
                  }" 
                  text-anchor="middle" font-size="12" fill="${
                    config.textColor || "#000000"
                  }">${cell}</text>
          `
            )
            .join("")}
        `
          )
          .join("")}
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Create metric card visualization
   */
  private async createMetricCard(
    data: DataPoint[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const width = config.width || 400;
    const height = config.height || 200;

    // Calculate primary metric
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const average = total / data.length;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${
          config.backgroundColor || "#ffffff"
        }" rx="8"/>
        
        <!-- Title -->
        ${
          config.title
            ? `<text x="${
                width / 2
              }" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="${
                config.textColor || "#000000"
              }">${config.title}</text>`
            : ""
        }
        
        <!-- Main Metric -->
        <text x="${width / 2}" y="${
      height / 2
    }" text-anchor="middle" font-size="36" font-weight="bold" fill="#3b82f6">
          ${total.toLocaleString()}
        </text>
        
        <!-- Sub Metrics -->
        <text x="${width / 2}" y="${
      height / 2 + 30
    }" text-anchor="middle" font-size="14" fill="${
      config.textColor || "#666666"
    }">
          Average: ${average.toFixed(2)} | Count: ${data.length}
        </text>
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Create heatmap using D3 and JSDOM
   */
  private async createHeatmap(
    data: any[],
    config: Partial<ChartConfig>
  ): Promise<Buffer> {
    const width = config.width || 800;
    const height = config.height || 600;

    // Create DOM environment
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    const body = d3.select(dom.window.document.body);

    // Create SVG
    const svg = body
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", config.backgroundColor || "#ffffff");

    // Add title
    if (config.title) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", config.textColor || "#000000")
        .text(config.title);
    }

    // Simple placeholder heatmap (you can expand this with actual heatmap logic)
    const cellSize = 20;
    const cols = Math.floor((width - 80) / cellSize);
    const rows = Math.floor((height - 100) / cellSize);

    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 1])
      .range(["#fff7ec", "#7f2704"]);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = Math.random(); // Replace with actual data logic
        svg
          .append("rect")
          .attr("x", 40 + j * cellSize)
          .attr("y", 60 + i * cellSize)
          .attr("width", cellSize - 1)
          .attr("height", cellSize - 1)
          .style("fill", colorScale(value));
      }
    }

    // Get SVG as string
    const svgNode = body.select("svg").node() as Element;
    const svgString = svgNode?.outerHTML || "";
    return Buffer.from(svgString);
  }

  /**
   * Convert image format
   */
  private async convertFormat(
    buffer: Buffer,
    format: string,
    quality: number
  ): Promise<Buffer> {
    const sharpInstance = sharp(buffer);

    switch (format) {
      case "jpeg":
        return sharpInstance.jpeg({ quality }).toBuffer();
      case "webp":
        return sharpInstance.webp({ quality }).toBuffer();
      case "svg":
        // SVG is already in the right format for some visualizations
        return buffer;
      default:
        return sharpInstance.png().toBuffer();
    }
  }
}

/**
 * Convenience function to create a visualizer and generate image
 */
export async function generateVisualization(
  request: VisualizationRequest
): Promise<VisualizationResult> {
  const visualizer = new DataVisualizer(
    request.config?.width,
    request.config?.height
  );
  return visualizer.visualize(request);
}
