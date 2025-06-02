# @daydreamsai/data-viz

A powerful, generic data-to-image conversion library for Daydreams agents.
Automatically analyzes data and generates beautiful visualizations that can be
posted on social media or used in applications.

## 🚀 Features

- **Auto-Analysis**: Automatically detects data types and suggests appropriate
  visualizations
- **Multiple Chart Types**: Line charts, bar charts, pie charts, scatter plots,
  heatmaps, tables, and more
- **Flexible Data Sources**: Support for JSON, CSV, APIs, and various data
  structures
- **Social Media Ready**: Pre-configured dimensions for Twitter, Instagram, and
  LinkedIn
- **TypeScript Support**: Full type safety and IntelliSense support
- **Extensible**: Easy to customize and extend with new chart types

## 📦 Installation

```bash
npm install @daydreamsai/data-viz
```

### Dependencies

The package requires several peer dependencies for image generation:

```bash
npm install canvas chart.js chartjs-node-canvas d3 d3-node jsdom sharp zod
```

## 🎯 Quick Start

### Basic Usage

```typescript
import { createDataToImageAgent } from "@daydreamsai/data-viz";

const agent = createDataToImageAgent();

// Simple data to chart
const data = {
  Q1: 150000,
  Q2: 230000,
  Q3: 180000,
  Q4: 280000,
};

// Generate image
const result = await agent.dataToImage(data, {
  title: "Quarterly Sales Revenue",
  type: "bar",
  width: 800,
  height: 600,
});

// Save or use the image buffer
await fs.writeFile("chart.png", result.buffer);
```

### Auto-Analysis

Let the system automatically choose the best visualization:

```typescript
import { analyzeAndVisualize } from "@daydreamsai/data-viz";

const timeSeriesData = [
  { timestamp: "2024-01-01", value: 100 },
  { timestamp: "2024-01-02", value: 120 },
  { timestamp: "2024-01-03", value: 95 },
];

// Automatically detects time series and creates line chart
const result = await analyzeAndVisualize(timeSeriesData, {
  title: "Daily Active Users",
});
```

## 📊 Supported Chart Types

| Type        | Description         | Best For                    |
| ----------- | ------------------- | --------------------------- |
| `bar`       | Bar/column charts   | Categories, comparisons     |
| `line`      | Line charts         | Time series, trends         |
| `pie`       | Pie/donut charts    | Proportions, distributions  |
| `scatter`   | Scatter plots       | Correlations, relationships |
| `area`      | Filled area charts  | Time series with emphasis   |
| `histogram` | Distribution charts | Frequency distributions     |
| `table`     | Data tables         | Detailed data display       |
| `metric`    | Single metric cards | KPIs, key numbers           |
| `heatmap`   | Heat maps           | Matrix data, correlations   |

## 🎨 Configuration Options

### Chart Configuration

```typescript
const config = {
  title: "My Chart",
  subtitle: "Optional subtitle",
  width: 800,
  height: 600,
  backgroundColor: "#ffffff",
  textColor: "#000000",
  theme: "light", // "light" | "dark" | "auto"
  showLegend: true,
  showGrid: true,
  fontFamily: "Arial, sans-serif",
};
```

### Chart-Specific Options

#### Line Charts

```typescript
const lineConfig = {
  ...baseConfig,
  xAxisLabel: "Time",
  yAxisLabel: "Value",
  showPoints: true,
  lineWidth: 2,
  smooth: false,
};
```

#### Bar Charts

```typescript
const barConfig = {
  ...baseConfig,
  horizontal: false,
  barSpacing: 0.1,
};
```

#### Pie Charts

```typescript
const pieConfig = {
  ...baseConfig,
  showPercentages: true,
  showValues: false,
  donut: false,
  donutRadius: 0.5,
};
```

## 📡 Data Sources

### Fetch from APIs

```typescript
const agent = createDataToImageAgent();

const result = await agent.urlToImage("https://api.example.com/sales-data", {
  apiKey: "your-api-key",
  headers: { "Custom-Header": "value" },
  title: "API Data Visualization",
  type: "bar",
});
```

### Fetch with Custom Headers

```typescript
import { fetchAndTransformData } from "@daydreamsai/data-viz";

const data = await fetchAndTransformData({
  url: "https://api.example.com/data",
  apiKey: "bearer-token",
  headers: {
    Authorization: "Bearer your-token",
    "Content-Type": "application/json",
  },
  format: "json", // "json" | "csv" | "xml"
});
```

