import { LogLevel } from "./types"; // Assuming LogLevel is defined elsewhere
import type { CorrelationIds, TokenUsage, ModelCallMetrics } from "./tracking";
import { formatCorrelationIds as formatCorrelationIdsUtil } from "./tracking";

// --- Interfaces ---

export interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  context: string;
  message: string;
  data?: any;
  correlationIds?: CorrelationIds;
}

export interface StructuredLogData {
  correlationIds?: CorrelationIds;
  tokenUsage?: TokenUsage;
  metrics?: ModelCallMetrics;
  modelInfo?: {
    provider: string;
    modelId: string;
  };
  actionInfo?: {
    actionName: string;
    status: "start" | "complete" | "error";
  };
  contextInfo?: {
    contextType: string;
    memoryOperations?: number;
  };
  error?: {
    message: string;
    code?: string;
    cause?: unknown;
  };
  [key: string]: unknown;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface Transport {
  log(formattedMessage: string, entry: LogEntry): void;
  init?(): Promise<void> | void; // Optional initialization (e.g., open file stream)
  close?(): Promise<void> | void; // Optional cleanup
}

export interface LoggerConfig {
  level: LogLevel;
  transports: Transport[];
  formatter: LogFormatter;
}

// --- Default Implementations ---

export class DefaultFormatter implements LogFormatter {
  private enableTimestamp: boolean;

  constructor(options: { enableTimestamp?: boolean } = {}) {
    this.enableTimestamp = options.enableTimestamp ?? true;
  }

  format(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.enableTimestamp) {
      parts.push(`[${entry.timestamp.toISOString()}]`);
    }

    parts.push(`[${LogLevel[entry.level]}]`);

    if (entry.correlationIds) {
      parts.push(`[${formatCorrelationIdsUtil(entry.correlationIds)}]`);
    }

    parts.push(`[${entry.context}]`);
    parts.push(entry.message);

    return parts.join(" ");
  }
}

export class EnhancedFormatter implements LogFormatter {
  private enableTimestamp: boolean;
  private enableColors: boolean;
  private enableStructuredData: boolean;
  private compactMode: boolean;

  constructor(
    options: {
      enableTimestamp?: boolean;
      enableColors?: boolean;
      enableStructuredData?: boolean;
      compactMode?: boolean;
    } = {}
  ) {
    this.enableTimestamp = options.enableTimestamp ?? true;
    this.enableColors = options.enableColors ?? true;
    this.enableStructuredData = options.enableStructuredData ?? true;
    this.compactMode = options.compactMode ?? false;
  }

  format(entry: LogEntry): string {
    const { level, timestamp, context, message, correlationIds, data } = entry;
    const style = logLevelStyles[level];
    const lines: string[] = [];

    // Main log line
    const mainParts: string[] = [];

    // Timestamp
    if (this.enableTimestamp) {
      if (this.enableColors) {
        mainParts.push(formatTimestamp(timestamp));
      } else {
        mainParts.push(`[${timestamp.toLocaleTimeString()}]`);
      }
    }

    // Level badge/icon
    if (this.enableColors) {
      if (this.compactMode) {
        mainParts.push(colorize(style.icon, style.color));
      } else {
        mainParts.push(style.badge);
      }
    } else {
      mainParts.push(`[${LogLevel[level].padEnd(5)}]`);
    }

    // Correlation IDs - subtle
    if (correlationIds) {
      if (this.enableColors) {
        mainParts.push(
          `${colorize("⟨", colors.darkGray)}${formatCorrelationIds(
            correlationIds
          )}${colorize("⟩", colors.darkGray)}`
        );
      } else {
        mainParts.push(`[${formatCorrelationIdsUtil(correlationIds)}]`);
      }
    }

    // Context - with subtle brackets
    if (this.enableColors) {
      const contextColor = getContextColor(context);
      mainParts.push(
        `${colorize("[", colors.darkGray)}${colorize(
          context,
          contextColor
        )}${colorize("]", colors.darkGray)}`
      );
    } else {
      mainParts.push(`[${context}]`);
    }

    // Message - clean display
    if (this.enableColors) {
      mainParts.push(colorize(message, colors.lightGray));
    } else {
      mainParts.push(message);
    }

    lines.push(mainParts.join(" "));

    // Structured data on additional lines
    if (this.enableStructuredData && data && this.enableColors) {
      const dataLines = formatStructuredData(data, level);
      lines.push(...dataLines);
    }

    return lines.join("\n");
  }
}

// Specialized formatters for different use cases
export class CompactFormatter implements LogFormatter {
  private enableColors: boolean;

  constructor(options: { enableColors?: boolean } = {}) {
    this.enableColors = options.enableColors ?? true;
  }

