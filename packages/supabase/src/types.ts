import { type SupabaseClient } from "@supabase/supabase-js";
import * as z from "zod/v4";
import type { SupabaseVectorStoreSchema } from "./schema";

export type SupabaseVectorStoreConfig = z.infer<
  typeof SupabaseVectorStoreSchema
>;

export interface SupabaseVectorRecord {
  key: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface SupabaseVectorFilter {
  metadata?: Record<string, any>;
  keys?: string[];
}

export interface SupabaseVectorStoreOptions {
  client: SupabaseClient;
  tableName: string;
  queryName?: string;
  embeddingColumnName?: string;
  contentColumnName?: string;
  metadataColumnName?: string;
}

export interface SupabaseSearchResult {
  key: string;
  content: string;
  metadata?: Record<string, any>;
  similarity?: number;
}
