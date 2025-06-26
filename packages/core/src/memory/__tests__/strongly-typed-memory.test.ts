import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  MemoryTypes,
  type PrimitiveMemory,
  type ObjectMemory,
  type ArrayMemory,
  type CounterMemory,
  type SetMemory,
  type MapMemory,
  type StronglyTypedMemory,
  type ExtractMemoryData,
} from "../types";
import type { Action, ActionSchema } from "../../types";

describe("StronglyTypedMemory", () => {
  describe("MemoryTypes factory functions", () => {
    it("should create primitive memory with correct type", () => {
      const stringMemory = MemoryTypes.primitive("user:name", "John");
      const numberMemory = MemoryTypes.primitive("user:age", 25);
      const booleanMemory = MemoryTypes.primitive("user:active", true);

      expect(stringMemory._type).toBe("primitive");
      expect(stringMemory.key).toBe("user:name");
      expect(stringMemory.create()).toBe("John");

      expect(numberMemory._type).toBe("primitive");
      expect(numberMemory.create()).toBe(25);

      expect(booleanMemory._type).toBe("primitive");
      expect(booleanMemory.create()).toBe(true);
    });

    it("should create object memory with schema validation", () => {
      const userSchema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      type User = z.infer<typeof userSchema>;

      const userMemory = MemoryTypes.object<User>(
        "user:profile",
        { name: "John", age: 25, email: "john@example.com" },
        userSchema
      );

      expect(userMemory._type).toBe("object");
      expect(userMemory.key).toBe("user:profile");
      expect(userMemory.schema).toBe(userSchema);

      const userData = userMemory.create();
      expect(userData.name).toBe("John");
      expect(userData.age).toBe(25);
      expect(userData.email).toBe("john@example.com");
    });

    it("should create array memory", () => {
      const tagsMemory = MemoryTypes.array<string>("user:tags", ["developer", "typescript"]);

      expect(tagsMemory._type).toBe("array");
      expect(tagsMemory.key).toBe("user:tags");
      expect(tagsMemory.create()).toEqual(["developer", "typescript"]);
    });

    it("should create counter memory", () => {
      const visitCountMemory = MemoryTypes.counter("user:visits", 0);

      expect(visitCountMemory._type).toBe("counter");
      expect(visitCountMemory.key).toBe("user:visits");
      expect(visitCountMemory.create()).toBe(0);
    });

    it("should create set memory", () => {
      const skillsMemory = MemoryTypes.set<string>("user:skills", new Set(["typescript", "react"]));

      expect(skillsMemory._type).toBe("set");
      expect(skillsMemory.key).toBe("user:skills");
      
      const skills = skillsMemory.create();
      expect(skills.has("typescript")).toBe(true);
      expect(skills.has("react")).toBe(true);
    });

    it("should create map memory", () => {
      const preferencesMemory = MemoryTypes.map<string, boolean>("user:preferences", {
        darkMode: true,
        notifications: false,
      });

      expect(preferencesMemory._type).toBe("map");
      expect(preferencesMemory.key).toBe("user:preferences");
      
      const preferences = preferencesMemory.create();
      expect(preferences.darkMode).toBe(true);
      expect(preferences.notifications).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should correctly infer data types from memory configurations", () => {
      const stringMemory = MemoryTypes.primitive("test", "hello");
      const numberMemory = MemoryTypes.counter("counter", 5);
      const objectMemory = MemoryTypes.object("config", { api: "v1", timeout: 30 });
      const arrayMemory = MemoryTypes.array<number>("numbers", [1, 2, 3]);

      // These assignments would fail at compile time if types were wrong
      const stringValue: string = stringMemory.create();
      const numberValue: number = numberMemory.create();
      const objectValue: { api: string; timeout: number } = objectMemory.create();
      const arrayValue: number[] = arrayMemory.create();

      expect(stringValue).toBe("hello");
      expect(numberValue).toBe(5);
      expect(objectValue.api).toBe("v1");
      expect(arrayValue).toEqual([1, 2, 3]);
    });

    it("should extract correct data types using ExtractMemoryData", () => {
      const userMemory = MemoryTypes.object("user", { id: 1, name: "John" });
      type UserData = ExtractMemoryData<typeof userMemory>;
      
      // This should compile correctly if the type is inferred properly
      const user: UserData = { id: 2, name: "Jane" };
      expect(user.id).toBe(2);
      expect(user.name).toBe("Jane");
    });
  });

  describe("Action integration examples", () => {
    it("should work with strongly typed actions", () => {
      // Example of a strongly typed action with counter memory
      const incrementAction: Action<
        { amount?: number },
        number,
        unknown,
        any,
        any,
        CounterMemory
      > = {
        name: "increment",
        description: "Increment a counter",
        schema: { amount: z.number().optional().default(1) },
        memory: MemoryTypes.counter("action:increment", 0),
        handler: async (args, ctx, agent) => {
          // ctx.actionMemory is now typed as `number`
          const currentValue: number = ctx.actionMemory;
          const newValue = currentValue + args.amount;
          
          // In a real implementation, this would be saved back to memory
          return newValue;
        },
      };

      expect(incrementAction.name).toBe("increment");
      expect(incrementAction.memory?._type).toBe("counter");
    });

    it("should work with object memory actions", () => {
      // Example with complex object memory
      type UserSession = {
        userId: string;
        loginTime: number;
        permissions: string[];
        lastActivity: number;
      };

      const sessionAction: Action<
        { action: string },
        UserSession,
        unknown,
        any,
        any,
        ObjectMemory<UserSession>
      > = {
        name: "updateSession",
        description: "Update user session",
        schema: { action: z.string() },
        memory: MemoryTypes.object<UserSession>("session", {
          userId: "user123",
          loginTime: Date.now(),
          permissions: ["read", "write"],
          lastActivity: Date.now(),
        }),
        handler: async (args, ctx, agent) => {
          // ctx.actionMemory is now typed as UserSession
          const session: UserSession = ctx.actionMemory;
          
          return {
            ...session,
            lastActivity: Date.now(),
          };
        },
      };

      expect(sessionAction.name).toBe("updateSession");
      expect(sessionAction.memory?._type).toBe("object");
    });
  });

  describe("Type safety validation", () => {
    it("should prevent incorrect memory data access", () => {
      const counterMemory = MemoryTypes.counter("test", 0);
      
      // This should be a number
      const value = counterMemory.create();
      expect(typeof value).toBe("number");
      
      // TypeScript would prevent this:
      // const wrongType: string = counterMemory.create(); // Type error!
    });

    it("should enforce correct schema types", () => {
      const configSchema = z.object({
        host: z.string(),
        port: z.number(),
        ssl: z.boolean(),
      });

      type Config = z.infer<typeof configSchema>;

      const configMemory = MemoryTypes.object<Config>(
        "config",
        { host: "localhost", port: 3000, ssl: false },
        configSchema
      );

      const config = configMemory.create();
      
      // These should all be properly typed
      expect(typeof config.host).toBe("string");
      expect(typeof config.port).toBe("number");
      expect(typeof config.ssl).toBe("boolean");
    });
  });
});