  format(entry: LogEntry): string {
    const { level, timestamp, context, message, correlationIds } = entry;
    const style = logLevelStyles[level];

    const time = timestamp.toLocaleTimeString("en-US", {
      hour12: false,
      timeStyle: "medium",
    });

    const parts = [
      this.enableColors
        ? colorize(time.slice(-8), colors.darkGray)
        : time.slice(-8),
      this.enableColors
        ? colorize(style.icon, style.color)
        : LogLevel[level][0],
    ];

    if (correlationIds) {
      const reqId = correlationIds.requestId?.slice(-6) || "------";
      parts.push(this.enableColors ? colorize(reqId, colors.darkGray) : reqId);
    }

    const contextColor = this.enableColors ? getContextColor(context) : "";
    const shortContext = context.split(":")[0];
    parts.push(
      this.enableColors
        ? colorize(
            shortContext.slice(0, 8).padEnd(8),
            contextColor + colors.dim
          )
        : shortContext.slice(0, 8)
    );

    parts.push(
      this.enableColors ? colorize(message, colors.lightGray) : message
    );

    return parts.join(
      this.enableColors ? colorize(" │ ", colors.darkGray) : " | "
    );
  }
}

export class VerboseFormatter implements LogFormatter {
  private enableColors: boolean;

  constructor(options: { enableColors?: boolean } = {}) {
    this.enableColors = options.enableColors ?? true;
  }

  format(entry: LogEntry): string {
    const { level, timestamp, context, message, correlationIds, data } = entry;
    const style = logLevelStyles[level];
    const lines: string[] = [];

    // Minimalist header with timestamp
    const timeStr = timestamp.toISOString();
    const header = this.enableColors
      ? `${colorize("━".repeat(60), colors.darkGray)}`
      : "-".repeat(60);
    lines.push(header);

    // Status line
    const levelStr = this.enableColors ? style.badge : `[${LogLevel[level]}]`;
    const contextStr = this.enableColors
      ? colorize(context, getContextColor(context))
      : context;

    lines.push(
      `${levelStr} ${
        this.enableColors ? colorize(timeStr, colors.gray) : timeStr
      }`
    );
    lines.push(
      `${
        this.enableColors ? colorize("▪", colors.darkGray) : "•"
      } ${contextStr}`
    );

    // Message with icon
    const msgLine = this.enableColors
      ? colorize(message, colors.white)
      : message;
    lines.push(
      `${
        this.enableColors ? colorize(style.icon, style.color) : style.icon
      } ${msgLine}`
    );

    // Correlation info - subtle
    if (correlationIds) {
      const corrLine = this.enableColors
        ? `${colorize("└─", colors.darkGray)} ${formatCorrelationIds(
            correlationIds
          )}`
        : `   Correlation: ${correlationIds.requestId}`;
      lines.push(corrLine);
    }

    // Structured data
    if (data) {
      if (this.enableColors) {
        const dataLines = formatStructuredData(data, level);
        if (dataLines.length > 0) {
          lines.push(colorize("   ╱", colors.darkGray));
          lines.push(...dataLines);
        }
      } else {
        lines.push(`Data: ${JSON.stringify(data, null, 2)}`);
      }
    }

    return lines.join("\n");
  }
}

// 2047 Terminal Theme - Cyberpunk-inspired color palette
const colors = {
  // Base colors
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  // Primary palette - muted cyberpunk aesthetic
  darkGray: "\x1b[38;5;236m", // #303030 - background elements
  gray: "\x1b[38;5;244m", // #808080 - secondary text
  lightGray: "\x1b[38;5;250m", // #bcbcbc - primary text
  white: "\x1b[38;5;255m", // #eeeeee - emphasis

  // Accent colors - neon-inspired but muted
  cyan: "\x1b[38;5;51m", // #00ffff - primary accent
  darkCyan: "\x1b[38;5;44m", // #00d7d7 - secondary accent
  purple: "\x1b[38;5;99m", // #875fff - tertiary accent
  darkPurple: "\x1b[38;5;60m", // #5f5f87 - muted purple

  // Semantic colors - minimal use
  red: "\x1b[38;5;197m", // #ff005f - errors only
  darkRed: "\x1b[38;5;88m", // #870000 - error backgrounds
  yellow: "\x1b[38;5;220m", // #ffd700 - warnings only
  darkYellow: "\x1b[38;5;136m", // #af8700 - warning backgrounds
  green: "\x1b[38;5;84m", // #5fff87 - success
  darkGreen: "\x1b[38;5;22m", // #005f00 - success backgrounds

  // Background colors - subtle and dark
  bgDarkGray: "\x1b[48;5;235m", // #262626
  bgGray: "\x1b[48;5;237m", // #3a3a3a
  bgCyan: "\x1b[48;5;23m", // #005f5f
  bgPurple: "\x1b[48;5;54m", // #5f0087
  bgRed: "\x1b[48;5;52m", // #5f0000
  bgYellow: "\x1b[48;5;58m", // #5f5f00
};

