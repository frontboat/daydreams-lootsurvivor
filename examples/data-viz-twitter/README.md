# Data Visualization to X (Twitter) Integration

This example demonstrates how to generate data visualizations and post them to X
(formerly Twitter) using the Daydreams AI framework.

## Features

- 🎨 Generate beautiful charts from any data using SVG fallback
- 🐦 Post visualizations to X with custom text and hashtags
- 🧵 Create Twitter threads with multiple visualizations
- 📱 Optimized for social media (Twitter dimensions: 1200x675)
- 🔄 Auto-analysis of data to choose the best chart type

## Quick Start

### 1. Install Dependencies

```bash
cd examples/data-viz-twitter
npm install
```

### 2. Set Environment Variables

Create a `.env` file:

```bash
# Twitter credentials (required for posting)
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email@example.com

# Optional: Set to false for real posting (default is dry run)
DRY_RUN=true
```

### 3. Run the Example

```bash
npm run dev
```

## Usage Examples

### Basic Visualization Post

```typescript
import { createDataToXAgent } from "./index";

const agent = createDataToXAgent();

const salesData = {
  "Q1 2024": 245000,
  "Q2 2024": 312000,
  "Q3 2024": 298000,
  "Q4 2024": 378000,
};

await agent.postDataToX(salesData, {
  title: "Quarterly Sales Performance 2024",
  text: "Our sales team absolutely crushed it this year! 📈🚀",
  hashtags: ["#sales", "#growth", "#Q4results"],
});
```

### Thread with Multiple Visualizations

```typescript
const engagementData = [
  {
    data: { Likes: 1250, Shares: 320, Comments: 180, Saves: 95 },
    title: "Social Media Engagement - Last Week",
    text: "Our content is really resonating with the audience!",
  },
  {
    data: { Mon: 450, Tue: 520, Wed: 380, Thu: 690, Fri: 780 },
    title: "Daily Active Users",
    text: "Thursday and Friday are our peak engagement days 📈",
  },
];

await agent.postDataThread(engagementData);
```

## Data Types Supported

- **Objects**: `{ label: value }` → Pie/Bar charts
- **Arrays**: `[1, 2, 3, 4]` → Histograms
- **Time Series**: `[{ timestamp, value }]` → Line charts
- **Categories**: `["apple", "banana", "apple"]` → Bar charts
- **Coordinates**: `[{ x, y }]` → Scatter plots

## Production Setup

For production use with real image uploads:

### Option 1: Twitter API v2

```bash
npm install twitter-api-v2
```

```typescript
import { TwitterApi } from "twitter-api-v2";

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

// Upload media and post tweet
const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, {
  type: "image/png",
});
const tweet = await twitterClient.v2.tweet({
  text: "Check out this data visualization!",
  media: { media_ids: [mediaId] },
});
```

### Option 2: Use the Production Agent

```typescript
import { createProductionDataToXAgent } from "./index";

const agent = createProductionDataToXAgent();
await agent.postVisualization(data, {
  text: "Amazing data insights! 📊",
  title: "Monthly Performance",
});
```

## Configuration Options

| Option     | Type     | Description      | Default                            |
| ---------- | -------- | ---------------- | ---------------------------------- |
| `title`    | string   | Chart title      | "Data Visualization"               |
| `text`     | string   | Tweet text       | Uses title                         |
| `hashtags` | string[] | Twitter hashtags | ["#data", "#visualization", "#AI"] |
| `width`    | number   | Chart width      | 1200 (Twitter optimized)           |
| `height`   | number   | Chart height     | 675 (Twitter optimized)            |
| `type`     | string   | Force chart type | Auto-detected                      |

## Chart Types

The system automatically chooses the best chart type based on your data:

- **Bar Chart**: Categories, key-value data
- **Line Chart**: Time series, temporal data
- **Pie Chart**: Small categorical datasets (≤5 items)
- **Scatter Plot**: Coordinate data (x, y pairs)
- **Histogram**: Numerical distributions
- **Table**: Complex structured data
- **Metric Cards**: Single values or summaries

## Rate Limiting

- Wait 30 seconds between thread posts
- Twitter has daily/hourly limits
- Use `DRY_RUN=true` for testing

## Troubleshooting

### Canvas Issues

If you see canvas-related errors:

```bash
# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman

# Then reinstall
pnpm install --force
```

The system will automatically fallback to SVG generation if canvas is
unavailable.

### Twitter Authentication

The current implementation uses screen scraping for demo purposes. For
production:

1. Apply for Twitter API access
2. Use Twitter API v2 with proper authentication
3. Implement media upload endpoints

## Files Generated

- Visualizations are temporarily saved as SVG/PNG files
- Files are automatically cleaned up after posting
- In dry run mode, files remain for inspection

## Contributing

This is an example implementation. For production use:

- Implement proper error handling
- Add retry logic for API failures
- Support additional social platforms
- Add more chart customization options

## License

MIT - Part of the Daydreams AI framework.
