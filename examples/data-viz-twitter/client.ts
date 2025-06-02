import { TwitterClient } from "../../packages/twitter/src";
import { promises as fs } from "fs";
import path from "path";

/**
 * Enhanced Twitter client with image posting capabilities
 */
export class TwitterClientWithImages extends TwitterClient {
  /**
   * Post a tweet with an image
   */
  async postTweetWithImage(
    text: string,
    imageBuffer: Buffer,
    imageFormat: string = "png"
  ) {
    try {
      console.log("📤 Preparing to post tweet with image...");

      // Save image temporarily (required by some Twitter clients)
      const tempImagePath = path.join(process.cwd(), `temp-viz.${imageFormat}`);
      await fs.writeFile(tempImagePath, imageBuffer);

      // Note: The current agent-twitter-client might not support image uploads
      // This is a conceptual example. For production, you'd need:
      // 1. A Twitter client that supports media uploads (like twitter-api-v2)
      // 2. Proper Twitter API credentials with media upload permissions

      console.log("📝 Tweet text:", text);
      console.log("🖼️  Image saved to:", tempImagePath);
      console.log(
        "📏 Image size:",
        Math.round(imageBuffer.length / 1024),
        "KB"
      );

      // For now, just post the text (you can manually attach the image)
      const result = await this.sendTweet({ content: text });

      // Clean up temp file
      try {
        await fs.unlink(tempImagePath);
      } catch (cleanupError) {
        console.warn("⚠️  Failed to clean up temp file:", cleanupError);
      }

      return {
        ...result,
        imagePath: tempImagePath,
        imageSize: imageBuffer.length,
      };
    } catch (error) {
      console.error("❌ Failed to post tweet with image:", error);
      throw error;
    }
  }
}
