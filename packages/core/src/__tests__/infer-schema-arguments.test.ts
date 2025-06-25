import { z } from "zod/v4";
import type { InferSchemaArguments } from "../types";

// Test 1: undefined schema should return empty object
type Test1 = InferSchemaArguments<undefined>;
// @ts-expect-error - Test1 should be {}
const test1: Test1 = { someProperty: "value" };
const test1Valid: {} = test1;

// Test 2: ZodRawShape should properly infer
type Test2 = InferSchemaArguments<{
  channelId: z.ZodString;
  messageId: z.ZodNumber;
}>;
const test2: Test2 = {
  channelId: "123",
  messageId: 456,
};

// Test 3: ZodObject should properly infer
type Test3 = InferSchemaArguments<
  z.ZodObject<{
    userId: z.ZodString;
    age: z.ZodNumber;
    isActive: z.ZodBoolean;
  }>
>;
const test3: Test3 = {
  userId: "user123",
  age: 25,
  isActive: true,
};

// Test 4: Other ZodType should properly infer
type Test4 = InferSchemaArguments<z.ZodString>;
const test4: Test4 = "hello";

// Test 5: Complex nested schema
type Test5 = InferSchemaArguments<{
  user: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
  }>;
  settings: z.ZodObject<{
    theme: z.ZodString;
    notifications: z.ZodBoolean;
  }>;
}>;
const test5: Test5 = {
  user: {
    name: "John",
    email: "john@example.com",
  },
  settings: {
    theme: "dark",
    notifications: true,
  },
};

// Test 6: Optional fields
type Test6 = InferSchemaArguments<
  z.ZodObject<{
    required: z.ZodString;
    optional: z.ZodOptional<z.ZodString>;
  }>
>;
const test6: Test6 = {
  required: "value",
  // optional is optional
};

// Export to prevent TS from optimizing away
export { test1Valid, test2, test3, test4, test5, test6 };