const logLevelStyles: {
  [key in LogLevel]: { color: string; icon: string; badge: string };
} = {
  [LogLevel.ERROR]: {
    color: colors.red,
    icon: "◉",
    badge: colors.bgRed + colors.white + colors.bright + " ERR " + colors.reset,
  },
  [LogLevel.WARN]: {
    color: colors.yellow,
    icon: "◈",
    badge: colors.bgYellow + colors.darkGray + " WRN " + colors.reset,
  },
  [LogLevel.INFO]: {
    color: colors.cyan,
    icon: "◇",
    badge: colors.darkCyan + colors.dim + " INF " + colors.reset,
  },
  [LogLevel.DEBUG]: {
    color: colors.purple,
    icon: "◦",
    badge: colors.darkPurple + colors.dim + " DBG " + colors.reset,
  },
  [LogLevel.TRACE]: {
    color: colors.gray + colors.dim,
    icon: "·",
    badge: colors.darkGray + " TRC " + colors.reset,
  },
};

const contextColors = {
  agent: colors.cyan,
  model: colors.darkCyan,
  action: colors.purple,
  context: colors.darkPurple,
  memory: colors.darkCyan + colors.dim,
  request: colors.gray,
  engine: colors.purple + colors.dim,
  task: colors.darkPurple,
  tracking: colors.gray + colors.dim,
};

function getContextColor(context: string): string {
  const baseContext = context.split(":")[0].split("[")[0];
  return (
    contextColors[baseContext as keyof typeof contextColors] || colors.darkCyan
  );
}

function colorize(message: string, color: string): string {
  return `${color}${message}${colors.reset}`;
}

function formatTimestamp(date: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
  return colorize(time, colors.darkGray);
}

function formatCorrelationIds(correlationIds: CorrelationIds): string {
  const formatted = formatCorrelationIdsUtil(correlationIds);

  // Use subtle gradient from cyan to purple for correlation chain
  const parts = formatted.split("|");
  const coloredParts = parts.map((part: string, index: number) => {
    const partColors = [
      colors.cyan,
      colors.darkCyan,
      colors.purple,
      colors.darkPurple,
    ];
    const color = partColors[index % partColors.length];
    return colorize(part, color + colors.dim);
  });

  return coloredParts.join(colorize("│", colors.darkGray));
}

function formatStructuredData(data: any, level: LogLevel): string[] {
  const lines: string[] = [];

  if (!data || typeof data !== "object") return lines;

  // Handle token usage - minimalist display
  if (data.tokenUsage) {
    const usage = data.tokenUsage;
    const tokenStr = `${usage.inputTokens}→${usage.outputTokens}`;
    const parts = [colorize(tokenStr, colors.darkCyan)];

    if (usage.reasoningTokens) {
      parts.push(colorize(`⟨${usage.reasoningTokens}⟩`, colors.darkPurple));
    }

    if (usage.estimatedCost) {
      const cost =
        usage.estimatedCost < 0.001
          ? `${(usage.estimatedCost * 1000000).toFixed(0)}µ`
          : `${usage.estimatedCost.toFixed(4)}`;
      parts.push(colorize(`$${cost}`, colors.gray));
    }

    lines.push(
      `    ${colorize("▸", colors.darkGray)} ${parts.join(
        colorize(" • ", colors.darkGray)
      )}`
    );
  }

  // Handle metrics - clean display
  if (data.metrics) {
    const metrics = data.metrics;
    const parts: string[] = [];

    if (metrics.totalTime) {
      const time =
        metrics.totalTime < 1000
          ? `${metrics.totalTime}ms`
          : `${(metrics.totalTime / 1000).toFixed(1)}s`;
      parts.push(colorize(time, colors.purple + colors.dim));
    }

    if (metrics.tokensPerSecond) {
      parts.push(
        colorize(
          `${metrics.tokensPerSecond.toFixed(1)}t/s`,
          colors.darkCyan + colors.dim
        )
      );
    }

    if (parts.length > 0) {
      lines.push(
        `    ${colorize("▸", colors.darkGray)} ${parts.join(
          colorize(" • ", colors.darkGray)
        )}`
      );
    }
  }

  // Handle model info - subtle display
  if (data.modelInfo) {
    const model = `${data.modelInfo.provider}/${data.modelInfo.modelId}`;
    lines.push(
      `    ${colorize("▸", colors.darkGray)} ${colorize(model, colors.gray)}`
    );
  }

  // Handle action info - minimal icons
  if (data.actionInfo) {
    const status = data.actionInfo.status;
    const statusIcon =
      status === "complete" ? "◉" : status === "error" ? "◉" : "◐";
    const statusColor =
      status === "complete"
        ? colors.green
        : status === "error"
        ? colors.red
        : colors.cyan;
    lines.push(
      `    ${colorize(statusIcon, statusColor)} ${colorize(
        data.actionInfo.actionName,
        colors.purple + colors.dim
      )}`
    );
  }

  // Handle errors - prominent but not overwhelming
  if (data.error) {
    lines.push(
      `    ${colorize("▸", colors.red)} ${colorize(
        data.error.message,
        colors.red + colors.dim
      )}`
    );
  }

  return lines;
}

