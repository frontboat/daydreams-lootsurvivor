import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import type { MemoryStore } from "@daydreamsai/core";

export interface FirebaseMemoryOptions {
  /**
   * Firebase project configuration
   * Either provide a service account JSON or use environment variables with firebase-admin
   */
  serviceAccount?: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  /**
   * Custom name for the Firestore collection
   * @default "conversations"
   */
  collectionName?: string;
  /**
   * Max retries for Firestore operations
   * @default 3
   */
  maxRetries?: number;
  /**
   * Base delay between retries (ms)
   * @default 1000
   */
  retryDelay?: number;
}

export class FirebaseMemoryStore implements MemoryStore {
  private app: App;
  private db: Firestore;
  private readonly collectionName: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(options: FirebaseMemoryOptions) {
    this.collectionName = options.collectionName || "conversations";
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Check if Firebase app is already initialized
    const apps = getApps();
    if (apps.length === 0) {
      // Initialize Firebase app if not already initialized
      if (options.serviceAccount) {
        this.app = initializeApp({
          credential: cert({
            projectId: options.serviceAccount.projectId,
            clientEmail: options.serviceAccount.clientEmail,
            privateKey: options.serviceAccount.privateKey,
          }),
        });
      } else {
        // Use environment variables for initialization
        this.app = initializeApp();
      }
    } else {
      this.app = apps[0];
    }
    
    // Initialize Firestore
    this.db = getFirestore(this.app);
  }

  /**
   * Helper method to implement retry logic for Firestore operations
   * @param operation - Function to retry
   * @returns Result of the operation
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if this is a retryable error (like RST_STREAM)
        const isRetryable = error?.code === 13 || 
                            error?.message?.includes('RST_STREAM') ||
                            error?.message?.includes('INTERNAL');
        
        if (!isRetryable) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        console.warn(`Firestore operation failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${Math.round(delay)}ms`, error?.message || error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we've exhausted all retries
    throw lastError || new Error('Operation failed after maximum retry attempts');
  }

  /**
   * Initialize the Firestore connection
   */
  async initialize(): Promise<void> {
    // Make a simple connection test with retry
    try {
      await this.withRetry(() => this.db.collection(this.collectionName).limit(1).get());
    } catch (error) {
      console.error(`Firestore connection error: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves a value from the store
   * @param key - Key to look up
   * @returns The stored value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    return this.withRetry(async () => {
      const docRef = this.db.collection(this.collectionName).doc(key);
      const doc = await docRef.get();
      
      if (!doc.exists) return null;
      
      const data = doc.data();
      return data?.value as T || null;
    });
  }

  /**
   * Stores a value in the store
   * @param key - Key to store under
   * @param value - Value to store
   */
  async set<T>(key: string, value: T): Promise<void> {
    return this.withRetry(async () => {
      const docRef = this.db.collection(this.collectionName).doc(key);
      // Convert undefined values to null to avoid Firestore errors
      const processedValue = this.processValue(value);
      await docRef.set({ value: processedValue, updatedAt: new Date() }, { merge: true });
    });
  }

  /**
   * Helper method to process values before storing in Firestore
   * Replaces undefined with null to avoid Firestore errors
   */
  private processValue(value: any): any {
    if (value === undefined) return null;
    
    if (Array.isArray(value)) {
      return value.map(item => this.processValue(item));
    }
    
    if (value !== null && typeof value === 'object') {
      return Object.entries(value).reduce((acc, [k, v]) => {
        acc[k] = this.processValue(v);
        return acc;
      }, {} as Record<string, any>);
    }
    
    return value;
  }

  /**
   * Removes a specific entry from the store
   * @param key - Key to remove
   */
  async delete(key: string): Promise<void> {
    return this.withRetry(async () => {
      const docRef = this.db.collection(this.collectionName).doc(key);
      await docRef.delete();
    });
  }

  /**
   * Removes all entries from the store
   */
  async clear(): Promise<void> {
    return this.withRetry(async () => {
      const batch = this.db.batch();
      const snapshot = await this.db.collection(this.collectionName).get();
      
      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    });
  }
}

/**
 * Creates a new Firebase-backed memory store
 * @param options - Firebase connection options
 * @returns A MemoryStore implementation using Firebase Firestore for storage
 */
export async function createFirebaseMemoryStore(
  options: FirebaseMemoryOptions
): Promise<MemoryStore> {
  const store = new FirebaseMemoryStore(options);
  await store.initialize();
  return store;
} 