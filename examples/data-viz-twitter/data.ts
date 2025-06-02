import {
  createDataToImageAgent,
  analyzeAndVisualize,
} from "../../packages/data-viz/src";
import { TwitterClientWithImages } from "./client";

/**
 * Create a data-to-X posting agent
 */
function createDataToXAgent() {
  const vizAgent = createDataToImageAgent();

  // Initialize Twitter client (you'll need to set these environment variables)
  const twitterClient = new TwitterClientWithImages({
    username: process.env.TWITTER_USERNAME || "your_username",
    password: process.env.TWITTER_PASSWORD || "your_password",
    email: process.env.TWITTER_EMAIL || "your_email@example.com",
  });

  return {
    /**
     * Generate visualization and post to X
     */
    async postDataToX(
      data: any,
      options: {
        title?: string;
        type?: any;
        text?: string;
        hashtags?: string[];
        width?: number;
        height?: number;
      } = {}
    ) {
      try {
        console.log("🎨 Generating visualization...");

        // Generate the visualization
        const visualization = await vizAgent.createSocialViz(
          data,
          "twitter",
          options.title || "Data Visualization"
        );

        console.log(
          `✅ Generated ${visualization.format} chart: ${visualization.width}x${visualization.height}`
        );

        // Create tweet text
        const hashtags = options.hashtags || ["#data", "#visualization", "#AI"];
        const tweetText = [
          options.text || options.title || "Check out this data visualization!",
          "",
          hashtags.join(" "),
        ]
          .join("\n")
          .substring(0, 280); // Twitter character limit

        // Initialize Twitter client
        await twitterClient.initialize();

        // Post to X
        const result = await twitterClient.postTweetWithImage(
          tweetText,
          visualization.buffer,
          visualization.format
        );

        console.log("🐦 Posted to X successfully!");

        return {
          visualization,
          tweet: result,
          text: tweetText,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("❌ Failed to post data to X:", errorMessage);
        throw error;
      }
    },

    /**
     * Generate multiple visualizations and post as a thread
     */
    async postDataThread(
      datasets: Array<{
        data: any;
        title: string;
        text?: string;
      }>
    ) {
      console.log(
        `🧵 Creating thread with ${datasets.length} visualizations...`
      );

      const results = [];

      for (let i = 0; i < datasets.length; i++) {
        const dataset = datasets[i];

        console.log(
          `\n📊 Processing dataset ${i + 1}/${datasets.length}: ${
            dataset.title
          }`
        );

        try {
          const result = await this.postDataToX(dataset.data, {
            title: dataset.title,
            text: `${i + 1}/${datasets.length} ${
              dataset.text || dataset.title
            }`,
            hashtags: i === 0 ? ["#datathread", "#visualization"] : undefined,
          });

          results.push(result);

          // Wait between posts to avoid rate limiting
          if (i < datasets.length - 1) {
            console.log("⏳ Waiting 30 seconds before next post...");
            await new Promise((resolve) => setTimeout(resolve, 30000));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to post dataset ${i + 1}:`, errorMessage);
          results.push({ error: errorMessage });
        }
      }

      return results;
    },
  };
}

/**
 * Example usage
 */
async function main() {
  console.log("🚀 Data Visualization to X Example");

  const agent = createDataToXAgent();

  // Example 1: Simple data visualization post
  console.log("\n📊 Example 1: Sales data visualization");
  const salesData = {
    "Q1 2024": 245000,
    "Q2 2024": 312000,
    "Q3 2024": 298000,
    "Q4 2024": 378000,
  };

  try {
    const result1 = await agent.postDataToX(salesData, {
      title: "Quarterly Sales Performance 2024",
      text: "Our sales team absolutely crushed it this year! 📈🚀",
      hashtags: ["#sales", "#growth", "#Q4results"],
    });

    console.log("✅ Sales visualization posted!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(
      "⚠️  Sales post failed (expected without proper Twitter credentials):",
      errorMessage
    );
  }

  // Example 2: User engagement thread
  console.log("\n🧵 Example 2: Engagement metrics thread");
  const engagementData = [
    {
      data: { Likes: 1250, Shares: 320, Comments: 180, Saves: 95 },
      title: "Social Media Engagement - Last Week",
      text: "Our content is really resonating with the audience!",
    },
    {
      data: {
        Mon: 450,
        Tue: 520,
        Wed: 380,
        Thu: 690,
        Fri: 780,
        Sat: 340,
        Sun: 290,
      },
      title: "Daily Active Users",
      text: "Thursday and Friday are our peak engagement days 📈",
    },
    {
      data: [
        { timestamp: "2024-01-01", value: 100 },
        { timestamp: "2024-02-01", value: 150 },
        { timestamp: "2024-03-01", value: 200 },
        { timestamp: "2024-04-01", value: 180 },
        { timestamp: "2024-05-01", value: 250 },
      ],
      title: "Monthly Growth Trend",
      text: "Steady upward trajectory with a slight dip in April 📊",
    },
  ];

  try {
    const threadResults = await agent.postDataThread(engagementData);
    console.log(
      `✅ Posted thread with ${threadResults.length} visualizations!`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(
      "⚠️  Thread posting failed (expected without proper Twitter credentials):",
      errorMessage
    );
  }

  console.log("\n🎉 Example completed!");
  console.log("\n💡 To use this for real:");
  console.log("   1. Set up Twitter API credentials:");
  console.log("      export TWITTER_USERNAME='your_username'");
  console.log("      export TWITTER_PASSWORD='your_password'");
  console.log("      export TWITTER_EMAIL='your_email@example.com'");
  console.log(
    "   2. Consider using twitter-api-v2 for proper media upload support"
  );
  console.log("   3. Be mindful of Twitter rate limits and posting guidelines");
}

// Real-world usage function
export function createProductionDataToXAgent() {
  return {
    /**
     * Production-ready function to post data visualization to X
     * This would use proper Twitter API v2 with media upload
     */
    async postVisualization(
      data: any,
      options: {
        text: string;
        title?: string;
        width?: number;
        height?: number;
      }
    ) {
      const vizAgent = createDataToImageAgent();

      // Generate visualization
      const viz = await vizAgent.createSocialViz(
        data,
        "twitter",
        options.title
      );

      // TODO: Implement with proper Twitter API v2 client
      // const twitterApi = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
      // const mediaId = await twitterApi.v1.uploadMedia(viz.buffer, { type: 'image/png' });
      // const tweet = await twitterApi.v2.tweet({
      //   text: options.text,
      //   media: { media_ids: [mediaId] }
      // });

      console.log("🚀 Would post visualization to X:", {
        text: options.text,
        imageSize: `${viz.width}x${viz.height}`,
        format: viz.format,
      });

      return {
        success: true,
        visualization: viz,
        message: "Use twitter-api-v2 for production implementation",
      };
    },
  };
}

// Run example if called directly
if (require.main === module) {
  main().catch(console.error);
}