// --- Enhanced Console Transport ---
export class ConsoleTransport implements Transport {
  private enableColors: boolean;

  constructor(options: { enableColors?: boolean } = {}) {
    this.enableColors = options.enableColors ?? true;
  }

  log(formattedMessage: string, entry: LogEntry): void {
    // The formatted message already includes colors and styling
    // Use appropriate console method based on level
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
}

export class Logger {
  private config: LoggerConfig;

  constructor(
    config: Partial<LoggerConfig> & {
      style?: "default" | "enhanced" | "compact" | "verbose";
      enableColors?: boolean;
      enableStructuredData?: boolean;
    } = {}
  ) {
    // Provide defaults if necessary
    const transports =
      !config.transports || config.transports.length === 0
        ? [new ConsoleTransport({ enableColors: config.enableColors })]
        : config.transports;

    // Choose formatter based on style preference
    let formatter: LogFormatter;
    if (config.formatter) {
      formatter = config.formatter;
    } else {
      const style = config.style || "enhanced";
      const enableColors = config.enableColors ?? true;
      const enableStructuredData = config.enableStructuredData ?? true;

      switch (style) {
        case "compact":
          formatter = new CompactFormatter({ enableColors });
          break;
        case "verbose":
          formatter = new VerboseFormatter({ enableColors });
          break;
        case "enhanced":
          formatter = new EnhancedFormatter({
            enableColors,
            enableStructuredData,
            compactMode: false,
          });
          break;
        case "default":
        default:
          formatter = new DefaultFormatter();
          break;
      }
    }

    this.config = {
      level: config.level ?? LogLevel.INFO,
      transports: transports,
      formatter: formatter,
    };

    // Initialize transports
    this.config.transports.forEach((transport) => {
      if (typeof transport.init === "function") {
        Promise.try(transport.init).catch((err) =>
          console.error("Error initializing transport:", err)
        );
      }
    });
  }

  configure(config: Pick<LoggerConfig, "level">) {
    this.config.level = config.level;
  }

  error(context: string, message: string, data?: any) {
    this.log(LogLevel.ERROR, context, message, data);
  }

  warn(context: string, message: string, data?: any) {
    this.log(LogLevel.WARN, context, message, data);
  }

  info(context: string, message: string, data?: any) {
    this.log(LogLevel.INFO, context, message, data);
  }

  debug(context: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  trace(context: string, message: string, data?: any) {
    this.log(LogLevel.TRACE, context, message, data);
  }

  /**
   * Structured logging method with correlation IDs and rich metadata
   */
  structured(
    level: LogLevel,
    context: string,
    message: string,
    data: StructuredLogData
  ) {
    if (level > this.config.level) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      context,
      message,
      data,
      correlationIds: data.correlationIds,
    };

    const formattedMessage = this.config.formatter.format(entry);

    this.config.transports.forEach((transport) => {
      try {
        transport.log(formattedMessage, entry);
      } catch (error) {
        console.error(
          `Error logging to transport ${transport.constructor.name}:`,
          error
        );
      }
    });
  }

  private log(level: LogLevel, context: string, message: string, data?: any) {
    if (level > this.config.level) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      context,
      message,
      data,
    };

    const formattedMessage = this.config.formatter.format(entry); // Format the core message

    // Send to all transports (passing both formatted string and raw entry)
    this.config.transports.forEach((transport) => {
      try {
        transport.log(formattedMessage, entry);
      } catch (error) {
        console.error(
          `Error logging to transport ${transport.constructor.name}:`,
          error
        );
      }
    });
  }

  // Method to gracefully close transports
  async close(): Promise<void> {
    for (const transport of this.config.transports) {
      if (typeof transport.close === "function") {
        try {
          await Promise.try(transport.close);
        } catch (err) {
          console.error(
            `Error closing transport ${transport.constructor.name}:`,
            err
          );
        }
      }
    }
  }
}
