import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { randomUUID } from "crypto";

// Define analytics event structure
export interface AnalyticsEvent {
  id: string;
  type: string;
  category: "wallet" | "task" | "portfolio" | "system";
  data: Record<string, any>;
  timestamp: number;
  sessionId?: string;
  platform?: string; // discord, telegram, twitter
}

// Define user session structure
export interface UserSession {
  id: string;
  startTime: number;
  endTime?: number;
  platform: string;
  eventCount: number;
  lastActivity: number;
}

// Define what our analytics context stores
export interface AnalyticsMemory {
  events: AnalyticsEvent[];
  sessions: UserSession[];
  totalInteractions: number;
  lastActive: number;
  dailyStats: Record<string, number>; // date -> interaction count
  featureUsage: Record<string, number>; // feature -> usage count
}

export const analyticsContext = context({
  type: "analytics",
  schema: z.object({
    userId: z.string().describe("User ID for analytics tracking"),
  }),
  create: (): AnalyticsMemory => ({
    events: [],
    sessions: [],
    totalInteractions: 0,
    lastActive: Date.now(),
    dailyStats: {},
    featureUsage: {},
  }),
  render: (state) => {
    const { events, totalInteractions, lastActive, featureUsage } = state.memory;
    const today = new Date().toDateString();
    const todayInteractions = state.memory.dailyStats[today] || 0;
    const topFeatures = Object.entries(featureUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    return `
📊 Analytics for User: ${state.args.userId}
🔢 Total Interactions: ${totalInteractions.toLocaleString()}
📅 Today's Interactions: ${todayInteractions}
⏰ Last Active: ${new Date(lastActive).toLocaleString()}
🎯 Total Events: ${events.length.toLocaleString()}

Top Features Used:
${topFeatures
  .map(([feature, count]) => `📈 ${feature}: ${count} times`)
  .join("\n") || "No feature usage yet"}

Recent Activity:
${events
  .slice(-3)
  .map((event) => `• ${event.type} (${new Date(event.timestamp).toLocaleTimeString()})`)
  .join("\n") || "No recent activity"}
    `.trim();
  },
}).setActions([
  action({
    name: "track-event",
    description: "Track a user interaction event for analytics",
    schema: z.object({
      eventType: z.string().describe("Type of event (e.g., 'account_created', 'balance_checked')"),
      category: z.enum(["wallet", "task", "portfolio", "system"]).describe("Event category"),
      data: z.record(z.string(), z.any()).optional().describe("Additional event data"),
      sessionId: z.string().optional().describe("Session ID if available"),
      platform: z.string().optional().describe("Platform (discord, telegram, twitter)"),
    }),
    handler: async ({ eventType, category, data = {}, sessionId, platform }, ctx) => {
      const event: AnalyticsEvent = {
        id: randomUUID(),
        type: eventType,
        category,
        data,
        timestamp: Date.now(),
        sessionId,
        platform,
      };

      ctx.memory.events.push(event);
      ctx.memory.totalInteractions++;
      ctx.memory.lastActive = Date.now();

      // Update daily stats
      const today = new Date().toDateString();
      ctx.memory.dailyStats[today] = (ctx.memory.dailyStats[today] || 0) + 1;

      // Update feature usage
      ctx.memory.featureUsage[eventType] = (ctx.memory.featureUsage[eventType] || 0) + 1;

      // Update session activity if sessionId provided
      if (sessionId) {
        const session = ctx.memory.sessions.find(s => s.id === sessionId);
        if (session) {
          session.eventCount++;
          session.lastActivity = Date.now();
        }
      }

      return { 
        tracked: true, 
        eventId: event.id,
        totalEvents: ctx.memory.events.length,
      };
    },
  }),

  action({
    name: "start-session",
    description: "Start a new user session",
    schema: z.object({
      platform: z.string().describe("Platform where session started (discord, telegram, twitter)"),
    }),
    handler: async ({ platform }, ctx) => {
      const session: UserSession = {
        id: randomUUID(),
        startTime: Date.now(),
        platform,
        eventCount: 0,
        lastActivity: Date.now(),
      };

      ctx.memory.sessions.push(session);

      // Session started - if needed, the LLM can call track-event separately

      return {
        success: true,
        sessionId: session.id,
        platform,
        startTime: session.startTime,
      };
    },
  }),

  action({
    name: "end-session",
    description: "End a user session",
    schema: z.object({
      sessionId: z.string().describe("Session ID to end"),
    }),
    handler: async ({ sessionId }, ctx) => {
      const session = ctx.memory.sessions.find(s => s.id === sessionId);
      
      if (!session) {
        return {
          success: false,
          message: "Session not found",
        };
      }

      session.endTime = Date.now();
      const duration = session.endTime - session.startTime;

      // Session ended - if needed, the LLM can call track-event separately

      return {
        success: true,
        sessionId,
        duration,
        eventCount: session.eventCount,
        platform: session.platform,
      };
    },
  }),

  action({
    name: "get-interaction-stats",
    description: "Get comprehensive user interaction statistics",
    schema: z.object({
      timeframe: z.enum(["today", "week", "month", "all"]).optional().default("all")
        .describe("Time period for statistics"),
    }),
    handler: async ({ timeframe }, ctx) => {
      const now = Date.now();
      let filterTime = 0;

      switch (timeframe) {
        case "today":
          filterTime = now - (24 * 60 * 60 * 1000);
          break;
        case "week":
          filterTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          filterTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
        default:
          filterTime = 0;
      }

      const filteredEvents = ctx.memory.events.filter(event => event.timestamp > filterTime);
      const eventTypes = [...new Set(filteredEvents.map(e => e.type))];
      const eventsByCategory = filteredEvents.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const platformUsage = filteredEvents.reduce((acc, event) => {
        if (event.platform) {
          acc[event.platform] = (acc[event.platform] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const activeSessions = ctx.memory.sessions.filter(s => !s.endTime);

      return {
        totalInteractions: ctx.memory.totalInteractions,
        periodInteractions: filteredEvents.length,
        eventTypes,
        eventsByCategory,
        platformUsage,
        activeSessions: activeSessions.length,
        totalSessions: ctx.memory.sessions.length,
        averageSessionLength: ctx.memory.sessions
          .filter(s => s.endTime)
          .reduce((acc, s) => acc + (s.endTime! - s.startTime), 0) / 
          Math.max(ctx.memory.sessions.filter(s => s.endTime).length, 1),
        topFeatures: Object.entries(ctx.memory.featureUsage)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
      };
    },
  }),

  action({
    name: "get-usage-patterns",
    description: "Analyze user behavior patterns and preferences",
    schema: z.object({}),
    handler: async (_, ctx) => {
      const events = ctx.memory.events;
      const sessions = ctx.memory.sessions;

      // Analyze time-based patterns
      const hourlyActivity = events.reduce((acc, event) => {
        const hour = new Date(event.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const mostActiveHour = Object.entries(hourlyActivity)
        .sort(([,a], [,b]) => b - a)[0];

      // Analyze platform preferences
      const platformEvents = events.reduce((acc, event) => {
        if (event.platform) {
          acc[event.platform] = (acc[event.platform] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const preferredPlatform = Object.entries(platformEvents)
        .sort(([,a], [,b]) => b - a)[0];

      // Analyze feature adoption
      const featureFirstUse = events.reduce((acc, event) => {
        if (!acc[event.type]) {
          acc[event.type] = event.timestamp;
        }
        return acc;
      }, {} as Record<string, number>);

      const recentlyAdopted = Object.entries(featureFirstUse)
        .filter(([, timestamp]) => Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) // Within last week
        .map(([feature]) => feature);

      // Calculate engagement score
      const avgSessionLength = sessions
        .filter(s => s.endTime)
        .reduce((acc, s) => acc + (s.endTime! - s.startTime), 0) / 
        Math.max(sessions.filter(s => s.endTime).length, 1);

      const engagementScore = Math.min(100, 
        (ctx.memory.totalInteractions / 100) * 20 + // Interaction count (0-20 points)
        (avgSessionLength / (10 * 60 * 1000)) * 30 + // Session length (0-30 points)
        (Object.keys(ctx.memory.featureUsage).length / 10) * 50 // Feature diversity (0-50 points)
      );

      return {
        timePatterns: {
          mostActiveHour: mostActiveHour ? {
            hour: parseInt(mostActiveHour[0]),
            interactions: mostActiveHour[1],
          } : null,
          hourlyDistribution: hourlyActivity,
        },
        platformPreferences: {
          preferred: preferredPlatform ? {
            platform: preferredPlatform[0],
            usage: preferredPlatform[1],
          } : null,
          distribution: platformEvents,
        },
        featureAdoption: {
          totalFeatures: Object.keys(ctx.memory.featureUsage).length,
          recentlyAdopted,
          mostUsed: Object.entries(ctx.memory.featureUsage)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5),
        },
        engagement: {
          score: Math.round(engagementScore),
          level: engagementScore > 70 ? "High" : engagementScore > 40 ? "Medium" : "Low",
          avgSessionLength: Math.round(avgSessionLength / 1000 / 60), // in minutes
        },
      };
    },
  }),

  action({
    name: "export-analytics",
    description: "Export analytics data in various formats",
    schema: z.object({
      format: z.enum(["json", "csv", "summary"]).default("summary")
        .describe("Export format"),
      timeframe: z.enum(["today", "week", "month", "all"]).default("all")
        .describe("Time period to export"),
    }),
    handler: async ({ format, timeframe }, ctx) => {
      const now = Date.now();
      let filterTime = 0;

      switch (timeframe) {
        case "today":
          filterTime = now - (24 * 60 * 60 * 1000);
          break;
        case "week":
          filterTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          filterTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
        default:
          filterTime = 0;
      }

      const filteredEvents = ctx.memory.events.filter(event => event.timestamp > filterTime);
      const filteredSessions = ctx.memory.sessions.filter(session => session.startTime > filterTime);

      switch (format) {
        case "json":
          return {
            success: true,
            format: "json",
            data: {
              events: filteredEvents,
              sessions: filteredSessions,
              stats: {
                totalInteractions: ctx.memory.totalInteractions,
                dailyStats: ctx.memory.dailyStats,
                featureUsage: ctx.memory.featureUsage,
              },
            },
          };

        case "csv":
          const csvData = filteredEvents.map(event => ({
            timestamp: new Date(event.timestamp).toISOString(),
            type: event.type,
            category: event.category,
            platform: event.platform || "unknown",
            data: JSON.stringify(event.data),
          }));
          
          return {
            success: true,
            format: "csv",
            headers: ["timestamp", "type", "category", "platform", "data"],
            rows: csvData,
          };

        case "summary":
        default:
          return {
            success: true,
            format: "summary",
            timeframe,
            summary: {
              totalEvents: filteredEvents.length,
              totalSessions: filteredSessions.length,
              activeSessions: filteredSessions.filter(s => !s.endTime).length,
              eventsByCategory: filteredEvents.reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>),
              topEventTypes: [...new Set(filteredEvents.map(e => e.type))]
                .map(type => ({
                  type,
                  count: filteredEvents.filter(e => e.type === type).length,
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10),
              platformDistribution: filteredEvents.reduce((acc, e) => {
                if (e.platform) {
                  acc[e.platform] = (acc[e.platform] || 0) + 1;
                }
                return acc;
              }, {} as Record<string, number>),
            },
          };
      }
    },
  }),
]);