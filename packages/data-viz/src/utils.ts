import { DataAnalyzer, generateVisualizationConfig } from "./analyzers";
import { generateVisualization } from "./visualizers";
import { fetchAndTransformData } from "./fetchers";
import type {
  VisualizationRequest,
  VisualizationResult,
  DataSource,
  DataAnalysis,
  ChartConfig,
} from "./types";

/**
 * High-level function to analyze data and generate appropriate visualization
 */
export async function analyzeAndVisualize(
  data: any,
  customConfig?: Partial<ChartConfig>
): Promise<VisualizationResult> {
  try {
    // Analyze the data
    const analysis = DataAnalyzer.analyze(data);

    // Transform data to visualization format
    const vizData = DataAnalyzer.transformToVisualizationData(data, analysis);

    // Generate configuration
    const dataSize = Array.isArray(vizData) ? vizData.length : 1;
    const config = generateVisualizationConfig(analysis, dataSize);

    // Merge with custom config
    const finalConfig = { ...config, ...customConfig };

    // Create visualization request
    const request: VisualizationRequest = {
      type: analysis.suggestedVisualization,
      data: vizData,
      config: finalConfig,
    };

    // Generate the visualization
    return await generateVisualization(request);
  } catch (error) {
    throw new Error(`Failed to analyze and visualize data: ${error}`);
  }
}

/**
 * Quick visualization function for simple data
 */
export async function quickVisualize(
  data: any,
  type?: VisualizationRequest["type"],
  title?: string
): Promise<VisualizationResult> {
  let vizType = type;
  let transformedData = data;

  if (!vizType) {
    const analysis = DataAnalyzer.analyze(data);
    vizType = analysis.suggestedVisualization;
    transformedData = DataAnalyzer.transformToVisualizationData(data, analysis);
  }

  const request: VisualizationRequest = {
    type: vizType,
    data: transformedData,
    config: {
      title,
      width: 800,
      height: 600,
    },
  };

  return await generateVisualization(request);
}

/**
 * Create a specialized agent function for data-to-image conversion
 * This integrates with the Daydreams agent system
 */
export function createDataToImageAgent() {
  return {
    /**
     * Convert data to image with automatic analysis
     */
    async dataToImage(
      data: any,
      options?: {
        type?: VisualizationRequest["type"];
        title?: string;
        width?: number;
        height?: number;
        format?: "png" | "jpeg" | "svg" | "webp";
        theme?: "light" | "dark";
      }
    ): Promise<VisualizationResult> {
      const config: Partial<ChartConfig> = {
        title: options?.title,
        width: options?.width,
        height: options?.height,
        theme: options?.theme,
      };

      if (options?.type) {
        const request: VisualizationRequest = {
          type: options.type,
          data,
          config,
          ...(options?.format && { format: options.format }),
        };
        return await generateVisualization(request);
      }

      return await analyzeAndVisualize(data, config);
    },

    /**
     * Fetch data from URL and convert to image
     */
    async urlToImage(
      url: string,
      options?: {
        apiKey?: string;
        headers?: Record<string, string>;
        type?: VisualizationRequest["type"];
        title?: string;
        format?: "png" | "jpeg" | "svg" | "webp";
      }
    ): Promise<VisualizationResult> {
      const source: DataSource = {
        url,
        apiKey: options?.apiKey,
        headers: options?.headers,
      };

      const data = await fetchAndTransformData(source);

      const config: Partial<ChartConfig> = {
        title: options?.title || `Data from ${new URL(url).hostname}`,
      };

      if (options?.type) {
        const request: VisualizationRequest = {
          type: options.type,
          data,
          config,
          ...(options?.format && { format: options.format }),
        };
        return await generateVisualization(request);
      }

      return await analyzeAndVisualize(data, config);
    },

    /**
     * Get data analysis without generating visualization
     */
    analyzeData(data: any): DataAnalysis {
      return DataAnalyzer.analyze(data);
    },

    /**
     * Transform raw data into visualization format
     */
    transformData(data: any, analysis?: DataAnalysis) {
      const dataAnalysis = analysis || DataAnalyzer.analyze(data);
      return DataAnalyzer.transformToVisualizationData(data, dataAnalysis);
    },

    /**
     * Create social media optimized visualization
     */
    async createSocialViz(
      data: any,
      platform: "twitter" | "instagram" | "linkedin" = "twitter",
      title?: string
    ): Promise<VisualizationResult> {
      const dimensions = {
        twitter: { width: 1200, height: 675 },
        instagram: { width: 1080, height: 1080 },
        linkedin: { width: 1200, height: 627 },
      };

      const { width, height } = dimensions[platform];

      return await analyzeAndVisualize(data, {
        title,
        width,
        height,
        theme: "light",
      });
    },
  };
}
