import type { MemoryStore } from "@daydreamsai/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export function _hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Configuration for the Supabase memory store
 */
export interface SupabaseMemoryStoreConfig {
  /** Supabase URL */
  url: string;
  /** Supabase API key */
  key: string;
  /** Table name for storing memory data */
  tableName?: string;
}

/**
 * Creates a Supabase-backed implementation of the MemoryStore interface
 *
 * @param config - Configuration for the Supabase memory store
 * @returns A MemoryStore implementation using Supabase
 */
export function createSupabaseMemoryStore(
  config: SupabaseMemoryStoreConfig
): MemoryStore {
  const { url, key, tableName = "memory" } = config;

  // Create Supabase client
  const client = createClient(url, key);

  // Initialize the table if it doesn't exist
  initializeTable(client, tableName).catch(console.error);

  return {
    /**
     * Retrieves data from the Supabase memory store
     * @param key - Key to look up
     * @returns The stored value or null if not found
     */
    async get<T>(key: string): Promise<T | null> {
      const hashedKey = _hashKey(key);
      const { data, error } = await client
        .from(tableName)
        .select("value")
        .eq("key", hashedKey)
        .single();

      if (error || !data) {
        return null;
      }

      try {
        return JSON.parse(data.value) as T;
      } catch (e) {
        console.error(`Error parsing data for key ${key}:`, e);
        return null;
      }
    },

    /**
     * Stores data in the Supabase memory store
     * @param key - Key to store under
     * @param value - Value to store
     */
    async set<T>(key: string, value: T): Promise<void> {
      const hashedKey = _hashKey(key);
      const serializedValue = JSON.stringify(value);

      const { error } = await client
        .from(tableName)
        .upsert({
          key: hashedKey,
          value: serializedValue,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        throw new Error(`Failed to set value for key ${key}: ${error.message}`);
      }
    },

    /**
     * Retrieves all keys from the Supabase memory store.
     * Note: Returns hashed keys, not the original keys.
     * @returns An array of all stored (hashed) keys
     */
    async keys(): Promise<string[]> {
      const { data, error } = await client.from(tableName).select("key");

      if (error) {
        throw new Error(`Failed to retrieve keys: ${error.message}`);
      }

      return data ? data.map((row: { key: string }) => row.key) : [];
    },

    /**
     * Removes a specific entry from the Supabase memory store
     * @param key - Key to remove
     */
    async delete(key: string): Promise<void> {
      const hashedKey = _hashKey(key);
      const { error } = await client
        .from(tableName)
        .delete()
        .eq("key", hashedKey);

      if (error) {
        throw new Error(`Failed to delete key ${key}: ${error.message}`);
      }
    },

    /**
     * Removes all entries from the Supabase memory store
     */
    async clear(): Promise<void> {
      const { error } = await client.from(tableName).delete().neq("key", "");

      if (error) {
        throw new Error(`Failed to clear memory store: ${error.message}`);
      }
    },
  };
}

/**
 * Initialize the memory table in Supabase
 *
 * @param client - Supabase client
 * @param tableName - Name of the table to create
 */
async function initializeTable(
  client: SupabaseClient,
  tableName: string
): Promise<void> {
  // Check if the table exists by querying it
  const { error } = await client.from(tableName).select("key").limit(1);

  // If the table doesn't exist, create it
  if (error && error.code === "42P01") {
    // PostgreSQL code for undefined_table
    // We need to use raw SQL to create the table
    // This requires the execute_sql function to be available in the database
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      const result = await client.rpc("execute_sql", {
        query: createTableQuery,
      });
      console.log(`Created memory table: ${tableName}`);
      console.log("result", result);
    } catch (e) {
      console.error(`Failed to create memory table ${tableName}:`, e);
      throw e;
    }
  } else if (error) {
    console.error(`Error checking memory table ${tableName}:`, error);
  }
}

/**
 * Factory function to create a MemoryStore implementation using Supabase
 *
 * @param url - Supabase URL
 * @param key - Supabase API key
 * @param tableName - Name of the table to store memory data
 * @returns A MemoryStore implementation
 */
export function createSupabaseMemory(
  url: string,
  key: string,
  tableName: string = "memory"
): MemoryStore {
  return createSupabaseMemoryStore({
    url,
    key,
    tableName,
  });
}
