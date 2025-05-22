# @daydreamsai/firebase

A Firebase Firestore integration package for the DaydreamsAI platform, providing persistent memory storage for conversation data.

## Features

- Persistent memory storage for conversation data in Firestore
- Use with environment variables or direct service account credentials
- Fully typed API
- Implements core DaydreamsAI interfaces for seamless integration

## Installation

```bash
npm install @daydreamsai/firebase
# or
yarn add @daydreamsai/firebase
# or
pnpm add @daydreamsai/firebase
```

## Usage

```typescript
import { createFirebaseMemoryStore } from '@daydreamsai/firebase';

// Create and initialize the store
const store = await createFirebaseMemoryStore({
  collectionName: 'my_conversations' // Optional, defaults to "conversations"
});

// Store and retrieve data
await store.set('user123', { messages: [...] });
const data = await store.get('user123');
```

You can also provide service account credentials directly:

```typescript
const store = await createFirebaseMemoryStore({
  serviceAccount: {
    projectId: 'your-project-id',
    clientEmail: 'your-client-email@project.iam.gserviceaccount.com',
    privateKey: 'YOUR_PRIVATE_KEY'
  },
  collectionName: 'my_conversations'
});
```

## API

### `createFirebaseMemoryStore(options: FirebaseMemoryOptions): Promise<MemoryStore>`

Creates and initializes a Firebase Firestore memory store implementation.

#### Options

- `serviceAccount` (optional): Service account credentials
  - `projectId`: Firebase project ID
  - `clientEmail`: Service account client email
  - `privateKey`: Service account private key
- `collectionName` (optional): Name of the Firestore collection to use (defaults to "conversations")

#### Methods

- `get<T>(key: string): Promise<T | null>` - Retrieve a value by key
- `set<T>(key: string, value: T): Promise<void>` - Store a value by key
- `delete(key: string): Promise<void>` - Remove a value by key
- `clear(): Promise<void>` - Remove all values from the store

## License

MIT 