## 📱 Social Media Integration

Generate charts optimized for social platforms:

```typescript
const agent = createDataToImageAgent();

// Twitter-optimized (1200x675)
const twitterChart = await agent.createSocialViz(
  data,
  "twitter",
  "Engagement Stats"
);

// Instagram-optimized (1080x1080)
const instagramChart = await agent.createSocialViz(
  data,
  "instagram",
  "Performance Metrics"
);

// LinkedIn-optimized (1200x627)
const linkedinChart = await agent.createSocialViz(
  data,
  "linkedin",
  "Business Analytics"
);
```

## 🔄 Data Types

The system automatically handles various data formats:

### Simple Key-Value Objects

```typescript
const data = { A: 10, B: 20, C: 15 };
// → Suggests: pie or bar chart
```

### Arrays of Objects

```typescript
const data = [
  { category: "Mobile", value: 45 },
  { category: "Desktop", value: 35 },
  { category: "Tablet", value: 20 },
];
// → Suggests: bar chart
```

### Time Series Data

```typescript
const data = [
  { timestamp: "2024-01-01", value: 100 },
  { timestamp: "2024-01-02", value: 110 },
];
// → Suggests: line chart
```

### Scatter Plot Data

```typescript
const data = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 6 },
];
// → Suggests: scatter plot
```

## 🧠 Data Analysis

Analyze data without generating images:

```typescript
import { DataAnalyzer } from "@daydreamsai/data-viz";

const analysis = DataAnalyzer.analyze(yourData);
console.log(analysis);
// {
//   type: "numerical" | "categorical" | "temporal" | "mixed",
//   structure: "flat" | "nested" | "tabular" | "key-value",
//   suggestedVisualization: "bar" | "line" | "pie" | ...,
//   confidence: 0.95
// }
```

## 🎭 Custom Themes

```typescript
const darkTheme = {
  backgroundColor: "#1a1a1a",
  textColor: "#ffffff",
  theme: "dark",
};

const result = await agent.dataToImage(data, {
  ...darkTheme,
  title: "Dark Mode Chart",
});
```

## 🔧 Advanced Usage

### Batch Processing

```typescript
import { batchVisualize } from "@daydreamsai/data-viz";

const sources = [
  { data: salesData, options: { title: "Sales", type: "bar" } },
  { data: usersData, options: { title: "Users", type: "line" } },
];

const results = await batchVisualize(sources);
results.forEach((result, i) => {
  fs.writeFileSync(`chart-${i}.png`, result.buffer);
});
```

### Custom Data Transformation

```typescript
const agent = createDataToImageAgent();
const analysis = agent.analyzeData(rawData);
const transformedData = agent.transformData(rawData, analysis);

// Modify transformed data if needed
const customData = transformedData.map((point) => ({
  ...point,
  color: point.value > 100 ? "#ff0000" : "#00ff00",
}));

const result = await agent.dataToImage(customData, {
  type: analysis.suggestedVisualization,
});
```

## 🔗 Integration with Daydreams Agents

This package integrates seamlessly with Daydreams agents:

```typescript
import { createDreams, action } from "@daydreamsai/core";
import { createDataToImageAgent } from "@daydreamsai/data-viz";

const vizAgent = createDataToImageAgent();

const agent = createDreams({
  actions: [
    action({
      name: "createChart",
      description: "Create a chart from data",
      schema: z.object({
        data: z.any(),
        title: z.string(),
        type: z.enum(["bar", "line", "pie"]).optional(),
      }),
      async handler({ data, title, type }) {
        const result = await vizAgent.dataToImage(data, {
          title,
          type,
        });

        // Save image or post to social media
        return { imageBuffer: result.buffer, metadata: result.metadata };
      },
    }),
  ],
});
```

## 📋 Examples

Check out the [examples](../../examples/data-viz/) directory for complete
working examples:

- Basic chart generation
- API data fetching
- Social media optimization
- Batch processing
- Custom themes

## 🛠️ Development

```bash
# Build the package
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## 📝 License

MIT - see [LICENSE](../../LICENSE) for details.

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

---

Built with ❤️ for the [Daydreams](https://dreams.fun) ecosystem.
